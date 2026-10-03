// src/components/layout/AppLayout.tsx
import { useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { ccc } from '@ckb-ccc/connector-react';

import { useAuth } from '../../features/auth/hooks/useAuth';
import { UserMenu } from './UserMenu';

const DOCS_URL = 'https://docs.nervos.org/';

function shortenAddress(address?: string | null): string {
    if (!address) return 'ckt1qrej...9f6ccr';
    if (address.length <= 16) return address;
    return `${address.slice(0, 8)}...${address.slice(-6)}`;
}

export default function AppLayout() {
    const location = useLocation();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { user, logout } = useAuth();
    const { open, wallet } = ccc.useCcc();

    const inIde = location.pathname.startsWith('/ide');
    const currentTab = searchParams.get('tab');

    const isWorkspacesActive =
        (location.pathname === '/dashboard' && (!currentTab || currentTab === 'workspaces')) ||
        location.pathname.startsWith('/ide');
    const isBrowserActive = location.pathname.startsWith('/browser');
    const isCommunityActive =
        location.pathname === '/community' ||
        (location.pathname === '/dashboard' && currentTab === 'community');
    const isDonateActive =
        location.pathname === '/donate' ||
        (location.pathname === '/dashboard' && currentTab === 'donate');

    const signOut = async () => {
        await logout();
        navigate('/auth', { replace: true });
    };

    return (
        <div
            className={`bg-surface font-body-md text-on-surface antialiased flex flex-col ${
                inIde ? 'h-screen overflow-hidden' : 'min-h-screen'
            }`}
        >
            {/* Top Fixed Header (h-14) */}
            <header className="fixed top-0 left-0 right-0 h-14 z-50 bg-surface-container-lowest border-b border-outline-variant/30 flex items-center justify-between px-space-md">
                <div className="flex items-center gap-space-lg">
                    {/* Brand Logo */}
                    <Link to="/dashboard" className="flex items-center gap-space-sm pl-space-xs group">
                        <div className="w-7 h-7 rounded-lg bg-surface-container flex items-center justify-center border border-outline-variant/50 text-primary transition-transform group-hover:scale-105">
                            <span className="material-symbols-outlined text-[18px]">deployed_code</span>
                        </div>
                        <span className="font-headline-sm text-headline-sm font-semibold tracking-tight text-on-surface">Corven</span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-code-sm bg-surface-container text-primary border border-outline-variant/40 uppercase tracking-wider">
                            IDE
                        </span>
                    </Link>

                    {/* Navigation Tabs */}
                    <nav className="hidden md:flex items-center gap-space-xs">
                        <Link
                            to="/dashboard"
                            className={`px-space-md py-1.5 transition-colors font-body-sm text-body-sm flex items-center gap-1.5 ${
                                isWorkspacesActive
                                    ? 'bg-surface-container text-on-surface font-medium rounded-lg border border-outline-variant/40'
                                    : 'rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container/60'
                            }`}
                        >
                            Workspaces
                        </Link>

                        <Link
                            to="/browser"
                            className={`px-space-md py-1.5 transition-colors font-body-sm text-body-sm flex items-center gap-1.5 ${
                                isBrowserActive
                                    ? 'bg-surface-container text-on-surface font-medium rounded-lg border border-outline-variant/40'
                                    : 'rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container/60'
                            }`}
                        >
                            <span>Browser</span>
                            <span className="px-1 py-0.2 rounded text-[10px] font-label-sm bg-primary/10 text-primary border border-primary/20">
                                APP
                            </span>
                        </Link>

                        <Link
                            to="/dashboard?tab=community"
                            className={`px-space-md py-1.5 transition-colors font-body-sm text-body-sm flex items-center gap-1.5 ${
                                isCommunityActive
                                    ? 'bg-surface-container text-on-surface font-medium rounded-lg border border-outline-variant/40'
                                    : 'rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container/60'
                            }`}
                        >
                            <span>Community</span>
                            <span className="px-1 py-0.2 rounded text-[10px] font-label-sm bg-surface-container-high text-secondary border border-outline-variant/30">
                                NEW
                            </span>
                        </Link>

                        <Link
                            to="/dashboard?tab=donate"
                            className={`px-space-md py-1.5 transition-colors font-body-sm text-body-sm flex items-center gap-1.5 ${
                                isDonateActive
                                    ? 'bg-surface-container text-on-surface font-medium rounded-lg border border-outline-variant/40'
                                    : 'rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container/60'
                            }`}
                        >
                            <span>Donate</span>
                            <span className="px-1 py-0.2 rounded text-[10px] font-code-sm bg-primary/10 text-primary border border-primary/20">
                                CKB
                            </span>
                        </Link>
                    </nav>
                </div>

                {/* Right controls */}
                <div className="flex items-center gap-space-md">
                    <a
                        className="hidden lg:block px-space-sm py-1 font-body-sm text-body-sm text-on-surface-variant hover:text-on-surface transition-colors"
                        href={DOCS_URL}
                        target="_blank"
                        rel="noreferrer noopener"
                    >
                        CKB Docs
                    </a>

                    {/* Devnet status badge */}
                    <div className="hidden sm:flex items-center gap-space-xs px-2.5 py-1 rounded-full bg-surface-container-low border border-outline-variant/30 font-code-sm text-code-sm text-on-surface-variant">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
                        <span className="text-on-surface">Devnet Connected:</span>
                        <span className="text-primary font-medium">24 ms</span>
                    </div>

                    {/* Connected wallet button */}
                    <button
                        type="button"
                        onClick={() => open()}
                        className="flex items-center gap-space-xs px-2 py-1 rounded-full bg-surface-container hover:bg-surface-container-high border border-outline-variant/40 font-code-sm text-code-sm text-on-surface transition-colors"
                        title="Wallet Settings"
                    >
                        <span className="material-symbols-outlined text-[14px] text-secondary">account_balance_wallet</span>
                        <span className="text-on-surface-variant font-code-sm text-code-sm">
                            {shortenAddress(user?.walletAddress)}
                        </span>
                        <div className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center ml-0.5 border border-primary/40">
                            <span className="material-symbols-outlined text-[12px]">token</span>
                        </div>
                    </button>

                    {/* User profile avatar / menu */}
                    {user ? (
                        <UserMenu user={user} onSignOut={() => void signOut()} />
                    ) : (
                        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                            <span className="material-symbols-outlined text-on-primary text-[18px]">person</span>
                        </div>
                    )}
                </div>
            </header>

            {/* Left Sidebar Fixed Rail (w-14) */}
            <aside className="fixed left-0 top-14 bottom-0 w-14 z-40 bg-surface-container-lowest border-r border-outline-variant/30 flex flex-col items-center justify-between py-space-sm">
                <nav className="w-full flex flex-col items-center gap-space-xs px-1.5">
                    <NavLink
                        to="/dashboard"
                        title="Workspaces"
                        className={({ isActive }) =>
                            `w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                                isActive && !currentTab
                                    ? 'bg-surface-container text-primary border border-outline-variant/50'
                                    : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container/60'
                            }`
                        }
                    >
                        <span className="material-symbols-outlined text-[20px]">code_blocks</span>
                    </NavLink>

                    <NavLink
                        to="/browser"
                        title="Browser & Frontend Apps"
                        className={({ isActive }) =>
                            `w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                                isActive
                                    ? 'bg-surface-container text-primary border border-outline-variant/50'
                                    : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container/60'
                            }`
                        }
                    >
                        <span className="material-symbols-outlined text-[20px]">open_in_browser</span>
                    </NavLink>

                    <Link
                        to="/dashboard"
                        title="Cell Dependency Graph"
                        className="w-10 h-10 rounded-lg flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container/60 transition-colors"
                    >
                        <span className="material-symbols-outlined text-[20px]">account_tree</span>
                    </Link>

                    <Link
                        to="/nodes"
                        title="Execution & Terminal Logs"
                        className="w-10 h-10 rounded-lg flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container/60 transition-colors"
                    >
                        <span className="material-symbols-outlined text-[20px]">terminal</span>
                    </Link>

                    <Link
                        to="/dashboard"
                        title="Contract Explorer"
                        className="w-10 h-10 rounded-lg flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container/60 transition-colors"
                    >
                        <span className="material-symbols-outlined text-[20px]">data_object</span>
                    </Link>
                </nav>

                <div className="w-full flex flex-col items-center gap-space-xs px-1.5">
                    <NavLink
                        to="/nodes"
                        title="Node & Network"
                        className={({ isActive }) =>
                            `w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                                isActive
                                    ? 'bg-surface-container text-primary border border-outline-variant/50'
                                    : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container/60'
                            }`
                        }
                    >
                        <span className="material-symbols-outlined text-[20px]">dns</span>
                    </NavLink>

                    <NavLink
                        to="/settings"
                        title="IDE Settings"
                        className={({ isActive }) =>
                            `w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                                isActive
                                    ? 'bg-surface-container text-primary border border-outline-variant/50'
                                    : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container/60'
                            }`
                        }
                    >
                        <span className="material-symbols-outlined text-[20px]">settings</span>
                    </NavLink>
                </div>
            </aside>

            {/* Main content body */}
            <div className={`pl-14 flex-1 flex flex-col min-h-0 ${inIde ? 'h-full overflow-hidden' : ''}`}>
                <main
                    className={`w-full ${
                        inIde
                            ? 'pt-14 h-full flex-1 flex flex-col min-h-0 overflow-hidden bg-surface'
                            : 'pt-14 bg-surface min-h-screen'
                    }`}
                >
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
