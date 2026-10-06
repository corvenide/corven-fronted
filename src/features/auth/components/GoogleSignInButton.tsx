// src/features/auth/components/GoogleSignInButton.tsx
//
// "Continue with Google", rendered by Google Identity Services (GIS).
// GIS opens Google's account picker in a popup and hands back an ID token
// (`credential`); the API verifies it and starts a Corven session.
//
// Hidden when VITE_GOOGLE_CLIENT_ID isn't set.

import { useEffect, useRef, useState } from 'react';

import { env } from '../../../config/env';

interface GoogleCredentialResponse {
    credential?: string;
}

interface GoogleIdentityServices {
    accounts: {
        id: {
            initialize(config: {
                client_id: string;
                callback: (response: GoogleCredentialResponse) => void;
                ux_mode?: 'popup' | 'redirect';
                auto_select?: boolean;
                cancel_on_tap_outside?: boolean;
                itp_support?: boolean;
            }): void;
            renderButton(
                parent: HTMLElement,
                options: {
                    type?: 'standard' | 'icon';
                    theme?: 'outline' | 'filled_blue' | 'filled_black';
                    size?: 'large' | 'medium' | 'small';
                    text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
                    shape?: 'rectangular' | 'pill' | 'circle' | 'square';
                    logo_alignment?: 'left' | 'center';
                    width?: number;
                },
            ): void;
            disableAutoSelect(): void;
        };
    };
}

declare global {
    interface Window {
        google?: GoogleIdentityServices;
    }
}

const GIS_SRC = 'https://accounts.google.com/gsi/client';

let loading: Promise<GoogleIdentityServices> | null = null;

/** Loads the GIS script once per page. */
function loadGoogleIdentity(): Promise<GoogleIdentityServices> {
    if (window.google?.accounts?.id) return Promise.resolve(window.google);
    if (loading) return loading;

    loading = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = GIS_SRC;
        script.async = true;
        script.defer = true;
        script.onload = () =>
            window.google?.accounts?.id ? resolve(window.google) : reject(new Error('Google sign-in did not load.'));
        script.onerror = () => {
            loading = null;
            script.remove();
            reject(new Error("Couldn't reach Google. Check your connection, or sign in with a wallet."));
        };
        document.head.appendChild(script);
    });

    return loading;
}

export const googleSignInEnabled = Boolean(env.googleClientId);

interface GoogleSignInButtonProps {
    /** Called with the Google ID token. */
    onCredential: (credential: string) => void;
    onError?: (message: string) => void;
}

export function GoogleSignInButton({ onCredential, onError }: GoogleSignInButtonProps) {
    const container = useRef<HTMLDivElement>(null);
    const [ready, setReady] = useState(false);

    // GIS keeps the first callback it's given, so route through a ref.
    const handlers = useRef({ onCredential, onError });
    handlers.current = { onCredential, onError };

    useEffect(() => {
        if (!googleSignInEnabled) return;
        let cancelled = false;

        loadGoogleIdentity()
            .then((google) => {
                const parent = container.current;
                if (cancelled || !parent) return;

                google.accounts.id.initialize({
                    client_id: env.googleClientId,
                    ux_mode: 'popup',
                    auto_select: false,
                    itp_support: true,
                    callback: (response) => {
                        if (response.credential) handlers.current.onCredential(response.credential);
                        else handlers.current.onError?.('Google sign-in was cancelled.');
                    },
                });

                parent.replaceChildren();
                google.accounts.id.renderButton(parent, {
                    type: 'standard',
                    theme: 'filled_black',
                    size: 'large',
                    text: 'continue_with',
                    shape: 'rectangular',
                    logo_alignment: 'center',
                    // GIS takes a pixel width (max 400).
                    width: Math.min(400, Math.max(200, Math.floor(parent.getBoundingClientRect().width))),
                });
                setReady(true);
            })
            .catch((error: Error) => !cancelled && handlers.current.onError?.(error.message));

        return () => {
            cancelled = true;
        };
    }, []);

    if (!googleSignInEnabled) return null;

    return (
        <div className="relative h-11 w-full">
            {!ready && (
                <div className="absolute inset-0 animate-pulse rounded-md border border-[var(--line-strong)] bg-white/[0.03]" />
            )}
            <div ref={container} className="flex h-11 w-full justify-center [color-scheme:light]" />
        </div>
    );
}
