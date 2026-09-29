// src/features/debugger/DebugPanel.tsx
//
// Cycles and debugging with ckb-debugger.
//   Transaction: replay every script of a devnet transaction (including ones
//     the node rejected) and see exit codes, cycles and debug output. Swap in
//     your latest build to test a fix without redeploying.
//   Run binary: run a built contract on its own for a quick check.

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
    AlertTriangle,
    Bug,
    Check,
    ChevronDown,
    ChevronRight,
    CircleCheck,
    CircleMinus,
    CircleX,
    Copy,
    Loader2,
    Play,
    RefreshCw,
} from 'lucide-react';

import { AskClaudeButton } from '../ai/components/AskClaudeButton';
import { deployApi } from '../deploy/deploy.api';
import { workspaceApi } from '../workspace/api/workspace.api';
import { workspaceKeys } from '../workspace/queries/workspace.keys';
import {
    debuggerApi,
    type ContractRun,
    type ScriptGroupResult,
    type ScriptRunResult,
    type TransactionDebug,
    type TxStatus,
} from './debugger.api';

/** CKB nodes' default per-transaction verification limit (tx pool). */
const TX_VERIFY_LIMIT = 70_000_000;

const STATUS_STYLE: Record<string, string> = {
    committed: 'text-primary font-medium',
    proposed: 'text-secondary font-medium',
    pending: 'text-secondary font-medium',
    rejected: 'text-error font-medium',
    'not-on-chain': 'text-on-surface-variant/70',
};

const STATUS_LABEL: Record<string, string> = {
    committed: 'Committed',
    proposed: 'Proposed',
    pending: 'Pending',
    rejected: 'Rejected',
    'not-on-chain': 'Not on chain',
};

function short(hash: string, head = 8, tail = 6) {
    return hash.length > head + tail + 2 ? `${hash.slice(0, head + 2)}…${hash.slice(-tail)}` : hash;
}

export function formatCycles(cycles: number | null): string {
    if (cycles === null) return '—';
    if (cycles >= 1_000_000) return `${(cycles / 1_000_000).toFixed(cycles >= 10_000_000 ? 1 : 2)}M`;
    if (cycles >= 1_000) return `${(cycles / 1_000).toFixed(1)}K`;
    return String(cycles);
}

