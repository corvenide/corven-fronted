// src/features/devnet/devnet-client.ts
//
// A CCC client for a workspace devnet. The devnet isn't reachable from the
// browser, so JSON-RPC calls are relayed through the gateway
// (POST /workspaces/:id/devnet/rpc), which forwards them to offckb's RPC
// proxy; transactions sent from here therefore show up in the IDE's Debug tab.

import { ccc } from '@ckb-ccc/connector-react';

export type RpcSend = (payload: unknown) => Promise<any>;

export function createDevnetClient(scripts: Record<string, unknown>, send: RpcSend): ccc.Client {
    return new ccc.ClientPublicTestnet({
        // Never fetched: every request goes through the transport below.
        url: 'https://devnet.corven.invalid',
        transport: { request: (payload: unknown) => send(payload) } as any,
        scripts: scripts as any,
    });
}

export function signerFor(client: ccc.Client, privkey: string): ccc.Signer {
    return new ccc.SignerCkbPrivateKey(client, privkey);
}

/** Error message worth showing: CCC verification errors carry the script failure. */
export function describeError(error: unknown): string {
    if (error && typeof error === 'object') {
        const e = error as { message?: string; data?: unknown };
        if (typeof e.message === 'string') {
            return typeof e.data === 'string' && !e.message.includes(e.data) ? `${e.message}: ${e.data}` : e.message;
        }
    }
    return String(error);
}

export async function transfer(client: ccc.Client, privkey: string, toAddress: string, amountCkb: string): Promise<string> {
    const signer = signerFor(client, privkey);
    const { script: lock } = await ccc.Address.fromString(toAddress, client);

    const tx = ccc.Transaction.from({
        outputs: [{ lock, capacity: ccc.fixedPointFrom(amountCkb) }],
        outputsData: ['0x'],
    });

    await tx.completeInputsByCapacity(signer);
    await tx.completeFeeBy(signer);
    return signer.sendTransaction(tx);
}

// ---------------------------------------------------------------------------
// Transaction builder
// ---------------------------------------------------------------------------

export interface ScriptSpec {
    codeHash: string;
    hashType: string;
    args: string;
}

export interface OutputSpec {
    /** An address, or a custom lock script. */
    lock: { address: string } | { script: ScriptSpec };
    /** CKB; empty = the minimum the cell needs. */
    capacityCkb: string;
    type: ScriptSpec | null;
    /** Hex (0x…) or plain text. */
    data: string;
    dataFormat: 'hex' | 'text';
}

export interface TxSpec {
    /** Devnet account paying fees and filling capacity. */
    privkey: string;
    outputs: OutputSpec[];
    cellDeps: Array<{ txHash: string; index: number; depType: 'code' | 'depGroup' }>;
    /** Extra inputs to consume, e.g. a cell locked by your contract. */
    inputs: Array<{ txHash: string; index: number }>;
    /** Witnesses to put in front, one per extra input (hex or empty). */
    witnesses: string[];
}

function toHexData(value: string, format: 'hex' | 'text'): ccc.Hex {
    if (format === 'text') return ccc.hexFrom(ccc.bytesFrom(value, 'utf8'));
    const trimmed = value.trim() || '0x';
    if (!/^0x([0-9a-fA-F]{2})*$/.test(trimmed)) throw new Error(`Data must be hex bytes (0x…): ${trimmed.slice(0, 20)}`);
    return trimmed.toLowerCase() as ccc.Hex;
}

function script(spec: ScriptSpec): ccc.Script {
    return ccc.Script.from({ codeHash: spec.codeHash, hashType: spec.hashType as ccc.HashTypeLike, args: spec.args || '0x' });
}

/** Builds and completes (inputs, change, fee) a transaction; doesn't sign. */
export async function buildTransaction(client: ccc.Client, spec: TxSpec): Promise<{ tx: ccc.Transaction; signer: ccc.Signer }> {
    const signer = signerFor(client, spec.privkey);

    const outputs = await Promise.all(
        spec.outputs.map(async (o) => ({
            lock: 'address' in o.lock ? (await ccc.Address.fromString(o.lock.address.trim(), client)).script : script(o.lock.script),
            type: o.type ? script(o.type) : undefined,
            ...(o.capacityCkb.trim() ? { capacity: ccc.fixedPointFrom(o.capacityCkb.trim()) } : {}),
        })),
    );

    const tx = ccc.Transaction.from({
        inputs: spec.inputs.map((i) => ({ previousOutput: { txHash: i.txHash, index: i.index } })),
        outputs,
        outputsData: spec.outputs.map((o) => toHexData(o.data, o.dataFormat)),
        cellDeps: spec.cellDeps.map((d) => ({ outPoint: { txHash: d.txHash, index: d.index }, depType: d.depType })),
        witnesses: spec.witnesses.map((w) => (w.trim() ? toHexData(w, 'hex') : '0x')),
    });

    await tx.completeInputsByCapacity(signer);
    await tx.completeFeeBy(signer);

    return { tx, signer };
}

/** Signs with the devnet account and sends. Throws the node's error when rejected. */
export async function signAndSend(signer: ccc.Signer, tx: ccc.Transaction): Promise<string> {
    return signer.sendTransaction(tx);
}

/** JSON the way the node shows it (snake_case), for the preview. */
export function transactionJson(tx: ccc.Transaction): string {
    return JSON.stringify(
        JSON.parse(ccc.stringify(tx)),
        null,
        2,
    );
}
