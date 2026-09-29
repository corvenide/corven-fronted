// src/features/workspace/components/FileExplorerPanel.tsx
import React from 'react';

import {
    ChevronDown,
    ChevronRight,
    File,
    FileArchive,
    FileAudio,
    FileCode,
    FileCog,
    FileDiff,
    FileImage,
    FileJson,
    FileLock,
    FileSpreadsheet,
    FileText,
    FileType,
    FileVideo,
    FileX,
    Folder,
    FolderPlus,
    Plus,
    RefreshCw,
    Trash2,
} from 'lucide-react';

import {
    useMemo,
    useRef,
    useState,
    type KeyboardEvent,
} from 'react';

import { buildFileTree } from '../utils/file-tree';

import type { FileTreeNode } from '../utils/file-tree';
import type { WorkspaceEntry } from '../types/workspace.types';

type CreateEntryType = 'file' | 'directory';

interface FileExplorerPanelProps {
    entries: WorkspaceEntry[];
    activePath: string;
    isRefreshing: boolean;

    onSelectFile: (path: string) => void;
    onRefresh: () => void;

    onCreateFile: (
        path: string,
    ) => Promise<void>;

    onCreateDirectory: (
        path: string,
    ) => Promise<void>;

    onDelete: (
        path: string,
    ) => Promise<void>;
}

// Helper function to get the appropriate icon based on file extension
function getFileIcon(fileName: string) {
    const extension = fileName.split('.').pop()?.toLowerCase() || '';

    const extensionMap: Record<string, React.ElementType> = {
        // JavaScript/TypeScript
        'js': FileCode,
        'jsx': FileCode,
        'ts': FileType,
        'tsx': FileType,
        'mjs': FileCode,
        'cjs': FileCode,
        'cts': FileType,
        'mts': FileType,

        // JSON
        'json': FileJson,
        'jsonc': FileJson,
        'json5': FileJson,

        // Images
        'png': FileImage,
        'jpg': FileImage,
        'jpeg': FileImage,
        'gif': FileImage,
        'svg': FileImage,
        'webp': FileImage,
        'ico': FileImage,
        'bmp': FileImage,
        'tiff': FileImage,

        // Videos
        'mp4': FileVideo,
        'webm': FileVideo,
        'avi': FileVideo,
        'mov': FileVideo,
        'mkv': FileVideo,
        'flv': FileVideo,
        'wmv': FileVideo,

        // Audio
        'mp3': FileAudio,
        'wav': FileAudio,
        'flac': FileAudio,
        'aac': FileAudio,
        'ogg': FileAudio,
        'wma': FileAudio,

        // Archives
        'zip': FileArchive,
        'rar': FileArchive,
        '7z': FileArchive,
        'tar': FileArchive,
        'gz': FileArchive,
        'bz2': FileArchive,
        'xz': FileArchive,
        'tgz': FileArchive,

        // Spreadsheets
        'csv': FileSpreadsheet,
        'xls': FileSpreadsheet,
        'xlsx': FileSpreadsheet,
        'ods': FileSpreadsheet,

        // Documents
        'txt': FileText,
        'log': FileText,
        'rtf': FileText,
        'pdf': FileText,
        'doc': FileText,
        'docx': FileText,

        // Configuration
        'env': FileCog,
        'ini': FileCog,
        'cfg': FileCog,
        'conf': FileCog,
        'yaml': FileCog,
        'yml': FileCog,
        'toml': FileCog,
        'xml': FileCog,
        'xsd': FileCog,
        'xslt': FileCog,
        'properties': FileCog,

        // Python
        'py': FileCode,
        'ipynb': FileJson,

        // Ruby
        'rb': FileCode,
        'erb': FileCode,
        'rake': FileCode,
        'gemspec': FileCode,

        // PHP
        'php': FileCode,
        'phar': FileArchive,

        // Java
        'java': FileCode,
        'jar': FileArchive,
        'jsp': FileCode,

        // C/C++
        'c': FileCode,
        'cpp': FileCode,
        'cc': FileCode,
        'cxx': FileCode,
        'h': FileCode,
        'hpp': FileCode,
        'hh': FileCode,
        'hxx': FileCode,

        // C#
        'cs': FileCode,
        'csx': FileCode,

        // Go
        'go': FileCode,
        'mod': FileCode,
        'sum': FileCode,

        // Rust
        'rs': FileCode,

        // Shell
        'sh': FileCode,
        'bash': FileCode,
        'zsh': FileCode,
        'fish': FileCode,
        'ps1': FileCode,

        // SQL
        'sql': FileCode,
        'sqlite': FileCode,

        // CSS/HTML
        'css': FileCode,
        'scss': FileCode,
        'sass': FileCode,
        'less': FileCode,
        'styl': FileCode,
        'html': FileCode,
        'htm': FileCode,
        'xhtml': FileCode,
        'vue': FileCode,
        'svelte': FileCode,

        // Docker
        'dockerfile': FileCode,
        'dockerignore': FileCode,

        // Git
        'gitignore': FileCode,
        'gitattributes': FileCode,
        'gitmodules': FileCode,

        // Package managers
        'lock': FileLock,
        'npmrc': FileCog,
        'yarnrc': FileCog,
        'pnpm-lock': FileLock,

        // GraphQL
        'graphql': FileCode,
        'gql': FileCode,

        // Protocol Buffers
        'proto': FileCode,

        // Make
        'makefile': FileCog,
        'mk': FileCog,

        // CMake
        'cmake': FileCog,
        'cmakelists': FileCog,

        // Other
        'patch': FileDiff,
        'diff': FileDiff,
        'bak': FileX,
        'tmp': FileX,
        'swp': FileX,
    };

    // Check if file has an extension
    if (!extension) {
        // For files without extension (like README, LICENSE, etc.)
        const specialFiles: Record<string, React.ElementType> = {
            'readme': FileText,
            'license': FileText,
            'changelog': FileText,
            'contributing': FileText,
            'makefile': FileCog,
            'dockerfile': FileCode,
            'gemfile': FileCode,
            'rakefile': FileCode,
            'cpanfile': FileCode,
        };

        const lowerFileName = fileName.toLowerCase();
        for (const [key, icon] of Object.entries(specialFiles)) {
            if (lowerFileName.includes(key)) {
                return icon;
            }
        }
        return File;
    }

    return extensionMap[extension] || File;
}

