// src/features/wallet/CorvenWalletCard.tsx
//
// Settings card for the Corven-held wallets of a Google account: addresses,
// balances, sending CKB and exporting a key. Mainnet sends and key exports
// are confirmed with Google first (a fresh sign-in token).

import { useState, type FormEvent, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Check, Copy, ExternalLink, KeyRound, Loader2, RefreshCw, Send, Wallet, X } from 'lucide-react';

import { GoogleSignInButton } from '../auth/components/GoogleSignInButton';
import { EXPLORER, walletApi, walletKeys, type CorvenWallet, type WalletNetwork } from './wallet.api';

const TESTNET_FAUCET = 'https://faucet.nervos.org/';

function formatCkb(shannons: string | bigint | null | undefined): string {
    if (shannons === null || shannons === undefined) return '—';
    const value = BigInt(shannons);
    const whole = value / 100_000_000n;
    const fraction = (value % 100_000_000n).toString().padStart(8, '0').replace(/0+$/, '').slice(0, 4);
    return `${whole.toLocaleString()}${fraction ? `.${fraction}` : ''}`;
}

function short(address: string): string {
    return address.length > 26 ? `${address.slice(0, 14)}…${address.slice(-8)}` : address;
}

type Action =
    | { kind: 'send'; network: WalletNetwork }
    | { kind: 'export'; network: WalletNetwork }
    | null;

