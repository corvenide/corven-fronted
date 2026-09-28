import { defineConfig, devices } from '@playwright/test';

// The app is built with fake backend URLs; e2e/support/mock-api.ts answers
// every request to them, so the tests need no running backend.
export const API_URL = 'http://api.test/api';
const PORT = 4173;

export default defineConfig({
    testDir: './e2e',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 1 : 0,
    reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
    use: {
        baseURL: `http://localhost:${PORT}`,
        trace: 'retain-on-failure',
        // A service worker would sit between the app and the mock API;
        // e2e/pwa.spec.ts turns it back on to test the installable app.
        serviceWorkers: 'block',
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],
    webServer: {
        // Run vite directly (no pnpm wrapper) so Playwright can stop the
        // preview server when the tests finish.
        command: `node node_modules/vite/bin/vite.js build --outDir dist-e2e && exec node node_modules/vite/bin/vite.js preview --outDir dist-e2e --port ${PORT} --strictPort`,
        url: `http://localhost:${PORT}`,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        env: {
            VITE_API_URL: API_URL,
            VITE_TERMINAL_URL: 'http://terminal.test',
        },
    },
});