export function FileExplorerPanel({
    entries,
    activePath,
    isRefreshing,
    onSelectFile,
    onRefresh,
    onCreateFile,
    onCreateDirectory,
    onDelete,
}: FileExplorerPanelProps) {
    const [creatingType, setCreatingType] =
        useState<CreateEntryType | null>(null);

    const [error, setError] =
        useState<string | null>(null);

    const tree = useMemo(
        () => buildFileTree(entries),
        [entries],
    );

    const handleCreate = async (
        name: string,
    ): Promise<void> => {
        setError(null);

        try {
            if (creatingType === 'directory') {
                await onCreateDirectory(name);
            } else if (creatingType === 'file') {
                await onCreateFile(name);
                onSelectFile(name);
            }

            setCreatingType(null);
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : `Failed to create ${creatingType}`;

            setError(message);

            throw error;
        }
    };

    return (
        <div className="flex flex-1 min-h-0 h-full flex-col bg-surface-container-low overflow-hidden">
            <div className="flex h-8 items-center justify-between border-b border-outline-variant/30 bg-surface-container px-3">
                <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant">
                    Explorer
                </span>

                <div className="flex items-center gap-0.5">
                    <button
                        type="button"
                        title="New file"
                        disabled={creatingType !== null}
                        onClick={() => {
                            setError(null);
                            setCreatingType('file');
                        }}
                        className="rounded p-1 text-on-surface-variant hover:bg-surface-container-high hover:text-primary disabled:cursor-not-allowed disabled:opacity-40 transition-colors"
                    >
                        <Plus className="h-3 w-3" />
                    </button>

                    <button
                        type="button"
                        title="New folder"
                        disabled={creatingType !== null}
                        onClick={() => {
                            setError(null);
                            setCreatingType('directory');
                        }}
                        className="rounded p-1 text-on-surface-variant hover:bg-surface-container-high hover:text-primary disabled:cursor-not-allowed disabled:opacity-40 transition-colors"
                    >
                        <FolderPlus className="h-3 w-3" />
                    </button>

                    <button
                        type="button"
                        title="Refresh"
                        onClick={onRefresh}
                        disabled={isRefreshing}
                        className="rounded p-1 text-on-surface-variant hover:bg-surface-container-high hover:text-primary disabled:opacity-40 transition-colors"
                    >
                        <RefreshCw
                            className={`h-3 w-3 ${isRefreshing
                                ? 'animate-spin'
                                : ''
                                }`}
                        />
                    </button>
                </div>
            </div>

            {error && (
                <div className="border-b border-error/30 bg-error/10 px-3 py-1.5 text-[10.5px] text-error font-mono">
                    {error}
                </div>
            )}

            <div className="flex-1 min-h-0 overflow-y-auto p-1.5">
                {creatingType && (
                    <InlineCreateInput
                        depth={0}
                        type={creatingType}
                        onSubmit={handleCreate}
                        onCancel={() => {
                            setCreatingType(null);
                            setError(null);
                        }}
                    />
                )}

                {tree.length === 0 &&
                    !creatingType && (
                        <div className="px-3 py-6 text-center text-[10.5px] font-mono text-on-surface-variant/60">
                            No files in workspace
                        </div>
                    )}

                {tree.map((node) => (
                    <FileTreeItem
                        key={node.path}
                        node={node}
                        depth={0}
                        activePath={activePath}
                        onSelectFile={onSelectFile}
                        onCreateFile={onCreateFile}
                        onCreateDirectory={
                            onCreateDirectory
                        }
                        onDelete={onDelete}
                    />
                ))}
            </div>
        </div>
    );
}

