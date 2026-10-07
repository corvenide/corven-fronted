// src/features/dashboard/components/CreateWorkspaceModal.tsx
import React, { useState } from 'react';
import { useWorkspaces } from '../hooks/useWorkspaces';
import { useAuth } from '../../auth/hooks/useAuth';
import type { Workspace } from '../../workspace/types/workspace.types';

interface CreateWorkspaceModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreated: (workspace: Workspace) => void;
    initialTemplateId?: string;
}

export function CreateWorkspaceModal({
    isOpen,
    onClose,
    onCreated,
    initialTemplateId = 'hello-world',
}: CreateWorkspaceModalProps) {
    const { createWorkspace, isCreating, createError, resetCreateError } = useWorkspaces();

    const [name, setName] = useState('');
    const [selectedFramework, setSelectedFramework] = useState<'rust' | 'c'>('rust');
    const [prewarm, setPrewarm] = useState(true);
    const { isGuest } = useAuth();
    const [temporary, setTemporary] = useState(false);

    if (!isOpen) return null;

    const handleClose = () => {
        if (isCreating) return;
        setName('');
        resetCreateError();
        onClose();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || isCreating) return;

        const templateId = selectedFramework === 'rust' ? (initialTemplateId || 'hello-world') : 'c-native';

        try {
            const workspace = await createWorkspace({
                name: name.trim(),
                templateId,
                temporary: isGuest || temporary,
            });

            onCreated(workspace);
            setName('');
            onClose();
        } catch {
            // Handled by createError
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 animate-fade-in">
            <div className="w-full max-w-md bg-surface-container rounded-lg shadow-2xl flex flex-col overflow-hidden border border-outline-variant/30">
                {/* Modal Header */}
                <div className="px-3.5 py-2.5 bg-surface-container-high flex items-center justify-between border-b border-outline-variant/20">
                    <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[16px] text-primary">add_box</span>
                        <h2 className="text-[12.5px] font-semibold text-on-surface tracking-tight">Create New Workspace</h2>
                    </div>
                    <button
                        onClick={handleClose}
                        className="w-6 h-6 rounded flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors"
                        type="button"
                    >
                        <span className="material-symbols-outlined text-[15px]">close</span>
                    </button>
                </div>

                {/* Modal Body */}
                <form id="new-workspace-form" onSubmit={handleSubmit} className="p-3.5 flex flex-col gap-3">
                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] uppercase font-semibold tracking-wider text-on-surface-variant" htmlFor="workspace-name-input">
                            Workspace Name
                        </label>
                        <input
                            id="workspace-name-input"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-surface-container-lowest rounded text-on-surface placeholder:text-on-surface-variant/40 text-[11px] font-mono border border-outline-variant/20 focus:border-primary focus:outline-none transition-colors"
                            placeholder="e.g. ckb-amm-swap"
                            autoFocus
                            required
                        />
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] uppercase font-semibold tracking-wider text-on-surface-variant">Framework & Runtime</label>
                        <div className="grid grid-cols-2 gap-1.5">
                            <div
                                onClick={() => setSelectedFramework('rust')}
                                className={`p-2 rounded cursor-pointer flex flex-col gap-0.5 border transition-all ${selectedFramework === 'rust'
                                        ? 'bg-surface-container-high border-primary/50 text-primary'
                                        : 'bg-surface-container-lowest border-outline-variant/20 hover:bg-surface-container-high text-on-surface'
                                    }`}
                            >
                                <span className="text-[11px] font-medium leading-tight">Rust Capsule</span>
                                <span className="text-[9.5px] font-mono text-on-surface-variant leading-tight">Recommended for high security</span>
                            </div>

                            <div
                                onClick={() => setSelectedFramework('c')}
                                className={`p-2 rounded cursor-pointer flex flex-col gap-0.5 border transition-all ${selectedFramework === 'c'
                                        ? 'bg-surface-container-high border-primary/50 text-primary'
                                        : 'bg-surface-container-lowest border-outline-variant/20 hover:bg-surface-container-high text-on-surface'
                                    }`}
                            >
                                <span className="text-[11px] font-medium leading-tight">C Native</span>
                                <span className="text-[9.5px] font-mono text-on-surface-variant leading-tight">Ultra-compact cycle size</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-between pt-0.5">
                        <div className="flex items-center gap-1.5 cursor-pointer" onClick={() => setPrewarm(!prewarm)}>
                            <input
                                checked={prewarm}
                                onChange={(e) => setPrewarm(e.target.checked)}
                                className="accent-primary rounded cursor-pointer w-3.5 h-3.5"
                                id="prewarm"
                                type="checkbox"
                            />
                            <label className="text-[10.5px] text-on-surface-variant cursor-pointer select-none" htmlFor="prewarm">
                                Prewarm Devnet on creation
                            </label>
                        </div>
                    </div>

                    {isGuest ? (
                        <p data-testid="guest-temporary-note" className="flex items-start gap-1.5 rounded border border-secondary/30 bg-secondary/10 px-2 py-1.5 text-[10.5px] leading-snug text-on-surface-variant">
                            <span className="material-symbols-outlined text-[14px] text-secondary">timer</span>
                            <span>
                                As a guest this workspace is temporary: it’s deleted 24 hours after you last use it.
                                Connect a wallet to keep it.
                            </span>
                        </p>
                    ) : (
                        <div className="flex items-center gap-1.5 cursor-pointer" onClick={() => setTemporary(!temporary)}>
                            <input
                                checked={temporary}
                                onChange={(e) => setTemporary(e.target.checked)}
                                onClick={(e) => e.stopPropagation()}
                                className="accent-primary rounded cursor-pointer w-3.5 h-3.5"
                                id="temporary-workspace"
                                type="checkbox"
                            />
                            <label className="text-[10.5px] text-on-surface-variant cursor-pointer select-none" htmlFor="temporary-workspace" onClick={(e) => e.stopPropagation()}>
                                Temporary — delete it 24 hours after I last use it
                            </label>
                        </div>
                    )}

                    {createError && (
                        <p className="text-[10px] text-error font-medium">
                            {createError instanceof Error ? createError.message : 'Failed to create workspace. Try again.'}
                        </p>
                    )}
                </form>

                {/* Modal Footer */}
                <div className="px-3.5 py-2.5 bg-surface-container-lowest flex items-center justify-end gap-2 border-t border-outline-variant/20">
                    <button
                        onClick={handleClose}
                        disabled={isCreating}
                        className="px-2.5 py-1 rounded text-on-surface-variant hover:text-on-surface text-[10.5px] font-medium transition-colors"
                        type="button"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        form="new-workspace-form"
                        disabled={!name.trim() || isCreating}
                        className="px-3 py-1 rounded bg-primary text-on-primary text-[10.5px] font-semibold hover:bg-primary-fixed transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                    >
                        {isCreating ? 'Creating Environment...' : 'Create Environment'}
                    </button>
                </div>
            </div>
        </div>
    );
}
