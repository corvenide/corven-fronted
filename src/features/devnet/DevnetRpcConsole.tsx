// src/features/devnet/DevnetRpcConsole.tsx
import React, { useState } from 'react';
import {
    Terminal,
    Play,
    Copy,
    Check,
    RotateCw,
    Clock,
    Zap,
    Code,
    Sparkles,
    CheckCircle2,
} from 'lucide-react';
import { apiClient } from '../../lib/api-client';

interface DevnetRpcConsoleProps {
    workspaceId: string;
}

const COMMON_METHODS = [
    {
        method: 'get_tip_header',
        label: 'get_tip_header',
        desc: 'Returns the header of the latest block on the devnet tip.',
        defaultParams: '[]',
    },
    {
        method: 'get_blockchain_info',
        label: 'get_blockchain_info',
        desc: 'Returns state of current blockchain (chain name, epoch, median time, difficulty).',
        defaultParams: '[]',
    },
    {
        method: 'local_node_info',
        label: 'local_node_info',
        desc: 'Returns local CKB node network identification, addresses, and protocols.',
        defaultParams: '[]',
    },
    {
        method: 'get_peers',
        label: 'get_peers',
        desc: 'Returns connected peer nodes in the local P2P devnet mesh.',
        defaultParams: '[]',
    },
    {
        method: 'get_raw_tx_pool',
        label: 'get_raw_tx_pool',
        desc: 'Returns all transaction hashes in the memory pool (pending and proposed).',
        defaultParams: '[]',
    },
    {
        method: 'get_tip_block_number',
        label: 'get_tip_block_number',
        desc: 'Returns the current block height as hex string.',
        defaultParams: '[]',
    },
    {
        method: 'send_transaction',
        label: 'send_transaction',
        desc: 'Submits a signed transaction to the local devnet pool.',
        defaultParams: '[\n  {\n    "version": "0x0",\n    "cell_deps": [],\n    "header_deps": [],\n    "inputs": [],\n    "outputs": [],\n    "outputs_data": [],\n    "witnesses": []\n  }\n]',
    },
];

