// src/features/deploy/ContractSandbox.tsx
//
// Remix-style sandbox for exercising a deployed CKB script: build a tx that
// consumes cells under the script (lock) or creates cells carrying it (type),
// sign with the connected wallet, and send.
//
// Both devnet and testnet go through the same wallet-signer path. On devnet
// the wallet (connected via CCC to the local node) pays; on testnet the
// wallet pays in test CKB. No backend endpoint is needed.

import { useMemo, useState } from 'react';
import { ccc } from '@ckb-ccc/connector-react';
import {
    AlertTriangle,
    ExternalLink,
    FlaskConical,
    Loader2,
    Play,
    Plus,
    Trash2,
} from 'lucide-react';

import type { ContractDeployment } from './deploy.api';

type CellInput = { txHash: string; index: string };
type CellOutput = { address: string; capacity: string; data: string };
type CellDep = { txHash: string; index: string };

type InterfaceHint = {
    note: string;
    args?: string | null;
    input?: CellInput | null;
    outputs?: CellOutput[] | null;
    extraDeps?: CellDep[] | null;
    role?: 'lock' | 'type';
};

const INTERFACE_HINTS: Record<string, InterfaceHint> = {
    'hello-world': {
        role: 'lock',
        note:
            'Stock ckb-rust-script template. No args, no witnesses, no cell deps — ' +
            'it returns 0 for any transaction. Use it to verify deploy plumbing, not real logic.',
        args: null,
        input: null,
        outputs: null,
        extraDeps: null,
    },
    'secp256k1-blake160-sighash-all': {
        role: 'lock',
        note:
            "Standard sighash lock. args = 20-byte blake160 of the owner's pubkey. " +
            'Witness[0] carries the 65-byte signature and is filled by the wallet.',
        args: null,
        input: null,
        outputs: null,
        extraDeps: null,
    },
};

const INTERFACE_HINTS_BY_HASH: Record<string, InterfaceHint> = {};

function hintFor(deployment: ContractDeployment): InterfaceHint | null {
    return (
        INTERFACE_HINTS[deployment.contractName] ??
        INTERFACE_HINTS_BY_HASH[deployment.codeHash] ??
        null
    );
}

const EXPLORER_TX: Partial<Record<ContractDeployment['network'], string>> = {
    TESTNET: 'https://testnet.explorer.nervos.org/transaction/',
};

