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
    Zap,
    Coins,
} from 'lucide-react';

import { useWorkspaces } from '../dashboard/hooks/useWorkspaces';
import { workspaceApi } from '../workspace/api/workspace.api';
import { workspaceKeys } from '../workspace/queries/workspace.keys';
import { apiClient } from '../../lib/api-client';
import type { DevnetInfo, Workspace } from '../workspace/types/workspace.types';
import { AccountsTab, CellsTab, TxBuilderTab } from './DevnetTools';
import { DevnetRpcConsole } from './DevnetRpcConsole';

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
        <div className="min-w-0 rounded-lg border border-outline-variant/20 bg-surface-container px-3.5 py-3">
            <div className="text-[10.5px] font-medium uppercase tracking-wider text-on-surface-variant">{label}</div>
            <div className="mt-1 truncate font-mono text-[16px] font-semibold tabular-nums text-on-surface">{value}</div>
            {sub && <div className="mt-0.5 truncate text-[10.5px] text-on-surface-variant">{sub}</div>}
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
            className={`flex w-full items-center gap-2.5 border-b border-outline-variant/15 px-3 py-2.5 text-left transition-colors last:border-b-0 ${selected ? 'bg-surface-container-high text-primary font-medium' : 'hover:bg-surface-container text-on-surface'
                }`}
        >
            <span className={`h-2 w-2 shrink-0 rounded-full ${running ? 'bg-primary animate-pulse' : workspace.status === 'PROVISIONING' ? 'bg-secondary animate-pulse' : 'bg-outline'}`} />
            <span className="min-w-0 flex-1">
                <span className={`block truncate text-[12px] ${selected ? 'font-semibold text-primary' : 'text-on-surface'}`}>{workspace.name}</span>
                <span className="block text-[10px] text-on-surface-variant">{running ? 'Workspace running' : workspace.status === 'PROVISIONING' ? 'Starting…' : 'Workspace stopped'}</span>
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
    const [tab, setTab] = useState<'overview' | 'accounts' | 'cells' | 'builder' | 'rpc'>('overview');
    const tabs = [
        ['overview', 'Overview'],
        ['accounts', 'Accounts & Faucet'],
        ['cells', 'Live Cells'],
        ['builder', 'Transaction Builder'],
        ['rpc', 'RPC Console'],
    ] as const;

    const mineBlock = useMutation({
        mutationFn: () => apiClient<{ success: boolean; block: any }>(`/workspaces/${workspace.id}/devnet/mine`, { method: 'POST' }),
        onSuccess: refresh,
    });

    const claimFaucet = useMutation({
        mutationFn: (addr?: string) =>
            apiClient<{ success: boolean; txHash: string; capacity: string }>(`/workspaces/${workspace.id}/devnet/faucet`, {
                method: 'POST',
                body: JSON.stringify({ address: addr }),
            }),
        onSuccess: refresh,
    });

    return (
        <div className="min-w-0">
            {/* ---------------------------------------------- Title */}
            <div className="flex flex-col gap-3 border-b border-outline-variant/30 pb-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                    <div className="flex items-center gap-2.5">
                        <h2 className="truncate text-[18px] font-semibold text-on-surface">{workspace.name}</h2>
                        {state && (
                            <span className={`inline-flex items-center gap-1.5 rounded-full border border-outline-variant/40 bg-surface-container px-2.5 py-0.5 text-[11px] font-mono ${state.text}`}>
                                <span className={`h-1.5 w-1.5 rounded-full ${state.dot}`} />
                                {state.label}
                            </span>
                        )}
                    </div>
                    <p className="mt-1 text-[13px] text-on-surface-variant">Private CKB devnet node &amp; P2P mesh for this workspace</p>
                </div>

                <div className="flex flex-wrap shrink-0 items-center gap-2">
                    {data?.state === 'running' && (
                        <>
                            <button
                                type="button"
                                onClick={() => mineBlock.mutate()}
                                disabled={mineBlock.isPending}
                                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-primary/40 bg-primary/10 px-3 text-[11.5px] font-mono text-primary hover:bg-primary/20 transition-colors disabled:opacity-50"
                                title="Instantly produce a new block on local devnet"
                            >
                                {mineBlock.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5 fill-current" />}
                                <span>Mine Block</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => claimFaucet.mutate()}
                                disabled={claimFaucet.isPending}
                                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-secondary/40 bg-secondary/10 px-3 text-[11.5px] font-mono text-secondary hover:bg-secondary/20 transition-colors disabled:opacity-50"
                                title="Dispense 1,000 CKB to connected address"
                            >
                                {claimFaucet.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Coins className="h-3.5 w-3.5" />}
                                <span>Faucet (+1k CKB)</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => stopDevnet.mutate()}
                                disabled={stopDevnet.isPending}
                                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-outline-variant/30 bg-surface-container px-3 text-[11.5px] font-mono text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors disabled:opacity-50"
                            >
                                {stopDevnet.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Square className="h-3.5 w-3.5" />}
                                <span>Stop</span>
                            </button>
                        </>
                    )}
                    <button
                        type="button"
                        onClick={() => navigate(`/ide/${workspace.id}`)}
                        className="inline-flex h-8 items-center gap-1.5 rounded-md border border-outline-variant/30 bg-surface-container px-3 text-[11.5px] font-mono text-on-surface hover:bg-surface-container-high transition-colors"
                    >
                        <span>Open in IDE</span>
                        <ArrowUpRight className="h-3.5 w-3.5" />
                    </button>
                </div>
            </div>

            {actionError && (
                <div className="mt-4 flex items-start gap-2 rounded-md border border-error/30 bg-error/10 px-3 py-2.5 text-[12px] text-error font-mono">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{actionError.message}</span>
                </div>
            )}

            {/* ---------------------------------------------- Body */}
            {info.isLoading ? (
                <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
                    {[0, 1, 2, 3].map((i) => (
                        <div key={i} className="h-[84px] animate-pulse rounded-lg border border-outline-variant/20 bg-surface-container" />
                    ))}
                </div>
            ) : info.isError ? (
                <div className="mt-6 flex flex-col items-center gap-3 rounded-lg border border-outline-variant/30 bg-surface-container px-6 py-12 text-center">
                    <AlertTriangle className="h-5 w-5 text-amber-400" />
                    <p className="text-[13px] text-on-surface">Couldn’t read this devnet.</p>
                    <button type="button" onClick={() => void info.refetch()} className="inline-flex items-center gap-1.5 rounded-md border border-outline-variant/30 bg-surface-container-high px-3 py-1.5 text-[12px] text-on-surface hover:bg-surface-container">
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
                            className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-[12px] font-medium text-on-primary hover:bg-primary/90 transition-colors disabled:opacity-60"
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
                            className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-[12px] font-medium text-on-primary hover:bg-primary/90 transition-colors disabled:opacity-60"
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
                    icon={<Loader2 className="h-5 w-5 animate-spin text-secondary" />}
                />
            ) : chain ? (
                <>
                    <div role="tablist" aria-label="Devnet tools" className="mt-5 flex gap-1 overflow-x-auto border-b border-outline-variant/30">
                        {tabs.map(([key, label]) => (
                            <button
                                key={key}
                                type="button"
                                role="tab"
                                aria-selected={tab === key}
                                onClick={() => setTab(key)}
                                className={`-mb-px whitespace-nowrap border-b-2 px-3 py-2 text-[12.5px] font-mono transition-colors ${tab === key ? 'border-primary font-semibold text-primary' : 'border-transparent text-on-surface-variant hover:text-on-surface'
                                    }`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>

                    {tab === 'accounts' && <AccountsTab workspaceId={workspace.id} />}
                    {tab === 'cells' && <CellsTab workspaceId={workspace.id} />}
                    {tab === 'builder' && <TxBuilderTab workspaceId={workspace.id} />}
                    {tab === 'rpc' && <DevnetRpcConsole workspaceId={workspace.id} />}

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
                                <section aria-label="Recent blocks" className="min-w-0 overflow-hidden rounded-lg border border-outline-variant/30 bg-surface-container-lowest">
                                    <div className="flex h-10 items-center justify-between border-b border-outline-variant/30 bg-surface-container px-4 font-mono">
                                        <span className="flex items-center gap-2 text-[12.5px] font-semibold text-on-surface">
                                            <Blocks className="h-4 w-4 text-primary" />
                                            <span>Recent Blocks</span>
                                        </span>
                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() => mineBlock.mutate()}
                                                disabled={mineBlock.isPending}
                                                className="text-[10.5px] text-primary hover:underline flex items-center gap-1 disabled:opacity-50"
                                            >
                                                <Play className="h-2.5 w-2.5 fill-current" />
                                                <span>Mine Block</span>
                                            </button>
                                            <span className="text-[11px] text-on-surface-variant/60">· Updates live</span>
                                        </div>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full min-w-[440px] text-[12px] font-mono">
                                            <thead>
                                                <tr className="border-b border-outline-variant/20 text-left text-[11px] text-on-surface-variant bg-surface-container-low">
                                                    <th className="px-4 py-2 font-medium">Block</th>
                                                    <th className="px-4 py-2 font-medium">Hash</th>
                                                    <th className="px-4 py-2 text-right font-medium">Txs</th>
                                                    <th className="px-4 py-2 text-right font-medium">Time</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-outline-variant/10">
                                                {chain.recentBlocks.map((block) => (
                                                    <tr key={block.hash || block.number} className="hover:bg-surface-container transition-colors">
                                                        <td className="px-4 py-2.5 font-bold tabular-nums text-primary">#{block.number.toLocaleString()}</td>
                                                        <td className="max-w-0 px-4 py-2.5 text-on-surface-variant">
                                                            <CopyText value={block.hash}>{shortHash(block.hash)}</CopyText>
                                                        </td>
                                                        <td className="px-4 py-2.5 text-right font-mono tabular-nums text-secondary font-medium">{block.transactions}</td>
                                                        <td className="whitespace-nowrap px-4 py-2.5 text-right text-on-surface-variant/70">{timeAgo(block.timestamp)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </section>

                                <aside className="space-y-4">
                                    <div className="rounded-lg border border-outline-variant/30 bg-surface-container p-4">
                                        <h3 className="text-[12.5px] font-semibold text-on-surface font-mono uppercase tracking-wider">
                                            Node &amp; Devnet Connect
                                        </h3>
                                        <p className="mt-1 text-[11.5px] leading-relaxed text-on-surface-variant">
                                            Accessible from your terminal, frontends, or scripts. <code className="font-mono text-primary">CKB_RPC_URL</code> is pre-configured.
                                        </p>
                                        <dl className="mt-3 space-y-2.5 text-[11.5px] font-mono">
                                            <div>
                                                <dt className="text-on-surface-variant text-[10.5px] uppercase">RPC Endpoint</dt>
                                                <dd className="mt-0.5 text-primary font-medium">
                                                    <CopyText value={data?.rpcUrl ?? 'http://127.0.0.1:8114'}>{data?.rpcUrl ?? 'http://127.0.0.1:8114'}</CopyText>
                                                </dd>
                                            </div>
                                            <div>
                                                <dt className="text-on-surface-variant text-[10.5px] uppercase">Proxy RPC</dt>
                                                <dd className="mt-0.5 text-secondary">
                                                    <CopyText value="http://ckb-node:28114">http://ckb-node:28114</CopyText>
                                                </dd>
                                            </div>
                                            {chain.nodeId && (
                                                <div>
                                                    <dt className="text-on-surface-variant text-[10.5px] uppercase">Node ID</dt>
                                                    <dd className="mt-0.5 text-on-surface">
                                                        <CopyText value={chain.nodeId}>{shortHash(chain.nodeId)}</CopyText>
                                                    </dd>
                                                </div>
                                            )}
                                        </dl>
                                    </div>

                                    <div className="rounded-lg border border-outline-variant/30 bg-surface-container p-4 text-[11.5px] leading-relaxed text-on-surface-variant">
                                        <span className="font-semibold text-on-surface block mb-1">Local Chain Persistence</span>
                                        The chain is private to this workspace and persists across reboots. Deleting the workspace cleans up its local storage.
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
        <div className="mt-5 flex flex-col items-center rounded-lg border border-dashed border-outline-variant/30 bg-surface-container/60 px-6 py-12 text-center">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-outline-variant/30 bg-surface-container-high">
                {icon ?? <Network className="h-4 w-4 text-primary" />}
            </div>
            <h3 className="mt-3 text-[13px] font-semibold text-on-surface">{title}</h3>
            <p className="mx-auto mt-1 max-w-[420px] text-[11px] leading-[1.6] text-on-surface-variant">{body}</p>
            {action && <div className="mt-4">{action}</div>}
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
        <div className="min-h-full bg-surface px-4 py-6 text-on-surface sm:px-6 lg:px-8">
            <div className="mx-auto max-w-[1200px]">
                <h1 className="text-[16px] font-semibold tracking-tight text-on-surface">Workspace Devnets & Tools</h1>
                <p className="mt-0.5 text-[11.5px] text-on-surface-variant">Every workspace has its own local CKB chain for deploying and testing.</p>

                {isError ? (
                    <div className="mt-5 flex flex-col items-center gap-2.5 rounded-lg border border-outline-variant/30 bg-surface-container px-6 py-12 text-center">
                        <AlertTriangle className="h-5 w-5 text-amber-400" />
                        <p className="text-[12px] text-on-surface">Couldn’t load your workspaces.</p>
                        <button type="button" onClick={() => void refetch()} className="inline-flex items-center gap-1.5 rounded-lg border border-outline-variant/30 px-3 py-1.5 text-[11px] text-on-surface hover:bg-surface-container-high">
                            <RotateCw className="h-3.5 w-3.5" /> Try again
                        </button>
                    </div>
                ) : isLoading ? (
                    <div className="mt-5 h-64 animate-pulse rounded-lg border border-outline-variant/20 bg-surface-container" />
                ) : !selected ? (
                    <EmptyState
                        title="No workspaces yet"
                        body="Create a workspace to get a private devnet with it."
                        action={
                            <button type="button" onClick={() => navigate('/dashboard')} className="inline-flex h-8 items-center rounded-lg bg-primary px-3 text-[11px] font-semibold text-on-primary hover:bg-primary-fixed">
                                Go to workspaces
                            </button>
                        }
                    />
                ) : (
                    <div className="mt-5 grid gap-5 lg:grid-cols-[240px_1fr]">
                        <nav aria-label="Workspaces" className="self-start overflow-hidden rounded-lg border border-outline-variant/20 bg-surface-container-low">
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