export function CorvenWalletCard() {
    const queryClient = useQueryClient();
    const [action, setAction] = useState<Action>(null);
    const [copied, setCopied] = useState<string | null>(null);

    const overview = useQuery({ queryKey: walletKeys.all, queryFn: () => walletApi.list(), refetchInterval: 30_000 });

    const copy = async (text: string, id: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopied(id);
            window.setTimeout(() => setCopied(null), 1500);
        } catch {
            /* clipboard blocked */
        }
    };

    const data = overview.data;

    return (
        <div className="rounded-lg border border-outline-variant/30 bg-surface-container p-6">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h3 className="flex items-center gap-2 text-[14px] font-semibold text-on-surface font-mono">
                        <Wallet className="h-4 w-4 text-primary" /> Corven wallet
                    </h3>
                    <p className="mt-1 max-w-[560px] text-[12.5px] leading-[1.6] text-on-surface-variant">
                        Corven holds these wallets for your Google account, so you can deploy and send CKB without a
                        wallet app. Export a key at any time to move to a wallet you control.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => void overview.refetch()}
                    aria-label="Refresh balances"
                    className="rounded p-1.5 text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
                >
                    <RefreshCw className={`h-4 w-4 ${overview.isFetching ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {overview.isLoading && <p className="mt-5 text-[12.5px] text-on-surface-variant">Loading wallets…</p>}

            {overview.isError && (
                <Notice tone="error">{overview.error instanceof Error ? overview.error.message : 'Could not load wallets.'}</Notice>
            )}

            {data && !data.enabled && (
                <Notice tone="info">Corven wallets aren’t set up on this server yet.</Notice>
            )}

            {data?.enabled && (
                <>
                    <ul className="mt-5 divide-y divide-outline-variant/15 rounded-md border border-outline-variant/20">
                        {data.wallets.map((w) => (
                            <WalletRow
                                key={w.network}
                                wallet={w}
                                copied={copied === w.network}
                                onCopy={() => void copy(w.address, w.network)}
                                onSend={() => setAction({ kind: 'send', network: w.network })}
                                onExport={() => setAction({ kind: 'export', network: w.network })}
                            />
                        ))}
                    </ul>

                    {action?.kind === 'send' && (
                        <SendForm
                            network={action.network}
                            wallet={data.wallets.find((w) => w.network === action.network)!}
                            remainingToday={BigInt(data.mainnetDailyLimit) - BigInt(data.mainnetSentToday)}
                            dailyLimit={BigInt(data.mainnetDailyLimit)}
                            onClose={() => setAction(null)}
                            onSent={() => void queryClient.invalidateQueries({ queryKey: walletKeys.all })}
                        />
                    )}

                    {action?.kind === 'export' && (
                        <ExportKey network={action.network} onClose={() => {
                            setAction(null);
                            void queryClient.invalidateQueries({ queryKey: walletKeys.all });
                        }} />
                    )}

                    {Boolean(data.transfers?.length) && (
                        <div className="mt-6">
                            <h4 className="font-mono text-[11px] uppercase tracking-wide text-on-surface-variant">Recent sends</h4>
                            <ul className="mt-2 space-y-1.5 text-[12px]">
                                {data.transfers!.slice(0, 5).map((t) => (
                                    <li key={t.txHash} className="flex flex-wrap items-center justify-between gap-2 font-mono">
                                        <span className="text-on-surface">
                                            {formatCkb(t.amount)} CKB → <span className="text-on-surface-variant">{short(t.toAddress)}</span>
                                            <span className="ml-2 text-[10.5px] text-on-surface-variant">{t.network === 'MAINNET' ? 'mainnet' : 'testnet'}</span>
                                        </span>
                                        <a
                                            href={`${EXPLORER[t.network]}/transaction/${t.txHash}`}
                                            target="_blank"
                                            rel="noreferrer noopener"
                                            className="inline-flex items-center gap-1 text-primary hover:underline"
                                        >
                                            {new Date(t.createdAt).toLocaleString()} <ExternalLink className="h-3 w-3" />
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

function WalletRow({
    wallet,
    copied,
    onCopy,
    onSend,
    onExport,
}: {
    wallet: CorvenWallet;
    copied: boolean;
    onCopy: () => void;
    onSend: () => void;
    onExport: () => void;
}) {
    const mainnet = wallet.network === 'MAINNET';

    return (
        <li className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
                <div className="flex items-center gap-2">
                    <span
                        className={`rounded px-1.5 py-0.5 font-mono text-[10.5px] font-medium ${
                            mainnet ? 'bg-primary/15 text-primary' : 'bg-secondary/15 text-secondary'
                        }`}
                    >
                        {mainnet ? 'Mainnet' : 'Testnet'}
                    </span>
                    <span className="font-mono text-[13px] text-on-surface">
                        {wallet.balance === null ? 'Balance unavailable' : `${formatCkb(wallet.balance)} CKB`}
                    </span>
                    {wallet.exportedAt && (
                        <span className="font-mono text-[10.5px] text-amber-300" title={`Key exported ${new Date(wallet.exportedAt).toLocaleString()}`}>
                            key exported
                        </span>
                    )}
                </div>
                <button
                    type="button"
                    onClick={onCopy}
                    title={wallet.address}
                    className="mt-1.5 inline-flex max-w-full items-center gap-1.5 font-mono text-[12px] text-on-surface-variant hover:text-on-surface"
                >
                    <span className="truncate">{short(wallet.address)}</span>
                    {copied ? <Check className="h-3.5 w-3.5 shrink-0 text-primary" /> : <Copy className="h-3.5 w-3.5 shrink-0" />}
                </button>
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-2 text-[12px]">
                <a
                    href={`${EXPLORER[wallet.network]}/address/${wallet.address}`}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="inline-flex items-center gap-1 text-on-surface-variant hover:text-on-surface"
                >
                    Explorer <ExternalLink className="h-3 w-3" />
                </a>
                {!mainnet && (
                    <a href={TESTNET_FAUCET} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1 text-on-surface-variant hover:text-on-surface">
                        Faucet <ExternalLink className="h-3 w-3" />
                    </a>
                )}
                <SmallButton onClick={onSend}>
                    <Send className="h-3.5 w-3.5" /> Send
                </SmallButton>
                <SmallButton onClick={onExport}>
                    <KeyRound className="h-3.5 w-3.5" /> Export key
                </SmallButton>
            </div>
        </li>
    );
}

function SendForm({
    network,
    wallet,
    remainingToday,
    dailyLimit,
    onClose,
    onSent,
}: {
    network: WalletNetwork;
    wallet: CorvenWallet;
    remainingToday: bigint;
    dailyLimit: bigint;
    onClose: () => void;
    onSent: () => void;
}) {
    const mainnet = network === 'MAINNET';
    const [to, setTo] = useState('');
    const [amount, setAmount] = useState('');
    const [confirming, setConfirming] = useState(false);

    const send = useMutation({
        mutationFn: (confirmation?: string) => walletApi.transfer({ network, to: to.trim(), amountCkb: amount.trim(), confirmation }),
        onSuccess: () => {
            setConfirming(false);
            onSent();
        },
        onError: () => setConfirming(false),
    });

    const submit = (event: FormEvent) => {
        event.preventDefault();
        send.reset();
        if (mainnet) setConfirming(true);
        else send.mutate(undefined);
    };

    return (
        <Panel title={`Send CKB on ${mainnet ? 'mainnet' : 'testnet'}`} onClose={onClose}>
            {send.isSuccess ? (
                <div className="space-y-3">
                    <Notice tone="success">
                        Sent {amount} CKB.{' '}
                        <a
                            href={`${EXPLORER[network]}/transaction/${send.data.txHash}`}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="font-medium underline-offset-2 hover:underline"
                        >
                            View transaction
                        </a>
                    </Notice>
                    <SmallButton onClick={onClose}>Done</SmallButton>
                </div>
            ) : (
                <form onSubmit={submit} className="space-y-3">
                    <Field label="To address">
                        <input
                            value={to}
                            onChange={(e) => setTo(e.target.value)}
                            placeholder={mainnet ? 'ckb1…' : 'ckt1…'}
                            required
                            disabled={confirming || send.isPending}
                            className="w-full rounded border border-outline-variant/30 bg-surface px-3 py-2 font-mono text-[12.5px] text-on-surface outline-none focus:border-primary"
                        />
                    </Field>
                    <Field label={`Amount (CKB) · balance ${formatCkb(wallet.balance)} CKB`}>
                        <input
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            inputMode="decimal"
                            placeholder="100"
                            required
                            disabled={confirming || send.isPending}
                            className="w-full rounded border border-outline-variant/30 bg-surface px-3 py-2 font-mono text-[12.5px] text-on-surface outline-none focus:border-primary"
                        />
                    </Field>
                    <p className="text-[11.5px] text-on-surface-variant">
                        At least 61 CKB per send.
                        {mainnet &&
                            ` Mainnet sends need a Google confirmation and are capped at ${formatCkb(dailyLimit)} CKB per 24 hours (${formatCkb(
                                remainingToday > 0n ? remainingToday : 0n,
                            )} CKB left).`}
                    </p>

                    {send.isError && <Notice tone="error">{send.error instanceof Error ? send.error.message : 'Send failed.'}</Notice>}

                    {confirming ? (
                        <div className="space-y-2 rounded-md border border-outline-variant/25 bg-surface p-3">
                            <p className="text-[12px] text-on-surface">
                                Confirm sending <span className="font-mono">{amount} CKB</span> to{' '}
                                <span className="font-mono">{short(to.trim())}</span> with your Google account.
                            </p>
                            <GoogleSignInButton onCredential={(credential) => send.mutate(credential)} />
                            <button type="button" onClick={() => setConfirming(false)} className="text-[12px] text-on-surface-variant hover:text-on-surface">
                                Cancel
                            </button>
                        </div>
                    ) : (
                        <button
                            type="submit"
                            disabled={send.isPending}
                            className="inline-flex h-9 items-center gap-2 rounded bg-primary px-4 text-[12.5px] font-medium text-on-primary hover:bg-primary-fixed disabled:opacity-60"
                        >
                            {send.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                            {send.isPending ? 'Sending…' : mainnet ? 'Continue' : 'Send'}
                        </button>
                    )}
                </form>
            )}
        </Panel>
    );
}

function ExportKey({ network, onClose }: { network: WalletNetwork; onClose: () => void }) {
    const [copied, setCopied] = useState(false);
    const reveal = useMutation({ mutationFn: (confirmation: string) => walletApi.exportKey({ network, confirmation }) });

    return (
        <Panel title={`Export ${network === 'MAINNET' ? 'mainnet' : 'testnet'} private key`} onClose={onClose}>
            {reveal.data ? (
                <div className="space-y-3">
                    <Notice tone="warning">
                        Anyone with this key controls the wallet. Store it in a wallet app or password manager and don’t
                        share it. Corven keeps its copy so your workspace can still sign.
                    </Notice>
                    <div className="flex items-center gap-2 rounded border border-outline-variant/30 bg-surface px-3 py-2">
                        <code className="min-w-0 flex-1 break-all font-mono text-[12px] text-on-surface">{reveal.data.privateKey}</code>
                        <button
                            type="button"
                            onClick={() => {
                                void navigator.clipboard.writeText(reveal.data!.privateKey).then(() => setCopied(true));
                            }}
                            aria-label="Copy private key"
                            className="shrink-0 rounded p-1.5 text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
                        >
                            {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
                        </button>
                    </div>
                    <SmallButton onClick={onClose}>Hide key</SmallButton>
                </div>
            ) : (
                <div className="space-y-3">
                    <p className="text-[12.5px] leading-[1.6] text-on-surface-variant">
                        Confirm with your Google account to show this wallet’s private key. You can import it into a CKB
                        wallet such as Neuron to control the funds yourself.
                    </p>
                    {reveal.isError && <Notice tone="error">{reveal.error instanceof Error ? reveal.error.message : 'Export failed.'}</Notice>}
                    {reveal.isPending ? (
                        <p className="flex items-center gap-2 text-[12px] text-on-surface-variant">
                            <Loader2 className="h-4 w-4 animate-spin" /> Checking…
                        </p>
                    ) : (
                        <GoogleSignInButton onCredential={(credential) => reveal.mutate(credential)} />
                    )}
                </div>
            )}
        </Panel>
    );
}

function Panel({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
    return (
        <div className="mt-5 rounded-md border border-outline-variant/25 bg-surface-container-high/40 p-4">
            <div className="mb-3 flex items-center justify-between">
                <h4 className="font-mono text-[12.5px] font-semibold text-on-surface">{title}</h4>
                <button type="button" onClick={onClose} aria-label="Close" className="rounded p-1 text-on-surface-variant hover:text-on-surface">
                    <X className="h-4 w-4" />
                </button>
            </div>
            <div className="max-w-[440px]">{children}</div>
        </div>
    );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
    return (
        <label className="block">
            <span className="mb-1 block font-mono text-[11px] text-on-surface-variant">{label}</span>
            {children}
        </label>
    );
}

function SmallButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="inline-flex h-8 items-center gap-1.5 rounded border border-outline-variant/30 bg-surface px-3 text-[12px] text-on-surface hover:bg-surface-container-high"
        >
            {children}
        </button>
    );
}

function Notice({ tone, children }: { tone: 'error' | 'info' | 'success' | 'warning'; children: ReactNode }) {
    const styles = {
        error: 'border-rose-500/30 bg-rose-500/10 text-rose-200',
        info: 'border-outline-variant/30 bg-surface text-on-surface-variant',
        success: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200',
        warning: 'border-amber-500/30 bg-amber-500/10 text-amber-200',
    }[tone];

    return (
        <div role={tone === 'error' ? 'alert' : 'status'} className={`mt-4 flex items-start gap-2 rounded-md border px-3 py-2.5 text-[12.5px] leading-[1.55] ${styles}`}>
            {tone === 'warning' || tone === 'error' ? <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> : null}
            <span>{children}</span>
        </div>
    );
}
