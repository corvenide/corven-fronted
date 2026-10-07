// src/components/layout/UserMenu.tsx
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Copy, Download, LogOut, Settings, Wallet } from 'lucide-react';

import type { AuthUser } from '../../features/auth/types/auth.types';
import { promptInstall, useCanInstall } from '../../features/pwa/install-prompt';

export function shortAddress(address: string): string {
    return address.length > 18 ? `${address.slice(0, 8)}…${address.slice(-6)}` : address;
}

/** Name to show: generated wallet names ("CKB User …") read worse than the address. */
export function displayName(user: AuthUser): string {
    if (user.walletAddress && (!user.name || user.name.startsWith('CKB User'))) {
        return shortAddress(user.walletAddress);
    }
    return user.name;
}

/** A stable colour per account, for the avatar. */
function avatarHue(seed: string): number {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
    return Math.abs(hash) % 360;
}

export function Avatar({ user, size = 28 }: { user: AuthUser; size?: number }) {
    const seed = user.walletAddress ?? user.id;
    const hue = avatarHue(seed);
    const label = user.walletAddress && (!user.name || user.name.startsWith('CKB User'))
        ? user.walletAddress.slice(-2).toUpperCase()
        : user.name.slice(0, 1).toUpperCase();

    return (
        <span
            aria-hidden
            className="inline-flex shrink-0 items-center justify-center rounded-full font-mono text-[11px] font-semibold text-white"
            style={{
                width: size,
                height: size,
                background: `linear-gradient(135deg, hsl(${hue} 55% 42%), hsl(${(hue + 40) % 360} 60% 30%))`,
            }}
        >
            {label}
        </span>
    );
}

export function UserMenu({ user, onSignOut }: { user: AuthUser; onSignOut: () => void }) {
    const navigate = useNavigate();
    const [open, setOpen] = useState(false);
    const [copied, setCopied] = useState(false);
    const canInstall = useCanInstall();
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;

        const onPointer = (event: PointerEvent) => {
            if (!ref.current?.contains(event.target as Node)) setOpen(false);
        };
        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setOpen(false);
        };

        document.addEventListener('pointerdown', onPointer);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('pointerdown', onPointer);
            document.removeEventListener('keydown', onKey);
        };
    }, [open]);

    const copyAddress = async () => {
        if (!user.walletAddress) return;
        try {
            await navigator.clipboard.writeText(user.walletAddress);
            setCopied(true);
            setTimeout(() => setCopied(false), 1400);
        } catch {
            /* clipboard blocked */
        }
    };

    return (
        <div ref={ref} className="relative">
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-haspopup="menu"
                aria-expanded={open}
                className="flex h-8 items-center gap-2 rounded-md pl-1 pr-2 text-[13px] text-gray-300 transition-colors hover:bg-[#21262d] hover:text-white"
            >
                <Avatar user={user} size={24} />
                <span className="hidden max-w-[160px] truncate font-mono text-[12px] sm:inline">{displayName(user)}</span>
            </button>

            {open && (
                <div role="menu" className="absolute right-0 top-10 z-50 w-64 overflow-hidden rounded-lg border border-[#30363d] bg-[#161b22] shadow-2xl shadow-black/40">
                    <div className="flex items-center gap-3 border-b border-[#30363d] px-3.5 py-3">
                        <Avatar user={user} size={32} />
                        <div className="min-w-0">
                            <div className="truncate text-[13px] font-medium text-gray-100">{displayName(user)}</div>
                            <div className="text-[11.5px] text-gray-500">
                                {user.isGuest
                                    ? 'Guest · temporary workspaces'
                                    : user.authProvider === 'CKB_WALLET'
                                        ? 'CKB wallet'
                                        : user.authProvider === 'GOOGLE'
                                            ? 'Google account'
                                            : 'Email account'}
                            </div>
                        </div>
                    </div>

                    <div className="py-1">
                        {user.isGuest && (
                            <button
                                type="button"
                                role="menuitem"
                                onClick={() => {
                                    setOpen(false);
                                    navigate('/auth', { state: { from: { pathname: '/dashboard' } } });
                                }}
                                className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-[13px] text-emerald-300 hover:bg-[#21262d]"
                            >
                                <Wallet className="h-4 w-4" />
                                Connect wallet or sign in
                            </button>
                        )}
                        {user.walletAddress && (
                            <button type="button" role="menuitem" onClick={() => void copyAddress()} className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-[13px] text-gray-300 hover:bg-[#21262d] hover:text-white">
                                {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4 text-gray-500" />}
                                {copied ? 'Address copied' : 'Copy wallet address'}
                            </button>
                        )}
                        <button
                            type="button"
                            role="menuitem"
                            onClick={() => {
                                setOpen(false);
                                navigate('/settings');
                            }}
                            className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-[13px] text-gray-300 hover:bg-[#21262d] hover:text-white"
                        >
                            <Settings className="h-4 w-4 text-gray-500" />
                            Settings
                        </button>
                        {canInstall && (
                            <button
                                type="button"
                                role="menuitem"
                                onClick={() => {
                                    setOpen(false);
                                    void promptInstall();
                                }}
                                className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-[13px] text-gray-300 hover:bg-[#21262d] hover:text-white"
                            >
                                <Download className="h-4 w-4 text-gray-500" />
                                Install Corven app
                            </button>
                        )}
                    </div>

                    <div className="border-t border-[#30363d] py-1">
                        <button
                            type="button"
                            role="menuitem"
                            onClick={() => {
                                setOpen(false);
                                onSignOut();
                            }}
                            className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-[13px] text-gray-300 hover:bg-[#21262d] hover:text-white"
                        >
                            <LogOut className="h-4 w-4 text-gray-500" />
                            {user.isGuest ? 'End guest session' : 'Sign out'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
