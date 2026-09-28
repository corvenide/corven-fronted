// src/pages/SettingsPage.tsx
import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Check, Copy, Loader2 } from 'lucide-react';

import { Avatar, displayName } from '../components/layout/UserMenu';
import { aiApi } from '../features/ai/api/ai.api';
import { useAuth } from '../features/auth/hooks/useAuth';
import { ConfirmDialog } from '../features/dashboard/components/ConfirmDialog';

const MODEL_KEY = 'corven.ai.model';
const CHAT_PREFIX = 'corven.ai.chat.';

function readModel(): string {
    try {
        return localStorage.getItem(MODEL_KEY) ?? '';
    } catch {
        return '';
    }
}

function countSavedChats(): number {
    try {
        return Object.keys(localStorage).filter((key) => key.startsWith(CHAT_PREFIX)).length;
    } catch {
        return 0;
    }
}

function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
    return (
        <section className="grid gap-4 border-b border-[#21262d] py-8 first:pt-0 last:border-b-0 md:grid-cols-[240px_1fr] md:gap-10">
            <div>
                <h2 className="text-[14px] font-semibold text-white">{title}</h2>
                {description && <p className="mt-1 text-[13px] leading-[1.55] text-gray-500">{description}</p>}
            </div>
            <div className="min-w-0">{children}</div>
        </section>
    );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
    return (
        <div className="flex flex-col gap-1 border-b border-[#21262d] py-3 last:border-b-0 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
            <dt className="text-[13px] text-gray-400">{label}</dt>
            <dd className="min-w-0 text-[13px] text-gray-200 sm:text-right">{children}</dd>
        </div>
    );
}

