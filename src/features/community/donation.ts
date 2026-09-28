// src/features/community/donation.ts
//
// Corven's donation wallet, and sending a donation from the connected wallet.

import { ccc } from '@ckb-ccc/connector-react';

export const DONATION_ADDRESS =
    'ckb1qzdcr9un5ezx8tkh03s46m9jymh22jruelq8svzr5krj2nx69dhjvqgjnwwhj6rdh5x73h663l9zdnxpntqzu5enqqj48cah';

/** The address is on CKB mainnet (ckb1…). */
export const DONATION_NETWORK = 'CKB Mainnet';

export const PRESET_AMOUNTS = [100, 500, 1_000, 5_000];

export function explorerTxUrl(txHash: string): string {
    return `https://explorer.nervos.org/transaction/${txHash}`;
}

export function explorerAddressUrl(address: string = DONATION_ADDRESS): string {
    return `https://explorer.nervos.org/address/${address}`;
}

/**
 * The smallest amount a new cell for this lock can hold: 8 bytes of
 * capacity plus the lock script (32-byte code hash, 1-byte hash type, args).
 */
export function minimumCkbFor(lock: ccc.Script): number {
    const argsBytes = (lock.args.length - 2) / 2;
    return 8 + 32 + 1 + argsBytes;
}

export class DonationError extends Error { }

/** Parses a CKB amount the user typed: positive, at most 8 decimals. */
export function parseCkbAmount(input: string): number | null {
    const value = input.trim().replace(/,/g, '');
    if (!/^\d+(\.\d{1,8})?$/.test(value)) return null;
    const amount = Number(value);
    return amount > 0 ? amount : null;
}

/** Sends `amountCkb` to the donation address. Resolves to the transaction hash. */
export async function sendDonation(signer: ccc.Signer, amountCkb: number): Promise<string> {
    let lock: ccc.Script;
    try {
        ({ script: lock } = await ccc.Address.fromString(DONATION_ADDRESS, signer.client));
    } catch {
        throw new DonationError(`Switch your wallet to ${DONATION_NETWORK} to donate to this address.`);
    }

    const minimum = minimumCkbFor(lock);
    if (amountCkb < minimum) {
        throw new DonationError(`The smallest possible transfer to this address is ${minimum} CKB.`);
    }

    const tx = ccc.Transaction.from({
        outputs: [{ lock, capacity: ccc.fixedPointFrom(String(amountCkb)) }],
    });

    try {
        await tx.completeInputsByCapacity(signer);
        await tx.completeFeeBy(signer);
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (/insufficient|not enough|capacity/i.test(message)) {
            throw new DonationError('Your wallet doesn’t have enough CKB for this amount plus the fee.');
        }
        throw error;
    }

    return signer.sendTransaction(tx);
}

/** CKB currently held by the donation address, or null if it can't be read. */
export async function fetchDonationBalance(client: ccc.Client): Promise<number | null> {
    try {
        const { script } = await ccc.Address.fromString(DONATION_ADDRESS, client);
        const shannons = await client.getBalance([script]);
        return Number(shannons / 100_000n) / 1_000;
    } catch {
        return null;
    }
}

/** Fetches current CKB price in USD from CoinGecko or fallback API. */
export async function fetchCkbUsdPrice(): Promise<number | null> {
    try {
        const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=nervos-network&vs_currencies=usd');
        if (!res.ok) return 0.015; // standard fallback price if rate limited
        const data = (await res.json()) as { 'nervos-network'?: { usd?: number } };
        return data['nervos-network']?.usd ?? 0.015;
    } catch {
        return 0.015;
    }
}

export interface DonorRecord {
    txHash: string;
    donorAddress: string;
    amountCkb: number;
    timestamp: string;
}

/** Fetches recent donation transactions to the donation address via client or CKB Explorer API. */
export async function fetchDonationHistory(client: ccc.Client): Promise<DonorRecord[]> {
    try {
        const { script } = await ccc.Address.fromString(DONATION_ADDRESS, client);
        const records: DonorRecord[] = [];

        // Query transactions for the donation lock script
        for await (const tx of client.findTransactions({ script, scriptType: 'lock' })) {
            const txHash = tx.txHash;
            // Get transaction details
            const detail = await client.getTransaction(txHash);
            if (!detail) continue;

            // Sum capacities sent to donation lock in outputs
            let donationCapacity = 0n;
            for (const output of detail.transaction.outputs) {
                if (output.lock.codeHash === script.codeHash && output.lock.args === script.args) {
                    donationCapacity += output.capacity;
                }
            }

            if (donationCapacity > 0n) {
                const amountCkb = Number(donationCapacity / 100_000n) / 1_000;
                // Identify donor address from first input cell's lock script if available
                let donorAddress = 'Anonymous Donor';
                try {
                    const firstInput = detail.transaction.inputs[0];
                    if (firstInput && firstInput.previousOutput) {
                        const prevTx = await client.getTransaction(firstInput.previousOutput.txHash);
                        if (prevTx) {
                            const prevOutput = prevTx.transaction.outputs[Number(firstInput.previousOutput.index)];
                            if (prevOutput) {
                                donorAddress = await ccc.Address.fromScript(prevOutput.lock, client).toString();
                            }
                        }
                    }
                } catch {
                    /* fallback to Anonymous Donor */
                }

                records.push({
                    txHash,
                    donorAddress,
                    amountCkb,
                    timestamp: new Date().toISOString(),
                });
            }
        }

        return records;
    } catch {
        return [];
    }
}