export function ContractSandbox({
    workspaceId: _workspaceId,
    deployment,
    onClose,
}: {
    workspaceId: string;
    deployment: ContractDeployment;
    onClose: () => void;
}) {
    const signer = ccc.useSigner();

    const hint = useMemo(() => hintFor(deployment), [deployment]);

    const [mode, setMode] = useState<'lock' | 'type'>(hint?.role ?? 'lock');
    const [args, setArgs] = useState(hint?.args ?? '0x');
    const [inputs, setInputs] = useState<CellInput[]>(
        hint?.input ? [hint.input] : [{ txHash: '', index: '0' }],
    );
    const [outputs, setOutputs] = useState<CellOutput[]>(
        hint?.outputs ?? [{ address: '', capacity: '100', data: '0x' }],
    );
    const [extraDeps, setExtraDeps] = useState<CellDep[]>(hint?.extraDeps ?? []);

    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<{ txHash: string; raw: string } | null>(null);

    // Snapshot the values run() needs, so a parent re-render can't pull the
    // prop out from under an in-flight click.
    const cellDep = useMemo(
        () => ({
            txHash: deployment.txHash,
            index: deployment.outputIndex,
        }),
        [deployment.txHash, deployment.outputIndex],
    );

    const script = useMemo(
        () =>
            ccc.Script.from({
                codeHash: deployment.codeHash,
                hashType: deployment.hashType as ccc.HashType,
                args,
            }),
        [deployment.codeHash, deployment.hashType, args],
    );

    async function run() {
        if (!signer) {
            setError('Connect a wallet first.');
            return;
        }

        setBusy(true);
        setError(null);
        setResult(null);

        try {
            // --- 1. Build the skeleton tx ------------------------------------
            const tx = ccc.Transaction.from({
                inputs: inputs.map((i) => ({
                    previousOutPoint: { txHash: i.txHash, index: Number(i.index) },
                })),
                outputs: outputs.map((o) => ({
                    capacity: ccc.fixedPointFrom(o.capacity),
                    // Filled below once we know the address parses.
                    lock: ccc.Script.from({ codeHash: '0x', hashType: 'data', args: '0x' }),
                })),
                outputsData: outputs.map((o) => o.data || '0x'),
                cellDeps: [
                    { outPoint: cellDep, depType: 'code' },
                    ...extraDeps
                        .filter((d) => d.txHash)
                        .map((d) => ({
                            outPoint: { txHash: d.txHash, index: Number(d.index) },
                            depType: 'code' as const,
                        })),
                ],
            });

            // --- 2. Resolve output locks from addresses ----------------------
            const client = signer.client;
            for (let i = 0; i < outputs.length; i++) {
                const addr = outputs[i].address.trim();
                if (!addr) throw new Error(`Output ${i} is missing an address.`);
                const parsed = await ccc.Address.fromString(addr, client);
                tx.outputs[i].lock = parsed.script;
            }

            // --- 3. Attach the deployed script to inputs or outputs ----------
            if (mode === 'lock') {
                tx.inputs.forEach((input) => {
                    input.cellOutput.lock = script;
                });
            } else {
                tx.outputs.forEach((output) => {
                    output.type = script;
                });
            }

            // --- 4. Let CCC top up inputs & fees from the wallet -------------
            // completeInputsByCapacity finds extra cells owned by the wallet
            // if the tx is short on capacity. completeFeeBy adds a change cell
            // and fee inputs.
            await tx.completeInputsByCapacity(signer);
            await tx.completeFeeBy(signer);

            // --- 5. Sign & broadcast -----------------------------------------
            await signer.signTransaction(tx);
            const txHash = await signer.client.sendTransaction(tx);

            if (typeof txHash !== 'string' || !txHash.startsWith('0x')) {
                throw new Error(`Broadcast returned an unexpected value: ${String(txHash)}`);
            }

            setResult({
                txHash,
                raw: safeStringify(tx),
            });
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
        } finally {
            setBusy(false);
        }
    }

    const canRun =
        Boolean(signer) &&
        !busy &&
        inputs.every((i) => i.txHash.trim() !== '') &&
        outputs.every((o) => o.address.trim() !== '');

    const explorerBase = EXPLORER_TX[deployment.network];

    return (
        <div className="flex min-h-0 flex-col bg-[#0d1117]">
            {/* Header */}
            <div className="flex h-8 shrink-0 items-center justify-between border-b border-[#30363d] px-3">
                <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                    <FlaskConical className="h-3 w-3" /> Test · {deployment.contractName}
                </span>
                <button
                    onClick={onClose}
                    className="text-[11px] text-gray-500 hover:text-gray-200"
                >
                    Close
                </button>
            </div>

            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
                {hint && (
                    <div className="rounded border border-amber-500/30 bg-amber-500/5 px-2 py-1.5 text-[11px] leading-snug text-amber-200">
                        <span className="mr-1.5 font-mono text-[10px] uppercase tracking-wide text-amber-400/70">
                            hint · {deployment.contractName}
                        </span>
                        {hint.note}
                    </div>
                )}

                {!signer && (
                    <div className="rounded border border-rose-500/30 bg-rose-500/5 px-2 py-1.5 text-[11px] text-rose-200">
                        Connect a wallet to run transactions.
                    </div>
                )}

                {/* Script role */}
                <div>
                    <label className="mb-1 block text-[11px] uppercase tracking-wide text-gray-500">
                        Script role
                    </label>
                    <div
                        role="radiogroup"
                        className="grid grid-cols-2 rounded-md border border-[#30363d] p-0.5"
                    >
                        {(['lock', 'type'] as const).map((m) => (
                            <button
                                key={m}
                                type="button"
                                role="radio"
                                aria-checked={mode === m}
                                onClick={() => setMode(m)}
                                className={`h-7 rounded text-[12px] ${
                                    mode === m
                                        ? 'bg-[#21262d] font-medium text-white'
                                        : 'text-gray-400 hover:text-gray-200'
                                }`}
                            >
                                {m === 'lock' ? 'Lock script' : 'Type script'}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Args */}
                <div>
                    <label className="mb-1 block text-[11px] uppercase tracking-wide text-gray-500">
                        Args (hex)
                    </label>
                    <input
                        value={args}
                        onChange={(e) => setArgs(e.target.value)}
                        className="h-8 w-full rounded-md border border-[#30363d] bg-[#0d1117] px-2 font-mono text-[12px] text-gray-200 focus:border-[#58a6ff] focus:outline-none"
                    />
                    {mode === 'lock' && signer && (
                        <button
                            type="button"
                            onClick={async () => {
                                const obj = await signer.getRecommendedAddressObj();
                                setArgs(obj.script.args);
                            }}
                            className="mt-1 text-[11px] text-[#79b8ff] hover:underline"
                        >
                            Use my wallet's args
                        </button>
                    )}
                </div>

                {/* Inputs */}
                <Section
                    title="Inputs"
                    onAdd={() => setInputs([...inputs, { txHash: '', index: '0' }])}
                >
                    {inputs.map((row, idx) => (
                        <div key={idx} className="flex gap-1">
                            <input
                                placeholder="txHash"
                                value={row.txHash}
                                onChange={(e) =>
                                    setInputs(
                                        inputs.map((r, i) =>
                                            i === idx ? { ...r, txHash: e.target.value } : r,
                                        ),
                                    )
                                }
                                className="h-7 min-w-0 flex-1 rounded border border-[#30363d] bg-[#0d1117] px-1.5 font-mono text-[11px] text-gray-200"
                            />
                            <input
                                placeholder="idx"
                                value={row.index}
                                onChange={(e) =>
                                    setInputs(
                                        inputs.map((r, i) =>
                                            i === idx ? { ...r, index: e.target.value } : r,
                                        ),
                                    )
                                }
                                className="h-7 w-12 rounded border border-[#30363d] bg-[#0d1117] px-1.5 font-mono text-[11px] text-gray-200"
                            />
                            <button
                                onClick={() => setInputs(inputs.filter((_, i) => i !== idx))}
                                className="rounded p-1 text-gray-500 hover:bg-[#21262d] hover:text-rose-300"
                            >
                                <Trash2 className="h-3 w-3" />
                            </button>
                        </div>
                    ))}
                </Section>

                {/* Outputs */}
                <Section
                    title="Outputs"
                    onAdd={() =>
                        setOutputs([...outputs, { address: '', capacity: '100', data: '0x' }])
                    }
                >
                    {outputs.map((row, idx) => (
                        <div key={idx} className="space-y-1 rounded border border-[#30363d] p-1.5">
                            <div className="flex gap-1">
                                <input
                                    placeholder="ckt1…"
                                    value={row.address}
                                    onChange={(e) =>
                                        setOutputs(
                                            outputs.map((r, i) =>
                                                i === idx ? { ...r, address: e.target.value } : r,
                                            ),
                                        )
                                    }
                                    className="h-7 min-w-0 flex-1 rounded border border-[#30363d] bg-[#0d1117] px-1.5 font-mono text-[11px] text-gray-200"
                                />
                                {signer && (
                                    <button
                                        type="button"
                                        title="Use my address"
                                        onClick={async () => {
                                            const addr = await signer.getRecommendedAddress();
                                            setOutputs(
                                                outputs.map((r, i) =>
                                                    i === idx ? { ...r, address: addr } : r,
                                                ),
                                            );
                                        }}
                                        className="rounded border border-[#30363d] px-1.5 text-[10.5px] text-gray-400 hover:bg-[#21262d] hover:text-gray-200"
                                    >
                                        Me
                                    </button>
                                )}
                            </div>
                            <div className="flex gap-1">
                                <input
                                    placeholder="capacity (CKB)"
                                    value={row.capacity}
                                    onChange={(e) =>
                                        setOutputs(
                                            outputs.map((r, i) =>
                                                i === idx ? { ...r, capacity: e.target.value } : r,
                                            ),
                                        )
                                    }
                                    className="h-7 flex-1 rounded border border-[#30363d] bg-[#0d1117] px-1.5 font-mono text-[11px] text-gray-200"
                                />
                                <input
                                    placeholder="data 0x…"
                                    value={row.data}
                                    onChange={(e) =>
                                        setOutputs(
                                            outputs.map((r, i) =>
                                                i === idx ? { ...r, data: e.target.value } : r,
                                            ),
                                        )
                                    }
                                    className="h-7 flex-1 rounded border border-[#30363d] bg-[#0d1117] px-1.5 font-mono text-[11px] text-gray-200"
                                />
                            </div>
                        </div>
                    ))}
                </Section>

                {/* Extra cell deps */}
                <Section
                    title="Extra cell deps"
                    onAdd={() => setExtraDeps([...extraDeps, { txHash: '', index: '0' }])}
                >
                    {extraDeps.map((row, idx) => (
                        <div key={idx} className="flex gap-1">
                            <input
                                placeholder="txHash"
                                value={row.txHash}
                                onChange={(e) =>
                                    setExtraDeps(
                                        extraDeps.map((r, i) =>
                                            i === idx ? { ...r, txHash: e.target.value } : r,
                                        ),
                                    )
                                }
                                className="h-7 min-w-0 flex-1 rounded border border-[#30363d] bg-[#0d1117] px-1.5 font-mono text-[11px] text-gray-200"
                            />
                            <input
                                placeholder="idx"
                                value={row.index}
                                onChange={(e) =>
                                    setExtraDeps(
                                        extraDeps.map((r, i) =>
                                            i === idx ? { ...r, index: e.target.value } : r,
                                        ),
                                    )
                                }
                                className="h-7 w-12 rounded border border-[#30363d] bg-[#0d1117] px-1.5 font-mono text-[11px] text-gray-200"
                            />
                            <button
                                onClick={() => setExtraDeps(extraDeps.filter((_, i) => i !== idx))}
                                className="rounded p-1 text-gray-500 hover:bg-[#21262d] hover:text-rose-300"
                            >
                                <Trash2 className="h-3 w-3" />
                            </button>
                        </div>
                    ))}
                </Section>

                {/* Run */}
                <button
                    type="button"
                    onClick={run}
                    disabled={!canRun}
                    className="flex h-8 w-full items-center justify-center gap-1.5 rounded-md bg-[#1f6feb] font-medium text-white hover:bg-[#388bfd] disabled:bg-[#21262d] disabled:text-gray-500"
                >
                    {busy ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                        <Play className="h-3.5 w-3.5" />
                    )}
                    {busy ? 'Running…' : 'Run transaction'}
                </button>

                {error && (
                    <div className="flex items-start gap-2 rounded border border-rose-500/30 bg-rose-500/5 p-2 text-rose-200">
                        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        <pre className="whitespace-pre-wrap break-words text-[11px]">{error}</pre>
                    </div>
                )}

                {result && (
                    <div className="space-y-1 rounded border border-emerald-500/30 bg-emerald-500/5 p-2">
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] text-emerald-200">Confirmed</span>
                            {explorerBase && (
                                <a
                                    href={`${explorerBase}${result.txHash}`}
                                    target="_blank"
                                    rel="noreferrer noopener"
                                    className="flex items-center gap-1 text-[11px] text-[#79b8ff] hover:underline"
                                >
                                    Explorer <ExternalLink className="h-3 w-3" />
                                </a>
                            )}
                        </div>
                        <code className="block break-all font-mono text-[11px] text-gray-300">
                            {result.txHash}
                        </code>
                        <details>
                            <summary className="cursor-pointer text-[11px] text-gray-500">
                                Raw transaction
                            </summary>
                            <pre className="mt-1 overflow-x-auto rounded bg-[#0d1117] p-2 font-mono text-[10.5px] text-gray-300">
                                {result.raw}
                            </pre>
                        </details>
                    </div>
                )}
            </div>
        </div>
    );
}

function safeStringify(tx: unknown): string {
    try {
        return JSON.stringify(tx, null, 2);
    } catch {
        return String(tx);
    }
}

function Section({
    title,
    onAdd,
    children,
}: {
    title: string;
    onAdd: () => void;
    children: React.ReactNode;
}) {
    return (
        <div>
            <div className="mb-1 flex items-center justify-between">
                <span className="text-[11px] uppercase tracking-wide text-gray-500">{title}</span>
                <button
                    onClick={onAdd}
                    className="rounded p-0.5 text-gray-500 hover:bg-[#21262d] hover:text-gray-200"
                >
                    <Plus className="h-3 w-3" />
                </button>
            </div>
            <div className="space-y-1">{children}</div>
        </div>
    );
}