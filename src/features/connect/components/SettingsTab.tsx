// Settings: name, logo, allowed origins, sign-in methods, Google client id,
// mainnet; and deleting the app.

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Check } from 'lucide-react';

import { Modal } from '../../../components/ui/Modal';
import { connectApi, connectKeys, type AppInput, type ConnectApp, type LoginMethod } from '../connect.api';
import { FieldLabel, MethodsEditor, OriginsEditor } from './AppForm';
import { Button, Card, ErrorNote, inputClass } from './ui';

export function SettingsTab({ app }: { app: ConnectApp }) {
    const queryClient = useQueryClient();
    const readOnly = app.role === 'VIEWER';
    const isOwner = app.role === 'OWNER';

    const [name, setName] = useState(app.name);
    const [logoUrl, setLogoUrl] = useState(app.logoUrl ?? '');
    const [origins, setOrigins] = useState(app.allowedOrigins);
    const [methods, setMethods] = useState<LoginMethod[]>(app.loginMethods);
    const [googleClientId, setGoogleClientId] = useState(app.googleClientId ?? '');
    const [mainnet, setMainnet] = useState(app.mainnetEnabled);
    const [saved, setSaved] = useState(false);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        setName(app.name);
        setLogoUrl(app.logoUrl ?? '');
        setOrigins(app.allowedOrigins);
        setMethods(app.loginMethods);
        setGoogleClientId(app.googleClientId ?? '');
        setMainnet(app.mainnetEnabled);
    }, [app]);

    const changes = useMemo(() => {
        const c: AppInput = {};
        if (name.trim() !== app.name) c.name = name.trim();
        if ((logoUrl.trim() || null) !== app.logoUrl) c.logoUrl = logoUrl.trim() || null;
        if (origins.join() !== app.allowedOrigins.join()) c.allowedOrigins = origins;
        if (methods.join() !== app.loginMethods.join()) c.loginMethods = methods;
        if ((googleClientId.trim() || null) !== app.googleClientId) c.googleClientId = googleClientId.trim() || null;
        if (mainnet !== app.mainnetEnabled) c.mainnetEnabled = mainnet;
        return c;
    }, [name, logoUrl, origins, methods, googleClientId, mainnet, app]);
    const dirty = Object.keys(changes).length > 0;

    const save = useMutation({
        mutationFn: () => connectApi.updateApp(app.id, changes),
        onSuccess: (updated) => {
            queryClient.setQueryData(connectKeys.app(app.id), updated);
            void queryClient.invalidateQueries({ queryKey: connectKeys.apps });
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        },
    });

    const googleWithoutClient = methods.includes('GOOGLE') && !googleClientId.trim();

    return (
        <div className="space-y-5">
            {readOnly && <p className="rounded-lg border border-outline-variant/30 bg-surface-container-low px-3 py-2 text-[12.5px] text-on-surface-variant">You're a viewer of this app. Ask an owner or admin to change its settings.</p>}

            <Card>
                <h2 className="text-[14px] font-semibold text-on-surface">General</h2>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <div>
                        <FieldLabel htmlFor="s-name">App name</FieldLabel>
                        <input id="s-name" className={inputClass} value={name} maxLength={60} disabled={readOnly} onChange={(e) => setName(e.target.value)} />
                    </div>
                    <div>
                        <FieldLabel htmlFor="s-logo">Logo URL</FieldLabel>
                        <input id="s-logo" className={inputClass} placeholder="https://myapp.xyz/logo.png" value={logoUrl} disabled={readOnly} onChange={(e) => setLogoUrl(e.target.value)} />
                    </div>
                </div>
            </Card>

            <Card>
                <h2 className="text-[14px] font-semibold text-on-surface">Allowed origins</h2>
                <p className="mt-0.5 mb-4 text-[12px] text-on-surface-variant">Only pages on these origins can use this app id. Add your production domain and your local dev server.</p>
                <OriginsEditor value={origins} onChange={setOrigins} disabled={readOnly} />
            </Card>

            <Card>
                <h2 className="text-[14px] font-semibold text-on-surface">Sign-in methods</h2>
                <p className="mt-0.5 mb-4 text-[12px] text-on-surface-variant">The modal shows these; the server refuses the rest.</p>
                <MethodsEditor value={methods} onChange={setMethods} disabled={readOnly} />
                <div className="mt-4">
                    <FieldLabel htmlFor="s-google">Google OAuth client id</FieldLabel>
                    <input id="s-google" className={`${inputClass} font-mono`} placeholder="123-abc.apps.googleusercontent.com" value={googleClientId} disabled={readOnly} onChange={(e) => setGoogleClientId(e.target.value)} />
                    <p className={`mt-1.5 text-[11.5px] ${googleWithoutClient ? 'text-[#f3dfaa]' : 'text-on-surface-variant'}`}>
                        {googleWithoutClient ? 'Google is on but has no client id, so the button stays hidden (unless the server sets a default). ' : ''}
                        In Google Cloud Console, add your allowed origins to the client's Authorized JavaScript origins.
                    </p>
                </div>
            </Card>

            <Card>
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h2 className="text-[14px] font-semibold text-on-surface">Mainnet</h2>
                        <p className="mt-0.5 max-w-xl text-[12px] text-on-surface-variant">
                            Let users sign mainnet transactions with their Corven wallet. Each one needs the user to confirm it's them, and there's a daily limit per user. Only owners can change this.
                        </p>
                    </div>
                    <label className="relative inline-flex shrink-0 cursor-pointer items-center">
                        <input type="checkbox" role="switch" aria-label="Mainnet" className="peer sr-only" checked={mainnet} disabled={!isOwner} onChange={(e) => setMainnet(e.target.checked)} />
                        <span className="h-6 w-11 rounded-full border border-outline-variant/50 bg-surface-container-high transition-colors peer-checked:border-primary peer-checked:bg-primary/80 peer-disabled:opacity-50" />
                        <span className="absolute left-1 top-1 h-4 w-4 rounded-full bg-on-surface transition-transform peer-checked:translate-x-5" />
                    </label>
                </div>
                {mainnet && !app.mainnetEnabled && (
                    <p className="mt-3 flex gap-2 rounded-lg border border-[#f0b429]/35 bg-[#f0b429]/10 px-3 py-2 text-[12px] text-[#f3dfaa]">
                        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> Real CKB will move. Make sure your app shows users what they sign.
                    </p>
                )}
            </Card>

            {!readOnly && (
                <div className="sticky bottom-4 z-10 flex items-center justify-end gap-3 rounded-xl border border-outline-variant/30 bg-surface-container-lowest/90 px-4 py-3 backdrop-blur">
                    <ErrorNote error={save.error} />
                    {saved && (
                        <span className="flex items-center gap-1 text-[12.5px] text-primary">
                            <Check className="h-3.5 w-3.5" /> Saved
                        </span>
                    )}
                    <Button
                        variant="ghost"
                        disabled={!dirty || save.isPending}
                        onClick={() => {
                            setName(app.name);
                            setLogoUrl(app.logoUrl ?? '');
                            setOrigins(app.allowedOrigins);
                            setMethods(app.loginMethods);
                            setGoogleClientId(app.googleClientId ?? '');
                            setMainnet(app.mainnetEnabled);
                        }}
                    >
                        Discard
                    </Button>
                    <Button variant="primary" disabled={!dirty || !name.trim() || origins.length === 0 || methods.length === 0} busy={save.isPending} onClick={() => save.mutate()}>
                        Save changes
                    </Button>
                </div>
            )}

            {isOwner && (
                <Card className="border-error/30">
                    <h2 className="text-[14px] font-semibold text-error">Delete app</h2>
                    <p className="mt-0.5 text-[12px] text-on-surface-variant">
                        Deletes the app, all its users and their Corven-held wallet keys. Users lose access to any CKB in those wallets unless they exported their keys. This can't be undone.
                    </p>
                    <Button variant="danger" className="mt-4" onClick={() => setDeleting(true)}>
                        Delete this app
                    </Button>
                </Card>
            )}

            {deleting && <DeleteAppModal app={app} onClose={() => setDeleting(false)} />}
        </div>
    );
}

function DeleteAppModal({ app, onClose }: { app: ConnectApp; onClose: () => void }) {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [typed, setTyped] = useState('');
    const del = useMutation({
        mutationFn: () => connectApi.deleteApp(app.id, typed),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: connectKeys.apps });
            navigate('/connect', { replace: true });
        },
    });
    return (
        <Modal
            isOpen
            onClose={onClose}
            title={`Delete ${app.name}?`}
            footer={
                <>
                    <Button variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button variant="danger" disabled={typed !== app.name} busy={del.isPending} onClick={() => del.mutate()}>
                        Delete app
                    </Button>
                </>
            }
        >
            <p className="text-[12.5px] text-on-surface-variant">
                {(app.userCount ?? 0).toLocaleString()} user(s) will lose their accounts. Type <span className="font-mono text-on-surface">{app.name}</span> to confirm.
            </p>
            <input aria-label="App name" autoFocus className={`${inputClass} mt-3`} value={typed} onChange={(e) => setTyped(e.target.value)} />
            <div className="mt-3">
                <ErrorNote error={del.error} />
            </div>
        </Modal>
    );
}