export function DevnetRpcConsole({ workspaceId }: DevnetRpcConsoleProps) {
    const [selectedMethod, setSelectedMethod] = useState(COMMON_METHODS[0].method);
    const [paramsInput, setParamsInput] = useState(COMMON_METHODS[0].defaultParams);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [durationMs, setDurationMs] = useState<number | null>(null);
    const [copied, setCopied] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSelectPreset = (m: (typeof COMMON_METHODS)[0]) => {
        setSelectedMethod(m.method);
        setParamsInput(m.defaultParams);
        setError(null);
    };

    const handleExecute = async () => {
        setLoading(true);
        setError(null);
        const start = performance.now();

        try {
            let parsedParams = [];
            if (paramsInput.trim()) {
                parsedParams = JSON.parse(paramsInput);
            }

            const response = await apiClient<any>(`/workspaces/${workspaceId}/devnet/rpc`, {
                method: 'POST',
                body: JSON.stringify({
                    jsonrpc: '2.0',
                    id: Date.now(),
                    method: selectedMethod,
                    params: parsedParams,
                }),
            });

            setDurationMs(Math.round(performance.now() - start));
            setResult(response);
        } catch (err: any) {
            setDurationMs(Math.round(performance.now() - start));
            setError(err.message || 'Failed to execute JSON-RPC command');
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = () => {
        if (!result) return;
        navigator.clipboard.writeText(JSON.stringify(result, null, 2));
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    };

    return (
        <div className="mt-5 space-y-4 font-mono select-text">
            {/* Header & Description */}
            <div className="rounded-xl border border-outline-variant/30 bg-surface-container p-4">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2">
                        <Terminal className="h-4 w-4 text-primary" />
                        <h3 className="text-[13px] font-semibold text-on-surface uppercase tracking-wider">
                            Interactive CKB JSON-RPC Console
                        </h3>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-on-surface-variant">
                        <span className="flex items-center gap-1 text-primary">
                            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                            Target: http://127.0.0.1:8114
                        </span>
                    </div>
                </div>

                <p className="text-[12px] text-on-surface-variant font-sans mb-3">
                    Execute raw JSON-RPC queries directly against this workspace's local CKB node without leaving Corven.
                </p>

                {/* Preset Chips */}
                <div className="flex flex-wrap gap-1.5">
                    {COMMON_METHODS.map((m) => (
                        <button
                            key={m.method}
                            type="button"
                            onClick={() => handleSelectPreset(m)}
                            className={`px-2.5 py-1 rounded text-[11px] font-mono transition-colors ${selectedMethod === m.method
                                    ? 'bg-surface-container-high text-primary border border-primary/40 font-semibold'
                                    : 'border border-outline-variant/30 bg-surface-container-low text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
                                }`}
                        >
                            {m.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Request & Response Split Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Request Box */}
                <div className="flex flex-col rounded-xl border border-outline-variant/30 bg-surface-container overflow-hidden">
                    <div className="flex h-9 items-center justify-between border-b border-outline-variant/20 bg-surface-container-low px-3 select-none">
                        <span className="text-[11px] font-semibold text-on-surface flex items-center gap-1.5">
                            <Code className="h-3.5 w-3.5 text-secondary" />
                            <span>Request Payload</span>
                        </span>
                        <span className="text-[10px] text-on-surface-variant">Method: {selectedMethod}</span>
                    </div>

                    <div className="p-3 space-y-3 flex-1 flex flex-col">
                        <div>
                            <label className="text-[10.5px] uppercase tracking-wider text-on-surface-variant font-medium block mb-1">
                                Method
                            </label>
                            <input
                                type="text"
                                value={selectedMethod}
                                onChange={(e) => setSelectedMethod(e.target.value)}
                                className="w-full rounded border border-outline-variant/30 bg-surface-container-low px-2.5 py-1 text-[11px] text-on-surface font-mono focus:border-primary focus:outline-none"
                            />
                        </div>

                        <div className="flex-1 flex flex-col">
                            <label className="text-[10.5px] uppercase tracking-wider text-on-surface-variant font-medium block mb-1">
                                Parameters (JSON Array)
                            </label>
                            <textarea
                                rows={6}
                                value={paramsInput}
                                onChange={(e) => setParamsInput(e.target.value)}
                                className="w-full flex-1 rounded border border-outline-variant/30 bg-surface-container-low p-2.5 text-[11px] text-on-surface font-mono focus:border-primary focus:outline-none leading-relaxed resize-none"
                            />
                        </div>

                        <button
                            type="button"
                            onClick={handleExecute}
                            disabled={loading}
                            className="flex h-8 items-center justify-center gap-1.5 rounded-lg bg-primary px-4 text-[11.5px] font-semibold text-on-primary hover:bg-primary/90 transition-colors disabled:opacity-50"
                        >
                            {loading ? (
                                <>
                                    <RotateCw className="h-3.5 w-3.5 animate-spin" />
                                    <span>Executing RPC...</span>
                                </>
                            ) : (
                                <>
                                    <Play className="h-3.5 w-3.5 fill-current" />
                                    <span>Send RPC Request</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* Response Box */}
                <div className="flex flex-col rounded-xl border border-outline-variant/30 bg-surface-container overflow-hidden min-h-[300px]">
                    <div className="flex h-9 items-center justify-between border-b border-outline-variant/20 bg-surface-container-low px-3 select-none">
                        <span className="text-[11px] font-semibold text-on-surface flex items-center gap-1.5">
                            <Zap className="h-3.5 w-3.5 text-primary" />
                            <span>Response</span>
                        </span>

                        <div className="flex items-center gap-2">
                            {durationMs !== null && (
                                <span className="flex items-center gap-1 text-[10px] text-on-surface-variant">
                                    <Clock className="h-3 w-3" />
                                    <span>{durationMs} ms</span>
                                </span>
                            )}
                            {result && (
                                <button
                                    type="button"
                                    onClick={handleCopy}
                                    className="flex items-center gap-1 text-[10.5px] text-on-surface-variant hover:text-on-surface transition-colors"
                                >
                                    {copied ? <Check className="h-3 w-3 text-primary" /> : <Copy className="h-3 w-3" />}
                                    <span>{copied ? 'Copied' : 'Copy'}</span>
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="flex-1 overflow-auto p-3 text-[11px] leading-relaxed">
                        {error ? (
                            <div className="rounded-lg bg-error/10 border border-error/30 p-3 text-error text-[11px]">
                                <span className="font-bold block mb-1">RPC Error:</span>
                                <span>{error}</span>
                            </div>
                        ) : result ? (
                            <pre className="text-on-surface">
                                {JSON.stringify(result, null, 2)}
                            </pre>
                        ) : (
                            <div className="flex h-full flex-col items-center justify-center text-center text-on-surface-variant/50 p-6">
                                <Sparkles className="h-6 w-6 text-on-surface-variant/30 mb-2" />
                                <span>Select a method and click "Send RPC Request" to view node response.</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
