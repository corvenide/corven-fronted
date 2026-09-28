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
    committed: 'border-emerald-500/40 text-emerald-300',
    proposed: 'border-[#1f6feb]/40 text-[#79b8ff]',
    pending: 'border-[#1f6feb]/40 text-[#79b8ff]',
    rejected: 'border-rose-500/40 text-rose-300',
    'not-on-chain': 'border-[#30363d] text-gray-400',
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
        <span className={`shrink-0 rounded border px-1.5 text-[10px] ${STATUS_STYLE[status] ?? STATUS_STYLE['not-on-chain']}`}>
            {STATUS_LABEL[status] ?? status}
        </span>
    );
}

function outcome(run: ScriptRunResult & { skipped?: string | null }): 'pass' | 'fail' | 'skip' {
    if (run.skipped) return 'skip';
    return run.exitCode === 0 && !run.vmError ? 'pass' : 'fail';
}

function OutcomeIcon({ kind }: { kind: 'pass' | 'fail' | 'skip' }) {
    if (kind === 'pass') return <CircleCheck className="h-3.5 w-3.5 shrink-0 text-emerald-400" />;
    if (kind === 'fail') return <CircleX className="h-3.5 w-3.5 shrink-0 text-rose-400" />;
    return <CircleMinus className="h-3.5 w-3.5 shrink-0 text-gray-500" />;
}

function CyclesBar({ cycles }: { cycles: number | null }) {
    if (cycles === null) return <span className="text-gray-600">—</span>;
    const share = Math.min(1, cycles / TX_VERIFY_LIMIT);

    return (
        <span className="flex items-center gap-2" title={`${cycles.toLocaleString()} cycles · ${(share * 100).toFixed(2)}% of the 70M default verification limit`}>
            <span className="w-14 text-right font-mono tabular-nums text-gray-200">{formatCycles(cycles)}</span>
            <span className="hidden h-1.5 w-20 overflow-hidden rounded-full bg-[#21262d] sm:block">
                <span
                    className={`block h-full rounded-full ${share > 0.8 ? 'bg-rose-400' : share > 0.4 ? 'bg-amber-400' : 'bg-emerald-400'}`}
                    style={{ width: `${Math.max(2, share * 100)}%` }}
                />
            </span>
        </span>
    );
}

function ExitSummary({ run }: { run: ScriptRunResult }) {
    if (run.vmError) return <span className="text-rose-300">{run.vmError}</span>;
    if (run.exitCode === null) return <span className="text-gray-500">—</span>;

    return (
        <span className="min-w-0">
            <span className={`font-mono ${run.exitCode === 0 ? 'text-emerald-300' : 'text-rose-300'}`}>exit {run.exitCode}</span>
            {run.meaning && run.exitCode !== 0 && <span className="text-gray-400"> · {run.meaning}</span>}
        </span>
    );
}

function Logs({ logs }: { logs: string[] }) {
    if (!logs.length) return <p className="text-[11px] text-gray-600">No debug output. Use ckb_std::debug! in your contract to print here.</p>;

    return (
        <pre className="max-h-48 overflow-auto rounded-md border border-[#21262d] bg-[#010409] p-2 font-mono text-[11px] leading-[1.5] text-gray-300">
            {logs.join('\n')}
        </pre>
    );
}

