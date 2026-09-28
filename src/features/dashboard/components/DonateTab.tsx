// src/features/dashboard/components/DonateTab.tsx
//
// Donate tab embedded in the dashboard. Displays donation metrics,
// the donation wallet address, recent donations received by the wallet,
// and the donate-with-wallet panel. All data comes from the real
// donation module (features/community/donation.ts).

import { useEffect, useState } from 'react';
import { ccc } from '@ckb-ccc/connector-react';
import {
    ArrowUpRight,
    Check,
    Copy,
    Cpu,
    Heart,
    Loader2,
    Server,
    TrendingUp,
    Wallet,
    Wrench,
    Zap,
    AlertTriangle,
    DollarSign,
    Users,
} from 'lucide-react';

import {
    DONATION_ADDRESS,
    DONATION_NETWORK,
    DonationError,
    DonorRecord,
    PRESET_AMOUNTS,
    explorerAddressUrl,
    explorerTxUrl,
    fetchCkbUsdPrice,
    fetchDonationBalance,
    fetchDonationHistory,
    parseCkbAmount,
    sendDonation,
} from '../../community/donation';

type SendState =
    | { kind: 'idle' }
    | { kind: 'sending' }
    | { kind: 'sent'; txHash: string; amount: number }
    | { kind: 'error'; message: string };

function formatCkb(value: number): string {
    return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function formatUsd(value: number): string {
    return value.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });
}

function shortAddress(address: string): string {
    return address.length > 18 ? `${address.slice(0, 8)}…${address.slice(-6)}` : address;
}

const USES = [
    {
        icon: Server,
        title: 'Workspace servers',
        body: 'Every workspace runs its own build container and private CKB devnet. Donations keep them running.',
    },
    {
        icon: Wrench,
        title: 'Open tooling',
        body: 'Templates, the debugger integration and deploy flows that make CKB development faster for everyone.',
    },
    {
        icon: Cpu,
        title: 'Faster builds',
        body: 'Shared build caches and bigger machines, so compiling for CKB-VM takes seconds rather than minutes.',
    },
];

