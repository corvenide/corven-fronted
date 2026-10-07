// src/features/connect/layout/ConnectLayout.tsx
//
// Corven Connect has its own home at /connect, separate from the IDE: its
// own header and navigation (Apps, Docs), sharing only the Corven account.

import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { BookOpen, Code2, ExternalLink, LayoutGrid, LogOut, Menu, X } from 'lucide-react';

import { useAuth } from '../../auth/hooks/useAuth';
import { Avatar, displayName } from '../../../components/layout/UserMenu';
import { KeepWorkspacesDialog } from '../../workspace/components/KeepWorkspacesDialog';

const NAV = [
    { to: '/connect', label: 'Apps', icon: LayoutGrid, end: (path: string) => path === '/connect' || path.startsWith('/connect/apps') },
    { to: '/connect/docs', label: 'Docs', icon: BookOpen, end: (path: string) => path.startsWith('/connect/docs') },
];

export function ConnectMark({ size = 28 }: { size?: number }) {
    return (
        <span
            className="flex items-center justify-center rounded-lg border border-primary/30 bg-primary/10 text-primary"
            style={{ width: size, height: size }}
            aria-hidden
        >
            <svg width={size * 0.55} height={size * 0.55} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 7H7a5 5 0 0 0 0 10h2" />
                <path d="M15 7h2a5 5 0 0 1 0 10h-2" />
                <path d="M8 12h8" />
            </svg>
        </span>
    );
}

function AccountMenu() {
    const { user, isGuest, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        const onPointer = (e: PointerEvent) => {
            if (!ref.current?.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('pointerdown', onPointer);
        return () => document.removeEventListener('pointerdown', onPointer);
    }, [open]);

    if (!user || isGuest) {
        return (
            <button
                type="button"
                onClick={() => navigate('/auth', { state: { from: location, intent: 'connect' } })}
                className="rounded-lg bg-primary px-3 py-1.5 text-[13px] font-semibold text-on-primary transition-colors hover:bg-primary-fixed"
            >
                Sign in
            </button>
        );
    }

    return (
        <div ref={ref} className="relative">
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-haspopup="menu"
                aria-expanded={open}
                className="flex h-8 items-center gap-2 rounded-lg pl-1 pr-2 text-[13px] text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface"
            >
                <Avatar user={user} size={24} />
                <span className="hidden max-w-[150px] truncate font-mono text-[12px] sm:inline">{displayName(user)}</span>
            </button>
            {open && (
                <div role="menu" className="absolute right-0 top-10 z-50 w-56 overflow-hidden rounded-xl border border-outline-variant/40 bg-surface-container-low shadow-2xl">
                    <div className="border-b border-outline-variant/30 px-3.5 py-2.5">
                        <div className="truncate text-[13px] font-medium text-on-surface">{displayName(user)}</div>
                        <div className="text-[11.5px] text-on-surface-variant">Corven account</div>
                    </div>
                    <Link
                        to="/dashboard"
                        role="menuitem"
                        className="flex items-center gap-2.5 px-3.5 py-2 text-[13px] text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
                    >
                        <Code2 className="h-4 w-4" /> Corven IDE
                    </Link>
                    <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                            setOpen(false);
                            void logout().then(() => navigate('/connect', { replace: true }));
                        }}
                        className="flex w-full items-center gap-2.5 border-t border-outline-variant/30 px-3.5 py-2 text-left text-[13px] text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
                    >
                        <LogOut className="h-4 w-4" /> Sign out
                    </button>
                </div>
            )}
        </div>
    );
}

export default function ConnectLayout() {
    const location = useLocation();
    const [mobileOpen, setMobileOpen] = useState(false);

    useEffect(() => setMobileOpen(false), [location.pathname]);

    return (
        <div className="min-h-screen bg-surface font-body-md text-on-surface antialiased">
            <header className="sticky top-0 z-50 border-b border-outline-variant/30 bg-surface-container-lowest/90 backdrop-blur">
                <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
                    <div className="flex items-center gap-6">
                        <Link to="/connect" className="flex items-center gap-2.5">
                            <ConnectMark />
                            <span className="text-[15px] font-semibold tracking-tight">
                                Corven <span className="text-primary">Connect</span>
                            </span>
                        </Link>
                        <nav className="hidden items-center gap-1 md:flex" aria-label="Connect">
                            {NAV.map((item) => {
                                const active = item.end(location.pathname);
                                return (
                                    <NavLink
                                        key={item.to}
                                        to={item.to}
                                        className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13.5px] transition-colors ${
                                            active
                                                ? 'bg-surface-container text-on-surface'
                                                : 'text-on-surface-variant hover:bg-surface-container/60 hover:text-on-surface'
                                        }`}
                                    >
                                        <item.icon className="h-4 w-4" />
                                        {item.label}
                                    </NavLink>
                                );
                            })}
                        </nav>
                    </div>

                    <div className="flex items-center gap-2">
                        <Link
                            to="/dashboard"
                            className="hidden items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[13px] text-on-surface-variant transition-colors hover:text-on-surface sm:flex"
                        >
                            Corven IDE <ExternalLink className="h-3.5 w-3.5" />
                        </Link>
                        <AccountMenu />
                        <button
                            type="button"
                            className="flex h-9 w-9 items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container md:hidden"
                            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
                            onClick={() => setMobileOpen((v) => !v)}
                        >
                            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                        </button>
                    </div>
                </div>
                {mobileOpen && (
                    <nav className="border-t border-outline-variant/30 px-4 py-2 md:hidden" aria-label="Connect mobile">
                        {NAV.map((item) => (
                            <Link key={item.to} to={item.to} className="flex items-center gap-2 rounded-lg px-2 py-2.5 text-[14px] text-on-surface-variant hover:text-on-surface">
                                <item.icon className="h-4 w-4" /> {item.label}
                            </Link>
                        ))}
                        <Link to="/dashboard" className="flex items-center gap-2 rounded-lg px-2 py-2.5 text-[14px] text-on-surface-variant hover:text-on-surface">
                            <Code2 className="h-4 w-4" /> Corven IDE
                        </Link>
                    </nav>
                )}
            </header>

            <main>
                <Outlet />
            </main>
            <KeepWorkspacesDialog />
        </div>
    );
}
