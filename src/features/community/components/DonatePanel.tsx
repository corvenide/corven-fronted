// src/features/community/components/DonatePanel.tsx
import { useEffect, useMemo, useState } from 'react';
import { ccc } from '@ckb-ccc/connector-react';
import {
    AlertTriangle,
    ArrowUpRight,
    Check,
    Copy,
    Cpu,
    Heart,
    Loader2,
    Server,
    Wallet,
    Wrench,
} from 'lucide-react';

import {
    DONATION_ADDRESS,
    DONATION_NETWORK,
    DonationError,
    PRESET_AMOUNTS,
    explorerAddressUrl,
    explorerTxUrl,
    fetchDonationBalance,
    parseCkbAmount,
    sendDonation,
} from '../donation';
import { shortAddress } from './shared';

type SendState =
    | { kind: 'idle' }
    | { kind: 'sending' }
    | { kind: 'sent'; txHash: string; amount: number }
    | { kind: 'error'; message: string };

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

function formatCkb(value: number): string {
    return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export default function DonatePanel() {
    const { open, client } = ccc.useCcc();
    const signer = ccc.useSigner();

    const [copied, setCopied] = useState(false);
    const [balance, setBalance] = useState<number | null>(null);
    const [walletAddress, setWalletAddress] = useState<string | null>(null);

    const [preset, setPreset] = useState<number | null>(PRESET_AMOUNTS[1]);
    const [custom, setCustom] = useState('');
    const [send, setSend] = useState<SendState>({ kind: 'idle' });

    const amount = useMemo(() => (preset !== null ? preset : parseCkbAmount(custom)), [preset, custom]);

    // Read the total again after each donation.
    const lastTxHash = send.kind === 'sent' ? send.txHash : null;
    useEffect(() => {
        let cancelled = false;
        void fetchDonationBalance(new ccc.ClientPublicTestnet()).then((value) => !cancelled && setBalance(value));
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
                      : 'The donation couldn’t be sent. Please try again.';
            setSend({ kind: 'error', message });
        }
    };

    const onTestnet = !client || client.addressPrefix === 'ckt';

    return (
        <div className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
                {/* ------------------------------------------ Address */}
                <section aria-labelledby="donation-address" className="rounded-2xl border border-[var(--line-strong)] bg-[var(--surface)] p-6">
                    <div className="flex items-center justify-between gap-3">
                        <h2 id="donation-address" className="text-[15px] font-semibold">Donation address</h2>
                        <span className="cv-mono inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-400/10 px-2.5 py-1 text-[11px] text-amber-300">
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-300" />
                            {DONATION_NETWORK}
                        </span>
                    </div>

                    <div className="mt-5">
                        <div className="min-w-0">
                            <p className="cv-mono break-all rounded-lg border border-[var(--line)] bg-[var(--ink)] p-3 text-[12px] leading-[1.65] text-[var(--text)]" data-testid="donation-address">
                                {DONATION_ADDRESS}
                            </p>
                            <div className="mt-3 flex flex-wrap gap-2">
                                <button
                                    type="button"
                                    onClick={() => void copy()}
                                    className="inline-flex h-9 items-center gap-2 rounded-md border border-[var(--line-strong)] bg-[var(--raised)] px-3 text-[13px] font-medium transition-colors hover:border-white/25"
                                >
                                    {copied ? <Check className="h-4 w-4 text-[var(--accent)]" /> : <Copy className="h-4 w-4 text-[var(--muted)]" />}
                                    {copied ? 'Copied' : 'Copy address'}
                                </button>
                                <a
                                    href={explorerAddressUrl()}
                                    target="_blank"
                                    rel="noreferrer noopener"
                                    className="inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-[13px] text-[var(--muted)] transition-colors hover:text-[var(--text)]"
                                >
                                    View on explorer
                                    <ArrowUpRight className="h-3.5 w-3.5" />
                                </a>
                            </div>
                            <p className="mt-4 text-[12.5px] leading-relaxed text-[var(--dim)]">
                                Send CKB from any wallet or exchange that supports {DONATION_NETWORK}. Always check the address
                                before sending.
                            </p>
                        </div>
                    </div>

                    {balance !== null && (
                        <div className="mt-6 flex items-baseline justify-between border-t border-[var(--line)] pt-5">
                            <span className="text-[13px] text-[var(--muted)]">Raised so far</span>
                            <span className="cv-mono text-[20px] font-semibold text-[var(--text)]">
                                {formatCkb(balance)} <span className="text-[13px] text-[var(--muted)]">CKB</span>
                            </span>
                        </div>
                    )}
                </section>

                {/* ------------------------------------------ Wallet donation */}
                <section aria-labelledby="donate-wallet" className="flex flex-col rounded-2xl border border-[var(--line-strong)] bg-[var(--surface)] p-6">
                    <h2 id="donate-wallet" className="text-[15px] font-semibold">Donate with your wallet</h2>
                    <p className="mt-1 text-[13px] text-[var(--muted)]">Choose an amount, then approve the transfer in your wallet.</p>

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
                                className={`cv-mono h-11 rounded-lg border text-[13.5px] font-medium transition-colors ${
                                    preset === value
                                        ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]'
                                        : 'border-[var(--line-strong)] bg-[var(--raised)] text-[var(--text)] hover:border-white/25'
                                }`}
                            >
                                {value.toLocaleString()}
                            </button>
                        ))}
                    </div>

                    <label className="mt-3 flex h-11 items-center rounded-lg border border-[var(--line-strong)] bg-[var(--ink)] px-3 focus-within:border-[var(--accent)]">
                        <span className="sr-only">Other amount in CKB</span>
                        <input
                            inputMode="decimal"
                            placeholder="Other amount"
                            value={custom}
                            onChange={(event) => {
                                setCustom(event.target.value);
                                setPreset(null);
                            }}
                            className="cv-mono min-w-0 flex-1 bg-transparent text-[14px] outline-none placeholder:text-[var(--dim)]"
                        />
                        <span className="cv-mono text-[12px] text-[var(--muted)]">CKB</span>
                    </label>
                    {preset === null && custom && !amount && (
                        <p className="mt-1.5 text-[12px] text-rose-300">Enter an amount in CKB, like 250 or 12.5.</p>
                    )}

                    <div className="mt-auto pt-6">
                        {!signer ? (
                            <button
                                type="button"
                                onClick={() => open()}
                                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[var(--accent)] text-[15px] font-medium text-[#07120c] transition-colors hover:bg-[var(--accent-hi)]"
                            >
                                <Wallet className="h-4 w-4" />
                                Connect wallet
                            </button>
                        ) : (
                            <>
                                {walletAddress && (
                                    <p className="mb-3 flex items-center justify-between text-[12.5px] text-[var(--muted)]">
                                        <span>From</span>
                                        <span className="cv-mono text-[var(--text)]">{shortAddress(walletAddress)}</span>
                                    </p>
                                )}
                                {!onTestnet && (
                                    <p className="mb-3 flex items-start gap-2 rounded-lg border border-amber-400/30 bg-amber-400/10 p-3 text-[12.5px] text-amber-200">
                                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                                        Your wallet is on mainnet. Switch it to {DONATION_NETWORK} to donate to this address.
                                    </p>
                                )}
                                <button
                                    type="button"
                                    onClick={() => void donate()}
                                    disabled={!amount || send.kind === 'sending'}
                                    className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[var(--accent)] text-[15px] font-medium text-[#07120c] transition-colors hover:bg-[var(--accent-hi)] disabled:cursor-not-allowed disabled:opacity-50"
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
                            <div role="status" className="mt-3 rounded-lg border border-[var(--accent)]/30 bg-[var(--accent)]/10 p-3 text-[13px]">
                                <p className="font-medium text-[var(--accent)]">Thank you! {formatCkb(send.amount)} CKB sent.</p>
                                <a
                                    href={explorerTxUrl(send.txHash)}
                                    target="_blank"
                                    rel="noreferrer noopener"
                                    className="cv-mono mt-1 inline-flex items-center gap-1 text-[12px] text-[var(--muted)] hover:text-[var(--text)]"
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

            {/* ------------------------------------------ Where it goes */}
            <section aria-labelledby="where-it-goes">
                <h2 id="where-it-goes" className="cv-mono text-[11px] uppercase tracking-[0.18em] text-[var(--dim)]">
                    Where your support goes
                </h2>
                <div className="mt-3 grid gap-3 md:grid-cols-3">
                    {USES.map(({ icon: Icon, title, body }) => (
                        <div key={title} className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-5">
                            <Icon className="h-5 w-5 text-[var(--accent)]" />
                            <h3 className="mt-3 text-[14px] font-semibold">{title}</h3>
                            <p className="mt-1 text-[13px] leading-relaxed text-[var(--muted)]">{body}</p>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
}

