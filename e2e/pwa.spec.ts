import { expect, test } from './support/fixtures';

test.describe('installable app', () => {
    test.use({ serviceWorkers: 'allow' });

    test('links a valid web app manifest', async ({ page, request }) => {
        await page.goto('/');

        const href = await page.locator('link[rel="manifest"]').getAttribute('href');
        expect(href).toBeTruthy();

        const response = await request.get(href!);
        expect(response.ok()).toBe(true);

        const manifest = await response.json();
        expect(manifest).toMatchObject({
            name: 'Corven IDE',
            short_name: 'Corven',
            start_url: '/dashboard',
            display: 'standalone',
        });

        const sizes = manifest.icons.map((icon: { sizes: string; purpose?: string }) => `${icon.sizes}:${icon.purpose}`);
        expect(sizes).toEqual(expect.arrayContaining(['192x192:any', '512x512:any', '512x512:maskable']));

        for (const icon of manifest.icons as { src: string }[]) {
            const image = await request.get(icon.src);
            expect(image.ok(), icon.src).toBe(true);
            expect(image.headers()['content-type']).toContain('image/png');
        }
    });

    test('registers a service worker that controls the page', async ({ page }) => {
        await page.goto('/');

        const scope = await page.evaluate(async () => (await navigator.serviceWorker.ready).scope);
        expect(scope).toBe('http://localhost:4173/');

        // After a reload the worker serves the page.
        await page.reload();
        expect(await page.evaluate(() => navigator.serviceWorker.controller !== null)).toBe(true);
    });

    test('Chrome reads the manifest as an app with its own window', async ({ page, browserName }) => {
        test.skip(browserName !== 'chromium', 'Chromium-only check');

        await page.goto('/');
        await page.evaluate(async () => navigator.serviceWorker.ready);

        const cdp = await page.context().newCDPSession(page);

        // Chrome's own parse of the manifest, as used when installing.
        const manifest = await cdp.send('Page.getAppManifest');
        expect(manifest.errors).toEqual([]);

        const parsed = JSON.parse(manifest.data);
        expect(parsed.display).toBe('standalone');
        expect(parsed.icons.length).toBeGreaterThanOrEqual(2);

        const { installabilityErrors } = await cdp.send('Page.getInstallabilityErrors');
        expect(installabilityErrors).toEqual([]);
    });

    test('offers "Install Corven app" when the browser allows it', async ({ page, api }) => {
        api.signedIn = true;
        await page.goto('/dashboard');
        await expect(page.getByRole('heading', { name: 'Workspaces', level: 1 })).toBeVisible();

        const account = page.getByRole('button', { name: /Ada|ckt1/ }).last();

        // Not offered before the browser says the app can be installed.
        await account.click();
        await expect(page.getByRole('menuitem', { name: 'Install Corven app' })).toHaveCount(0);
        await page.keyboard.press('Escape');

        // Simulate Chrome's install prompt event.
        await page.evaluate(() => {
            const event = new Event('beforeinstallprompt', { cancelable: true }) as Event & {
                prompt: () => Promise<void>;
                userChoice: Promise<{ outcome: string }>;
            };
            event.prompt = async () => {
                (window as unknown as { installPrompted: boolean }).installPrompted = true;
            };
            event.userChoice = Promise.resolve({ outcome: 'accepted' });
            window.dispatchEvent(event);
        });

        await account.click();
        await page.getByRole('menuitem', { name: 'Install Corven app' }).click();

        expect(await page.evaluate(() => (window as unknown as { installPrompted?: boolean }).installPrompted)).toBe(true);

        // The prompt can only be used once, so the item goes away.
        await account.click();
        await expect(page.getByRole('menuitem', { name: 'Install Corven app' })).toHaveCount(0);
    });
});