export default function DonateTab() {
    const { open, client } = ccc.useCcc();
    const signer = ccc.useSigner();

    const [copied, setCopied] = useState(false);
    const [balance, setBalance] = useState<number | null>(null);
    const [ckbUsdPrice, setCkbUsdPrice] = useState<number | null>(null);
    const [walletAddress, setWalletAddress] = useState<string | null>(null);
    const [donors, setDonors] = useState<DonorRecord[]>([]);
    const [loadingDonors, setLoadingDonors] = useState(true);

    const [preset, setPreset] = useState<number | null>(PRESET_AMOUNTS[1]);
    const [custom, setCustom] = useState('');
    const [send, setSend] = useState<SendState>({ kind: 'idle' });

    const amount = preset !== null ? preset : parseCkbAmount(custom);

    // Read balance, CKB USD price, and donation history
    const lastTxHash = send.kind === 'sent' ? send.txHash : null;
    useEffect(() => {
        let cancelled = false;
        const mainnetClient = new ccc.ClientPublicMainnet();
        void fetchDonationBalance(mainnetClient).then((value) => !cancelled && setBalance(value));
        void fetchCkbUsdPrice().then((price) => !cancelled && setCkbUsdPrice(price));
        setLoadingDonors(true);
        void fetchDonationHistory(mainnetClient).then((records) => {
            if (!cancelled) {
                setDonors(records);
                setLoadingDonors(false);
            }
        });
        return () => {
            cancelled = true;
        };
    }, [lastTxHash]);

    useEffect(() => {
        let cancelled = false;
        setWalletAddress(null);
        if (signer) {
            void signer
                .getRecommendedAddress()
                .then((address) => !cancelled && setWalletAddress(address))
                .catch(() => undefined);
        }
        return () => {
            cancelled = true;
        };
    }, [signer]);

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(DONATION_ADDRESS);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1800);
        } catch {
            /* clipboard blocked */
        }
    };

    const donate = async () => {
        if (!signer || !amount) return;
        setSend({ kind: 'sending' });
        try {
            const txHash = await sendDonation(signer, amount);
            setSend({ kind: 'sent', txHash, amount });
        } catch (error) {
            const message =
                error instanceof DonationError
                    ? error.message
                    : /reject|denied|cancel/i.test(String((error as Error)?.message))
                      ? 'The transaction was cancelled in your wallet.'
                      : 'The donation couldn\'t be sent. Please try again.';
            setSend({ kind: 'error', message });
        }
    };

    const onMainnet = !client || client.addressPrefix === 'ckb';

    return (
        <div className="space-y-7">
            {/* ────────── Metrics overview ────────── */}
            <div>
                <h2 className="text-[18px] font-semibold text-white">Donations</h2>
                <p className="mt-0.5 text-[13px] text-gray-400">
                    Support Corven development. Every contribution helps keep the platform free and open.
                </p>
            </div>

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <div className="rounded-lg border border-[#30363d] bg-[#161b22] px-4 py-3.5">
                    <div className="text-[12px] text-gray-400">Total raised</div>
                    <div className="mt-1 font-mono text-[22px] font-semibold tabular-nums text-[#3cc68a]">
                        {balance !== null ? formatCkb(balance) : '—'} <span className="text-[13px] text-gray-400 font-sans font-normal">CKB</span>
                    </div>
                    <div className="mt-0.5 font-mono text-[12px] text-emerald-400/80">
                        {balance !== null && ckbUsdPrice !== null ? `≈ ${formatUsd(balance * ckbUsdPrice)} USD` : '—'}
                    </div>
                </div>
                <div className="rounded-lg border border-[#30363d] bg-[#161b22] px-4 py-3.5">
                    <div className="text-[12px] text-gray-400">Network</div>
                    <div className="mt-1 flex items-center gap-2 text-[16px] font-semibold text-amber-300">
                        <span className="h-2 w-2 rounded-full bg-amber-300" />
                        {DONATION_NETWORK}
                    </div>
                </div>
                <div className="rounded-lg border border-[#30363d] bg-[#161b22] px-4 py-3.5">
                    <div className="text-[12px] text-gray-400">Wallet status</div>
                    <div className="mt-1 flex items-center gap-2 text-[16px] font-semibold text-emerald-300">
                        <span className={`h-2 w-2 rounded-full ${signer ? 'bg-emerald-400' : 'bg-gray-500'}`} />
                        {signer ? 'Connected' : 'Not connected'}
                    </div>
                </div>
                <div className="rounded-lg border border-[#30363d] bg-[#161b22] px-4 py-3.5">
                    <div className="text-[12px] text-gray-400">Donation impact</div>
                    <div className="mt-1 flex items-center gap-1.5 text-[16px] font-semibold text-[#79b8ff]">
                        <TrendingUp className="h-4 w-4" />
                        Building CKB
                    </div>
                </div>
            </div>

            {/* ────────── Donation panels ────────── */}
            <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
                {/* Wallet address + balance */}
                <section aria-labelledby="donation-address" className="rounded-xl border border-[#30363d] bg-[#161b22] p-6">
                    <div className="flex items-center justify-between gap-3">
                        <h3 id="donation-address" className="text-[15px] font-semibold text-white">Donation address</h3>
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-400/10 px-2.5 py-1 text-[11px] font-mono text-amber-300">
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-300" />
                            {DONATION_NETWORK}
                        </span>
                    </div>

                    <div className="mt-5">
                        <p className="break-all rounded-lg border border-[#21262d] bg-[#0d1117] p-3 font-mono text-[12px] leading-[1.65] text-gray-200" data-testid="donation-address">
                            {DONATION_ADDRESS}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                            <button
                                type="button"
                                onClick={() => void copy()}
                                className="inline-flex h-9 items-center gap-2 rounded-md border border-[#30363d] bg-[#21262d] px-3 text-[13px] font-medium text-gray-200 transition-colors hover:border-gray-500"
                            >
                                {copied ? <Check className="h-4 w-4 text-[#3cc68a]" /> : <Copy className="h-4 w-4 text-gray-400" />}
                                {copied ? 'Copied' : 'Copy address'}
                            </button>
                            <a
                                href={explorerAddressUrl()}
                                target="_blank"
                                rel="noreferrer noopener"
                                className="inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-[13px] text-gray-400 transition-colors hover:text-gray-200"
                            >
                                View on explorer
                                <ArrowUpRight className="h-3.5 w-3.5" />
                            </a>
                        </div>
                        <p className="mt-4 text-[12.5px] leading-relaxed text-gray-500">
                            Send CKB from any wallet or exchange that supports {DONATION_NETWORK}. Always verify the address before sending.
                        </p>
                    </div>

                    {balance !== null && (
                        <div className="mt-6 flex flex-col gap-1 border-t border-[#21262d] pt-5">
                            <div className="flex items-baseline justify-between">
                                <span className="text-[13px] text-gray-400">Raised so far</span>
                                <span className="font-mono text-[20px] font-semibold text-white">
                                    {formatCkb(balance)} <span className="text-[13px] text-gray-400">CKB</span>
                                </span>
                            </div>
                            {ckbUsdPrice !== null && (
                                <div className="text-right font-mono text-[13px] text-[#3cc68a]">
                                    ≈ {formatUsd(balance * ckbUsdPrice)} USD
                                </div>
                            )}
                        </div>
                    )}
                </section>

                {/* Donate with wallet */}
                <section aria-labelledby="donate-wallet" className="flex flex-col rounded-xl border border-[#30363d] bg-[#161b22] p-6">
                    <h3 id="donate-wallet" className="text-[15px] font-semibold text-white">Donate with your wallet</h3>
                    <p className="mt-1 text-[13px] text-gray-400">Choose an amount, then approve the transfer in your wallet.</p>

                    <div role="radiogroup" aria-label="Amount" className="mt-5 grid grid-cols-4 gap-2">
                        {PRESET_AMOUNTS.map((value) => (
                            <button
                                key={value}
                                type="button"
                                role="radio"
                                aria-checked={preset === value}
                                onClick={() => {
                                    setPreset(value);
                                    setCustom('');
                                }}
                                className={`h-11 rounded-lg border font-mono text-[13.5px] font-medium transition-colors ${
                                    preset === value
                                        ? 'border-[#3cc68a] bg-[#3cc68a]/10 text-[#3cc68a]'
                                        : 'border-[#30363d] bg-[#21262d] text-gray-200 hover:border-gray-500'
                                }`}
                            >
                                {value.toLocaleString()}
                            </button>
                        ))}
                    </div>

                    <label className="mt-3 flex h-11 items-center rounded-lg border border-[#30363d] bg-[#0d1117] px-3 focus-within:border-[#3cc68a]">
                        <span className="sr-only">Other amount in CKB</span>
                        <input
                            inputMode="decimal"
                            placeholder="Other amount"
                            value={custom}
                            onChange={(event) => {
                                setCustom(event.target.value);
                                setPreset(null);
                            }}
                            className="min-w-0 flex-1 bg-transparent font-mono text-[14px] text-gray-200 outline-none placeholder:text-gray-500"
                        />
                        <span className="font-mono text-[12px] text-gray-400">CKB</span>
                    </label>

                    {amount !== null && amount > 0 && ckbUsdPrice !== null && (
                        <p className="mt-2 text-[12.5px] font-mono text-emerald-400/90">
                            ≈ {formatUsd(amount * ckbUsdPrice)} USD
                        </p>
                    )}

                    {preset === null && custom && !amount && (
                        <p className="mt-1.5 text-[12px] text-rose-300">Enter an amount in CKB, like 250 or 12.5.</p>
                    )}

                    <div className="mt-auto pt-6">
                        {!signer ? (
                            <button
                                type="button"
                                onClick={() => open()}
                                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#238636] text-[15px] font-medium text-white transition-colors hover:bg-[#2ea043]"
                            >
                                <Wallet className="h-4 w-4" />
                                Connect wallet
                            </button>
                        ) : (
                            <>
                                {walletAddress && (
                                    <p className="mb-3 flex items-center justify-between text-[12.5px] text-gray-400">
                                        <span>From</span>
                                        <span className="font-mono text-gray-200">{shortAddress(walletAddress)}</span>
                                    </p>
                                )}
                                {!onMainnet && (
                                    <p className="mb-3 flex items-start gap-2 rounded-lg border border-amber-400/30 bg-amber-400/10 p-3 text-[12.5px] text-amber-200">
                                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                                        Your wallet is on testnet. Switch it to {DONATION_NETWORK} to donate to this address.
                                    </p>
                                )}
                                <button
                                    type="button"
                                    onClick={() => void donate()}
                                    disabled={!amount || send.kind === 'sending'}
                                    className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#238636] text-[15px] font-medium text-white transition-colors hover:bg-[#2ea043] disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {send.kind === 'sending' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Heart className="h-4 w-4" />}
                                    {send.kind === 'sending'
                                        ? 'Waiting for your wallet…'
                                        : amount
                                          ? `Donate ${formatCkb(amount)} CKB`
                                          : 'Donate'}
                                </button>
                            </>
                        )}

                        {send.kind === 'sent' && (
                            <div role="status" className="mt-3 rounded-lg border border-[#3cc68a]/30 bg-[#3cc68a]/10 p-3 text-[13px]">
                                <p className="font-medium text-[#3cc68a]">Thank you! {formatCkb(send.amount)} CKB sent.</p>
                                <a
                                    href={explorerTxUrl(send.txHash)}
                                    target="_blank"
                                    rel="noreferrer noopener"
                                    className="mt-1 inline-flex items-center gap-1 font-mono text-[12px] text-gray-400 hover:text-gray-200"
                                >
                                    {send.txHash.slice(0, 10)}…{send.txHash.slice(-8)}
                                    <ArrowUpRight className="h-3 w-3" />
                                </a>
                            </div>
                        )}
                        {send.kind === 'error' && (
                            <p role="alert" className="mt-3 flex items-start gap-2 rounded-lg border border-rose-400/30 bg-rose-400/10 p-3 text-[13px] text-rose-200">
                                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                                {send.message}
                            </p>
                        )}
                    </div>
                </section>
            </div>

            {/* ────────── Recent Donors Section ────────── */}
            <section aria-labelledby="recent-donors" className="rounded-xl border border-[#30363d] bg-[#161b22] p-6">
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-[#3cc68a]" />
                        <h3 id="recent-donors" className="text-[15px] font-semibold text-white">Recent Donors</h3>
                    </div>
                    <span className="text-[12px] text-gray-400">On-chain contributions</span>
                </div>

                <div className="mt-4 overflow-hidden rounded-lg border border-[#21262d]">
                    {loadingDonors ? (
                        <div className="flex items-center justify-center p-8 text-gray-400">
                            <Loader2 className="h-5 w-5 animate-spin text-[#3cc68a] mr-2" />
                            <span>Loading donors...</span>
                        </div>
                    ) : donors.length === 0 ? (
                        <div className="p-8 text-center text-[13px] text-gray-500">
                            No recent on-chain donors recorded yet. Be the first to donate!
                        </div>
                    ) : (
                        <div className="divide-y divide-[#21262d]">
                            <div className="grid grid-cols-[1fr_120px_130px] bg-[#0d1117] px-4 py-2.5 text-[12px] font-medium text-gray-400">
                                <div>Donor Address</div>
                                <div>Amount</div>
                                <div className="text-right">Transaction</div>
                            </div>
                            {donors.map((record) => (
                                <div key={record.txHash} className="grid grid-cols-[1fr_120px_130px] items-center px-4 py-3 text-[13px] bg-[#161b22] hover:bg-[#1f242c]">
                                    <div className="font-mono text-gray-200 truncate pr-4">
                                        {shortAddress(record.donorAddress)}
                                    </div>
                                    <div className="font-mono font-medium text-[#3cc68a]">
                                        {formatCkb(record.amountCkb)} <span className="text-[11px] text-gray-400">CKB</span>
                                    </div>
                                    <div className="text-right">
                                        <a
                                            href={explorerTxUrl(record.txHash)}
                                            target="_blank"
                                            rel="noreferrer noopener"
                                            className="inline-flex items-center gap-1 font-mono text-[12px] text-gray-400 hover:text-gray-200"
                                        >
                                            {record.txHash.slice(0, 6)}…{record.txHash.slice(-4)}
                                            <ArrowUpRight className="h-3 w-3" />
                                        </a>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </section>

            {/* ────────── Where your support goes ────────── */}
            <section aria-labelledby="where-it-goes">
                <h3 id="where-it-goes" className="font-mono text-[11px] uppercase tracking-[0.18em] text-gray-500">
                    Where your support goes
                </h3>
                <div className="mt-3 grid gap-3 md:grid-cols-3">
                    {USES.map(({ icon: Icon, title, body }) => (
                        <div key={title} className="rounded-xl border border-[#30363d] bg-[#161b22] p-5">
                            <Icon className="h-5 w-5 text-[#3cc68a]" />
                            <h4 className="mt-3 text-[14px] font-semibold text-white">{title}</h4>
                            <p className="mt-1 text-[13px] leading-relaxed text-gray-400">{body}</p>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
}
