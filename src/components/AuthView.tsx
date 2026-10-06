// src/components/AuthView.tsx
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';

import {
    AlertCircle,
    ArrowLeft,
    ArrowRight,
    Check,
    ChevronDown,
    Copy,
    Loader2,
    ShieldCheck,
    Wallet,
} from 'lucide-react';

import { ccc } from '@ckb-ccc/connector-react';

import { ApiError } from '../lib/api-client';
import { authApi } from '../features/auth/api/auth.api';
import { GoogleSignInButton, googleSignInEnabled } from '../features/auth/components/GoogleSignInButton';
import { useAuth } from '../features/auth/hooks/useAuth';

interface AuthViewProps {
    onAuthenticated?: () => void;
    sessionExpired?: boolean;
}

type Phase = 'idle' | 'preparing' | 'signing' | 'verifying' | 'done';

const LOGO_URL =
    'https://res.cloudinary.com/dswyz4vpp/image/upload/v1785082590/ChatGPT_Image_Jul_26__2026__01_05_52_PM-removebg-preview_wua44l.png';

function shorten(address: string): string {
    return address.length <= 22 ? address : `${address.slice(0, 12)}…${address.slice(-8)}`;
}

/** Turns wallet and API failures into something a person can act on. */
function describeError(error: unknown): string {
    const message = error instanceof Error ? error.message : String(error ?? '');

    if (/reject|denied|cancel|declin|closed|user abort/i.test(message)) {
        return 'You cancelled the signature request. Nothing was signed.';
    }

    if (error instanceof ApiError) {
        if (error.status === 429) return error.message;
        if (error.status === 0) return error.message;
        if (error.status >= 500) return 'Corven had a problem verifying your wallet. Please try again.';
        return error.message;
    }

    return message || 'Something went wrong. Please try again.';
}

const PHASE_LABEL: Record<Phase, string> = {
    idle: 'Sign in',
    preparing: 'Preparing request…',
    signing: 'Approve in your wallet…',
    verifying: 'Verifying signature…',
    done: 'Signed in',
};

