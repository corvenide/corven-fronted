// src/features/pwa/install-prompt.ts
//
// Chrome and Edge fire `beforeinstallprompt` once, early in page load, when
// Corven can be installed as an app. We keep that event so the account menu
// can offer "Install app" whenever the user opens it. Imported from main.tsx
// so the listener is in place before the browser fires the event.

import { useSyncExternalStore } from 'react';

export interface BeforeInstallPromptEvent extends Event {
    prompt(): Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();

function notify() {
    listeners.forEach((listener) => listener());
}

if (typeof window !== 'undefined') {
    window.addEventListener('beforeinstallprompt', (event) => {
        // Stop the browser's own mini-infobar; we offer install from the menu.
        event.preventDefault();
        deferredPrompt = event as BeforeInstallPromptEvent;
        notify();
    });

    window.addEventListener('appinstalled', () => {
        deferredPrompt = null;
        notify();
    });
}

/** True when running as the installed app rather than in a browser tab. */
export function isInstalledApp(): boolean {
    if (typeof window === 'undefined') return false;

    return (
        window.matchMedia?.('(display-mode: standalone)').matches ||
        window.matchMedia?.('(display-mode: window-controls-overlay)').matches ||
        // Safari "Add to Dock" on macOS.
        (navigator as Navigator & { standalone?: boolean }).standalone === true
    );
}

/** Shows the browser's install dialog. Resolves to whether the user installed. */
export async function promptInstall(): Promise<boolean> {
    const event = deferredPrompt;
    if (!event) return false;

    // The event can only be used once.
    deferredPrompt = null;
    notify();

    await event.prompt();
    const { outcome } = await event.userChoice;
    return outcome === 'accepted';
}

function subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

/** Whether "Install app" should be offered right now. */
export function useCanInstall(): boolean {
    return useSyncExternalStore(
        subscribe,
        () => deferredPrompt !== null && !isInstalledApp(),
        () => false,
    );
}
