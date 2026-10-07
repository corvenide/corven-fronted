// src/features/workspace/components/KeepWorkspacesDialog.tsx
//
// Shown once after a guest connects a wallet (or signs in): their temporary
// workspaces are now on the account, and they choose which to keep for good.
// Anything not kept stays temporary (deleted 24 hours after its last use).

import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { useAuth } from '../../auth/hooks/useAuth';
import { workspaceApi } from '../api/workspace.api';
import { workspaceKeys } from '../queries/workspace.keys';

export function KeepWorkspacesDialog() {
    const { claimedWorkspaces, clearClaimedWorkspaces } = useAuth();
    const queryClient = useQueryClient();

    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        setSelected(new Set(claimedWorkspaces.map((w) => w.id)));
        setError('');
    }, [claimedWorkspaces]);

    if (claimedWorkspaces.length === 0) return null;

    const toggle = (id: string) =>
        setSelected((current) => {
            const next = new Set(current);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });

    const finish = async (keep: string[]) => {
        setSaving(true);
        setError('');
        try {
            await Promise.all(keep.map((id) => workspaceApi.setTemporary(id, false)));
            await queryClient.invalidateQueries({ queryKey: workspaceKeys.all });
            clearClaimedWorkspaces();
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Could not save. Try again.');
        } finally {
            setSaving(false);
        }
    };

    const count = claimedWorkspaces.length;

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="keep-title">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
            <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-outline-variant/40 bg-surface-container shadow-2xl">
                <div className="flex flex-col gap-1.5 px-5 pb-3 pt-5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
                        <span className="material-symbols-outlined text-[22px]">bookmark_add</span>
                    </div>
                    <h2 id="keep-title" className="mt-2 text-[17px] font-semibold tracking-tight text-on-surface">
                        Keep your workspace{count === 1 ? '' : 's'}?
                    </h2>
                    <p className="text-[13px] leading-relaxed text-on-surface-variant">
                        You made {count === 1 ? 'this workspace' : `these ${count} workspaces`} as a guest. They’re on your
                        account now. Keep them for good, or leave them temporary: a temporary workspace is deleted 24
                        hours after you last use it.
                    </p>
                </div>

                <ul className="mx-5 max-h-60 overflow-y-auto rounded-xl border border-outline-variant/30 bg-surface-container-low">
                    {claimedWorkspaces.map((w) => (
                        <li key={w.id} className="border-b border-outline-variant/20 last:border-0">
                            <label className="flex cursor-pointer items-center gap-3 px-3.5 py-2.5 hover:bg-surface-container-high/50">
                                <input
                                    type="checkbox"
                                    className="h-4 w-4 accent-primary"
                                    checked={selected.has(w.id)}
                                    onChange={() => toggle(w.id)}
                                />
                                <span className="min-w-0 flex-1 truncate font-mono text-[13px] text-on-surface">{w.name}</span>
                                <span className="text-[11.5px] text-on-surface-variant">
                                    {selected.has(w.id) ? 'Keep' : 'Temporary'}
                                </span>
                            </label>
                        </li>
                    ))}
                </ul>

                {error && <p role="alert" className="mx-5 mt-3 text-[12.5px] text-error">{error}</p>}

                <div className="mt-4 flex flex-col-reverse gap-2 border-t border-outline-variant/30 bg-surface-container-lowest px-5 py-3.5 sm:flex-row sm:justify-end">
                    <button
                        type="button"
                        disabled={saving}
                        onClick={() => void finish([])}
                        className="rounded-lg px-3.5 py-2 text-[13px] font-medium text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface disabled:opacity-50"
                    >
                        Keep {count === 1 ? 'it' : 'all'} temporary
                    </button>
                    <button
                        type="button"
                        disabled={saving || selected.size === 0}
                        onClick={() => void finish([...selected])}
                        className="rounded-lg bg-primary px-3.5 py-2 text-[13px] font-semibold text-on-primary transition-colors hover:bg-primary-fixed disabled:opacity-50"
                    >
                        {saving
                            ? 'Saving…'
                            : selected.size === count
                                ? `Keep ${count === 1 ? 'it' : `all ${count}`} permanently`
                                : `Keep ${selected.size} permanently`}
                    </button>
                </div>
            </div>
        </div>
    );
}
