// src/features/devnet/DevnetTools.tsx
//
// Devnet tools on the Devnets page: pre-funded accounts (send CKB), a cell
// browser, and a transaction builder. Everything talks to the workspace
// devnet through the gateway's RPC relay, so transactions sent here also
// appear in the IDE's Debug tab (including rejected ones).

import { useMemo, useState, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ccc } from '@ckb-ccc/connector-react';
import {
    AlertTriangle,
    Check,
    Copy,
    Eye,
    EyeOff,
    Loader2,
    Plus,
    Search,
    Send,
    Trash2,
} from 'lucide-react';

import { apiClient } from '../../lib/api-client';
import { deployApi, type ContractDeployment } from '../deploy/deploy.api';
import { workspaceKeys } from '../workspace/queries/workspace.keys';
import {
    buildTransaction,
    createDevnetClient,
    describeError,
    signAndSend,
    transactionJson,
    transfer,
    type OutputSpec,
    type ScriptSpec,
} from './devnet-client';

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

export interface DevnetAccount {
    index: number;
    address: string;
    privkey: string;
    lockArgs: string;
    lockScript: { codeHash: string; hashType: string; args: string };
    balance: string;
    note: string | null;
}

const toolKeys = {
    accounts: (id: string) => [...workspaceKeys.detail(id), 'devnet', 'accounts'] as const,
    scripts: (id: string) => [...workspaceKeys.detail(id), 'devnet', 'scripts'] as const,
    deployments: (id: string) => [...workspaceKeys.detail(id), 'deployments'] as const,
};

function useDevnetClient(workspaceId: string) {
    const scripts = useQuery({
        queryKey: toolKeys.scripts(workspaceId),
        queryFn: () => apiClient<Record<string, unknown>>(`/workspaces/${workspaceId}/devnet/scripts`),
        staleTime: Infinity,
    });

    const client = useMemo(
        () =>
            scripts.data
                ? createDevnetClient(scripts.data, (payload) =>
                      apiClient(`/workspaces/${workspaceId}/devnet/rpc`, { method: 'POST', body: JSON.stringify(payload) }),
                  )
                : null,
        [scripts.data, workspaceId],
    );

    return { client, error: scripts.error as Error | null, isLoading: scripts.isLoading };
}

function useAccounts(workspaceId: string) {
    return useQuery({
        queryKey: toolKeys.accounts(workspaceId),
        queryFn: () => apiClient<DevnetAccount[]>(`/workspaces/${workspaceId}/devnet/accounts`),
    });
}

// ---------------------------------------------------------------------------
// Small pieces
// ---------------------------------------------------------------------------

function short(hash: string, head = 8, tail = 6) {
    return hash.length > head + tail + 2 ? `${hash.slice(0, head + 2)}…${hash.slice(-tail)}` : hash;
}

function ckb(shannons: bigint | string | number) {
    const value = BigInt(shannons);
    const whole = value / 100_000_000n;
    const frac = value % 100_000_000n;
    return `${whole.toLocaleString()}${frac ? `.${frac.toString().padStart(8, '0').replace(/0+$/, '').slice(0, 4)}` : ''}`;
}

function CopyInline({ value, label, children }: { value: string; label: string; children?: ReactNode }) {
    const [done, setDone] = useState(false);
    return (
        <button
            type="button"
            title={label}
            aria-label={label}
            onClick={async () => {
                try {
                    await navigator.clipboard.writeText(value);
                    setDone(true);
                    setTimeout(() => setDone(false), 1400);
                } catch {
                    /* clipboard blocked */
                }
            }}
            className="inline-flex min-w-0 items-center gap-1.5 font-mono text-left hover:text-white"
        >
            {children && <span className="truncate">{children}</span>}
            {done ? <Check className="h-3 w-3 shrink-0 text-emerald-400" /> : <Copy className="h-3 w-3 shrink-0 text-gray-600" />}
        </button>
    );
}

const inputClass =
    'h-8 w-full rounded-md border border-[#30363d] bg-[#0d1117] px-2 text-[12.5px] text-gray-200 placeholder:text-gray-600 focus:border-[#58a6ff] focus:outline-none';

function Label({ children }: { children: ReactNode }) {
    return <span className="mb-1 block text-[11.5px] text-gray-400">{children}</span>;
}

function ErrorBox({ message }: { message: string }) {
    return (
        <div className="flex items-start gap-2 rounded-md border border-rose-500/30 bg-rose-500/5 px-3 py-2.5 text-[12.5px] text-rose-200">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span className="min-w-0 whitespace-pre-wrap break-words">{message}</span>
        </div>
    );
}