function timeAgo(iso: string) {
    const seconds = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return hours < 24 ? `${hours}h ago` : new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

function StatusBadge({ status }: { status: TxStatus }) {
    return (
        <span className={`shrink-0 font-mono text-[9.5px] ${STATUS_STYLE[status] ?? STATUS_STYLE['not-on-chain']}`}>
            {STATUS_LABEL[status] ?? status}
        </span>
    );
}

function outcome(run: ScriptRunResult & { skipped?: string | null }): 'pass' | 'fail' | 'skip' {
    if (run.skipped) return 'skip';
    return run.exitCode === 0 && !run.vmError ? 'pass' : 'fail';
}

function OutcomeIcon({ kind }: { kind: 'pass' | 'fail' | 'skip' }) {
    if (kind === 'pass') return <CircleCheck className="h-3 w-3 shrink-0 text-primary" />;
    if (kind === 'fail') return <CircleX className="h-3 w-3 shrink-0 text-error" />;
    return <CircleMinus className="h-3 w-3 shrink-0 text-on-surface-variant" />;
}

function CyclesBar({ cycles }: { cycles: number | null }) {
    if (cycles === null) return <span className="text-on-surface-variant/50 font-mono">—</span>;
    const share = Math.min(1, cycles / TX_VERIFY_LIMIT);

    return (
        <span className="flex items-center gap-1.5 font-mono text-[10px]" title={`${cycles.toLocaleString()} cycles · ${(share * 100).toFixed(2)}% of limit`}>
            <span className="w-12 text-right tabular-nums text-on-surface">{formatCycles(cycles)}</span>
            <span className="hidden h-1 w-16 overflow-hidden rounded-sm bg-surface-container-high sm:block">
                <span
                    className={`block h-full ${share > 0.8 ? 'bg-error' : share > 0.4 ? 'bg-amber-400' : 'bg-primary'}`}
                    style={{ width: `${Math.max(2, share * 100)}%` }}
                />
            </span>
        </span>
    );
}

function ExitSummary({ run }: { run: ScriptRunResult }) {
    if (run.vmError) return <span className="text-error font-mono">{run.vmError}</span>;
    if (run.exitCode === null) return <span className="text-on-surface-variant/50 font-mono">—</span>;

    return (
        <span className="min-w-0 font-mono text-[10px]">
            <span className={run.exitCode === 0 ? 'text-primary' : 'text-error'}>exit {run.exitCode}</span>
            {run.meaning && run.exitCode !== 0 && <span className="text-on-surface-variant/70"> · {run.meaning}</span>}
        </span>
    );
}

function Logs({ logs }: { logs: string[] }) {
    if (!logs.length) return <p className="text-[10px] font-mono text-on-surface-variant/60">No debug output. Use ckb_std::debug! in contract to print here.</p>;

    return (
        <pre className="max-h-40 overflow-auto rounded border border-outline-variant/30 bg-surface-container-lowest p-2 font-mono text-[10px] leading-relaxed text-on-surface">
            {logs.join('\n')}
        </pre>
    );
}

function GroupRow({ group }: { group: ScriptGroupResult }) {
    const [open, setOpen] = useState(outcome(group) === 'fail');
    const kind = outcome(group);

    return (
        <li className="border-b border-outline-variant/20 last:border-b-0 font-mono text-[10.5px]">
            <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="flex w-full items-center gap-2 px-3 py-1.5 text-left hover:bg-surface-container transition-colors">
                {open ? <ChevronDown className="h-3 w-3 shrink-0 text-on-surface-variant" /> : <ChevronRight className="h-3 w-3 shrink-0 text-on-surface-variant" />}
                <OutcomeIcon kind={kind} />
                <span className="w-[84px] shrink-0 text-[10px] text-on-surface-variant/80 uppercase">{group.label}</span>
                <span className="min-w-0 flex-1 truncate">
                    <span className={group.contract ? 'font-medium text-on-surface' : 'text-on-surface-variant'}>{group.name ?? short(group.codeHash, 6, 4)}</span>
                    {group.replaced && <span className="ml-1.5 text-[9.5px] text-secondary font-medium">· latest build</span>}
                    <span className="ml-2 text-[10px]">{group.skipped ? <span className="text-on-surface-variant/50">skipped</span> : <ExitSummary run={group} />}</span>
                </span>
                <CyclesBar cycles={group.cycles} />
            </button>

            {open && (
                <div className="space-y-1.5 px-3 pb-2.5 pl-8 text-[10px] font-mono bg-surface-container-lowest/60">
                    {group.skipped ? (
                        <p className="text-on-surface-variant/70">{group.skipped}</p>
                    ) : (
                        <>
                            {kind === 'fail' && (
                                <p className="whitespace-normal">
                                    <ExitSummary run={group} />
                                </p>
                            )}
                            <Logs logs={group.logs} />
                            {group.cycles !== null && (
                                <p className="text-on-surface-variant/70">
                                    {group.cycles.toLocaleString()} cycles · {((group.cycles / TX_VERIFY_LIMIT) * 100).toFixed(2)}% of verification limit
                                </p>
                            )}
                        </>
                    )}
                    <p className="truncate text-[9.5px] text-on-surface-variant/50" title={`${group.codeHash} (${group.hashType}) args ${group.args}`}>
                        code {short(group.codeHash)} · {group.hashType} · args {group.args.length > 20 ? short(group.args, 6, 4) : group.args}
                    </p>
                </div>
            )}
        </li>
    );
}

/** Plain-text report for Claude. */
function reportText(result: TransactionDebug): string {
    const lines = [`Transaction ${result.txHash} (${STATUS_LABEL[result.status] ?? result.status}), ${result.inputs} inputs, ${result.outputs} outputs.`];
    for (const g of result.groups) {
        const what = g.skipped ? 'skipped' : g.vmError ? `VM error: ${g.vmError}` : `exit ${g.exitCode}${g.meaning ? ` (${g.meaning})` : ''}`;
        lines.push(`${g.label} ${g.name ?? g.codeHash}${g.replaced ? ' [latest build]' : ''}: ${what}, cycles ${g.cycles ?? '-'}`);
        for (const log of g.logs.slice(0, 40)) lines.push(`  log: ${log}`);
    }
    return lines.join('\n');
}

export function DebugPanel({ workspaceId, active }: { workspaceId: string; active: boolean }) {
    const [mode, setMode] = useState<'tx' | 'run'>('tx');
    const [txHash, setTxHash] = useState('');
    const [replace, setReplace] = useState<string[]>([]);
    const [contract, setContract] = useState('');
    const [copied, setCopied] = useState(false);

    const status = useQuery({
        queryKey: workspaceKeys.status(workspaceId),
        queryFn: () => workspaceApi.status(workspaceId),
        enabled: active,
    });
    const node = status.data?.containers.find((c) => c.type === 'CKB_NODE');
    const devnetRunning = node?.status === 'RUNNING';

    const recent = useQuery({
        queryKey: [...workspaceKeys.detail(workspaceId), 'debug', 'transactions'],
        queryFn: () => debuggerApi.transactions(workspaceId),
        enabled: active && mode === 'tx' && devnetRunning,
        refetchInterval: active && mode === 'tx' && devnetRunning ? 10_000 : false,
    });

    const contracts = useQuery({
        queryKey: [...workspaceKeys.detail(workspaceId), 'contracts'],
        queryFn: () => deployApi.contracts(workspaceId),
        enabled: active,
    });

    const deployments = useQuery({
        queryKey: [...workspaceKeys.detail(workspaceId), 'deployments'],
        queryFn: () => deployApi.deployments(workspaceId),
        enabled: active,
    });

    useEffect(() => {
        if (active) void contracts.refetch();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [active]);

    useEffect(() => {
        const list = contracts.data ?? [];
        if (list.length && !list.some((c) => c.name === contract)) setContract(list[0].name);
    }, [contracts.data, contract]);

    // Contracts that are both deployed on the devnet and built: these can be
    // swapped for the latest build.
    const swappable = useMemo(() => {
        const built = new Set((contracts.data ?? []).map((c) => c.name));
        return [...new Set((deployments.data ?? []).filter((d) => d.network === 'DEVNET' && built.has(d.contractName)).map((d) => d.contractName))];
    }, [contracts.data, deployments.data]);

    const debugTx = useMutation({
        mutationFn: (hash: string) => debuggerApi.debugTransaction(workspaceId, hash.trim(), replace),
    });

    const runBinary = useMutation({
        mutationFn: () => debuggerApi.run(workspaceId, contract),
    });

    const submit = (event?: FormEvent, hash = txHash) => {
        event?.preventDefault();
        if (!hash.trim()) return;
        setTxHash(hash);
        debugTx.mutate(hash);
    };

    const result = debugTx.data;
    const run: ContractRun | undefined = runBinary.data;

    return (
        <div className="grid h-full min-h-0 grid-cols-[minmax(240px,320px)_minmax(0,1fr)] font-mono text-[10.5px] bg-surface-container-lowest">
            {/* ---------------------------------------------------- Controls */}
            <div className="flex min-h-0 flex-col border-r border-outline-variant/30 bg-surface-container-low">
                <div className="p-3 pb-2">
                    <div role="radiogroup" className="grid grid-cols-2 rounded border border-outline-variant/30 p-0.5 bg-surface">
                        {([['tx', 'Transaction'], ['run', 'Run Binary']] as const).map(([key, label]) => (
                            <button
                                key={key}
                                type="button"
                                role="radio"
                                aria-checked={mode === key}
                                onClick={() => setMode(key)}
                                className={`h-6 rounded text-[10px] font-mono transition-colors ${mode === key ? 'bg-surface-container-high font-medium text-primary' : 'text-on-surface-variant hover:text-on-surface'}`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                </div>

                {mode === 'tx' ? (
                    <div className="flex min-h-0 flex-1 flex-col">
                        <form onSubmit={submit} className="space-y-2 px-3">
                            <input
                                value={txHash}
                                onChange={(e) => setTxHash(e.target.value)}
                                placeholder="Devnet tx hash (0x…)"
                                aria-label="Transaction hash"
                                spellCheck={false}
                                className="h-7 w-full rounded border border-outline-variant/30 bg-surface px-2 text-[10.5px] text-on-surface placeholder:text-on-surface-variant/40 focus:border-secondary focus:outline-none"
                            />

                            {swappable.length > 0 && (
                                <fieldset className="space-y-1">
                                    <legend className="mb-0.5 text-[9.5px] uppercase tracking-wider text-on-surface-variant/70">Swap latest build</legend>
                                    {swappable.map((name) => (
                                        <label key={name} className="flex cursor-pointer items-center gap-1.5 text-[10px] text-on-surface">
                                            <input
                                                type="checkbox"
                                                checked={replace.includes(name)}
                                                onChange={(e) => setReplace((list) => (e.target.checked ? [...list, name] : list.filter((n) => n !== name)))}
                                                className="accent-primary"
                                            />
                                            {name}
                                        </label>
                                    ))}
                                </fieldset>
                            )}

                            <button
                                type="submit"
                                disabled={!txHash.trim() || debugTx.isPending || !devnetRunning}
                                className="flex h-7 w-full items-center justify-center gap-1.5 rounded bg-primary font-medium text-on-primary hover:bg-primary-fixed transition disabled:bg-surface-container disabled:text-on-surface-variant/50"
                            >
                                {debugTx.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Bug className="h-3 w-3" />}
                                {debugTx.isPending ? 'Replaying scripts…' : 'Debug transaction'}
                            </button>
                        </form>

                        {!devnetRunning ? (
                            <p className="m-3 rounded border border-dashed border-outline-variant/30 px-2.5 py-2 text-on-surface-variant/60 font-mono text-[10.5px]">
                                Start devnet to debug transactions.
                            </p>
                        ) : (
                            <div className="mt-2.5 flex min-h-0 flex-1 flex-col border-t border-outline-variant/20 font-mono">
                                <div className="flex h-7 shrink-0 items-center justify-between px-3">
                                    <span className="text-[9.5px] font-semibold uppercase tracking-wider text-on-surface-variant">Recent transactions</span>
                                    <button type="button" onClick={() => void recent.refetch()} aria-label="Refresh" className="rounded p-0.5 text-on-surface-variant hover:bg-surface-container hover:text-on-surface">
                                        <RefreshCw className={`h-3 w-3 ${recent.isFetching ? 'animate-spin' : ''}`} />
                                    </button>
                                </div>
                                <ul className="min-h-0 flex-1 overflow-y-auto">
                                    {(recent.data ?? []).length === 0 ? (
                                        <li className="px-3 py-3 text-[10.5px] leading-relaxed text-on-surface-variant/60">
                                            Transactions sent through proxy show up here.
                                        </li>
                                    ) : (
                                        recent.data!.map((tx) => (
                                            <li key={tx.txHash}>
                                                <button
                                                    type="button"
                                                    onClick={() => submit(undefined, tx.txHash)}
                                                    className={`flex w-full items-center gap-2 px-3 py-1.5 text-left hover:bg-surface-container transition-colors ${result?.txHash === tx.txHash ? 'bg-primary/10 text-primary' : 'text-on-surface'}`}
                                                >
                                                    <span className="min-w-0 flex-1 truncate font-mono text-[10.5px]">{short(tx.txHash, 8, 6)}</span>
                                                    <StatusBadge status={tx.status} />
                                                    <span className="w-12 shrink-0 text-right text-[9.5px] text-on-surface-variant/70">{timeAgo(tx.recordedAt)}</span>
                                                </button>
                                            </li>
                                        ))
                                    )}
                                </ul>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="space-y-2 px-3 font-mono text-[10.5px]">
                        {contracts.data && contracts.data.length === 0 ? (
                            <p className="rounded border border-dashed border-outline-variant/30 px-2.5 py-2 text-on-surface-variant/60">No built contracts yet. Run a build first.</p>
                        ) : (
                            <select
                                value={contract}
                                onChange={(e) => setContract(e.target.value)}
                                aria-label="Contract"
                                className="h-7 w-full rounded border border-outline-variant/30 bg-surface px-2 text-[10.5px] text-on-surface focus:border-secondary focus:outline-none"
                            >
                                {(contracts.data ?? []).map((c) => (
                                    <option key={c.name} value={c.name}>
                                        {c.name}
                                    </option>
                                ))}
                            </select>
                        )}
                        <button
                            type="button"
                            onClick={() => runBinary.mutate()}
                            disabled={!contract || runBinary.isPending}
                            className="flex h-7 w-full items-center justify-center gap-1.5 rounded bg-primary font-medium text-on-primary hover:bg-primary-fixed disabled:bg-surface-container disabled:text-on-surface-variant/50"
                        >
                            {runBinary.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
                            Run in ckb-debugger
                        </button>
                        <p className="text-[10px] leading-relaxed text-on-surface-variant/70">
                            Runs binary directly without transaction state.
                        </p>
                    </div>
                )}
            </div>

            {/* ---------------------------------------------------- Results */}
            <div className="flex min-h-0 flex-col bg-surface-container-lowest font-mono">
                {mode === 'tx' ? (
                    debugTx.isError ? (
                        <div className="m-3 flex items-start gap-1.5 rounded border border-error/30 bg-error/10 p-2.5 text-error">
                            <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                            <span className="whitespace-pre-wrap text-[10.5px]">{(debugTx.error as Error).message}</span>
                        </div>
                    ) : result ? (
                        <>
                            <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1 border-b border-outline-variant/30 bg-surface-container px-3 py-1.5 text-[10.5px]">
                                <button
                                    type="button"
                                    onClick={async () => {
                                        try {
                                            await navigator.clipboard.writeText(result.txHash);
                                            setCopied(true);
                                            setTimeout(() => setCopied(false), 1400);
                                        } catch {
                                            /* ignore */
                                        }
                                    }}
                                    className="inline-flex items-center gap-1 text-on-surface hover:text-primary transition-colors"
                                    title="Copy transaction hash"
                                >
                                    {short(result.txHash, 8, 6)}
                                    {copied ? <Check className="h-3 w-3 text-primary" /> : <Copy className="h-3 w-3 text-on-surface-variant" />}
                                </button>
                                <span className="text-on-surface-variant/40">·</span>
                                <StatusBadge status={result.status} />
                                <span className="text-on-surface-variant text-[10px]">
                                    <span className="text-on-surface-variant/40">·</span> {result.groups.length} script{result.groups.length === 1 ? '' : 's'} ·{' '}
                                    <span className="text-on-surface font-medium">{formatCycles(result.totalCycles)}</span> cycles
                                    {result.failed > 0 && <span className="text-error font-medium"> · {result.failed} failed</span>}
                                </span>
                                <span className="ml-auto">
                                    {result.failed > 0 && (
                                        <AskClaudeButton
                                            kind="test"
                                            prompt="This devnet transaction fails verification. Which script fails, why, and how do I fix my contract?"
                                            output={reportText(result)}
                                        />
                                    )}
                                </span>
                            </div>
                            <ul className="min-h-0 flex-1 overflow-y-auto">
                                {result.groups.map((group) => (
                                    <GroupRow key={`${group.label}-${group.codeHash}`} group={group} />
                                ))}
                            </ul>
                            {result.truncated && <p className="border-t border-outline-variant/20 px-3 py-1 text-[9.5px] text-on-surface-variant/60">Only the first 24 script groups were run.</p>}
                        </>
                    ) : (
                        <div className="flex h-full flex-col items-center justify-center gap-1.5 p-6 text-center text-on-surface-variant/60">
                            <Bug className="h-4 w-4 text-on-surface-variant/40" />
                            <p className="max-w-[360px] text-[10.5px] leading-relaxed">
                                Select a recent transaction or paste a hash to replay with ckb-debugger.
                            </p>
                        </div>
                    )
                ) : runBinary.isError ? (
                    <div className="m-3 flex items-start gap-1.5 rounded border border-error/30 bg-error/10 p-2.5 text-error">
                        <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                        <span className="text-[10.5px]">{(runBinary.error as Error).message}</span>
                    </div>
                ) : run ? (
                    <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto p-3 text-[10.5px]">
                        <div className="flex flex-wrap items-center gap-2.5">
                            <OutcomeIcon kind={outcome(run)} />
                            <span className="font-medium text-on-surface">{run.contract}</span>
                            <span>
                                <ExitSummary run={run} />
                            </span>
                            <span className="ml-auto">
                                <CyclesBar cycles={run.cycles} />
                            </span>
                        </div>
                        <Logs logs={run.logs} />
                        <p className="text-[10px] text-on-surface-variant/70">{run.note}</p>
                        {outcome(run) === 'fail' && (
                            <AskClaudeButton
                                kind="terminal"
                                prompt={`Running ${run.contract} in ckb-debugger failed. What does this mean?`}
                                output={run.raw}
                            />
                        )}
                    </div>
                ) : (
                    <div className="flex h-full items-center justify-center p-6 text-center text-[10.5px] text-on-surface-variant/60">
                        Run a built contract to see its exit code, cycles and debug output.
                    </div>
                )}
            </div>
        </div>
    );
}
