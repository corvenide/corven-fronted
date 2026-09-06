// src/features/workspace/components/CreateWorkspaceModal.tsx
import React, { useState } from 'react';
import {
    Box,
    FileCode2,
    Terminal,
    Sparkles,
} from 'lucide-react';

import { Modal } from '../../../components/ui/Modal';
import { useWorkspaces } from '../hooks/useWorkspaces';
import type { Workspace } from '../../workspace/types/workspace.types';

interface CreateWorkspaceModalProps {
    isOpen: boolean;
    onClose: () => void;
    /** Fired after the workspace is successfully created. */
    onCreated: (workspace: Workspace) => void;
    /** Pre-selects a template, e.g. when opened from "Use Template". */
    initialTemplateId?: string;
}

export function CreateWorkspaceModal({
    isOpen,
    onClose,
    onCreated,
    initialTemplateId,
}: CreateWorkspaceModalProps) {
    const {
        createWorkspace,
        isCreating,
        createError,
        resetCreateError,
    } = useWorkspaces();

    const [name, setName] = useState('');

    const handleClose = () => {
        if (isCreating) return;
        setName('');
        resetCreateError();
        onClose();
    };

    const handleSubmit = async (
        e: React.FormEvent<HTMLFormElement>,
    ) => {
        e.preventDefault();
        if (!name.trim() || isCreating) return;

        const workspace = await createWorkspace({
            name: name.trim()
        });

        onCreated(workspace);
        handleClose();
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            title="Create Workspace"
            footer={
                <>
                    <button
                        type="button"
                        onClick={handleClose}
                        disabled={isCreating}
                        className="rounded-lg border border-[#30363d] px-4 py-2 text-xs font-semibold text-gray-300 transition-colors hover:bg-[#21262d] disabled:opacity-50"
                    >
                        Cancel
                    </button>

                    <button
                        type="submit"
                        form="create-workspace-form"
                        disabled={!name.trim() || isCreating}
                        className="rounded-lg bg-[#1f6feb] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#388bfd] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {isCreating
                            ? 'Creating...'
                            : 'Create Workspace'}
                    </button>
                </>
            }
        >
            <form
                id="create-workspace-form"
                onSubmit={handleSubmit}
                className="flex flex-col gap-5"
            >
                <div className="flex flex-col gap-2">
                    <label
                        htmlFor="workspace-name"
                        className="text-[11px] font-semibold uppercase tracking-wide text-gray-400"
                    >
                        Workspace name
                    </label>
                    <input
                        id="workspace-name"
                        type="text"
                        value={name}
                        onChange={(e) =>
                            setName(e.target.value)
                        }
                        placeholder="my-fiber-service"
                        autoFocus
                        className="rounded-lg border border-[#30363d] bg-[#0d1117] px-3 py-2 font-mono text-sm text-gray-200 outline-none placeholder:text-gray-600 focus:border-[#1f6feb]"
                    />
                </div>

                {createError && (
                    <p className="text-xs text-rose-400">
                        {createError instanceof Error
                            ? createError.message
                            : 'Failed to create workspace. Try again.'}
                    </p>
                )}
            </form>
        </Modal>
    );
}