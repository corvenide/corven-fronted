import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// The module keeps the captured prompt, so load a fresh copy per test.
async function load() {
    vi.resetModules();
    return import('./install-prompt');
}

function fireInstallPrompt(outcome: 'accepted' | 'dismissed' = 'accepted') {
    const event = new Event('beforeinstallprompt', { cancelable: true }) as Event & {
        prompt: ReturnType<typeof vi.fn>;
        userChoice: Promise<{ outcome: string }>;
    };
    event.prompt = vi.fn().mockResolvedValue(undefined);
    event.userChoice = Promise.resolve({ outcome });
    act(() => {
        window.dispatchEvent(event);
    });
    return event;
}

function setDisplayMode(mode: 'browser' | 'standalone') {
    vi.stubGlobal('matchMedia', (query: string) => ({
        matches: query === `(display-mode: ${mode})`,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
    }));
}

describe('install prompt', () => {
    beforeEach(() => {
        setDisplayMode('browser');
    });

    it('offers install only after the browser allows it', async () => {
        const { useCanInstall } = await load();
        const { result } = renderHook(() => useCanInstall());

        expect(result.current).toBe(false);

        fireInstallPrompt();

        expect(result.current).toBe(true);
    });

    it("stops the browser's own install banner", async () => {
        await load();
        const event = fireInstallPrompt();

        expect(event.defaultPrevented).toBe(true);
    });

    it('shows the install dialog once and reports the outcome', async () => {
        const { useCanInstall, promptInstall } = await load();
        const { result } = renderHook(() => useCanInstall());
        const event = fireInstallPrompt('accepted');

        let installed = false;
        await act(async () => {
            installed = await promptInstall();
        });

        expect(installed).toBe(true);
        expect(event.prompt).toHaveBeenCalledTimes(1);
        // The browser's event can't be reused.
        expect(result.current).toBe(false);
        await expect(promptInstall()).resolves.toBe(false);
    });

    it('reports a dismissed dialog', async () => {
        const { promptInstall } = await load();
        fireInstallPrompt('dismissed');

        await expect(promptInstall()).resolves.toBe(false);
    });

    it('hides the offer once the app is installed', async () => {
        const { useCanInstall } = await load();
        const { result } = renderHook(() => useCanInstall());
        fireInstallPrompt();

        act(() => {
            window.dispatchEvent(new Event('appinstalled'));
        });

        expect(result.current).toBe(false);
    });

    it('never offers install inside the installed app', async () => {
        setDisplayMode('standalone');
        const { useCanInstall, isInstalledApp } = await load();
        const { result } = renderHook(() => useCanInstall());

        fireInstallPrompt();

        expect(isInstalledApp()).toBe(true);
        expect(result.current).toBe(false);
    });
});
