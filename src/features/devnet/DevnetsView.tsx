// src/features/devnet/DevnetsView.tsx
//
// Each workspace has its own private CKB devnet. This page lists them and
// shows live chain facts for the selected one, read from the node's RPC.

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
    AlertTriangle,
    ArrowUpRight,
    Blocks,
    Check,
    Copy,
    Loader2,
    Network,
    Play,
    RotateCw,
    Square,
} from 'lucide-react';

import { useWorkspaces } from '../dashboard/hooks/useWorkspaces';
import { workspaceApi } from '../workspace/api/workspace.api';
import { workspaceKeys } from '../workspace/queries/workspace.keys';
import type { DevnetInfo, Workspace } from '../workspace/types/workspace.types';
import { AccountsTab, CellsTab, TxBuilderTab } from './DevnetTools';

const devnetKey = (workspaceId: string) => [...workspaceKeys.detail(workspaceId), 'devnet'] as const;

const STATE: Record<DevnetInfo['state'], { label: string; dot: string; text: string }> = {
    running: { label: 'Running', dot: 'bg-emerald-400', text: 'text-emerald-300' },
    starting: { label: 'Starting', dot: 'bg-[#58a6ff] animate-pulse', text: 'text-[#79b8ff]' },
    off: { label: 'Off', dot: 'bg-gray-500', text: 'text-gray-400' },
    failed: { label: 'Failed', dot: 'bg-rose-400', text: 'text-rose-300' },
    'workspace-stopped': { label: 'Workspace stopped', dot: 'bg-gray-600', text: 'text-gray-400' },
};

function timeAgo(ms: number): string {
    if (!ms) return '—';
    const seconds = Math.max(0, Math.floor((Date.now() - ms) / 1000));
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return new Date(ms).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

function shortHash(hash: string): string {
    return hash.length > 18 ? `${hash.slice(0, 10)}…${hash.slice(-6)}` : hash;
}

function CopyText({ value, children }: { value: string; children: ReactNode }) {
    const [copied, setCopied] = useState(false);

    return (
        <button
            type="button"
            title="Copy"
            onClick={async () => {
                try {
                    await navigator.clipboard.writeText(value);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1400);
                } catch {
                    /* clipboard blocked */
                }
            }}
            className="group inline-flex min-w-0 items-center gap-1.5 rounded font-mono text-left hover:text-white"
        >
            <span className="truncate">{children}</span>
            {copied ? (
                <Check className="h-3 w-3 shrink-0 text-emerald-400" />
            ) : (
                <Copy className="h-3 w-3 shrink-0 text-gray-600 group-hover:text-gray-400" />
            )}
        </button>
    );
}

function Tile({ label, value, sub }: { label: string; value: ReactNode; sub?: ReactNode }) {
    return (
        <div className="min-w-0 rounded-lg border border-[#30363d] bg-[#161b22] px-4 py-3.5">
            <div className="text-[12px] text-gray-400">{label}</div>
            <div className="mt-1 truncate font-mono text-[20px] font-semibold tabular-nums text-white">{value}</div>
            {sub && <div className="mt-0.5 truncate text-[11.5px] text-gray-500">{sub}</div>}
        </div>
    );
}

function WorkspaceRow({ workspace, selected, onSelect }: { workspace: Workspace; selected: boolean; onSelect: () => void }) {
    const running = workspace.status === 'RUNNING';

    return (
        <button
            type="button"
            onClick={onSelect}
            aria-current={selected}
            className={`flex w-full items-center gap-3 border-b border-[#21262d] px-4 py-3 text-left transition-colors last:border-b-0 ${
                selected ? 'bg-[#1f6feb]/10' : 'hover:bg-[#161b22]'
            }`}
        >
            <span className={`h-2 w-2 shrink-0 rounded-full ${running ? 'bg-emerald-400' : workspace.status === 'PROVISIONING' ? 'bg-[#58a6ff] animate-pulse' : 'bg-gray-600'}`} />
            <span className="min-w-0 flex-1">
                <span className={`block truncate text-[13.5px] ${selected ? 'font-medium text-white' : 'text-gray-200'}`}>{workspace.name}</span>
                <span className="block text-[11.5px] text-gray-500">{running ? 'Workspace running' : workspace.status === 'PROVISIONING' ? 'Starting…' : 'Workspace stopped'}</span>
            </span>
        </button>
    );
}