function GroupRow({ group }: { group: ScriptGroupResult }) {
    const [open, setOpen] = useState(outcome(group) === 'fail');
    const kind = outcome(group);

    return (
        <li className="border-b border-[#21262d] last:border-b-0">
            <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-[#161b22]">
                {open ? <ChevronDown className="h-3.5 w-3.5 shrink-0 text-gray-500" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0 text-gray-500" />}
                <OutcomeIcon kind={kind} />
                <span className="w-[108px] shrink-0 font-mono text-[11.5px] text-gray-400">{group.label}</span>
                <span className="min-w-0 flex-1 truncate">
                    <span className={group.contract ? 'font-mono text-gray-100' : 'text-gray-300'}>{group.name ?? short(group.codeHash, 6, 4)}</span>
                    {group.replaced && <span className="ml-2 rounded border border-[#1f6feb]/40 px-1 text-[10px] text-[#79b8ff]">latest build</span>}
                    <span className="ml-2 text-[11.5px]">{group.skipped ? <span className="text-gray-500">skipped</span> : <ExitSummary run={group} />}</span>
                </span>
                <CyclesBar cycles={group.cycles} />
            </button>

            {open && (
                <div className="space-y-2 px-3 pb-3 pl-[52px] text-[11.5px]">
                    {group.skipped ? (
                        <p className="text-gray-500">{group.skipped}</p>
                    ) : (
                        <>
                            {kind === 'fail' && (
                                <p className="whitespace-normal">
                                    <ExitSummary run={group} />
                                </p>
                            )}
                            <Logs logs={group.logs} />
                            {group.cycles !== null && (
                                <p className="text-gray-500">
                                    {group.cycles.toLocaleString()} cycles · {((group.cycles / TX_VERIFY_LIMIT) * 100).toFixed(2)}% of the 70M default verification limit
                                </p>
                            )}
                        </>
                    )}
                    <p className="truncate font-mono text-[10.5px] text-gray-600" title={`${group.codeHash} (${group.hashType}) args ${group.args}`}>
                        code {short(group.codeHash)} · {group.hashType} · args {group.args.length > 22 ? short(group.args, 8, 4) : group.args}
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
        <div className="grid h-full min-h-0 grid-cols-[minmax(260px,320px)_minmax(0,1fr)] text-[12.5px]">
            {/* ---------------------------------------------------- Controls */}
            <div className="flex min-h-0 flex-col border-r border-[#30363d]">
                <div className="p-3 pb-2">
                    <div role="radiogroup" className="grid grid-cols-2 rounded-md border border-[#30363d] p-0.5">
                        {([['tx', 'Transaction'], ['run', 'Run binary']] as const).map(([key, label]) => (
                            <button
                                key={key}
                                type="button"
                                role="radio"
                                aria-checked={mode === key}
                                onClick={() => setMode(key)}
                                className={`h-7 rounded text-[12px] ${mode === key ? 'bg-[#21262d] font-medium text-white' : 'text-gray-400 hover:text-gray-200'}`}
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
                                placeholder="Devnet transaction hash (0x…)"
                                aria-label="Transaction hash"
                                spellCheck={false}
                                className="h-8 w-full rounded-md border border-[#30363d] bg-[#0d1117] px-2 font-mono text-[11.5px] text-gray-200 placeholder:font-sans placeholder:text-gray-600 focus:border-[#58a6ff] focus:outline-none"
                            />

                            {swappable.length > 0 && (
                                <fieldset className="space-y-1">
                                    <legend className="mb-1 text-[11px] text-gray-500">Run with my latest build</legend>
                                    {swappable.map((name) => (
                                        <label key={name} className="flex cursor-pointer items-center gap-2 font-mono text-[11.5px] text-gray-300">
                                            <input
                                                type="checkbox"
                                                checked={replace.includes(name)}
                                                onChange={(e) => setReplace((list) => (e.target.checked ? [...list, name] : list.filter((n) => n !== name)))}
                                                className="accent-[#58a6ff]"
                                            />
                                            {name}
                                        </label>
                                    ))}
                                </fieldset>
                            )}

                            <button
                                type="submit"
                                disabled={!txHash.trim() || debugTx.isPending || !devnetRunning}
                                className="flex h-8 w-full items-center justify-center gap-1.5 rounded-md bg-[#238636] font-medium text-white hover:bg-[#2ea043] disabled:bg-[#21262d] disabled:text-gray-500"
                            >
                                {debugTx.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Bug className="h-3.5 w-3.5" />}
                                {debugTx.isPending ? 'Replaying scripts…' : 'Debug transaction'}
                            </button>
                        </form>

                        {!devnetRunning ? (
                            <p className="m-3 rounded-md border border-dashed border-[#30363d] px-3 py-2 text-gray-400">
                                Start the devnet to debug its transactions.
                            </p>
                        ) : (
                            <div className="mt-3 flex min-h-0 flex-1 flex-col border-t border-[#30363d]">
                                <div className="flex h-8 shrink-0 items-center justify-between px-3">
                                    <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Recent transactions</span>
                                    <button type="button" onClick={() => void recent.refetch()} aria-label="Refresh" className="rounded p-0.5 text-gray-500 hover:bg-[#21262d] hover:text-gray-200">
                                        <RefreshCw className={`h-3 w-3 ${recent.isFetching ? 'animate-spin' : ''}`} />
                                    </button>
                                </div>
                                <ul className="min-h-0 flex-1 overflow-y-auto">
                                    {(recent.data ?? []).length === 0 ? (
                                        <li className="px-3 py-2 text-[11.5px] leading-[1.5] text-gray-500">
                                            Transactions sent through the devnet’s RPC proxy (<span className="font-mono">$CKB_PROXY_RPC_URL</span>) show up here, even ones the node rejected.
                                        </li>
                                    ) : (
                                        recent.data!.map((tx) => (
                                            <li key={tx.txHash}>
                                                <button
                                                    type="button"
                                                    onClick={() => submit(undefined, tx.txHash)}
                                                    className={`flex w-full items-center gap-2 px-3 py-1.5 text-left hover:bg-[#161b22] ${result?.txHash === tx.txHash ? 'bg-[#1f6feb]/10' : ''}`}
                                                >
                                                    <span className="min-w-0 flex-1 truncate font-mono text-[11.5px] text-gray-300">{short(tx.txHash, 8, 6)}</span>
                                                    <StatusBadge status={tx.status} />
                                                    <span className="w-12 shrink-0 text-right text-[10.5px] text-gray-500">{timeAgo(tx.recordedAt)}</span>
                                                </button>
                                            </li>
                                        ))
                                    )}
                                </ul>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="space-y-2 px-3">
                        {contracts.data && contracts.data.length === 0 ? (
                            <p className="rounded-md border border-dashed border-[#30363d] px-3 py-2 text-gray-400">No built contracts yet. Run a build first.</p>
                        ) : (
                            <select
                                value={contract}
                                onChange={(e) => setContract(e.target.value)}
                                aria-label="Contract"
                                className="h-8 w-full rounded-md border border-[#30363d] bg-[#0d1117] px-2 font-mono text-[12px] text-gray-200 focus:border-[#58a6ff] focus:outline-none"
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
                            className="flex h-8 w-full items-center justify-center gap-1.5 rounded-md bg-[#238636] font-medium text-white hover:bg-[#2ea043] disabled:bg-[#21262d] disabled:text-gray-500"
                        >
                            {runBinary.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                            Run in ckb-debugger
                        </button>
                        <p className="text-[11.5px] leading-[1.5] text-gray-500">
                            Runs the binary without a transaction. Syscalls that read cells or witnesses fail, so debug a real transaction for realistic cycles.
                        </p>
                    </div>
                )}
            </div>

            {/* ---------------------------------------------------- Results */}
            <div className="flex min-h-0 flex-col">
                {mode === 'tx' ? (
                    debugTx.isError ? (
                        <div className="m-3 flex items-start gap-2 rounded-md border border-rose-500/30 bg-rose-500/5 px-3 py-2.5 text-rose-200">
                            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                            <span className="whitespace-pre-wrap text-[12px]">{(debugTx.error as Error).message}</span>
                        </div>
                    ) : result ? (
                        <>
                            <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1 border-b border-[#30363d] px-3 py-2">
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
                                    className="inline-flex items-center gap-1 font-mono text-[12px] text-gray-200 hover:text-white"
                                    title="Copy transaction hash"
                                >
                                    {short(result.txHash, 10, 8)}
                                    {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3 text-gray-500" />}
                                </button>
                                <StatusBadge status={result.status} />
                                <span className="text-[11.5px] text-gray-400">
                                    {result.groups.length} script{result.groups.length === 1 ? '' : 's'} ·{' '}
                                    <span className="font-mono text-gray-200">{formatCycles(result.totalCycles)}</span> cycles
                                    {result.failed > 0 && <span className="text-rose-300"> · {result.failed} failed</span>}
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
                            {result.truncated && <p className="border-t border-[#30363d] px-3 py-1.5 text-[11px] text-gray-500">Only the first 24 script groups were run.</p>}
                        </>
                    ) : (
                        <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center text-gray-500">
                            <Bug className="h-5 w-5 text-gray-600" />
                            <p className="max-w-[420px] text-[12px] leading-[1.6]">
                                Pick a recent transaction or paste a hash. Every lock and type script is replayed in ckb-debugger, with its exit
                                code, cycles and debug output.
                            </p>
                        </div>
                    )
                ) : runBinary.isError ? (
                    <div className="m-3 flex items-start gap-2 rounded-md border border-rose-500/30 bg-rose-500/5 px-3 py-2.5 text-rose-200">
                        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        <span className="text-[12px]">{(runBinary.error as Error).message}</span>
                    </div>
                ) : run ? (
                    <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
                        <div className="flex flex-wrap items-center gap-3">
                            <OutcomeIcon kind={outcome(run)} />
                            <span className="font-mono text-[12.5px] text-gray-100">{run.contract}</span>
                            <span className="text-[12px]">
                                <ExitSummary run={run} />
                            </span>
                            <span className="ml-auto">
                                <CyclesBar cycles={run.cycles} />
                            </span>
                        </div>
                        <Logs logs={run.logs} />
                        <p className="text-[11.5px] text-gray-500">{run.note}</p>
                        {outcome(run) === 'fail' && (
                            <AskClaudeButton
                                kind="terminal"
                                prompt={`Running ${run.contract} in ckb-debugger failed. What does this mean?`}
                                output={run.raw}
                            />
                        )}
                    </div>
                ) : (
                    <div className="flex h-full items-center justify-center p-6 text-center text-[12px] text-gray-500">
                        Run a built contract to see its exit code, cycles and debug output.
                    </div>
                )}
            </div>
        </div>
    );
}