function SentBox({ txHash, children }: { txHash: string; children?: ReactNode }) {
    return (
        <div className="rounded-md border border-emerald-500/30 bg-emerald-500/5 px-3 py-2.5 text-[12.5px] text-emerald-200">
            <div className="flex items-center gap-2">
                <Check className="h-3.5 w-3.5 shrink-0" /> Sent
                <span className="text-emerald-100/80">
                    <CopyInline value={txHash} label="Copy transaction hash">
                        {short(txHash, 10, 8)}
                    </CopyInline>
                </span>
            </div>
            {children}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Accounts
// ---------------------------------------------------------------------------

export function AccountsTab({ workspaceId }: { workspaceId: string }) {
    const queryClient = useQueryClient();
    const accounts = useAccounts(workspaceId);
    const { client, error: clientError } = useDevnetClient(workspaceId);

    const [revealed, setRevealed] = useState<number | null>(null);
    const [from, setFrom] = useState(0);
    const [to, setTo] = useState('');
    const [amount, setAmount] = useState('1000');

    const send = useMutation({
        mutationFn: async () => {
            if (!client || !accounts.data) throw new Error('The devnet client is not ready yet.');
            const sender = accounts.data.find((a) => a.index === from);
            if (!sender) throw new Error('Choose an account to send from.');
            if (!to.trim()) throw new Error('Enter a recipient address.');
            if (!(Number(amount) >= 61)) throw new Error('Send at least 61 CKB (the smallest cell).');
            const hash = await transfer(client, sender.privkey, to.trim(), amount);
            await client.waitTransaction(hash, 0, 60_000).catch(() => undefined);
            return hash;
        },
        onSuccess: () => void queryClient.invalidateQueries({ queryKey: toolKeys.accounts(workspaceId) }),
    });

    return (
        <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_320px]">
            <section className="min-w-0 overflow-hidden rounded-lg border border-[#30363d]">
                <div className="flex h-10 items-center justify-between border-b border-[#30363d] bg-[#161b22] px-4">
                    <span className="text-[13px] font-medium text-gray-200">Pre-funded accounts</span>
                    <span className="text-[11.5px] text-gray-500">Test keys: devnet only</span>
                </div>
                {accounts.isLoading ? (
                    <div className="h-40 animate-pulse bg-[#161b22]" />
                ) : accounts.isError ? (
                    <div className="p-4">
                        <ErrorBox message={(accounts.error as Error).message} />
                    </div>
                ) : (
                    <div className="max-h-[520px] overflow-auto">
                        <table className="w-full min-w-[560px] text-[12.5px]">
                            <thead className="sticky top-0 bg-[#0d1117]">
                                <tr className="border-b border-[#21262d] text-left text-[11.5px] text-gray-500">
                                    <th className="w-10 px-4 py-2 font-medium">#</th>
                                    <th className="px-4 py-2 font-medium">Address</th>
                                    <th className="px-4 py-2 text-right font-medium">Balance (CKB)</th>
                                    <th className="px-4 py-2 font-medium">Private key</th>
                                </tr>
                            </thead>
                            <tbody>
                                {accounts.data!.map((a) => (
                                    <tr key={a.index} className="border-b border-[#21262d] last:border-b-0">
                                        <td className="px-4 py-2 font-mono text-gray-500">{a.index}</td>
                                        <td className="max-w-0 px-4 py-2 text-gray-300">
                                            <CopyInline value={a.address} label="Copy address">
                                                {short(a.address, 12, 8)}
                                            </CopyInline>
                                            {a.note && <span className="ml-2 text-[10.5px] text-gray-500">{a.note}</span>}
                                        </td>
                                        <td className="whitespace-nowrap px-4 py-2 text-right font-mono tabular-nums text-gray-200">{ckb(a.balance)}</td>
                                        <td className="px-4 py-2 text-gray-400">
                                            <span className="inline-flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setRevealed(revealed === a.index ? null : a.index)}
                                                    aria-label={revealed === a.index ? 'Hide private key' : 'Show private key'}
                                                    className="text-gray-500 hover:text-gray-200"
                                                >
                                                    {revealed === a.index ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                                                </button>
                                                {revealed === a.index ? (
                                                    <CopyInline value={a.privkey} label="Copy private key">
                                                        {short(a.privkey, 10, 6)}
                                                    </CopyInline>
                                                ) : (
                                                    <span className="font-mono text-gray-600">••••••••</span>
                                                )}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            <aside className="space-y-3 self-start rounded-lg border border-[#30363d] bg-[#161b22] p-4">
                <h3 className="flex items-center gap-2 text-[13px] font-medium text-gray-200">
                    <Send className="h-3.5 w-3.5 text-gray-400" /> Send CKB
                </h3>
                <label className="block">
                    <Label>From</Label>
                    <select value={from} onChange={(e) => setFrom(Number(e.target.value))} className={inputClass}>
                        {(accounts.data ?? []).map((a) => (
                            <option key={a.index} value={a.index}>
                                #{a.index} · {ckb(a.balance)} CKB
                            </option>
                        ))}
                    </select>
                </label>
                <label className="block">
                    <Label>To address</Label>
                    <input value={to} onChange={(e) => setTo(e.target.value)} placeholder="ckt1…" spellCheck={false} className={`${inputClass} font-mono`} />
                    <span className="mt-1 flex flex-wrap gap-1">
                        {(accounts.data ?? []).slice(0, 6).filter((a) => a.index !== from).slice(0, 4).map((a) => (
                            <button key={a.index} type="button" onClick={() => setTo(a.address)} className="rounded border border-[#30363d] px-1.5 text-[10.5px] text-gray-400 hover:text-gray-200">
                                #{a.index}
                            </button>
                        ))}
                    </span>
                </label>
                <label className="block">
                    <Label>Amount (CKB)</Label>
                    <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" className={`${inputClass} font-mono`} />
                </label>
                <button
                    type="button"
                    onClick={() => send.mutate()}
                    disabled={send.isPending || !client}
                    className="flex h-8 w-full items-center justify-center gap-1.5 rounded-md bg-[#238636] text-[13px] font-medium text-white hover:bg-[#2ea043] disabled:bg-[#21262d] disabled:text-gray-500"
                >
                    {send.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                    Send
                </button>
                {clientError && <ErrorBox message={clientError.message} />}
                {send.isError && <ErrorBox message={describeError(send.error)} />}
                {send.data && <SentBox txHash={send.data} />}
            </aside>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Cells
// ---------------------------------------------------------------------------

interface FoundCell {
    txHash: string;
    index: number;
    capacity: bigint;
    lock: ScriptSpec;
    type: ScriptSpec | null;
    data: string;
}

function decodeText(hex: string): string | null {
    if (hex.length <= 2) return null;
    try {
        const text = new TextDecoder('utf-8', { fatal: true }).decode(ccc.bytesFrom(hex));
        return /^[\x20-\x7e\s]+$/.test(text) ? text : null;
    } catch {
        return null;
    }
}

function scriptLabel(script: ScriptSpec, names: Map<string, string>) {
    return names.get(script.codeHash) ?? `${short(script.codeHash, 6, 4)} · ${script.hashType}`;
}

export function CellsTab({ workspaceId }: { workspaceId: string }) {
    const { client, error: clientError } = useDevnetClient(workspaceId);
    const accounts = useAccounts(workspaceId);
    const deployments = useQuery({ queryKey: toolKeys.deployments(workspaceId), queryFn: () => deployApi.deployments(workspaceId) });

    const [mode, setMode] = useState<'address' | 'script'>('address');
    const [address, setAddress] = useState('');
    const [spec, setSpec] = useState<ScriptSpec>({ codeHash: '', hashType: 'type', args: '0x' });
    const [scriptType, setScriptType] = useState<'lock' | 'type'>('type');
    const [prefix, setPrefix] = useState(true);

    const names = useMemo(() => {
        const map = new Map<string, string>([
            ['0x9bd7e06f3ecf4be0f2fcd2188b23f1b9fcc88e5d4b65a8637b17723bbda3cce8', 'secp256k1 lock'],
            ['0x00000000000000000000000000000000000000000000000000545950455f4944', 'Type ID'],
        ]);
        for (const d of deployments.data ?? []) if (d.network === 'DEVNET') map.set(d.codeHash, d.contractName);
        return map;
    }, [deployments.data]);

    const search = useMutation({
        mutationFn: async (): Promise<FoundCell[]> => {
            if (!client) throw new Error('The devnet client is not ready yet.');

            let key: ccc.ClientIndexerSearchKeyLike;
            if (mode === 'address') {
                const { script } = await ccc.Address.fromString(address.trim(), client);
                key = { script, scriptType: 'lock', scriptSearchMode: 'exact' };
            } else {
                if (!/^0x[0-9a-f]{64}$/i.test(spec.codeHash.trim())) throw new Error('Code hash must be 0x followed by 64 hex characters.');
                key = {
                    script: { codeHash: spec.codeHash.trim(), hashType: spec.hashType as ccc.HashTypeLike, args: spec.args.trim() || '0x' },
                    scriptType,
                    scriptSearchMode: prefix ? 'prefix' : 'exact',
                };
            }

            const found: FoundCell[] = [];
            for await (const cell of client.findCells(key, 'desc', 50)) {
                found.push({
                    txHash: cell.outPoint.txHash,
                    index: Number(cell.outPoint.index),
                    capacity: cell.cellOutput.capacity,
                    lock: { codeHash: cell.cellOutput.lock.codeHash, hashType: cell.cellOutput.lock.hashType, args: cell.cellOutput.lock.args },
                    type: cell.cellOutput.type
                        ? { codeHash: cell.cellOutput.type.codeHash, hashType: cell.cellOutput.type.hashType, args: cell.cellOutput.type.args }
                        : null,
                    data: cell.outputData,
                });
                if (found.length >= 50) break;
            }
            return found;
        },
    });

    const deployedHere = (deployments.data ?? []).filter((d) => d.network === 'DEVNET');

    return (
        <div className="mt-6 space-y-4">
            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    search.mutate();
                }}
                className="space-y-3 rounded-lg border border-[#30363d] bg-[#161b22] p-4"
            >
                <div className="flex flex-wrap items-center gap-3">
                    <div role="radiogroup" className="inline-grid grid-cols-2 rounded-md border border-[#30363d] p-0.5">
                        {([['address', 'By address'], ['script', 'By script']] as const).map(([key, label]) => (
                            <button
                                key={key}
                                type="button"
                                role="radio"
                                aria-checked={mode === key}
                                onClick={() => setMode(key)}
                                className={`h-7 rounded px-3 text-[12px] ${mode === key ? 'bg-[#21262d] font-medium text-white' : 'text-gray-400 hover:text-gray-200'}`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                    <span className="text-[11.5px] text-gray-500">Live cells from the devnet indexer, newest first.</span>
                </div>

                {mode === 'address' ? (
                    <div>
                        <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="ckt1… address (cells it owns)" spellCheck={false} className={`${inputClass} font-mono`} />
                        <span className="mt-1.5 flex flex-wrap gap-1">
                            {(accounts.data ?? []).slice(0, 5).map((a) => (
                                <button key={a.index} type="button" onClick={() => setAddress(a.address)} className="rounded border border-[#30363d] px-1.5 text-[10.5px] text-gray-400 hover:text-gray-200">
                                    account #{a.index}
                                </button>
                            ))}
                        </span>
                    </div>
                ) : (
                    <div className="space-y-2">
                        <div className="grid gap-2 md:grid-cols-[1fr_110px_1fr]">
                            <input value={spec.codeHash} onChange={(e) => setSpec({ ...spec, codeHash: e.target.value })} placeholder="Code hash 0x…" spellCheck={false} className={`${inputClass} font-mono`} />
                            <select value={spec.hashType} onChange={(e) => setSpec({ ...spec, hashType: e.target.value })} className={inputClass}>
                                {['type', 'data', 'data1', 'data2'].map((t) => (
                                    <option key={t}>{t}</option>
                                ))}
                            </select>
                            <input value={spec.args} onChange={(e) => setSpec({ ...spec, args: e.target.value })} placeholder="Args 0x…" spellCheck={false} className={`${inputClass} font-mono`} />
                        </div>
                        <div className="flex flex-wrap items-center gap-4 text-[12px] text-gray-300">
                            <label className="flex items-center gap-1.5">
                                <input type="radio" checked={scriptType === 'type'} onChange={() => setScriptType('type')} className="accent-[#58a6ff]" /> Type script
                            </label>
                            <label className="flex items-center gap-1.5">
                                <input type="radio" checked={scriptType === 'lock'} onChange={() => setScriptType('lock')} className="accent-[#58a6ff]" /> Lock script
                            </label>
                            <label className="flex items-center gap-1.5">
                                <input type="checkbox" checked={prefix} onChange={(e) => setPrefix(e.target.checked)} className="accent-[#58a6ff]" /> Args as prefix
                            </label>
                            {deployedHere.length > 0 && (
                                <span className="flex flex-wrap items-center gap-1">
                                    <span className="text-[11px] text-gray-500">Your contracts:</span>
                                    {[...new Map(deployedHere.map((d) => [d.codeHash, d])).values()].map((d: ContractDeployment) => (
                                        <button
                                            key={d.id}
                                            type="button"
                                            onClick={() => setSpec({ codeHash: d.codeHash, hashType: d.hashType, args: '0x' })}
                                            className="rounded border border-[#30363d] px-1.5 font-mono text-[10.5px] text-gray-400 hover:text-gray-200"
                                        >
                                            {d.contractName}
                                        </button>
                                    ))}
                                </span>
                            )}
                        </div>
                    </div>
                )}

                <button
                    type="submit"
                    disabled={search.isPending || !client}
                    className="inline-flex h-8 items-center gap-1.5 rounded-md bg-[#238636] px-3 text-[13px] font-medium text-white hover:bg-[#2ea043] disabled:bg-[#21262d] disabled:text-gray-500"
                >
                    {search.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
                    Find cells
                </button>
                {clientError && <ErrorBox message={clientError.message} />}
                {search.isError && <ErrorBox message={describeError(search.error)} />}
            </form>

            {search.data && (
                <section className="overflow-hidden rounded-lg border border-[#30363d]">
                    <div className="flex h-10 items-center justify-between border-b border-[#30363d] bg-[#161b22] px-4">
                        <span className="text-[13px] font-medium text-gray-200">
                            {search.data.length} cell{search.data.length === 1 ? '' : 's'}
                            {search.data.length === 50 ? ' (first 50)' : ''}
                        </span>
                    </div>
                    {search.data.length === 0 ? (
                        <p className="px-4 py-6 text-center text-[12.5px] text-gray-500">No live cells match.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[720px] text-[12px]">
                                <thead>
                                    <tr className="border-b border-[#21262d] text-left text-[11.5px] text-gray-500">
                                        <th className="px-4 py-2 font-medium">Out point</th>
                                        <th className="px-4 py-2 text-right font-medium">Capacity</th>
                                        <th className="px-4 py-2 font-medium">Lock</th>
                                        <th className="px-4 py-2 font-medium">Type</th>
                                        <th className="px-4 py-2 font-medium">Data</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {search.data.map((cell) => {
                                        const text = decodeText(cell.data);
                                        const bytes = (cell.data.length - 2) / 2;
                                        return (
                                            <tr key={`${cell.txHash}-${cell.index}`} className="border-b border-[#21262d] align-top last:border-b-0">
                                                <td className="px-4 py-2 text-gray-300">
                                                    <CopyInline value={`${cell.txHash}:${cell.index}`} label="Copy out point">
                                                        {short(cell.txHash, 6, 4)}:{cell.index}
                                                    </CopyInline>
                                                </td>
                                                <td className="whitespace-nowrap px-4 py-2 text-right font-mono tabular-nums text-gray-200">{ckb(cell.capacity)}</td>
                                                <td className="px-4 py-2 text-gray-400" title={`${cell.lock.codeHash} ${cell.lock.hashType} ${cell.lock.args}`}>
                                                    {scriptLabel(cell.lock, names)}
                                                    <span className="block font-mono text-[10.5px] text-gray-600">args {short(cell.lock.args, 6, 4)}</span>
                                                </td>
                                                <td className="px-4 py-2 text-gray-400" title={cell.type ? `${cell.type.codeHash} ${cell.type.hashType} ${cell.type.args}` : ''}>
                                                    {cell.type ? (
                                                        <>
                                                            {scriptLabel(cell.type, names)}
                                                            <span className="block font-mono text-[10.5px] text-gray-600">args {short(cell.type.args, 6, 4)}</span>
                                                        </>
                                                    ) : (
                                                        <span className="text-gray-600">—</span>
                                                    )}
                                                </td>
                                                <td className="max-w-[260px] px-4 py-2 text-gray-400">
                                                    {bytes === 0 ? (
                                                        <span className="text-gray-600">empty</span>
                                                    ) : (
                                                        <>
                                                            <span className="text-[10.5px] text-gray-500">{bytes.toLocaleString()} bytes</span>
                                                            <span className="block truncate font-mono text-[11px]" title={text ?? cell.data}>
                                                                {text ? `"${text}"` : short(cell.data, 16, 8)}
                                                            </span>
                                                        </>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>
            )}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Transaction builder
// ---------------------------------------------------------------------------

interface OutputRow extends Omit<OutputSpec, 'lock'> {
    id: number;
    lockMode: 'address' | 'script';
    address: string;
    lockScript: ScriptSpec;
    withType: boolean;
}

const emptyScript = (): ScriptSpec => ({ codeHash: '', hashType: 'type', args: '0x' });

let nextRowId = 1;
const newRow = (address = ''): OutputRow => ({
    id: nextRowId++,
    lockMode: 'address',
    address,
    lockScript: emptyScript(),
    capacityCkb: '',
    withType: false,
    type: emptyScript(),
    data: '',
    dataFormat: 'text',
});

function ScriptFields({ value, onChange, contracts }: { value: ScriptSpec; onChange: (v: ScriptSpec) => void; contracts: ContractDeployment[] }) {
    return (
        <div className="space-y-1.5">
            <div className="grid gap-1.5 md:grid-cols-[1fr_96px_minmax(0,0.6fr)]">
                <input value={value.codeHash} onChange={(e) => onChange({ ...value, codeHash: e.target.value })} placeholder="Code hash 0x…" spellCheck={false} className={`${inputClass} font-mono`} />
                <select value={value.hashType} onChange={(e) => onChange({ ...value, hashType: e.target.value })} className={inputClass}>
                    {['type', 'data', 'data1', 'data2'].map((t) => (
                        <option key={t}>{t}</option>
                    ))}
                </select>
                <input value={value.args} onChange={(e) => onChange({ ...value, args: e.target.value })} placeholder="Args 0x…" spellCheck={false} className={`${inputClass} font-mono`} />
            </div>
            {contracts.length > 0 && (
                <span className="flex flex-wrap items-center gap-1">
                    <span className="text-[10.5px] text-gray-500">Use:</span>
                    {contracts.map((d) => (
                        <button
                            key={d.id}
                            type="button"
                            onClick={() => onChange({ codeHash: d.codeHash, hashType: d.hashType, args: value.args || '0x' })}
                            className="rounded border border-[#30363d] px-1.5 font-mono text-[10.5px] text-gray-400 hover:text-gray-200"
                        >
                            {d.contractName}
                        </button>
                    ))}
                </span>
            )}
        </div>
    );
}

export function TxBuilderTab({ workspaceId }: { workspaceId: string }) {
    const queryClient = useQueryClient();
    const { client, error: clientError } = useDevnetClient(workspaceId);
    const accounts = useAccounts(workspaceId);
    const deployments = useQuery({ queryKey: toolKeys.deployments(workspaceId), queryFn: () => deployApi.deployments(workspaceId) });

    // Newest devnet deployment of each contract (older cells are spent by upgrades).
    const contracts = useMemo(() => {
        const seen = new Map<string, ContractDeployment>();
        for (const d of deployments.data ?? []) if (d.network === 'DEVNET' && !seen.has(d.contractName)) seen.set(d.contractName, d);
        return [...seen.values()];
    }, [deployments.data]);

    const [payer, setPayer] = useState(1);
    const [rows, setRows] = useState<OutputRow[]>(() => [newRow()]);
    const [deps, setDeps] = useState<string[]>([]);
    const [inputs, setInputs] = useState<Array<{ outPoint: string; witness: string }>>([]);
    const [preview, setPreview] = useState<string | null>(null);

    const update = (id: number, patch: Partial<OutputRow>) => setRows((list) => list.map((r) => (r.id === id ? { ...r, ...patch } : r)));

    const spec = () => {
        const account = accounts.data?.find((a) => a.index === payer);
        if (!account) throw new Error('Choose the account that pays.');

        const parsedInputs = inputs
            .filter((i) => i.outPoint.trim())
            .map((i) => {
                const match = /^(0x[0-9a-fA-F]{64})[:#](\d+)$/.exec(i.outPoint.trim());
                if (!match) throw new Error(`Inputs are written txHash:index, got "${i.outPoint}"`);
                return { txHash: match[1], index: Number(match[2]), witness: i.witness };
            });

        return {
            privkey: account.privkey,
            outputs: rows.map((r) => ({
                lock: r.lockMode === 'address' ? { address: r.address } : { script: r.lockScript },
                capacityCkb: r.capacityCkb,
                type: r.withType ? r.type : null,
                data: r.data,
                dataFormat: r.dataFormat,
            })),
            cellDeps: contracts.filter((c) => deps.includes(c.id)).map((c) => ({ txHash: c.txHash, index: c.outputIndex, depType: 'code' as const })),
            inputs: parsedInputs.map(({ txHash, index }) => ({ txHash, index })),
            witnesses: parsedInputs.map((i) => i.witness),
        };
    };

    const build = useMutation({
        mutationFn: async () => {
            if (!client) throw new Error('The devnet client is not ready yet.');
            const { tx } = await buildTransaction(client, spec());
            return transactionJson(tx);
        },
        onSuccess: (json) => setPreview(json),
    });

    const send = useMutation({
        mutationFn: async () => {
            if (!client) throw new Error('The devnet client is not ready yet.');
            const { tx, signer } = await buildTransaction(client, spec());
            setPreview(transactionJson(tx));
            const hash = await signAndSend(signer, tx);
            await client.waitTransaction(hash, 0, 60_000).catch(() => undefined);
            return hash;
        },
        onSuccess: () => void queryClient.invalidateQueries({ queryKey: toolKeys.accounts(workspaceId) }),
    });

    const busy = build.isPending || send.isPending;
    const error = send.error ?? build.error;

    return (
        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)]">
            <div className="space-y-4">
                <section className="rounded-lg border border-[#30363d] bg-[#161b22] p-4">
                    <label className="block max-w-[320px]">
                        <Label>Paid by (fills inputs, change and fee)</Label>
                        <select value={payer} onChange={(e) => setPayer(Number(e.target.value))} className={inputClass}>
                            {(accounts.data ?? []).map((a) => (
                                <option key={a.index} value={a.index}>
                                    Account #{a.index} · {ckb(a.balance)} CKB
                                </option>
                            ))}
                        </select>
                    </label>
                </section>

                <section className="space-y-3 rounded-lg border border-[#30363d] bg-[#161b22] p-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-[13px] font-medium text-gray-200">Outputs</h3>
                        <button type="button" onClick={() => setRows((l) => [...l, newRow()])} className="inline-flex items-center gap-1 rounded border border-[#30363d] px-2 py-0.5 text-[12px] text-gray-300 hover:bg-[#21262d]">
                            <Plus className="h-3 w-3" /> Add output
                        </button>
                    </div>

                    {rows.map((row, i) => (
                        <div key={row.id} className="space-y-2 rounded-md border border-[#21262d] bg-[#0d1117] p-3">
                            <div className="flex items-center justify-between">
                                <span className="font-mono text-[11.5px] text-gray-500">outputs[{i}]</span>
                                {rows.length > 1 && (
                                    <button type="button" onClick={() => setRows((l) => l.filter((r) => r.id !== row.id))} aria-label="Remove output" className="text-gray-500 hover:text-rose-300">
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                )}
                            </div>

                            <div>
                                <Label>
                                    Lock{' '}
                                    <button type="button" onClick={() => update(row.id, { lockMode: row.lockMode === 'address' ? 'script' : 'address' })} className="ml-1 text-[#79b8ff] hover:underline">
                                        {row.lockMode === 'address' ? 'use a custom script' : 'use an address'}
                                    </button>
                                </Label>
                                {row.lockMode === 'address' ? (
                                    <>
                                        <input value={row.address} onChange={(e) => update(row.id, { address: e.target.value })} placeholder="ckt1…" spellCheck={false} className={`${inputClass} font-mono`} />
                                        <span className="mt-1 flex flex-wrap gap-1">
                                            {(accounts.data ?? []).slice(0, 4).map((a) => (
                                                <button key={a.index} type="button" onClick={() => update(row.id, { address: a.address })} className="rounded border border-[#30363d] px-1.5 text-[10.5px] text-gray-400 hover:text-gray-200">
                                                    #{a.index}
                                                </button>
                                            ))}
                                        </span>
                                    </>
                                ) : (
                                    <ScriptFields value={row.lockScript} onChange={(v) => update(row.id, { lockScript: v })} contracts={contracts} />
                                )}
                            </div>

                            <label className="flex items-center gap-2 text-[12px] text-gray-300">
                                <input type="checkbox" checked={row.withType} onChange={(e) => update(row.id, { withType: e.target.checked })} className="accent-[#58a6ff]" />
                                Type script
                            </label>
                            {row.withType && <ScriptFields value={row.type!} onChange={(v) => update(row.id, { type: v })} contracts={contracts} />}

                            <div className="grid gap-2 md:grid-cols-[140px_1fr]">
                                <label className="block">
                                    <Label>Capacity (CKB)</Label>
                                    <input value={row.capacityCkb} onChange={(e) => update(row.id, { capacityCkb: e.target.value })} placeholder="minimum" inputMode="decimal" className={`${inputClass} font-mono`} />
                                </label>
                                <label className="block">
                                    <Label>
                                        Data{' '}
                                        <select value={row.dataFormat} onChange={(e) => update(row.id, { dataFormat: e.target.value as 'hex' | 'text' })} className="ml-1 rounded border border-[#30363d] bg-[#0d1117] px-1 text-[11px] text-gray-300">
                                            <option value="text">text</option>
                                            <option value="hex">hex</option>
                                        </select>
                                    </Label>
                                    <input
                                        value={row.data}
                                        onChange={(e) => update(row.id, { data: e.target.value })}
                                        placeholder={row.dataFormat === 'hex' ? '0x…' : 'Plain text (UTF-8)'}
                                        spellCheck={false}
                                        className={`${inputClass} font-mono`}
                                    />
                                </label>
                            </div>
                        </div>
                    ))}
                </section>

                <section className="space-y-3 rounded-lg border border-[#30363d] bg-[#161b22] p-4">
                    <div>
                        <h3 className="text-[13px] font-medium text-gray-200">Cell deps</h3>
                        <p className="text-[11.5px] text-gray-500">The payer’s lock dep is added for you. Add your contracts when outputs or inputs use them.</p>
                    </div>
                    {contracts.length === 0 ? (
                        <p className="text-[12px] text-gray-500">No contracts deployed to this devnet yet (Deploy tab in the IDE).</p>
                    ) : (
                        contracts.map((c) => (
                            <label key={c.id} className="flex items-center gap-2 text-[12.5px] text-gray-300">
                                <input type="checkbox" checked={deps.includes(c.id)} onChange={(e) => setDeps((l) => (e.target.checked ? [...l, c.id] : l.filter((x) => x !== c.id)))} className="accent-[#58a6ff]" />
                                <span className="font-mono">{c.contractName}</span>
                                <span className="font-mono text-[11px] text-gray-500">{short(c.txHash, 6, 4)}:{c.outputIndex}</span>
                            </label>
                        ))
                    )}

                    <div className="border-t border-[#21262d] pt-3">
                        <div className="mb-1 flex items-center justify-between">
                            <h3 className="text-[13px] font-medium text-gray-200">Extra inputs</h3>
                            <button type="button" onClick={() => setInputs((l) => [...l, { outPoint: '', witness: '' }])} className="inline-flex items-center gap-1 rounded border border-[#30363d] px-2 py-0.5 text-[12px] text-gray-300 hover:bg-[#21262d]">
                                <Plus className="h-3 w-3" /> Add input
                            </button>
                        </div>
                        <p className="mb-2 text-[11.5px] text-gray-500">Cells to consume, e.g. one locked by your contract (find them in the Cells tab). They go first, before the payer’s inputs.</p>
                        {inputs.map((input, i) => (
                            <div key={i} className="mb-2 grid gap-1.5 md:grid-cols-[1fr_0.8fr_28px]">
                                <input value={input.outPoint} onChange={(e) => setInputs((l) => l.map((x, j) => (j === i ? { ...x, outPoint: e.target.value } : x)))} placeholder="0x…txHash:index" spellCheck={false} className={`${inputClass} font-mono`} />
                                <input value={input.witness} onChange={(e) => setInputs((l) => l.map((x, j) => (j === i ? { ...x, witness: e.target.value } : x)))} placeholder="Witness 0x… (optional)" spellCheck={false} className={`${inputClass} font-mono`} />
                                <button type="button" onClick={() => setInputs((l) => l.filter((_, j) => j !== i))} aria-label="Remove input" className="flex items-center justify-center text-gray-500 hover:text-rose-300">
                                    <Trash2 className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        ))}
                    </div>
                </section>

                <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => build.mutate()} disabled={busy || !client} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-[#30363d] px-3 text-[13px] text-gray-200 hover:bg-[#21262d] disabled:opacity-50">
                        {build.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                        Build preview
                    </button>
                    <button type="button" onClick={() => send.mutate()} disabled={busy || !client} className="inline-flex h-8 items-center gap-1.5 rounded-md bg-[#238636] px-3 text-[13px] font-medium text-white hover:bg-[#2ea043] disabled:bg-[#21262d] disabled:text-gray-500">
                        {send.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                        Sign &amp; send
                    </button>
                </div>
                {clientError && <ErrorBox message={clientError.message} />}
                {error && (
                    <ErrorBox
                        message={`${describeError(error)}${
                            send.isError ? '\n\nThe transaction was recorded by the devnet proxy; open the IDE’s Debug tab to replay its scripts.' : ''
                        }`}
                    />
                )}
                {send.data && <SentBox txHash={send.data} />}
            </div>

            <section className="min-w-0 self-start overflow-hidden rounded-lg border border-[#30363d]">
                <div className="flex h-10 items-center justify-between border-b border-[#30363d] bg-[#161b22] px-4">
                    <span className="text-[13px] font-medium text-gray-200">Transaction</span>
                    {preview && <CopyInline value={preview} label="Copy JSON" />}
                </div>
                <pre className="max-h-[640px] min-h-[200px] overflow-auto bg-[#0d1117] p-3 font-mono text-[11px] leading-[1.55] text-gray-300">
                    {preview ?? 'Build a preview to see the completed transaction: inputs, change, fee and cell deps filled in.'}
                </pre>
            </section>
        </div>
    );
}