interface FileTreeItemProps {
    key?: string;
    node: FileTreeNode;
    depth: number;
    activePath: string;

    onSelectFile: (path: string) => void;

    onCreateFile: (
        path: string,
    ) => Promise<void>;

    onCreateDirectory: (
        path: string,
    ) => Promise<void>;

    onDelete: (
        path: string,
    ) => Promise<void>;
}

function FileTreeItem({
    node,
    depth,
    activePath,
    onSelectFile,
    onCreateFile,
    onCreateDirectory,
    onDelete,
}: FileTreeItemProps) {
    const [expanded, setExpanded] =
        useState(true);

    const [creatingType, setCreatingType] =
        useState<CreateEntryType | null>(null);

    const [isDeleting, setIsDeleting] =
        useState(false);

    const [confirmingDelete, setConfirmingDelete] =
        useState(false);

    const isDirectory =
        node.type === 'directory';

    // Get the appropriate icon for files
    const FileIcon = isDirectory ? Folder : getFileIcon(node.name);

    const createNestedPath = (
        name: string,
    ): string => {
        if (!isDirectory) {
            return name;
        }

        return `${node.path}/${name}`;
    };

    const handleCreate = async (
        name: string,
    ): Promise<void> => {
        const path = createNestedPath(name);

        if (creatingType === 'directory') {
            await onCreateDirectory(path);
        } else if (creatingType === 'file') {
            await onCreateFile(path);
            onSelectFile(path);
        }

        setExpanded(true);
        setCreatingType(null);
    };

    const handleDelete = async () => {
        setIsDeleting(true);

        try {
            await onDelete(node.path);
        } finally {
            setIsDeleting(false);
            setConfirmingDelete(false);
        }
    };

    return (
        <div>
            <div
                className={`group flex items-center rounded text-[11px] font-mono transition-colors ${
                    activePath === node.path
                        ? 'bg-primary/10 text-primary font-medium'
                        : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                }`}
                style={{
                    paddingLeft: depth * 12,
                }}
            >
                <button
                    type="button"
                    className="flex min-w-0 flex-1 items-center gap-1.5 py-1 px-1 text-left"
                    onClick={() => {
                        if (isDirectory) {
                            setExpanded(
                                (current) => !current,
                            );
                        } else {
                            onSelectFile(node.path);
                        }
                    }}
                >
                    {isDirectory ? (
                        <>
                            {expanded ? (
                                <ChevronDown className="h-3 w-3 shrink-0 text-on-surface-variant" />
                            ) : (
                                <ChevronRight className="h-3 w-3 shrink-0 text-on-surface-variant" />
                            )}

                            <Folder className="h-3 w-3 shrink-0 text-secondary" />
                        </>
                    ) : (
                        <>
                            <span className="w-3 shrink-0" />

                            <FileIcon className={`h-3 w-3 shrink-0 ${
                                activePath === node.path
                                    ? 'text-primary'
                                    : 'text-on-surface-variant'
                            }`} />
                        </>
                    )}

                    <span className="truncate">
                        {node.name}
                    </span>
                </button>

                {confirmingDelete ? (
                    <div className="flex items-center gap-1 pr-1 text-[10px]" onClick={(e) => e.stopPropagation()}>
                        <span className="text-error font-medium">Delete?</span>
                        <button
                            type="button"
                            disabled={isDeleting}
                            onClick={() => void handleDelete()}
                            className="px-1 py-0.5 rounded bg-error/20 text-error hover:bg-error/30"
                        >
                            Yes
                        </button>
                        <button
                            type="button"
                            onClick={() => setConfirmingDelete(false)}
                            className="px-1 py-0.5 rounded bg-surface-container-high text-on-surface-variant hover:text-on-surface"
                        >
                            No
                        </button>
                    </div>
                ) : (
                    <>
                        {isDirectory && (
                            <>
                                <button
                                    type="button"
                                    title="New file"
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        setExpanded(true);
                                        setCreatingType('file');
                                    }}
                                    className="hidden rounded p-0.5 text-on-surface-variant hover:text-primary group-hover:block"
                                >
                                    <Plus className="h-3 w-3" />
                                </button>

                                <button
                                    type="button"
                                    title="New folder"
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        setExpanded(true);
                                        setCreatingType(
                                            'directory',
                                        );
                                    }}
                                    className="hidden rounded p-0.5 text-on-surface-variant hover:text-primary group-hover:block"
                                >
                                    <FolderPlus className="h-3 w-3" />
                                </button>
                            </>
                        )}

                        <button
                            type="button"
                            title="Delete"
                            disabled={isDeleting}
                            onClick={(event) => {
                                event.stopPropagation();
                                setConfirmingDelete(true);
                            }}
                            className="mr-1 hidden rounded p-0.5 text-on-surface-variant hover:text-error disabled:opacity-40 group-hover:block"
                        >
                            <Trash2 className="h-3 w-3" />
                        </button>
                    </>
                )}
            </div>

            {isDirectory && expanded && (
                <>
                    {creatingType && (
                        <InlineCreateInput
                            depth={depth + 1}
                            type={creatingType}
                            onSubmit={handleCreate}
                            onCancel={() =>
                                setCreatingType(null)
                            }
                        />
                    )}

                    {node.children.map((child) => (
                        <FileTreeItem
                            key={child.path}
                            node={child}
                            depth={depth + 1}
                            activePath={activePath}
                            onSelectFile={onSelectFile}
                            onCreateFile={onCreateFile}
                            onCreateDirectory={
                                onCreateDirectory
                            }
                            onDelete={onDelete}
                        />
                    ))}
                </>
            )}
        </div>
    );
}