function DevnetDetail({ workspace }: { workspace: Workspace }) {
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const info = useQuery({
        queryKey: devnetKey(workspace.id),
        queryFn: () => workspaceApi.devnet(workspace.id),
        refetchInterval: (query) => {
            const state = query.state.data?.state;
            if (state === 'running') return 5_000;
            if (state === 'starting') return 2_000;
            return false;
        },
    });

    const refresh = async () => {
        await queryClient.invalidateQueries({ queryKey: devnetKey(workspace.id) });
    };

    const startWorkspace = useMutation({
        mutationFn: () => workspaceApi.start(workspace.id),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: workspaceKeys.list() });
        },
    });

    const startDevnet = useMutation({ mutationFn: () => workspaceApi.startDevnet(workspace.id), onSuccess: refresh });
    const stopDevnet = useMutation({ mutationFn: () => workspaceApi.stopDevnet(workspace.id), onSuccess: refresh });

    // A workspace that finishes starting: re-read its devnet state.
    useEffect(() => {
        void refresh();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [workspace.status]);

    const data = info.data;
    const state = data ? STATE[data.state] : null;
    const chain = data?.chain;
    const actionError = (startDevnet.error ?? stopDevnet.error ?? startWorkspace.error) as Error | null;
    const [tab, setTab] = useState<'overview' | 'accounts' | 'cells' | 'builder'>('overview');
    const tabs = [
        ['overview', 'Overview'],
        ['accounts', 'Accounts'],
        ['cells', 'Cells'],
        ['builder', 'Transaction builder'],
    ] as const;

    return (
        <div className="min-w-0">
            {/* ---------------------------------------------- Title */}
            <div className="flex flex-col gap-3 border-b border-[#30363d] pb-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                    <div className="flex items-center gap-2.5">
                        <h2 className="truncate text-[18px] font-semibold text-white">{workspace.name}</h2>
                        {state && (
                            <span className={`inline-flex items-center gap-1.5 rounded-full border border-[#30363d] px-2 py-0.5 text-[11.5px] ${state.text}`}>
                                <span className={`h-1.5 w-1.5 rounded-full ${state.dot}`} />
                                {state.label}
                            </span>
                        )}
                    </div>
                    <p className="mt-1 text-[13px] text-gray-400">Private CKB devnet (offckb) for this workspace</p>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                    {data?.state === 'running' && (
                        <button
                            type="button"
                            onClick={() => stopDevnet.mutate()}
                            disabled={stopDevnet.isPending}
                            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-[#30363d] px-3 text-[13px] text-gray-200 hover:bg-[#21262d] disabled:opacity-50"
                        >
                            {stopDevnet.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Square className="h-3.5 w-3.5" />}
                            Stop devnet
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={() => navigate(`/ide/${workspace.id}`)}
                        className="inline-flex h-8 items-center gap-1.5 rounded-md border border-[#30363d] px-3 text-[13px] text-gray-200 hover:bg-[#21262d]"
                    >
                        Open in IDE
                        <ArrowUpRight className="h-3.5 w-3.5" />
                    </button>
                </div>
            </div>

            {actionError && (
                <div className="mt-4 flex items-start gap-2 rounded-md border border-rose-500/30 bg-rose-500/5 px-3 py-2.5 text-[13px] text-rose-200">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    {actionError.message}
                </div>
            )}

            {/* ---------------------------------------------- Body */}
            {info.isLoading ? (
                <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
                    {[0, 1, 2, 3].map((i) => (
                        <div key={i} className="h-[84px] animate-pulse rounded-lg border border-[#30363d] bg-[#161b22]" />
                    ))}
                </div>
            ) : info.isError ? (
                <div className="mt-6 flex flex-col items-center gap-3 rounded-lg border border-[#30363d] bg-[#161b22] px-6 py-12 text-center">
                    <AlertTriangle className="h-5 w-5 text-amber-400" />
                    <p className="text-[14px] text-gray-300">Couldn’t read this devnet.</p>
                    <button type="button" onClick={() => void info.refetch()} className="inline-flex items-center gap-1.5 rounded-md border border-[#30363d] px-3 py-1.5 text-[13px] text-gray-200 hover:bg-[#21262d]">
                        <RotateCw className="h-3.5 w-3.5" /> Try again
                    </button>
                </div>
            ) : data?.state === 'workspace-stopped' ? (
                <EmptyState
                    title="The workspace is stopped"
                    body="A devnet runs alongside its workspace. Start the workspace, then start its devnet."
                    action={
                        <button
                            type="button"
                            onClick={() => startWorkspace.mutate()}
                            disabled={startWorkspace.isPending || workspace.status === 'PROVISIONING'}
                            className="inline-flex h-8 items-center gap-1.5 rounded-md bg-[#238636] px-3 text-[13px] font-medium text-white hover:bg-[#2ea043] disabled:opacity-60"
                        >
                            {startWorkspace.isPending || workspace.status === 'PROVISIONING' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                            {workspace.status === 'PROVISIONING' ? 'Starting workspace…' : 'Start workspace'}
                        </button>
                    }
                />
            ) : data?.state === 'off' || data?.state === 'failed' ? (
                <EmptyState
                    title={data.state === 'failed' ? 'The devnet didn’t start' : 'Devnet is off'}
                    body={
                        data.state === 'failed'
                            ? 'The node didn’t become ready. Start it again; if it keeps failing, check the workspace’s terminal for errors.'
                            : 'Devnets start on demand, so workspaces start fast. Start this one when you want to deploy or send transactions.'
                    }
                    action={
                        <button
                            type="button"
                            onClick={() => startDevnet.mutate()}
                            disabled={startDevnet.isPending}
                            className="inline-flex h-8 items-center gap-1.5 rounded-md bg-[#238636] px-3 text-[13px] font-medium text-white hover:bg-[#2ea043] disabled:opacity-60"
                        >
                            {startDevnet.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                            Start devnet
                        </button>
                    }
                />
            ) : data?.state === 'starting' ? (
                <EmptyState
                    title="Starting the devnet…"
                    body="The node usually answers within 10–30 seconds. This page updates on its own."
                    icon={<Loader2 className="h-5 w-5 animate-spin text-[#79b8ff]" />}
                />
            ) : chain ? (
                <>
                    <div role="tablist" aria-label="Devnet tools" className="mt-5 flex gap-1 overflow-x-auto border-b border-[#30363d]">
                        {tabs.map(([key, label]) => (
                            <button
                                key={key}
                                type="button"
                                role="tab"
                                aria-selected={tab === key}
                                onClick={() => setTab(key)}
                                className={`-mb-px whitespace-nowrap border-b-2 px-3 py-2 text-[13px] transition-colors ${
                                    tab === key ? 'border-[#3cc68a] font-medium text-white' : 'border-transparent text-gray-400 hover:text-gray-200'
                                }`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>

                    {tab === 'accounts' && <AccountsTab workspaceId={workspace.id} />}
                    {tab === 'cells' && <CellsTab workspaceId={workspace.id} />}
                    {tab === 'builder' && <TxBuilderTab workspaceId={workspace.id} />}

                    {tab === 'overview' && (
                    <>
                    <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
                        <Tile label="Tip block" value={chain.tip ? chain.tip.number.toLocaleString() : '—'} sub={chain.tip ? timeAgo(chain.tip.timestamp) : undefined} />
                        <Tile label="Epoch" value={chain.tip?.epoch.split(' ')[0] ?? '—'} sub={chain.tip?.epoch.split(' ')[1]?.replace(/[()]/g, '') ? `block ${chain.tip?.epoch.split(' ')[1]?.replace(/[()]/g, '')}` : undefined} />
                        <Tile
                            label="Tx pool"
                            value={chain.txPool ? chain.txPool.pending + chain.txPool.proposed : '—'}
                            sub={chain.txPool ? `${chain.txPool.pending} pending · ${chain.txPool.proposed} proposed` : undefined}
                        />
                        <Tile label="Chain" value={chain.chain ?? '—'} sub={chain.nodeVersion ? `CKB ${chain.nodeVersion}` : undefined} />
                    </div>

                    <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_300px]">
                        <section aria-label="Recent blocks" className="min-w-0 overflow-hidden rounded-lg border border-[#30363d]">
                            <div className="flex h-10 items-center justify-between border-b border-[#30363d] bg-[#161b22] px-4">
                                <span className="flex items-center gap-2 text-[13px] font-medium text-gray-200">
                                    <Blocks className="h-4 w-4 text-gray-400" /> Recent blocks
                                </span>
                                <span className="text-[11.5px] text-gray-500">Updates every 5s</span>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[440px] text-[12.5px]">
                                    <thead>
                                        <tr className="border-b border-[#21262d] text-left text-[11.5px] text-gray-500">
                                            <th className="px-4 py-2 font-medium">Block</th>
                                            <th className="px-4 py-2 font-medium">Hash</th>
                                            <th className="px-4 py-2 text-right font-medium">Txs</th>
                                            <th className="px-4 py-2 text-right font-medium">Time</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {chain.recentBlocks.map((block) => (
                                            <tr key={block.hash || block.number} className="border-b border-[#21262d] last:border-b-0">
                                                <td className="px-4 py-2 font-mono tabular-nums text-gray-200">{block.number.toLocaleString()}</td>
                                                <td className="max-w-0 px-4 py-2 text-gray-400">
                                                    <CopyText value={block.hash}>{shortHash(block.hash)}</CopyText>
                                                </td>
                                                <td className="px-4 py-2 text-right font-mono tabular-nums text-gray-300">{block.transactions}</td>
                                                <td className="whitespace-nowrap px-4 py-2 text-right text-gray-500">{timeAgo(block.timestamp)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </section>

                        <aside className="space-y-4">
                            <div className="rounded-lg border border-[#30363d] bg-[#161b22] p-4">
                                <h3 className="text-[13px] font-medium text-gray-200">Connect</h3>
                                <p className="mt-1 text-[12px] leading-[1.55] text-gray-500">
                                    From the workspace terminal or your scripts. <code className="font-mono text-gray-400">CKB_RPC_URL</code> is already set.
                                </p>
                                <dl className="mt-3 space-y-2 text-[12px]">
                                    <div>
                                        <dt className="text-gray-500">RPC</dt>
                                        <dd className="mt-0.5 text-gray-300">
                                            <CopyText value={data?.rpcUrl ?? 'http://ckb-node:8114'}>{data?.rpcUrl ?? 'http://ckb-node:8114'}</CopyText>
                                        </dd>
                                    </div>
                                    <div>
                                        <dt className="text-gray-500">Proxy RPC</dt>
                                        <dd className="mt-0.5 text-gray-300">
                                            <CopyText value="http://ckb-node:28114">http://ckb-node:28114</CopyText>
                                        </dd>
                                    </div>
                                    {chain.nodeId && (
                                        <div>
                                            <dt className="text-gray-500">Node ID</dt>
                                            <dd className="mt-0.5 text-gray-300">
                                                <CopyText value={chain.nodeId}>{shortHash(chain.nodeId)}</CopyText>
                                            </dd>
                                        </div>
                                    )}
                                </dl>
                            </div>
                            <div className="rounded-lg border border-[#30363d] bg-[#161b22] p-4 text-[12px] leading-[1.6] text-gray-500">
                                The chain is private to this workspace and kept when it stops. Deleting the workspace deletes its chain.
                            </div>
                        </aside>
                    </div>
                    </>
                    )}
                </>
            ) : null}
        </div>
    );
}

function EmptyState({ title, body, action, icon }: { title: string; body: string; action?: ReactNode; icon?: ReactNode }) {
    return (
        <div className="mt-6 flex flex-col items-center rounded-lg border border-dashed border-[#30363d] bg-[#161b22]/60 px-6 py-14 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#30363d] bg-[#0d1117]">
                {icon ?? <Network className="h-5 w-5 text-gray-300" />}
            </div>
            <h3 className="mt-4 text-[15px] font-semibold text-white">{title}</h3>
            <p className="mx-auto mt-1.5 max-w-[440px] text-[13px] leading-[1.6] text-gray-400">{body}</p>
            {action && <div className="mt-5">{action}</div>}
        </div>
    );
}

export default function DevnetsView() {
    const navigate = useNavigate();
    const [params, setParams] = useSearchParams();
    const { workspaces, isLoading, isError, refetch } = useWorkspaces();

    const sorted = useMemo(
        () =>
            [...workspaces].sort((a, b) => {
                const rank = (w: Workspace) => (w.status === 'RUNNING' ? 0 : w.status === 'PROVISIONING' ? 1 : 2);
                return rank(a) - rank(b) || a.name.localeCompare(b.name);
            }),
        [workspaces],
    );

    const selectedId = params.get('workspace') ?? sorted[0]?.id ?? null;
    const selected = sorted.find((w) => w.id === selectedId) ?? sorted[0] ?? null;

    return (
        <div className="min-h-full bg-[#0d1117] px-5 pb-16 pt-8 text-gray-200 sm:px-8">
            <div className="mx-auto max-w-[1200px]">
                <h1 className="text-[24px] font-semibold tracking-[-0.01em] text-white">Devnets</h1>
                <p className="mt-1 text-[14px] text-gray-400">Every workspace has its own local CKB chain for deploying and testing.</p>

                {isError ? (
                    <div className="mt-7 flex flex-col items-center gap-3 rounded-lg border border-[#30363d] bg-[#161b22] px-6 py-14 text-center">
                        <AlertTriangle className="h-5 w-5 text-amber-400" />
                        <p className="text-[14px] text-gray-300">Couldn’t load your workspaces.</p>
                        <button type="button" onClick={() => void refetch()} className="inline-flex items-center gap-1.5 rounded-md border border-[#30363d] px-3 py-1.5 text-[13px] text-gray-200 hover:bg-[#21262d]">
                            <RotateCw className="h-3.5 w-3.5" /> Try again
                        </button>
                    </div>
                ) : isLoading ? (
                    <div className="mt-7 h-64 animate-pulse rounded-lg border border-[#30363d] bg-[#161b22]" />
                ) : !selected ? (
                    <EmptyState
                        title="No workspaces yet"
                        body="Create a workspace to get a private devnet with it."
                        action={
                            <button type="button" onClick={() => navigate('/dashboard')} className="inline-flex h-8 items-center rounded-md bg-[#238636] px-3 text-[13px] font-medium text-white hover:bg-[#2ea043]">
                                Go to workspaces
                            </button>
                        }
                    />
                ) : (
                    <div className="mt-7 grid gap-6 lg:grid-cols-[260px_1fr]">
                        <nav aria-label="Workspaces" className="self-start overflow-hidden rounded-lg border border-[#30363d]">
                            {sorted.map((workspace) => (
                                <WorkspaceRow
                                    key={workspace.id}
                                    workspace={workspace}
                                    selected={workspace.id === selected.id}
                                    onSelect={() => setParams({ workspace: workspace.id }, { replace: true })}
                                />
                            ))}
                        </nav>
                        <DevnetDetail key={selected.id} workspace={selected} />
                    </div>
                )}
            </div>
        </div>
    );
}