export default function SettingsPage() {
    const navigate = useNavigate();
    const { user, logoutEverywhere } = useAuth();
    const ai = useQuery({ queryKey: ['ai', 'status'], queryFn: aiApi.status, staleTime: 5 * 60_000, retry: 1 });

    const [copied, setCopied] = useState(false);
    const [model, setModel] = useState(readModel);
    const [savedChats, setSavedChats] = useState(countSavedChats);
    const [confirmSignOut, setConfirmSignOut] = useState(false);
    const [signingOut, setSigningOut] = useState(false);

    if (!user) return null;

    const selectedModel = model || ai.data?.defaultModel || '';

    const copyAddress = async () => {
        if (!user.walletAddress) return;
        try {
            await navigator.clipboard.writeText(user.walletAddress);
            setCopied(true);
            setTimeout(() => setCopied(false), 1400);
        } catch {
            /* clipboard blocked */
        }
    };

    const chooseModel = (id: string) => {
        setModel(id);
        try {
            localStorage.setItem(MODEL_KEY, id);
        } catch {
            /* storage unavailable */
        }
    };

    const clearChats = () => {
        try {
            Object.keys(localStorage)
                .filter((key) => key.startsWith(CHAT_PREFIX))
                .forEach((key) => localStorage.removeItem(key));
        } catch {
            /* storage unavailable */
        }
        setSavedChats(countSavedChats());
    };

    const signOutEverywhere = async () => {
        setSigningOut(true);
        try {
            await logoutEverywhere();
            navigate('/auth', { replace: true });
        } finally {
            setSigningOut(false);
        }
    };

    return (
        <div className="min-h-full bg-[#0d1117] px-5 pb-16 pt-8 text-gray-200 sm:px-8">
            <div className="mx-auto max-w-[960px]">
                <h1 className="text-[24px] font-semibold tracking-[-0.01em] text-white">Settings</h1>
                <p className="mt-1 text-[14px] text-gray-400">Your account, the AI assistant, and sign-in sessions.</p>

                <div className="mt-8">
                    <Section title="Account" description="You sign in with your CKB wallet. Corven never sees your private keys.">
                        <div className="flex items-center gap-3 pb-4">
                            <Avatar user={user} size={40} />
                            <div className="min-w-0">
                                <div className="truncate text-[15px] font-medium text-white">{displayName(user)}</div>
                                <div className="text-[12.5px] text-gray-500">
                                    {user.authProvider === 'CKB_WALLET' ? 'Wallet account' : 'Email account'}
                                </div>
                            </div>
                        </div>
                        <dl className="rounded-lg border border-[#30363d] bg-[#161b22] px-4">
                            {user.walletAddress && (
                                <Field label="Wallet address">
                                    <button
                                        type="button"
                                        onClick={() => void copyAddress()}
                                        title="Copy address"
                                        className="group inline-flex max-w-full items-center gap-2 font-mono text-[12px] text-gray-200 hover:text-white"
                                    >
                                        <span className="break-all text-left sm:text-right">{user.walletAddress}</span>
                                        {copied ? (
                                            <Check className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                                        ) : (
                                            <Copy className="h-3.5 w-3.5 shrink-0 text-gray-500 group-hover:text-gray-300" />
                                        )}
                                    </button>
                                </Field>
                            )}
                            {user.email && <Field label="Email">{user.email}</Field>}
                            <Field label="Member since">
                                {new Date(user.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}
                            </Field>
                        </dl>
                    </Section>

                    <Section title="AI assistant" description="Claude in the IDE. Your choice of model is saved in this browser.">
                        {ai.isLoading ? (
                            <div className="h-24 animate-pulse rounded-lg border border-[#30363d] bg-[#161b22]" />
                        ) : !ai.data?.enabled ? (
                            <div className="rounded-lg border border-[#30363d] bg-[#161b22] px-4 py-3.5 text-[13px] leading-[1.6] text-gray-400">
                                {ai.isError
                                    ? 'Couldn’t reach the assistant service.'
                                    : 'The assistant isn’t configured on this server yet. An administrator needs to set ANTHROPIC_API_KEY for the API gateway.'}
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <fieldset>
                                    <legend className="mb-2 text-[13px] text-gray-400">Default model</legend>
                                    <div className="overflow-hidden rounded-lg border border-[#30363d]">
                                        {ai.data.models.map((m) => (
                                            <label
                                                key={m.id}
                                                className={`flex cursor-pointer items-start gap-3 border-b border-[#21262d] px-4 py-3 last:border-b-0 ${
                                                    selectedModel === m.id ? 'bg-[#1f6feb]/10' : 'bg-[#161b22] hover:bg-[#1c2128]'
                                                }`}
                                            >
                                                <input
                                                    type="radio"
                                                    name="model"
                                                    value={m.id}
                                                    checked={selectedModel === m.id}
                                                    onChange={() => chooseModel(m.id)}
                                                    className="mt-1 accent-[#58a6ff]"
                                                />
                                                <span className="min-w-0">
                                                    <span className="block text-[13.5px] text-gray-100">
                                                        {m.name}
                                                        {m.id === ai.data.defaultModel && <span className="ml-2 text-[11.5px] text-gray-500">server default</span>}
                                                    </span>
                                                    {m.description && <span className="block text-[12px] text-gray-500">{m.description}</span>}
                                                </span>
                                            </label>
                                        ))}
                                    </div>
                                </fieldset>

                                <div className="flex flex-col gap-2 rounded-lg border border-[#30363d] bg-[#161b22] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                                    <div>
                                        <div className="text-[13px] text-gray-200">Saved conversations</div>
                                        <div className="text-[12px] text-gray-500">
                                            {savedChats === 0
                                                ? 'None in this browser.'
                                                : `${savedChats} workspace chat${savedChats === 1 ? '' : 's'} stored in this browser.`}
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={clearChats}
                                        disabled={savedChats === 0}
                                        className="h-8 shrink-0 rounded-md border border-[#30363d] px-3 text-[13px] text-gray-200 hover:bg-[#21262d] disabled:opacity-40"
                                    >
                                        Clear conversations
                                    </button>
                                </div>
                            </div>
                        )}
                    </Section>

                    <Section title="Sessions" description="Signed in somewhere you no longer use? End every session, including this one.">
                        <div className="flex flex-col gap-3 rounded-lg border border-[#30363d] bg-[#161b22] px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
                            <div className="text-[13px] text-gray-300">Sign out of all devices and browsers</div>
                            <button
                                type="button"
                                onClick={() => setConfirmSignOut(true)}
                                disabled={signingOut}
                                className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border border-rose-500/40 px-3 text-[13px] text-rose-300 transition-colors hover:bg-rose-500/10 disabled:opacity-50"
                            >
                                {signingOut && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                                Sign out everywhere
                            </button>
                        </div>
                    </Section>
                </div>
            </div>

            <ConfirmDialog
                isOpen={confirmSignOut}
                onClose={() => setConfirmSignOut(false)}
                onConfirm={() => {
                    setConfirmSignOut(false);
                    void signOutEverywhere();
                }}
                title="Sign out everywhere?"
                description="Every browser signed in to your account, including this one, will need to connect the wallet again."
                confirmLabel="Sign out everywhere"
                variant="danger"
            />
        </div>
    );
}