interface InlineCreateInputProps {
    depth: number;
    type: CreateEntryType;

    onSubmit: (
        name: string,
    ) => Promise<void>;

    onCancel: () => void;
}

function InlineCreateInput({
    depth,
    type,
    onSubmit,
    onCancel,
}: InlineCreateInputProps) {
    const [value, setValue] =
        useState('');

    const [isSubmitting, setIsSubmitting] =
        useState(false);

    const [error, setError] =
        useState<string | null>(null);

    const hasCommittedRef =
        useRef(false);

    // Get the appropriate icon based on what's being typed
    const getPreviewIcon = (fileName: string) => {
        if (type === 'directory') {
            return Folder;
        }

        const extension = fileName.split('.').pop()?.toLowerCase() || '';
        const previewIcons: Record<string, React.ElementType> = {
            'js': FileCode,
            'jsx': FileCode,
            'ts': FileType,
            'tsx': FileType,
            'json': FileJson,
            'html': FileCode,
            'css': FileCode,
            'scss': FileCode,
            'py': FileCode,
            'rb': FileCode,
            'php': FileCode,
            'java': FileCode,
            'go': FileCode,
            'rs': FileCode,
            'sh': FileCode,
            'sql': FileCode,
            'xml': FileCog,
            'yaml': FileCog,
            'yml': FileCog,
            'toml': FileCog,
            'env': FileCog,
            'png': FileImage,
            'jpg': FileImage,
            'jpeg': FileImage,
            'svg': FileImage,
            'gif': FileImage,
            'mp4': FileVideo,
            'webm': FileVideo,
            'mp3': FileAudio,
            'wav': FileAudio,
            'zip': FileArchive,
            'rar': FileArchive,
            'tar': FileArchive,
            'gz': FileArchive,
            'csv': FileSpreadsheet,
            'xls': FileSpreadsheet,
            'xlsx': FileSpreadsheet,
            'txt': FileText,
            'log': FileText,
            'lock': FileLock,
        };

        const Icon = previewIcons[extension] || FileCode;
        return Icon;
    };

    const PreviewIcon = getPreviewIcon(value);

    const commit = async () => {
        if (
            hasCommittedRef.current ||
            isSubmitting
        ) {
            return;
        }

        const trimmed = value.trim();

        if (!trimmed) {
            onCancel();
            return;
        }

        if (
            trimmed.includes('/') ||
            trimmed.includes('\\')
        ) {
            setError(
                'Enter only a file or folder name.',
            );

            return;
        }

        if (
            trimmed === '.' ||
            trimmed === '..'
        ) {
            setError('Invalid name.');
            return;
        }

        hasCommittedRef.current = true;
        setIsSubmitting(true);
        setError(null);

        try {
            await onSubmit(trimmed);
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : `Unable to create ${type}`;

            setError(message);
            hasCommittedRef.current = false;
            setIsSubmitting(false);
        }
    };

    const handleKeyDown = (
        event: KeyboardEvent<HTMLInputElement>,
    ) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            event.stopPropagation();

            void commit();
            return;
        }

        if (event.key === 'Escape') {
            event.preventDefault();
            event.stopPropagation();

            onCancel();
        }
    };

    return (
        <div>
            <div
                className="flex items-center gap-1.5 py-1"
                style={{
                    paddingLeft:
                        depth * 12 + 22,
                }}
            >
                {type === 'directory' ? (
                    <Folder className="h-3.5 w-3.5 shrink-0 text-secondary" />
                ) : (
                    <PreviewIcon className="h-3.5 w-3.5 shrink-0 text-on-surface-variant" />
                )}

                <input
                    autoFocus
                    value={value}
                    disabled={isSubmitting}
                    onChange={(event) => {
                        setValue(event.target.value);
                        setError(null);
                    }}
                    onKeyDown={handleKeyDown}
                    onBlur={() => {
                        if (
                            !hasCommittedRef.current &&
                            value.trim()
                        ) {
                            void commit();
                        } else if (!value.trim()) {
                            onCancel();
                        }
                    }}
                    placeholder={
                        type === 'directory'
                            ? 'Folder name'
                            : 'File name'
                    }
                    className="w-full min-w-0 rounded border border-primary/50 bg-surface-container-lowest px-1.5 py-0.5 text-[11px] font-mono text-on-surface outline-none focus:border-primary disabled:opacity-50"
                />
            </div>

            {error && (
                <div
                    className="pb-1 text-[10px] text-rose-400"
                    style={{
                        paddingLeft:
                            depth * 12 + 42,
                    }}
                >
                    {error}
                </div>
            )}
        </div>
    );
}