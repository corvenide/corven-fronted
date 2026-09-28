// src/features/deploy/wallet-deploy.ts
//
// Builds, signs and sends a contract deployment from the user's wallet (CCC).
// The binary goes into the data of one output cell owned by the wallet.
// Upgradable deploys put a Type ID on that cell; upgrading consumes the old
// code cell and recreates it with the same Type ID, so the code hash that
// other scripts reference stays the same.

import { ccc } from '@ckb-ccc/connector-react';

export interface WalletDeployInput {
    /** Contract binary. */
    data: Uint8Array;
    upgradable: boolean;
    /** Previous upgradable deploy of this contract, owned by this wallet. */
    previous?: { txHash: string; outputIndex: number; typeArgs: string } | null;
}

export interface WalletDeployResult {
    txHash: string;
    outputIndex: number;
    codeHash: string;
    hashType: 'type' | 'data2';
    typeId: string | null;
    typeArgs: string | null;
    dataHash: string;
    sizeBytes: number;
    /** Occupied capacity of the code cell, in shannons. */
    capacity: string;
    deployerAddress: string;
}

export const TYPE_ID_CODE_HASH = '0x00000000000000000000000000000000000000000000000000545950455f4944';

/** Shannons the code cell locks up (the data plus the cell's own fields). */
export function estimateCapacity(sizeBytes: number, upgradable: boolean): bigint {
    // capacity (8) + secp256k1 lock (32 + 1 + 20) + Type ID (32 + 1 + 32)
    const overhead = 8 + 53 + (upgradable ? 65 : 0);
    return BigInt(sizeBytes + overhead) * 100_000_000n;
}

export function formatCkb(shannons: bigint | string | number): string {
    const value = BigInt(shannons);
    const whole = value / 100_000_000n;
    const fraction = value % 100_000_000n;
    const decimals = fraction === 0n ? '' : `.${fraction.toString().padStart(8, '0').replace(/0+$/, '').slice(0, 2)}`;
    return `${whole.toLocaleString()}${decimals}`;
}

export async function buildDeployTransaction(signer: ccc.Signer, input: WalletDeployInput) {
    const { script: lock } = await signer.getRecommendedAddressObj();
    const dataHex = ccc.hexFrom(input.data);

    const type = input.upgradable
        ? await ccc.Script.fromKnownScript(
              signer.client,
              ccc.KnownScript.TypeId,
              input.previous?.typeArgs ?? `0x${'00'.repeat(32)}`,
          )
        : undefined;

    const tx = ccc.Transaction.from({
        outputs: [{ lock, type }],
        outputsData: [dataHex],
    });

    if (input.upgradable && input.previous) {
        // Consume the old code cell: its capacity pays for most of the new one.
        tx.inputs.push(
            ccc.CellInput.from({
                previousOutput: { txHash: input.previous.txHash, index: input.previous.outputIndex },
            }),
        );
    }

    await tx.completeInputsByCapacity(signer);

    if (input.upgradable && !input.previous && type) {
        // A new Type ID is derived from the first input and the output index.
        type.args = ccc.hashTypeId(tx.inputs[0], 0);
        tx.outputs[0].type = type;
    }

    await tx.completeFeeBy(signer);

    const typeScript = tx.outputs[0].type;
    const dataHash = ccc.hashCkb(dataHex);

    return {
        tx,
        summary: {
            outputIndex: 0,
            codeHash: typeScript ? typeScript.hash() : dataHash,
            hashType: (typeScript ? 'type' : 'data2') as 'type' | 'data2',
            typeId: typeScript ? typeScript.hash() : null,
            typeArgs: typeScript ? typeScript.args : null,
            dataHash,
            sizeBytes: input.data.length,
            capacity: tx.outputs[0].capacity.toString(),
            deployerAddress: await signer.getRecommendedAddress(),
        },
    };
}

/** Signs in the wallet and sends. Resolves once the node accepts the transaction. */
export async function deployFromWallet(signer: ccc.Signer, input: WalletDeployInput): Promise<WalletDeployResult> {
    const { tx, summary } = await buildDeployTransaction(signer, input);
    const txHash = await signer.sendTransaction(tx);
    return { txHash, ...summary };
}