export default function AuthView({ onAuthenticated, sessionExpired }: AuthViewProps) {
    const { open, wallet, disconnect } = ccc.useCcc();
    const signer = ccc.useSigner();
    const { walletLogin, googleLogin } = useAuth();
    const [googleBusy, setGoogleBusy] = useState(false);

    const [address, setAddress] = useState('');
    const [phase, setPhase] = useState<Phase>('idle');
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [copied, setCopied] = useState(false);

    // Ignore results from a sign-in that was started with a previous wallet.
    const attempt = useRef(0);

    useEffect(() => {
        let cancelled = false;
        attempt.current += 1;

        setAddress('');
        setPhase('idle');
        setMessage('');

        if (!signer) return;

        setError('');

        signer
            .getRecommendedAddress()
            .then((value) => !cancelled && setAddress(value))
            .catch((caught) => !cancelled && setError(describeError(caught)));

        return () => {
            cancelled = true;
        };
    }, [signer]);

    const signIn = useCallback(async () => {
        if (!signer || !address) return;

        const id = ++attempt.current;
        const stale = () => id !== attempt.current;

        setError('');
        setPhase('preparing');

        try {
            const challenge = await authApi.createWalletChallenge({ walletAddress: address });
            if (stale()) return;

            setMessage(challenge.message);
            setPhase('signing');

            const signature = await signer.signMessage(challenge.message);
            if (stale()) return;

            setPhase('verifying');

            await walletLogin({
                walletAddress: address,
                challengeId: challenge.challengeId,
                signature,
            });

            setPhase('done');
            onAuthenticated?.();
        } catch (caught) {
            if (stale()) return;
            setPhase('idle');
            setError(describeError(caught));
        }
    }, [signer, address, walletLogin, onAuthenticated]);

    const signInWithGoogle = useCallback(
        async (credential: string) => {
            setError('');
            setGoogleBusy(true);
            try {
                await googleLogin(credential);
                onAuthenticated?.();
            } catch (caught) {
                setError(describeError(caught));
            } finally {
                setGoogleBusy(false);
            }
        },
        [googleLogin, onAuthenticated],
    );

    const copyAddress = async () => {
        try {
            await navigator.clipboard.writeText(address);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1500);
        } catch {
            /* clipboard blocked */
        }
    };

    const busy = phase !== 'idle';
    const connected = Boolean(signer);

    return (
        <div className="cv-auth min-h-screen bg-[var(--ink)] text-[var(--text)] antialiased">
            <style>{`
                .cv-auth {
                    --ink: #0a0b0d; --surface: #0f1114; --raised: #14171b;
                    --text: #ecebe6; --muted: #9a9ea6; --dim: #62676f;
                    --line: rgba(255,255,255,0.07); --line-strong: rgba(255,255,255,0.12);
                    --accent: #3cc68a; --accent-hi: #5ad8a0; --danger: #f07178;
                    font-family: 'Geist', ui-sans-serif, system-ui, sans-serif;
                }
                .cv-auth ::selection { background: rgba(60,198,138,0.3); }
                .cv-mono { font-family: 'Geist Mono', ui-monospace, SFMono-Regular, Menlo, monospace; }
                .cv-serif { font-family: 'Instrument Serif', ui-serif, Georgia, serif; font-weight: 400; }
                .cv-grid {
                    background-image:
                        linear-gradient(to right, rgba(255,255,255,0.045) 1px, transparent 1px),
                        linear-gradient(to bottom, rgba(255,255,255,0.045) 1px, transparent 1px);
                    background-size: 56px 56px;
                    mask-image: radial-gradient(ellipse 80% 70% at 30% 20%, #000 20%, transparent 75%);
                    -webkit-mask-image: radial-gradient(ellipse 80% 70% at 30% 20%, #000 20%, transparent 75%);
                }
            `}</style>

            <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
                {/* ---------------------------------------------- Brand panel */}
                <aside className="relative hidden overflow-hidden border-r border-[var(--line)] bg-[var(--surface)] lg:flex lg:flex-col lg:justify-between lg:p-12 xl:p-16">
                    <div className="cv-grid pointer-events-none absolute inset-0" />
                    <div className="pointer-events-none absolute left-0 top-0 h-px w-2/3 bg-gradient-to-r from-[var(--accent)]/50 to-transparent" />

                    <a href="/" className="relative flex items-center gap-2.5">
                        <img src={LOGO_URL} alt="" className="h-7 w-7 object-contain" />
                        <span className="text-[17px] font-semibold tracking-[-0.02em]">Corven</span>
                    </a>

                    <div className="relative max-w-[520px]">
                        <h1 className="text-[3.4rem] font-medium leading-[1.02] tracking-[-0.045em] xl:text-[4rem]">
                            Start building{' '}
                            <span className="cv-serif italic text-[var(--accent)]">in seconds.</span>
                        </h1>
                        <p className="mt-6 max-w-[440px] text-[16px] leading-[1.65] text-[var(--muted)]">
                            There's no password to create or forget. Continue with Google, or
                            prove a wallet is yours by signing a one-time message.
                        </p>

                        <ol className="mt-12 border-t border-[var(--line)]">
                            {[
                                ['Sign in', 'Continue with Google, or choose JoyID, MetaMask, UniSat, OKX or another wallet.'],
                                ['Confirm', 'Wallets approve a plain-text message. It is not a transaction.'],
                                ['Build', 'Your workspaces open, and you stay signed in on this device.'],
                            ].map(([title, body], i) => (
                                <li key={title} className="flex gap-5 border-b border-[var(--line)] py-5">
                                    <span className="cv-mono pt-0.5 text-[11px] text-[var(--accent)]">
                                        {String(i + 1).padStart(2, '0')}
                                    </span>
                                    <div>
                                        <div className="text-[15px] font-medium">{title}</div>
                                        <div className="mt-1 text-[14px] leading-[1.6] text-[var(--muted)]">{body}</div>
                                    </div>
                                </li>
                            ))}
                        </ol>
                    </div>

                    <p className="cv-mono relative text-[11px] text-[var(--dim)]">
                        Corven never sees your Google password or your private keys.
                    </p>
                </aside>

                {/* ---------------------------------------------- Sign-in panel */}
                <main className="flex flex-col px-5 py-8 sm:px-10">
                    <div className="flex items-center justify-between">
                        <a href="/" className="flex items-center gap-2.5 lg:hidden">
                            <img src={LOGO_URL} alt="" className="h-6 w-6 object-contain" />
                            <span className="text-[16px] font-semibold tracking-[-0.02em]">Corven</span>
                        </a>
                        <a
                            href="/"
                            className="ml-auto inline-flex items-center gap-1.5 text-[13px] text-[var(--muted)] transition-colors hover:text-[var(--text)]"
                        >
                            <ArrowLeft className="h-3.5 w-3.5" /> Back to home
                        </a>
                    </div>

                    <div className="flex flex-1 items-center justify-center py-12">
                        <div className="w-full max-w-[400px]">
                            <div className="cv-mono flex items-center gap-3 text-[11px] uppercase tracking-[0.18em] text-[var(--dim)]">
                                <span className="text-[var(--accent)]">§</span>
                                <span className="h-px w-6 bg-[var(--line-strong)]" />
                                Sign in
                            </div>

                            <h2 className="mt-5 text-[2rem] font-medium leading-[1.1] tracking-[-0.035em]">
                                {connected ? 'Confirm it’s you' : 'Sign in to Corven'}
                            </h2>
                            <p className="mt-3 text-[15px] leading-[1.6] text-[var(--muted)]">
                                {connected
                                    ? 'Sign a one-time message to finish signing in.'
                                    : googleSignInEnabled
                                        ? 'Use your Google account or a CKB-compatible wallet. New here? This creates your account.'
                                        : 'Use a CKB-compatible wallet to sign in or create your account.'}
                            </p>

                            {connected && <Steps connected={connected} phase={phase} />}

                            {sessionExpired && !error && phase === 'idle' && (
                                <Notice tone="info">Your session ended. Sign in again to pick up where you left off.</Notice>
                            )}

                            {error && (
                                <Notice tone="error">
                                    <span>{error}</span>
                                </Notice>
                            )}

                            {!connected ? (
                                <>
                                    {googleSignInEnabled && (
                                        <>
                                            <div className={`mt-8 ${googleBusy ? 'pointer-events-none opacity-60' : ''}`} aria-busy={googleBusy}>
                                                <GoogleSignInButton
                                                    onCredential={(credential) => void signInWithGoogle(credential)}
                                                    onError={(message) => setError(message)}
                                                />
                                            </div>
                                            {googleBusy && (
                                                <p className="mt-3 flex items-center justify-center gap-2 text-[13px] text-[var(--muted)]">
                                                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Signing in with Google…
                                                </p>
                                            )}
                                            <div className="cv-mono my-5 flex items-center gap-3 text-[11px] uppercase tracking-[0.18em] text-[var(--dim)]">
                                                <span className="h-px flex-1 bg-[var(--line)]" />
                                                or
                                                <span className="h-px flex-1 bg-[var(--line)]" />
                                            </div>
                                        </>
                                    )}
                                    <button
                                        type="button"
                                        disabled={googleBusy}
                                        onClick={() => {
                                            setError('');
                                            open();
                                        }}
                                        className={`${googleSignInEnabled ? '' : 'mt-6 '}inline-flex h-12 w-full items-center justify-center gap-2 rounded-md bg-[var(--accent)] text-[15px] font-medium text-[#07120c] transition-colors hover:bg-[var(--accent-hi)] active:translate-y-px disabled:opacity-60`}
                                    >
                                        <Wallet className="h-4 w-4" />
                                        Connect wallet
                                    </button>
                                </>
                            ) : (
                                <>
                                    <div className="mt-6 rounded-lg border border-[var(--line-strong)] bg-[var(--raised)] p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-md border border-[var(--line)] bg-[var(--ink)]">
                                                {wallet?.icon ? (
                                                    <img src={wallet.icon} alt="" className="h-6 w-6 object-contain" />
                                                ) : (
                                                    <Wallet className="h-4 w-4 text-[var(--muted)]" />
                                                )}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="text-[13px] font-medium">{wallet?.name ?? 'Wallet'}</div>
                                                <div
                                                    className="cv-mono truncate text-[12px] text-[var(--muted)]"
                                                    title={address}
                                                >
                                                    {address ? shorten(address) : 'Reading address…'}
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={copyAddress}
                                                disabled={!address}
                                                aria-label="Copy wallet address"
                                                className="rounded-md p-2 text-[var(--dim)] transition-colors hover:bg-white/[0.04] hover:text-[var(--text)] disabled:opacity-40"
                                            >
                                                {copied ? <Check className="h-4 w-4 text-[var(--accent)]" /> : <Copy className="h-4 w-4" />}
                                            </button>
                                        </div>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={signIn}
                                        disabled={!address || busy}
                                        aria-busy={busy}
                                        className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-md bg-[var(--accent)] text-[15px] font-medium text-[#07120c] transition-colors hover:bg-[var(--accent-hi)] active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        {busy ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : null}
                                        {PHASE_LABEL[phase]}
                                        {!busy && <ArrowRight className="h-4 w-4" />}
                                    </button>

                                    {phase === 'signing' && (
                                        <p className="mt-3 text-center text-[13px] text-[var(--muted)]">
                                            Check your wallet. It may have opened a popup or a new tab.
                                        </p>
                                    )}

                                    <div className="mt-4 flex items-center justify-between text-[13px]">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setError('');
                                                open();
                                            }}
                                            disabled={busy}
                                            className="text-[var(--muted)] transition-colors hover:text-[var(--text)] disabled:opacity-40"
                                        >
                                            Use a different wallet
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                attempt.current += 1;
                                                disconnect();
                                            }}
                                            className="text-[var(--dim)] transition-colors hover:text-[var(--text)]"
                                        >
                                            Disconnect
                                        </button>
                                    </div>

                                    {message && (
                                        <details className="group mt-6 rounded-lg border border-[var(--line)] open:bg-[var(--surface)]">
                                            <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-[13px] text-[var(--muted)] hover:text-[var(--text)]">
                                                What am I signing?
                                                <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
                                            </summary>
                                            <pre className="cv-mono overflow-x-auto whitespace-pre-wrap break-all border-t border-[var(--line)] px-4 py-3 text-[11.5px] leading-[1.7] text-[var(--muted)]">
                                                {message}
                                            </pre>
                                        </details>
                                    )}
                                </>
                            )}

                            <div className="mt-10 flex items-start gap-3 border-t border-[var(--line)] pt-6 text-[13px] leading-[1.6] text-[var(--dim)]">
                                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[var(--muted)]" />
                                <span>
                                    Signing in never sends a transaction or costs fees. Each wallet sign-in
                                    request can be used once and expires after 5 minutes.
                                </span>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}

