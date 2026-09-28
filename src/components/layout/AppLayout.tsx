// src/components/layout/AppLayout.tsx
//
// Shell for signed-in pages: a top bar (brand, where you are, account) and a
// slim navigation rail. The IDE gets the full remaining height.

import type { ReactNode } from 'react';
import { Link, NavLink, Outlet, useLocation, useMatch, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { BookOpen, ChevronRight, Globe, LayoutGrid, Network, Settings, Wallet } from 'lucide-react';
import { ccc } from '@ckb-ccc/connector-react';

import { useAuth } from '../../features/auth/hooks/useAuth';
import { workspaceApi } from '../../features/workspace/api/workspace.api';
import { workspaceKeys } from '../../features/workspace/queries/workspace.keys';
import { UserMenu } from './UserMenu';

function NetworkSelector() {
    const { client, setClient } = ccc.useCcc();

    const clientOptions = [
        { name: 'CKB Mainnet', client: new ccc.ClientPublicMainnet() },
        { name: 'CKB Testnet', client: new ccc.ClientPublicTestnet() },
    ];

    const currentClientName =
        clientOptions.find((opt) => opt.client.addressPrefix === client?.addressPrefix)?.name ??
        (client?.addressPrefix === 'ckb' ? 'CKB Mainnet' : 'CKB Testnet');

    return (
        <div className="relative flex items-center">
            <label className="sr-only">Switch CKB Network</label>
            <div className="flex h-8 items-center gap-1.5 rounded-md border border-[#30363d] bg-[#161b22] px-2.5 text-[12px] font-medium text-gray-200 transition-colors hover:border-gray-500">
                <Globe className="h-3.5 w-3.5 text-[#3cc68a]" />
                <select
                    value={currentClientName}
                    onChange={(e) => {
                        const selected = clientOptions.find((opt) => opt.name === e.target.value);
                        if (selected) {
                            setClient(selected.client);
                        }
                    }}
                    className="cursor-pointer bg-transparent text-gray-200 outline-none"
                >
                    {clientOptions.map((opt) => (
                        <option key={opt.name} value={opt.name} className="bg-[#161b22] text-gray-200">
                            {opt.name}
                        </option>
                    ))}
                </select>
            </div>
        </div>
    );
}

function WalletButton() {
    const { open, wallet } = ccc.useCcc();
    const signer = ccc.useSigner();

    return (
        <button
            type="button"
            onClick={() => open()}
            className="flex h-8 items-center gap-1.5 rounded-md border border-[#30363d] bg-[#161b22] px-2.5 text-[12px] font-medium text-gray-200 transition-colors hover:border-gray-500 hover:bg-[#21262d]"
        >
            <Wallet className="h-3.5 w-3.5 text-[#3cc68a]" />
            <span>{wallet ? wallet.name : 'Connect Wallet'}</span>
        </button>
    );
}

const LOGO_URL =
    'https://res.cloudinary.com/dswyz4vpp/image/upload/v1785082590/ChatGPT_Image_Jul_26__2026__01_05_52_PM-removebg-preview_wua44l.png';

const DOCS_URL = 'https://docs.nervos.org/';

const STATUS_DOT: Record<string, string> = {
    RUNNING: 'bg-emerald-400',
    PROVISIONING: 'bg-[#58a6ff] animate-pulse',
    FAILED: 'bg-rose-400',
    IDLE: 'bg-amber-400',
};

interface NavItem {
    to: string;
    label: string;
    icon: ReactNode;
    /** Also active on these path prefixes. */
    match?: string[];
}

const NAV: NavItem[] = [
    { to: '/dashboard', label: 'Workspaces', icon: <LayoutGrid className="h-[18px] w-[18px]" />, match: ['/ide'] },
    { to: '/nodes', label: 'Devnets', icon: <Network className="h-[18px] w-[18px]" /> },
];

function RailLink({ item }: { item: NavItem }) {
    const location = useLocation();
    const active =
        location.pathname.startsWith(item.to) || (item.match ?? []).some((prefix) => location.pathname.startsWith(prefix));

    return (
        <NavLink
            to={item.to}
            aria-label={item.label}
            aria-current={active ? 'page' : undefined}
            className={`group relative flex h-10 w-10 items-center justify-center rounded-lg transition-colors ${active ? 'bg-[#21262d] text-white' : 'text-gray-500 hover:bg-[#161b22] hover:text-gray-200'
                }`}
        >
            {active && <span className="absolute -left-2 top-2 bottom-2 w-0.5 rounded-r bg-[#3cc68a]" />}
            {item.icon}
            <span className="pointer-events-none absolute left-12 z-50 whitespace-nowrap rounded-md border border-[#30363d] bg-[#161b22] px-2 py-1 text-[12px] text-gray-200 opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                {item.label}
            </span>
        </NavLink>
    );
}

/** "Workspaces / my-contract ●" in the IDE; the page name elsewhere. */
function Breadcrumb() {
    const location = useLocation();
    // The layout sits above the IDE route, so read the id from the URL.
    const workspaceId = useMatch('/ide/:workspaceId')?.params.workspaceId;

    const workspace = useQuery({
        queryKey: workspaceKeys.detail(workspaceId ?? 'none'),
        queryFn: () => workspaceApi.get(workspaceId!),
        enabled: Boolean(workspaceId),
    });

    const page = location.pathname.startsWith('/nodes')
        ? 'Devnets'
        : location.pathname.startsWith('/settings')
            ? 'Settings'
            : 'Workspaces';

    if (!workspaceId) {
        return <span className="truncate text-[13px] font-medium text-gray-200">{page}</span>;
    }

    return (
        <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-[13px]">
            <Link to="/dashboard" className="shrink-0 text-gray-400 hover:text-gray-200">
                Workspaces
            </Link>
            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-gray-600" />
            <span className="flex min-w-0 items-center gap-2 font-medium text-gray-100">
                <span className="truncate">{workspace.data?.name ?? '…'}</span>
                {workspace.data && (
                    <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${STATUS_DOT[workspace.data.status] ?? 'bg-gray-500'}`} />
                )}
            </span>
        </nav>
    );
}

export default function AppLayout() {
    const location = useLocation();
    const navigate = useNavigate();
    const { user, logout } = useAuth();

    const inIde = location.pathname.startsWith('/ide');

    const signOut = async () => {
        await logout();
        navigate('/auth', { replace: true });
    };

    return (
        <div className="flex h-screen flex-col bg-[#0d1117] font-sans text-gray-200 antialiased">
            {/* ---------------------------------------------------------- Top bar */}
            <header className="flex h-12 shrink-0 items-center gap-3 border-b border-[#30363d] bg-[#010409] pl-3 pr-3 sm:pr-4">
                <Link to="/dashboard" className="flex h-8 shrink-0 items-center gap-2 rounded-md pr-1" aria-label="Corven workspaces">
                    <img src={LOGO_URL} alt="" className="h-6 w-6 object-contain" />
                    <span className="hidden text-[14.5px] font-semibold tracking-[-0.02em] text-white sm:inline">Corven</span>
                </Link>

                <span className="h-5 w-px shrink-0 bg-[#30363d]" aria-hidden />

                <div className="min-w-0 flex-1">
                    <Breadcrumb />
                </div>

                <a
                    href={DOCS_URL}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="hidden h-8 items-center gap-1.5 rounded-md px-2 text-[12.5px] text-gray-400 transition-colors hover:bg-[#21262d] hover:text-gray-200 md:flex"
                >
                    <BookOpen className="h-3.5 w-3.5" />
                    CKB docs
                </a>

                <NetworkSelector />

                {/* <WalletButton /> */}

                {user && <UserMenu user={user} onSignOut={() => void signOut()} />}
            </header>

            <div className="flex min-h-0 flex-1">
                {/* ------------------------------------------------------ Rail */}
                <nav
                    aria-label="Main"
                    className="hidden w-14 shrink-0 flex-col items-center gap-1.5 border-r border-[#30363d] bg-[#010409] py-3 sm:flex"
                >
                    {NAV.map((item) => (
                        <RailLink key={item.to} item={item} />
                    ))}
                    <div className="flex-1" />
                    <RailLink item={{ to: '/settings', label: 'Settings', icon: <Settings className="h-[18px] w-[18px]" /> }} />
                </nav>

                {/* ------------------------------------------------------ Page */}
                <main className={`min-w-0 flex-1 ${inIde ? 'overflow-hidden' : 'overflow-y-auto'}`}>
                    <Outlet />
                </main>
            </div>

            {/* ---------------------------------------------------------- Mobile nav */}
            <nav aria-label="Main" className="flex h-12 shrink-0 items-center justify-around border-t border-[#30363d] bg-[#010409] sm:hidden">
                {[...NAV, { to: '/settings', label: 'Settings', icon: <Settings className="h-[18px] w-[18px]" /> }].map((item) => (
                    <NavLink
                        key={item.to}
                        to={item.to}
                        className={({ isActive }) =>
                            `flex flex-col items-center gap-0.5 px-3 text-[10.5px] ${isActive ? 'text-white' : 'text-gray-500'}`
                        }
                    >
                        {item.icon}
                        {item.label}
                    </NavLink>
                ))}
            </nav>
        </div>
    );
}
