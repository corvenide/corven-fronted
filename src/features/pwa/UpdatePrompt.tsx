// src/features/pwa/UpdatePrompt.tsx
//
// Registers the service worker and, when a new version of Corven has been
// deployed, asks before reloading, so nobody loses unsaved editor changes.

import { RefreshCw, X } from 'lucide-react';
import { useRegisterSW } from 'virtual:pwa-register/react';

// Look for a new deploy this often while the app stays open.
const UPDATE_CHECK_MS = 60 * 60 * 1000;

export default function UpdatePrompt() {
    const {
        needRefresh: [needRefresh, setNeedRefresh],
        updateServiceWorker,
    } = useRegisterSW({
        onRegisteredSW(_url, registration) {
            if (!registration) return;
            setInterval(() => {
                if (navigator.onLine) void registration.update();
            }, UPDATE_CHECK_MS);
        },
    });

    if (!needRefresh) return null;

    return (
        <div
            role="status"
            aria-live="polite"
            className="fixed bottom-4 right-4 z-[100] flex max-w-sm items-center gap-3 rounded-lg border border-[#30363d] bg-[#161b22] px-4 py-3 text-[13px] text-gray-200 shadow-2xl shadow-black/40"
        >
            <span className="min-w-0 flex-1">A new version of Corven is available.</span>
            <button
                type="button"
                onClick={() => void updateServiceWorker(true)}
                className="inline-flex items-center gap-1.5 rounded-md bg-[#238636] px-2.5 py-1.5 text-[12.5px] font-medium text-white hover:bg-[#2ea043]"
            >
                <RefreshCw className="h-3.5 w-3.5" />
                Reload
            </button>
            <button
                type="button"
                aria-label="Later"
                onClick={() => setNeedRefresh(false)}
                className="rounded-md p-1 text-gray-500 hover:bg-[#21262d] hover:text-gray-300"
            >
                <X className="h-4 w-4" />
            </button>
        </div>
    );
}
