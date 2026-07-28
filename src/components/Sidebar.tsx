import React from 'react';
import {
    FolderOpen,
    GitBranch,
    Home,
    LayoutDashboard,
    Network,
    Play,
    Search,
    Settings,
    User,
} from 'lucide-react';

import {
    useLocation,
    useNavigate,
    useParams,
    useSearchParams,
} from 'react-router-dom';

type IdePanel =
    | 'files'
    | 'search'
    | 'git'
    | 'debug';

interface NavigationButtonProps {
    label: string;
    title: string;
    active: boolean;
    icon: React.ReactNode;
    onClick: () => void;
}

function NavigationButton({
    label,
    title,
    active,
    icon,
    onClick,
}: NavigationButtonProps) {
    return (
        <button
            type="button"
            onClick={onClick}
            title={title}
            className={`relative w-11 h-11 flex flex-col items-center justify-center rounded-lg transition-all ${active
                ? 'text-[#58a6ff] bg-[#30363d]'
                : 'text-gray-400 hover:text-white hover:bg-gray-800/40'
                }`}
        >
            {active && (
                <span className="absolute left-0 top-2 bottom-2 w-0.5 rounded-r bg-[#58a6ff]" />
            )}

            {icon}

            <span className="text-[8px] font-mono mt-0.5 uppercase">
                {label}
            </span>
        </button>
    );
}

export default function Sidebar() {
    const navigate = useNavigate();
    const location = useLocation();
    const { workspaceId } =
        useParams<{
            workspaceId: string;
        }>();

    const [searchParams, setSearchParams] =
        useSearchParams();

    const currentIdePanel =
        (searchParams.get('panel') as IdePanel | null) ??
        'files';

    const isRouteActive = (path: string) =>
        location.pathname === path;

    const handleIdePanel = (
        panel: IdePanel,
    ) => {
        if (!workspaceId) {
            navigate('/dashboard');
            return;
        }

        navigate(
            `/ide/${workspaceId}?panel=${panel}`,
        );
    };

    return (
        <aside className="fixed left-0 top-14 z-40 flex h-[calc(100vh-3.5rem)] w-16 select-none flex-col items-center border-r border-[#30363d] bg-[#161b22] py-4">
            <div className="flex w-full flex-1 flex-col items-center gap-3">
                <NavigationButton
                    label="Home"
                    title="Home"
                    active={isRouteActive('/')}
                    icon={<Home className="h-5 w-5" />}
                    onClick={() => navigate('/')}
                />

                <NavigationButton
                    label="Dash"
                    title="Dashboard"
                    active={isRouteActive('/dashboard')}
                    icon={
                        <LayoutDashboard className="h-5 w-5" />
                    }
                    onClick={() => navigate('/dashboard')}
                />

                <div className="my-1 h-px w-8 bg-[#30363d]" />

                {/* <NavigationButton
                    label="Files"
                    title="File Explorer"
                    active={
                        isRouteActive('/ide') &&
                        currentIdePanel === 'files'
                    }
                    icon={
                        <FolderOpen className="h-5 w-5" />
                    }
                    onClick={() => handleIdePanel('files')}
                />

                <NavigationButton
                    label="Find"
                    title="Search in Files"
                    active={
                        isRouteActive('/ide') &&
                        currentIdePanel === 'search'
                    }
                    icon={<Search className="h-5 w-5" />}
                    onClick={() => handleIdePanel('search')}
                />

                <NavigationButton
                    label="Git"
                    title="Source Control"
                    active={
                        isRouteActive('/ide') &&
                        currentIdePanel === 'git'
                    }
                    icon={
                        <GitBranch className="h-5 w-5" />
                    }
                    onClick={() => handleIdePanel('git')}
                />

                <NavigationButton
                    label="Debug"
                    title="Run and Debug"
                    active={
                        isRouteActive('/ide') &&
                        currentIdePanel === 'debug'
                    }
                    icon={<Play className="h-5 w-5" />}
                    onClick={() => handleIdePanel('debug')}
                /> */}

                {/* <div className="my-1 h-px w-8 bg-[#30363d]" /> */}

                <NavigationButton
                    label="Nodes"
                    title="Node Manager"
                    active={isRouteActive('/nodes')}
                    icon={<Network className="h-5 w-5" />}
                    onClick={() => navigate('/nodes')}
                />
            </div>

            <div className="flex w-full flex-col items-center gap-2 pb-4">
                <button
                    type="button"
                    title="Profile"
                    onClick={() => navigate('/profile')}
                    className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-800/40 hover:text-[#58a6ff]"
                >
                    <User className="h-5 w-5" />
                </button>

                <button
                    type="button"
                    title="Settings"
                    onClick={() => navigate('/settings')}
                    className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-800/40 hover:text-[#58a6ff]"
                >
                    <Settings className="h-5 w-5" />
                </button>
            </div>
        </aside>
    );
}