function Steps({ connected, phase }: { connected: boolean; phase: Phase }) {
    const signed = phase === 'done';
    const items = [
        { label: 'Connect', state: connected ? 'done' : 'active' },
        { label: 'Sign', state: signed ? 'done' : connected ? 'active' : 'todo' },
    ] as const;

    return (
        <ol className="mt-8 grid grid-cols-2 gap-2" aria-label="Sign-in progress">
            {items.map((item, i) => (
                <li key={item.label} className="flex flex-col gap-2">
                    <span
                        className={`h-[3px] rounded-full transition-colors duration-500 ${
                            item.state === 'todo' ? 'bg-[var(--line-strong)]' : 'bg-[var(--accent)]'
                        } ${item.state === 'active' ? 'opacity-50' : ''}`}
                    />
                    <span
                        className={`cv-mono flex items-center gap-1.5 text-[11px] uppercase tracking-[0.14em] ${
                            item.state === 'todo' ? 'text-[var(--dim)]' : 'text-[var(--muted)]'
                        }`}
                    >
                        {item.state === 'done' ? (
                            <Check className="h-3 w-3 text-[var(--accent)]" />
                        ) : (
                            <span className="text-[var(--dim)]">{String(i + 1).padStart(2, '0')}</span>
                        )}
                        {item.label}
                    </span>
                </li>
            ))}
        </ol>
    );
}

function Notice({ tone, children }: { tone: 'error' | 'info'; children: ReactNode }) {
    const styles =
        tone === 'error'
            ? 'border-[var(--danger)]/25 bg-[var(--danger)]/[0.07] text-[#f4a3a8]'
            : 'border-[var(--line-strong)] bg-white/[0.03] text-[var(--muted)]';

    return (
        <div
            role={tone === 'error' ? 'alert' : 'status'}
            className={`mt-6 flex items-start gap-2.5 rounded-lg border px-4 py-3 text-[13.5px] leading-[1.55] ${styles}`}
        >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {children}
        </div>
    );
}
