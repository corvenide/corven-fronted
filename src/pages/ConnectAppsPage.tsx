// src/pages/ConnectAppsPage.tsx
//
// Corven Connect: the developer's apps (sign-in + embedded CKB wallets for
// their own dApps). Its own site at /connect; uses the Corven account.

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, BookOpen, Fingerprint, KeyRound, Mail, Phone, Plus, Users, Wallet } from 'lucide-react';

import { Modal } from '../components/ui/Modal';
import { connectApi, connectKeys, METHOD_LABEL, type LoginMethod } from '../features/connect/connect.api';
import { FieldLabel, MethodsEditor, OriginsEditor } from '../features/connect/components/AppForm';
import { AppLogo, Button, Card, CopyText, ErrorNote, Loading, RoleBadge, inputClass } from '../features/connect/components/ui';

export default function ConnectAppsPage() {
    const [creating, setCreating] = useState(false);
    const apps = useQuery({ queryKey: connectKeys.apps, queryFn: connectApi.listApps });

    return (
        <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <div className="flex items-center gap-2">
                        <h1 className="text-[22px] font-semibold tracking-tight text-on-surface">Corven Connect</h1>
                        <span className="rounded border border-primary/20 bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] uppercase text-primary">Beta</span>
                    </div>
                    <p className="mt-1 max-w-2xl text-[13px] text-on-surface-variant">
                        Phone, email, Google, passkey and wallet sign-in with an embedded CKB wallet, for your own apps. Create an app, add its domains, and drop the SDK in.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Link
                        to="/connect/docs/quickstart"
                        className="inline-flex items-center gap-1.5 rounded-lg border border-outline-variant/40 px-3 py-2 text-[13px] text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface"
                    >
                        <BookOpen className="h-4 w-4" /> Docs
                    </Link>
                    <Button variant="primary" onClick={() => setCreating(true)}>
                        <Plus className="h-4 w-4" /> New app
                    </Button>
                </div>
            </div>

            <div className="mt-8">
                {apps.isLoading ? (
                    <Loading />
                ) : apps.error ? (
                    <ErrorNote error={apps.error} />
                ) : apps.data && apps.data.length > 0 ? (
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {apps.data.map((app) => (
                            <Link
                                key={app.id}
                                to={`/connect/apps/${app.id}`}
                                className="group flex flex-col rounded-xl border border-outline-variant/30 bg-surface-container p-5 transition-colors hover:border-primary/40 hover:bg-surface-container-high/60"
                            >
                                <div className="flex items-start gap-3">
                                    <AppLogo name={app.name} logoUrl={app.logoUrl} />
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2">
                                            <h2 className="truncate text-[15px] font-semibold text-on-surface">{app.name}</h2>
                                            <RoleBadge role={app.role} />
                                        </div>
                                        <div className="mt-1">
                                            <CopyText value={app.id} />
                                        </div>
                                    </div>
                                    <ArrowRight className="h-4 w-4 shrink-0 text-on-surface-variant transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                                </div>
                                <div className="mt-5 flex items-center gap-4 text-[12px] text-on-surface-variant">
                                    <span className="flex items-center gap-1.5">
                                        <Users className="h-3.5 w-3.5" /> {(app.userCount ?? 0).toLocaleString()} {app.userCount === 1 ? 'user' : 'users'}
                                    </span>
                                    <span className="truncate font-mono">{app.allowedOrigins[0] ?? 'no origins'}{app.allowedOrigins.length > 1 ? ` +${app.allowedOrigins.length - 1}` : ''}</span>
                                </div>
                                <div className="mt-3 flex flex-wrap gap-1.5">
                                    {app.loginMethods.map((m) => (
                                        <MethodChip key={m} method={m} />
                                    ))}
                                    {app.mainnetEnabled && <span className="rounded-md border border-[#f0b429]/40 bg-[#f0b429]/10 px-1.5 py-0.5 text-[10.5px] text-[#f3dfaa]">Mainnet</span>}
                                </div>
                            </Link>
                        ))}
                    </div>
                ) : (
                    <EmptyState onCreate={() => setCreating(true)} />
                )}
            </div>

            {creating && <CreateAppModal onClose={() => setCreating(false)} />}
        </div>
    );
}

export function MethodChip({ method }: { method: LoginMethod | string }) {
    const Icon = { PHONE: Phone, EMAIL: Mail, GOOGLE: KeyRound, PASSKEY: Fingerprint, WALLET: Wallet }[method] ?? KeyRound;
    return (
        <span className="inline-flex items-center gap-1 rounded-md border border-outline-variant/30 bg-surface-container-low px-1.5 py-0.5 text-[10.5px] text-on-surface-variant">
            <Icon className="h-3 w-3" /> {METHOD_LABEL[method] ?? method}
        </span>
    );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
    return (
        <Card className="flex flex-col items-center px-6 py-14 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
                <Fingerprint className="h-7 w-7" />
            </div>
            <h2 className="mt-4 text-[16px] font-semibold text-on-surface">Create your first Connect app</h2>
            <p className="mt-1.5 max-w-md text-[13px] text-on-surface-variant">
                Your users sign in with their phone number, email, Google, a passkey or a wallet they already have, and get a CKB wallet without a seed phrase.
            </p>
            <Button variant="primary" className="mt-5" onClick={onCreate}>
                <Plus className="h-4 w-4" /> New app
            </Button>
        </Card>
    );
}

function CreateAppModal({ onClose }: { onClose: () => void }) {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [name, setName] = useState('');
    const [origins, setOrigins] = useState<string[]>(['http://localhost:5173']);
    const [methods, setMethods] = useState<LoginMethod[]>(['PHONE', 'EMAIL', 'GOOGLE', 'PASSKEY', 'WALLET']);

    const create = useMutation({
        mutationFn: () => connectApi.createApp({ name: name.trim(), allowedOrigins: origins, loginMethods: methods }),
        onSuccess: (app) => {
            void queryClient.invalidateQueries({ queryKey: connectKeys.apps });
            navigate(`/connect/apps/${app.id}`);
        },
    });

    const valid = name.trim().length > 0 && origins.length > 0 && methods.length > 0;

    return (
        <Modal
            isOpen
            onClose={onClose}
            title="New Connect app"
            footer={
                <>
                    <Button variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button variant="primary" busy={create.isPending} disabled={!valid} onClick={() => create.mutate()}>
                        Create app
                    </Button>
                </>
            }
        >
            <form
                className="space-y-5"
                onSubmit={(e) => {
                    e.preventDefault();
                    if (valid) create.mutate();
                }}
            >
                <div>
                    <FieldLabel htmlFor="app-name">App name</FieldLabel>
                    <input id="app-name" autoFocus className={inputClass} placeholder="Kisumu Market" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} />
                    <p className="mt-1.5 text-[11.5px] text-on-surface-variant">Shown in the sign-in modal and in code emails.</p>
                </div>
                <div>
                    <FieldLabel>Allowed origins</FieldLabel>
                    <OriginsEditor value={origins} onChange={setOrigins} />
                </div>
                <div>
                    <FieldLabel>Sign-in methods</FieldLabel>
                    <MethodsEditor value={methods} onChange={setMethods} />
                </div>
                <ErrorNote error={create.error} />
            </form>
        </Modal>
    );
}
