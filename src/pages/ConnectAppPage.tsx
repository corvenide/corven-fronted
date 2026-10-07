// src/pages/ConnectAppPage.tsx
//
// One Corven Connect app: Overview (usage + SDK snippet), Users, Settings, Team.

import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft } from 'lucide-react';

import { connectApi, connectKeys } from '../features/connect/connect.api';
import { OverviewTab } from '../features/connect/components/OverviewTab';
import { SettingsTab } from '../features/connect/components/SettingsTab';
import { TeamTab } from '../features/connect/components/TeamTab';
import { AppLogo, CopyText, ErrorNote, Loading, RoleBadge } from '../features/connect/components/ui';
import { UsersTab } from '../features/connect/components/UsersTab';

const TABS = [
    { key: 'overview', label: 'Overview' },
    { key: 'users', label: 'Users' },
    { key: 'settings', label: 'Settings' },
    { key: 'team', label: 'Team' },
] as const;
type Tab = (typeof TABS)[number]['key'];

export default function ConnectAppPage() {
    const { appId = '' } = useParams();
    const [params, setParams] = useSearchParams();
    const tab = (TABS.some((t) => t.key === params.get('tab')) ? params.get('tab') : 'overview') as Tab;
    const app = useQuery({ queryKey: connectKeys.app(appId), queryFn: () => connectApi.getApp(appId) });

    return (
        <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
            <Link to="/connect" className="inline-flex items-center gap-1 text-[12.5px] text-on-surface-variant hover:text-on-surface">
                <ChevronLeft className="h-3.5 w-3.5" /> Connect apps
            </Link>

            {app.isLoading ? (
                <Loading />
            ) : app.error || !app.data ? (
                <div className="mt-6">
                    <ErrorNote error={app.error ?? new Error('App not found.')} />
                </div>
            ) : (
                <>
                    <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center">
                        <AppLogo name={app.data.name} logoUrl={app.data.logoUrl} size={48} />
                        <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                                <h1 className="truncate text-[21px] font-semibold tracking-tight text-on-surface">{app.data.name}</h1>
                                <RoleBadge role={app.data.role} />
                            </div>
                            <div className="mt-1 flex flex-wrap items-center gap-2 text-[12px] text-on-surface-variant">
                                App id <CopyText value={app.data.id} />
                                <span>· {(app.data.userCount ?? 0).toLocaleString()} users</span>
                            </div>
                        </div>
                    </div>

                    <div role="tablist" className="mt-6 flex gap-5 overflow-x-auto border-b border-outline-variant/30">
                        {TABS.map((t) => (
                            <button
                                key={t.key}
                                type="button"
                                role="tab"
                                aria-selected={tab === t.key}
                                onClick={() => setParams(t.key === 'overview' ? {} : { tab: t.key }, { replace: true })}
                                className={`-mb-px whitespace-nowrap border-b-2 px-0.5 pb-2.5 text-[13px] transition-colors ${
                                    tab === t.key ? 'border-primary font-medium text-on-surface' : 'border-transparent text-on-surface-variant hover:text-on-surface'
                                }`}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>

                    <div className="mt-6 pb-10">
                        {tab === 'overview' && <OverviewTab app={app.data} />}
                        {tab === 'users' && <UsersTab app={app.data} />}
                        {tab === 'settings' && <SettingsTab app={app.data} />}
                        {tab === 'team' && <TeamTab app={app.data} />}
                    </div>
                </>
            )}
        </div>
    );
}
