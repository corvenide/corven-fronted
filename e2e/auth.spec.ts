import { expect, test } from './support/fixtures';

test.describe('session', () => {
    test('landing page is public and "Start building" leads to sign-in', async ({ page }) => {
        await page.goto('/');

        await page.getByRole('button', { name: 'Start building' }).first().click();

        await expect(page).toHaveURL(/\/auth$/);
        await expect(page.getByRole('heading', { name: /Your wallet is/ })).toBeVisible();
    });

    test('signed-out visitors are sent to sign-in', async ({ page, api }) => {
        await page.goto('/dashboard');

        await expect(page).toHaveURL(/\/auth$/);
        await expect(page.getByText('Corven never sees or stores your private keys.')).toBeVisible();
        expect(api.sent('POST', '/auth/refresh')).not.toHaveLength(0);
        expect(api.sent('GET', '/workspaces')).toHaveLength(0);
    });

    test('a returning user is signed back in from the refresh cookie', async ({ page, api }) => {
        api.signedIn = true;

        await page.goto('/dashboard');

        await expect(page.getByRole('heading', { name: 'Workspaces', level: 1 })).toBeVisible();
        await expect(page).toHaveURL(/\/dashboard$/);

        const [listRequest] = api.sent('GET', '/workspaces');
        expect(listRequest.authorization).toMatch(/^Bearer .+\..+\..+$/);
    });

    test('a revoked session ends up back at sign-in', async ({ page, api }) => {
        api.signedIn = true;
        await page.goto('/dashboard');
        await expect(page.getByRole('heading', { name: 'Workspaces', level: 1 })).toBeVisible();

        // Server-side logout from another device: every call now fails.
        api.revoked = true;
        await page.reload();

        await expect(page).toHaveURL(/\/auth$/);
    });
});
