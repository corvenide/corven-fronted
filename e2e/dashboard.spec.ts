import type { Page } from '@playwright/test';

import { expect, test } from './support/fixtures';

const workspaceList = (page: Page) => page.getByRole('region', { name: 'Workspaces', exact: true }).getByRole('listitem');

const row = (page: Page, name: string) => workspaceList(page).filter({ hasText: name });

test.describe('dashboard', () => {
    test.beforeEach(({ api }) => {
        api.signedIn = true;
    });

    test('shows the empty state for a new user', async ({ page }) => {
        await page.goto('/dashboard');

        await expect(page.getByRole('heading', { name: 'Create your first workspace' })).toBeVisible();
    });

    test('lists workspaces with their status', async ({ page, api }) => {
        api.workspaces = [
            { id: 'ws-1', name: 'token-contract', status: 'RUNNING' },
            { id: 'ws-2', name: 'nft-playground', status: 'STOPPED' },
            { id: 'ws-3', name: 'broken-build', status: 'FAILED', provisionError: 'Image not found' },
        ];

        await page.goto('/dashboard');

        await expect(workspaceList(page)).toHaveCount(3);
        await expect(row(page, 'token-contract')).toContainText('Running');
        await expect(row(page, 'nft-playground')).toContainText('Stopped');
        await expect(row(page, 'broken-build')).toContainText('Failed');

        // Actions match each state.
        await expect(row(page, 'token-contract').getByRole('button', { name: 'Stop workspace' })).toBeVisible();
        await expect(row(page, 'nft-playground').getByRole('button', { name: 'Start workspace' })).toBeVisible();
        await expect(row(page, 'broken-build').getByRole('button', { name: 'Retry start' })).toBeVisible();
    });

    test('creates a workspace from a template and opens it', async ({ page, api }) => {
        await page.goto('/dashboard');
        // The header and the empty state both offer this button.
        await page.getByRole('button', { name: 'New workspace' }).first().click();

        const submit = page.getByRole('button', { name: 'Create Workspace' });
        await expect(submit).toBeDisabled();

        await page.getByLabel('Workspace name').fill('my-token');
        await page.getByRole('radio', { name: /Token \(xUDT\)/ }).check();
        await submit.click();

        // A new workspace opens straight in the IDE.
        await expect(page).toHaveURL(/\/ide\/ws-new-1$/);
        expect(api.sent('POST', '/workspaces').map((request) => request.body)).toEqual([
            { name: 'my-token', templateId: 'xudt' },
        ]);

        // And it is in the list when the user comes back.
        await page.goto('/dashboard');
        await expect(row(page, 'my-token')).toContainText('Not started');
    });

    test('deletes a workspace only after confirming', async ({ page, api }) => {
        api.workspaces = [
            { id: 'ws-1', name: 'keep-me', status: 'STOPPED' },
            { id: 'ws-2', name: 'delete-me', status: 'STOPPED' },
        ];
        await page.goto('/dashboard');

        // Cancel leaves it alone.
        await row(page, 'delete-me').getByRole('button', { name: 'Delete workspace' }).click();
        await expect(page.getByText('Delete "delete-me"?', { exact: false })).toBeVisible();
        await page.getByRole('button', { name: 'Cancel' }).click();
        expect(api.sent('DELETE', '/workspaces/ws-2')).toHaveLength(0);

        // Confirm removes it.
        await row(page, 'delete-me').getByRole('button', { name: 'Delete workspace' }).click();
        await page.getByRole('button', { name: 'Delete', exact: true }).click();

        await expect(row(page, 'delete-me')).toHaveCount(0);
        await expect(row(page, 'keep-me')).toBeVisible();
        expect(api.sent('DELETE', '/workspaces/ws-2')).toHaveLength(1);
    });

    test('starts and stops a workspace', async ({ page, api }) => {
        api.workspaces = [{ id: 'ws-1', name: 'demo', status: 'STOPPED' }];
        await page.goto('/dashboard');

        await row(page, 'demo').getByRole('button', { name: 'Start workspace' }).click();
        await expect(row(page, 'demo')).toContainText('Running');
        expect(api.sent('POST', '/workspaces/ws-1/start')).toHaveLength(1);

        await row(page, 'demo').getByRole('button', { name: 'Stop workspace' }).click();
        await expect(row(page, 'demo')).toContainText('Stopped');
        expect(api.sent('POST', '/workspaces/ws-1/stop')).toHaveLength(1);
    });

    test('filters the list by search', async ({ page, api }) => {
        api.workspaces = [
            { id: 'ws-1', name: 'token-contract', status: 'STOPPED' },
            { id: 'ws-2', name: 'nft-playground', status: 'STOPPED' },
        ];
        await page.goto('/dashboard');

        await page.getByPlaceholder('Search workspaces').fill('nft');

        await expect(workspaceList(page)).toHaveCount(1);
        await expect(row(page, 'nft-playground')).toBeVisible();

        await page.getByPlaceholder('Search workspaces').fill('nothing-matches');
        await expect(page.getByText('No workspaces match “nothing-matches”.')).toBeVisible();
    });

    test('recovers from a failed load with Retry', async ({ page, api }) => {
        api.workspaces = [{ id: 'ws-1', name: 'demo', status: 'STOPPED' }];
        api.listFailure = 500;
        await page.goto('/dashboard');

        await expect(page.getByText('Couldn’t load your workspaces.')).toBeVisible({ timeout: 15_000 });

        api.listFailure = null;
        await page.getByRole('button', { name: 'Try again' }).click();

        await expect(row(page, 'demo')).toBeVisible();
    });

    test('opens a workspace in the IDE', async ({ page, api }) => {
        api.workspaces = [{ id: 'ws-1', name: 'demo', status: 'STOPPED' }];
        await page.goto('/dashboard');

        await row(page, 'demo').getByRole('button', { name: 'demo' }).click();

        await expect(page).toHaveURL(/\/ide\/ws-1$/);
    });
});
