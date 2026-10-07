// src/features/connect/layout/ConnectAccountGate.tsx
//
// Managing Connect apps needs a real Corven account (wallet, Google or
// email). Visitors without one, and IDE guests, see what Connect is and a
// sign-in button instead.

import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, BookOpen, Fingerprint, KeyRound, Mail, Phone, Wallet } from 'lucide-react';

import { useAuth } from '../../auth/hooks/useAuth';
import { Loading } from '../components/ui';
import { ConnectMark } from './ConnectLayout';

const METHODS = [
    { icon: Phone, label: 'Phone', note: 'SMS, WhatsApp or call' },
    { icon: Mail, label: 'Email', note: 'One-time code' },
    { icon: KeyRound, label: 'Google', note: 'Your OAuth client' },
    { icon: Fingerprint, label: 'Passkeys', note: 'Face ID, fingerprint' },
    { icon: Wallet, label: 'Wallets', note: 'JoyID, MetaMask, UniSat…' },
];

export default function ConnectAccountGate() {
    const { isAuthenticated, isGuest, isInitializing } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    if (isInitializing) {
        return (
            <div className="py-24">
                <Loading />
            </div>
        );
    }

    if (isAuthenticated && !isGuest) return <Outlet />;

    const signIn = () => navigate('/auth', { state: { from: location, intent: 'connect' } });

    return (
        <div className="mx-auto w-full max-w-5xl px-4 py-14 sm:px-6 sm:py-20">
            <div className="flex flex-col items-start gap-5">
                <ConnectMark size={44} />
                <h1 className="max-w-3xl text-[34px] font-semibold leading-[1.1] tracking-[-0.03em] text-on-surface sm:text-[44px]">
                    Sign-in and a CKB wallet for your users, <span className="text-primary">without seed phrases.</span>
                </h1>
                <p className="max-w-2xl text-[15.5px] leading-[1.7] text-on-surface-variant">
                    Corven Connect gives your dApp phone, email, Google, passkey and wallet sign-in. New users get an
                    embedded wallet on testnet and mainnet, and approve every transaction in a clear screen.
                </p>
                <div className="flex flex-wrap gap-3">
                    <button
                        type="button"
                        onClick={signIn}
                        className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-[14px] font-semibold text-on-primary transition-colors hover:bg-primary-fixed"
                    >
                        {isGuest ? 'Connect a wallet to manage apps' : 'Sign in to manage apps'} <ArrowRight className="h-4 w-4" />
                    </button>
                    <Link
                        to="/connect/docs/quickstart"
                        className="flex items-center gap-2 rounded-xl border border-outline-variant/50 px-4 py-2.5 text-[14px] font-medium text-on-surface transition-colors hover:bg-surface-container"
                    >
                        <BookOpen className="h-4 w-4" /> Read the quick start
                    </Link>
                </div>
                {isGuest && (
                    <p className="text-[13px] text-on-surface-variant">
                        You’re using Corven as a guest. Apps need an account so your team and settings are kept.
                    </p>
                )}
            </div>

            <div className="mt-14 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                {METHODS.map((m) => (
                    <div key={m.label} className="rounded-xl border border-outline-variant/30 bg-surface-container-low p-4">
                        <m.icon className="h-5 w-5 text-primary" />
                        <div className="mt-3 text-[14px] font-medium text-on-surface">{m.label}</div>
                        <div className="text-[12.5px] text-on-surface-variant">{m.note}</div>
                    </div>
                ))}
            </div>

            <div className="mt-10 overflow-hidden rounded-xl border border-outline-variant/30 bg-surface-container-lowest">
                <div className="border-b border-outline-variant/20 px-4 py-2 font-mono text-[11px] text-on-surface-variant">App.tsx</div>
                <pre className="overflow-x-auto px-4 py-4 font-mono text-[12.5px] leading-[1.7] text-on-surface">
                    <code>{`<CorvenConnectProvider appId="app_…">
  <ConnectButton />
</CorvenConnectProvider>

const signer = useCorvenConnect().getSigner('TESTNET'); // a CCC signer`}</code>
                </pre>
            </div>
        </div>
    );
}
