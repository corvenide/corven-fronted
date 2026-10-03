// src/features/browser/components/BrowserDevTools.tsx
import React, { useState } from 'react';
import {
    Terminal,
    Code,
    Activity,
    Database,
    X,
    Trash2,
    Search,
    ChevronRight,
    AlertTriangle,
    AlertCircle,
    Info,
    CornerDownLeft,
    Check,
    Copy,
} from 'lucide-react';
import type { BrowserTab, ConsoleLogEntry, NetworkLogEntry } from '../types/browser.types';

interface BrowserDevToolsProps {
    tab: BrowserTab;
    onClose: () => void;
    onChangeTab: (devToolsTab: 'console' | 'elements' | 'network' | 'storage') => void;
    onClearConsole: () => void;
    onClearNetwork: () => void;
    onExecCommand?: (cmd: string) => void;
    htmlSource?: string;
}

export function BrowserDevTools({
    tab,
    onClose,
    onChangeTab,
    onClearConsole,
    onClearNetwork,
    onExecCommand,
    htmlSource = '',
}: BrowserDevToolsProps) {
    const [logFilter, setLogFilter] = useState<'all' | 'log' | 'info' | 'warn' | 'error'>('all');
    const [logSearch, setLogSearch] = useState('');
    const [evalInput, setEvalInput] = useState('');
    const [copiedHtml, setCopiedHtml] = useState(false);

    // Mock storage entries for the sandboxed storage viewer
    const [storageItems, setStorageItems] = useState<Array<{ key: string; value: string }>>([
        { key: 'corven_devnet_node', value: 'http://127.0.0.1:8114' },
        { key: 'theme', value: 'dark' },
        { key: 'corven_active_workspace', value: 'ws-default' },
        { key: 'ckb_network_id', value: 'corven-devnet' },
    ]);
    const [newKey, setNewKey] = useState('');
    const [newValue, setNewValue] = useState('');

    const handleEvalSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const cmd = evalInput.trim();
        if (!cmd) return;
        if (onExecCommand) {
            onExecCommand(cmd);
        }
        setEvalInput('');
    };

    const handleCopyHtml = () => {
        navigator.clipboard.writeText(htmlSource);
        setCopiedHtml(true);
        setTimeout(() => setCopiedHtml(false), 1500);
    };

    const handleAddStorage = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newKey.trim()) return;
        setStorageItems([...storageItems, { key: newKey.trim(), value: newValue.trim() }]);
        setNewKey('');
        setNewValue('');
    };

    const handleDeleteStorage = (keyToDelete: string) => {
        setStorageItems(storageItems.filter((item) => item.key !== keyToDelete));
    };

    const filteredLogs = tab.consoleLogs.filter((entry) => {
        if (logFilter !== 'all' && entry.level !== logFilter) return false;
        if (!logSearch) return true;
        return entry.message.toLowerCase().includes(logSearch.toLowerCase());
    });

    const errorCount = tab.consoleLogs.filter((l) => l.level === 'error').length;
    const warnCount = tab.consoleLogs.filter((l) => l.level === 'warn').length;

    return (
        <div className="flex h-full w-full flex-col bg-surface-container-lowest border-t border-outline-variant/30 font-mono text-[11px] select-text">
            {/* Header bar */}
            <div className="flex h-8 shrink-0 items-center justify-between border-b border-outline-variant/30 bg-surface px-3 select-none">
                <div className="flex items-center gap-1">
                    {/* Tab Buttons */}
                    <button
                        type="button"
                        onClick={() => onChangeTab('console')}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[10.5px] font-medium transition-colors ${
                            tab.devToolsTab === 'console'
                                ? 'bg-surface-container-high text-primary font-semibold'
                                : 'text-on-surface-variant hover:text-on-surface'
                        }`}
                    >
                        <Terminal className="h-3 w-3" />
                        <span>Console</span>
                        {errorCount > 0 && (
                            <span className="rounded bg-error/20 px-1 text-[9px] text-error font-bold">
                                {errorCount}
                            </span>
                        )}
                        {warnCount > 0 && (
                            <span className="rounded bg-yellow-400/20 px-1 text-[9px] text-yellow-400 font-bold">
                                {warnCount}
                            </span>
                        )}
                    </button>

                    <button
                        type="button"
                        onClick={() => onChangeTab('elements')}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[10.5px] font-medium transition-colors ${
                            tab.devToolsTab === 'elements'
                                ? 'bg-surface-container-high text-primary font-semibold'
                                : 'text-on-surface-variant hover:text-on-surface'
                        }`}
                    >
                        <Code className="h-3 w-3" />
                        <span>Elements / DOM</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => onChangeTab('network')}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[10.5px] font-medium transition-colors ${
                            tab.devToolsTab === 'network'
                                ? 'bg-surface-container-high text-primary font-semibold'
                                : 'text-on-surface-variant hover:text-on-surface'
                        }`}
                    >
                        <Activity className="h-3 w-3" />
                        <span>Network</span>
                        <span className="rounded bg-surface-container px-1 text-[9px] text-on-surface-variant">
                            {tab.networkLogs.length}
                        </span>
                    </button>

                    <button
                        type="button"
                        onClick={() => onChangeTab('storage')}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[10.5px] font-medium transition-colors ${
                            tab.devToolsTab === 'storage'
                                ? 'bg-surface-container-high text-primary font-semibold'
                                : 'text-on-surface-variant hover:text-on-surface'
                        }`}
                    >
                        <Database className="h-3 w-3" />
                        <span>Storage</span>
                    </button>
                </div>

                {/* Right controls */}
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded p-1 text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors"
                        title="Close DevTools"
                    >
                        <X className="h-3.5 w-3.5" />
                    </button>
                </div>
            </div>

            {/* DevTools Body */}
            <div className="flex-1 min-h-0 overflow-hidden">
                {/* 1. CONSOLE TAB */}
                {tab.devToolsTab === 'console' && (
                    <div className="flex h-full flex-col">
                        {/* Sub-toolbar */}
                        <div className="flex h-7 items-center justify-between border-b border-outline-variant/20 bg-surface-container-low px-3 select-none">
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={onClearConsole}
                                    className="flex items-center gap-1 text-[10px] text-on-surface-variant hover:text-on-surface transition-colors"
                                    title="Clear console"
                                >
                                    <Trash2 className="h-2.5 w-2.5" />
                                    <span>Clear</span>
                                </button>
                                <div className="h-3 w-[1px] bg-outline-variant/30" />
                                <div className="flex items-center gap-1">
                                    {(['all', 'log', 'info', 'warn', 'error'] as const).map((lvl) => (
                                        <button
                                            key={lvl}
                                            type="button"
                                            onClick={() => setLogFilter(lvl)}
                                            className={`px-1.5 py-0.5 rounded text-[9.5px] uppercase transition-colors ${
                                                logFilter === lvl
                                                    ? 'bg-surface-container text-primary font-bold'
                                                    : 'text-on-surface-variant hover:text-on-surface'
                                            }`}
                                        >
                                            {lvl}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Search logs */}
                            <div className="flex items-center gap-1 rounded bg-surface-container px-1.5 py-0.5 border border-outline-variant/20">
                                <Search className="h-2.5 w-2.5 text-on-surface-variant" />
                                <input
                                    type="text"
                                    value={logSearch}
                                    onChange={(e) => setLogSearch(e.target.value)}
                                    placeholder="Filter logs..."
                                    className="w-24 bg-transparent text-[10px] text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none"
                                />
                            </div>
                        </div>

                        {/* Logs list */}
                        <div className="flex-1 overflow-y-auto p-2 space-y-1">
                            {filteredLogs.length === 0 ? (
                                <div className="flex h-full items-center justify-center text-[10.5px] text-on-surface-variant/50">
                                    No console messages to display.
                                </div>
                            ) : (
                                filteredLogs.map((log) => {
                                    const timeStr = new Date(log.timestamp).toLocaleTimeString();
                                    const isError = log.level === 'error';
                                    const isWarn = log.level === 'warn';
                                    const isInfo = log.level === 'info';

                                    return (
                                        <div
                                            key={log.id}
                                            className={`flex items-start gap-2 rounded px-2 py-1 transition-colors ${
                                                isError
                                                    ? 'bg-error/10 text-error border-l-2 border-error'
                                                    : isWarn
                                                    ? 'bg-yellow-400/10 text-yellow-300 border-l-2 border-yellow-400'
                                                    : isInfo
                                                    ? 'bg-secondary/10 text-secondary border-l-2 border-secondary'
                                                    : 'hover:bg-surface-container text-on-surface'
                                            }`}
                                        >
                                            <span className="shrink-0 text-[9px] text-on-surface-variant/60 font-mono">
                                                {timeStr}
                                            </span>
                                            <span className="shrink-0 mt-0.5">
                                                {isError ? (
                                                    <AlertCircle className="h-2.5 w-2.5 text-error" />
                                                ) : isWarn ? (
                                                    <AlertTriangle className="h-2.5 w-2.5 text-yellow-400" />
                                                ) : isInfo ? (
                                                    <Info className="h-2.5 w-2.5 text-secondary" />
                                                ) : (
                                                    <ChevronRight className="h-2.5 w-2.5 text-on-surface-variant" />
                                                )}
                                            </span>
                                            <div className="flex-1 whitespace-pre-wrap break-all font-mono text-[10.5px]">
                                                {log.message}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        {/* Eval Input Bar */}
                        <form
                            onSubmit={handleEvalSubmit}
                            className="flex h-7 items-center border-t border-outline-variant/30 bg-surface-container px-2 select-none"
                        >
                            <span className="text-primary font-bold mr-1">&gt;</span>
                            <input
                                type="text"
                                value={evalInput}
                                onChange={(e) => setEvalInput(e.target.value)}
                                placeholder="Type JavaScript expression or command..."
                                className="w-full bg-transparent text-[11px] font-mono text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none"
                            />
                            <button
                                type="submit"
                                className="text-on-surface-variant hover:text-primary transition-colors p-0.5"
                                title="Execute"
                            >
                                <CornerDownLeft className="h-3 w-3" />
                            </button>
                        </form>
                    </div>
                )}

                {/* 2. ELEMENTS TAB */}
                {tab.devToolsTab === 'elements' && (
                    <div className="flex h-full flex-col">
                        <div className="flex h-7 items-center justify-between border-b border-outline-variant/20 bg-surface-container-low px-3">
                            <span className="text-[10px] text-on-surface-variant font-mono">
                                Document Object Model (DOM) Tree
                            </span>
                            <button
                                type="button"
                                onClick={handleCopyHtml}
                                className="flex items-center gap-1 text-[10px] text-on-surface-variant hover:text-on-surface transition-colors"
                            >
                                {copiedHtml ? <Check className="h-2.5 w-2.5 text-primary" /> : <Copy className="h-2.5 w-2.5" />}
                                <span>{copiedHtml ? 'Copied' : 'Copy HTML'}</span>
                            </button>
                        </div>
                        <div className="flex-1 overflow-auto p-3 font-mono text-[10.5px] leading-relaxed text-on-surface-variant">
                            <pre className="text-on-surface">
                                {htmlSource || (
                                    `<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>${tab.title}</title>
  </head>
  <body>
    <div id="root" class="corven-frontend-app">
      <!-- Frontend rendered via isolated iframe runtime -->
      <header class="app-header">...</header>
      <main class="app-main">...</main>
    </div>
  </body>
</html>`
                                )}
                            </pre>
                        </div>
                    </div>
                )}

                {/* 3. NETWORK TAB */}
                {tab.devToolsTab === 'network' && (
                    <div className="flex h-full flex-col">
                        <div className="flex h-7 items-center justify-between border-b border-outline-variant/20 bg-surface-container-low px-3 select-none">
                            <span className="text-[10px] text-on-surface-variant font-mono">
                                HTTP Requests ({tab.networkLogs.length})
                            </span>
                            <button
                                type="button"
                                onClick={onClearNetwork}
                                className="flex items-center gap-1 text-[10px] text-on-surface-variant hover:text-on-surface transition-colors"
                            >
                                <Trash2 className="h-2.5 w-2.5" />
                                <span>Clear Network</span>
                            </button>
                        </div>
                        <div className="flex-1 overflow-auto">
                            <table className="w-full text-left font-mono text-[10px]">
                                <thead className="border-b border-outline-variant/30 bg-surface text-on-surface-variant sticky top-0">
                                    <tr>
                                        <th className="py-1 px-3">Method</th>
                                        <th className="py-1 px-3">Status</th>
                                        <th className="py-1 px-3">URL / Endpoint</th>
                                        <th className="py-1 px-3">Type</th>
                                        <th className="py-1 px-3">Duration</th>
                                        <th className="py-1 px-3">Size</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-outline-variant/10">
                                    {tab.networkLogs.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="py-6 text-center text-on-surface-variant/50">
                                                No network activity recorded.
                                            </td>
                                        </tr>
                                    ) : (
                                        tab.networkLogs.map((req) => (
                                            <tr key={req.id} className="hover:bg-surface-container">
                                                <td className="py-1 px-3 font-semibold text-primary">{req.method}</td>
                                                <td className="py-1 px-3">
                                                    <span className={`px-1 rounded ${
                                                        req.status >= 200 && req.status < 300
                                                            ? 'text-primary bg-primary/10'
                                                            : req.status >= 400
                                                            ? 'text-error bg-error/10'
                                                            : 'text-yellow-400 bg-yellow-400/10'
                                                    }`}>
                                                        {req.status}
                                                    </span>
                                                </td>
                                                <td className="py-1 px-3 truncate max-w-xs text-on-surface" title={req.url}>
                                                    {req.url}
                                                </td>
                                                <td className="py-1 px-3 text-on-surface-variant">{req.type}</td>
                                                <td className="py-1 px-3 text-on-surface-variant">{req.durationMs} ms</td>
                                                <td className="py-1 px-3 text-on-surface-variant">{req.size || '1.2 KB'}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* 4. STORAGE TAB */}
                {tab.devToolsTab === 'storage' && (
                    <div className="flex h-full flex-col">
                        <div className="flex h-7 items-center justify-between border-b border-outline-variant/20 bg-surface-container-low px-3 select-none">
                            <span className="text-[10px] text-on-surface-variant font-mono">
                                localStorage &amp; App Cache
                            </span>
                        </div>
                        <div className="flex-1 overflow-auto p-2">
                            <table className="w-full text-left font-mono text-[10px]">
                                <thead className="border-b border-outline-variant/30 text-on-surface-variant">
                                    <tr>
                                        <th className="py-1 px-2">Key</th>
                                        <th className="py-1 px-2">Value</th>
                                        <th className="py-1 px-2 w-10">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-outline-variant/10">
                                    {storageItems.map((item) => (
                                        <tr key={item.key} className="hover:bg-surface-container">
                                            <td className="py-1 px-2 font-semibold text-secondary">{item.key}</td>
                                            <td className="py-1 px-2 text-on-surface truncate max-w-sm" title={item.value}>
                                                {item.value}
                                            </td>
                                            <td className="py-1 px-2">
                                                <button
                                                    type="button"
                                                    onClick={() => handleDeleteStorage(item.key)}
                                                    className="text-on-surface-variant hover:text-error transition-colors"
                                                    title="Delete key"
                                                >
                                                    <X className="h-3 w-3" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            {/* Add Item form */}
                            <form onSubmit={handleAddStorage} className="mt-3 flex items-center gap-2 border-t border-outline-variant/20 pt-2">
                                <input
                                    type="text"
                                    value={newKey}
                                    onChange={(e) => setNewKey(e.target.value)}
                                    placeholder="New key..."
                                    className="w-32 rounded border border-outline-variant/30 bg-surface-container px-2 py-0.5 text-[10px] text-on-surface focus:outline-none"
                                />
                                <input
                                    type="text"
                                    value={newValue}
                                    onChange={(e) => setNewValue(e.target.value)}
                                    placeholder="Value..."
                                    className="flex-1 rounded border border-outline-variant/30 bg-surface-container px-2 py-0.5 text-[10px] text-on-surface focus:outline-none"
                                />
                                <button
                                    type="submit"
                                    className="rounded bg-primary px-2.5 py-0.5 text-[10px] font-semibold text-on-primary hover:bg-primary/90 transition-colors"
                                >
                                    Add
                                </button>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
