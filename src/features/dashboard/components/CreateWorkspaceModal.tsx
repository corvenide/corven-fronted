// src/features/dashboard/components/CreateWorkspaceModal.tsx
import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { Modal } from '../../../components/ui/Modal';
import { useWorkspaces } from '../hooks/useWorkspaces';
import { workspaceApi } from '../../workspace/api/workspace.api';
import type { Workspace } from '../../workspace/types/workspace.types';

interface CreateWorkspaceModalProps {
    isOpen: boolean;
    onClose: () => void;
    /** Fired after the workspace is successfully created. */
    onCreated: (workspace: Workspace) => void;
    /** Pre-selects a template. */
    initialTemplateId?: string;
}

const DEFAULT_TEMPLATE_ID = 'hello-world';

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
    const [templateId, setTemplateId] = useState(initialTemplateId ?? DEFAULT_TEMPLATE_ID);

    const templates = useQuery({
        queryKey: ['workspace-templates'],
        queryFn: () => workspaceApi.templates(),
        enabled: isOpen,
        staleTime: Infinity,
    });

    useEffect(() => {
        if (isOpen) setTemplateId(initialTemplateId ?? DEFAULT_TEMPLATE_ID);
    }, [isOpen, initialTemplateId]);

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
            name: name.trim(),
            templateId,
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
                        placeholder="my-token"
                        autoFocus
                        className="rounded-lg border border-[#30363d] bg-[#0d1117] px-3 py-2 font-mono text-sm text-gray-200 outline-none placeholder:text-gray-600 focus:border-[#1f6feb]"
                    />
                </div>

                <fieldset className="flex flex-col gap-2">
                    <legend className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                        Start from
                    </legend>

                    {templates.isLoading && (
                        <p className="text-xs text-gray-500">Loading templates…</p>
                    )}

                    {templates.isError && (
                        <p className="text-xs text-gray-500">
                            Couldn't load templates; the workspace starts from Hello world.
                        </p>
                    )}

                    {templates.data?.map((template) => {
                        const selected = template.id === templateId;
                        return (
                            <label
                                key={template.id}
                                className={`flex cursor-pointer gap-3 rounded-lg border px-3 py-2.5 transition-colors ${
                                    selected
                                        ? 'border-[#1f6feb] bg-[#1f6feb]/10'
                                        : 'border-[#30363d] hover:border-[#484f58]'
                                }`}
                            >
                                <input
                                    type="radio"
                                    name="template"
                                    value={template.id}
                                    checked={selected}
                                    onChange={() => setTemplateId(template.id)}
                                    className="mt-0.5 accent-[#1f6feb]"
                                />
                                <span className="min-w-0">
                                    <span className="block text-[13px] font-semibold text-gray-200">
                                        {template.name}
                                    </span>
                                    <span className="mt-0.5 block text-[12px] leading-[1.45] text-gray-400">
                                        {template.description}
                                    </span>
                                    <span className="mt-1 block font-mono text-[11px] text-gray-500">
                                        contracts/{template.contracts.join(', contracts/')}
                                    </span>
                                </span>
                            </label>
                        );
                    })}
                </fieldset>

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
