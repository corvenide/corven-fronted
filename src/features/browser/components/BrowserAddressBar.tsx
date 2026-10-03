// src/features/browser/components/BrowserAddressBar.tsx
import React, { useState, useEffect } from 'react';
import {
    ArrowLeft,
    ArrowRight,
    RotateCw,
    Home,
    Star,
    ExternalLink,
    Copy,
    Check,
    Terminal,
    Maximize2,
    RotateCcw,
} from 'lucide-react';
import type { BrowserTab, DeviceType } from '../types/browser.types';
import { DEVICE_PRESETS } from '../data/presetApps';

interface BrowserAddressBarProps {
    tab: BrowserTab;
    onNavigate: (url: string) => void;
    onBack: () => void;
    onForward: () => void;
    onReload: () => void;
    onHome: () => void;
    onChangeDevice: (device: DeviceType) => void;
    onToggleLandscape: () => void;
    onChangeZoom: (zoom: number) => void;
    onToggleDevTools: () => void;
    isBookmarked: boolean;
    onToggleBookmark: () => void;
}

export function BrowserAddressBar({
    tab,
    onNavigate,
    onBack,
    onForward,
    onReload,
    onHome,
    onChangeDevice,
    onToggleLandscape,
    onChangeZoom,
    onToggleDevTools,
    isBookmarked,
    onToggleBookmark,
}: BrowserAddressBarProps) {
    const [inputValue, setInputValue] = useState(tab.displayUrl || tab.url);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        setInputValue(tab.displayUrl || tab.url);
    }, [tab.url, tab.displayUrl]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = inputValue.trim();
        if (!trimmed) return;
        onNavigate(trimmed);
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(tab.url);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    };

    const handleOpenExternal = () => {
        if (tab.url.startsWith('http://') || tab.url.startsWith('https://')) {
            window.open(tab.url, '_blank', 'noopener,noreferrer');
        } else {
            handleCopy();
        }
    };

    const getProtocolBadge = () => {
        if (tab.url.startsWith('workspace://')) {
            return (
                <span className="flex items-center gap-1 text-[10px] text-primary font-mono px-1.5 py-0.5 rounded bg-primary/10 border border-primary/20 shrink-0">
                    <span className="material-symbols-outlined text-[12px]">deployed_code</span>
                    <span>WORKSPACE</span>
                </span>
            );
        }
        if (tab.url.startsWith('sandbox://')) {
            return (
                <span className="flex items-center gap-1 text-[10px] text-secondary font-mono px-1.5 py-0.5 rounded bg-secondary/10 border border-secondary/20 shrink-0">
                    <span className="material-symbols-outlined text-[12px]">code</span>
                    <span>SANDBOX</span>
                </span>
            );
        }
        if (tab.url.includes('localhost') || tab.url.includes('127.0.0.1')) {
            return (
                <span className="flex items-center gap-1 text-[10px] text-yellow-400 font-mono px-1.5 py-0.5 rounded bg-yellow-400/10 border border-yellow-400/20 shrink-0">
                    <span className="material-symbols-outlined text-[12px]">computer</span>
                    <span>DEV-SERVER</span>
                </span>
            );
        }
        if (tab.url.startsWith('https://')) {
            return (
                <span className="flex items-center gap-1 text-[10px] text-primary font-mono px-1.5 py-0.5 rounded bg-primary/10 border border-primary/20 shrink-0">
                    <span className="material-symbols-outlined text-[12px]">lock</span>
                    <span>HTTPS</span>
                </span>
            );
        }
        return (
            <span className="flex items-center gap-1 text-[10px] text-on-surface-variant font-mono px-1.5 py-0.5 rounded bg-surface-container-high border border-outline-variant/30 shrink-0">
                <span className="material-symbols-outlined text-[12px]">public</span>
                <span>HTTP</span>
            </span>
        );
    };

    const errorLogsCount = tab.consoleLogs.filter((l) => l.level === 'error').length;

    return (
        <div className="flex h-10 items-center justify-between gap-2 border-b border-outline-variant/30 bg-surface px-2.5">
            {/* Left Nav Controls */}
            <div className="flex items-center gap-1">
                <button
                    type="button"
                    onClick={onBack}
                    disabled={!tab.canGoBack}
                    className="flex h-7 w-7 items-center justify-center rounded hover:bg-surface-container text-on-surface-variant hover:text-on-surface disabled:opacity-30 transition-colors"
                    title="Back"
                >
                    <ArrowLeft className="h-3.5 w-3.5" />
                </button>
                <button
                    type="button"
                    onClick={onForward}
                    disabled={!tab.canGoForward}
                    className="flex h-7 w-7 items-center justify-center rounded hover:bg-surface-container text-on-surface-variant hover:text-on-surface disabled:opacity-30 transition-colors"
                    title="Forward"
                >
                    <ArrowRight className="h-3.5 w-3.5" />
                </button>
                <button
                    type="button"
                    onClick={onReload}
                    className="flex h-7 w-7 items-center justify-center rounded hover:bg-surface-container text-on-surface-variant hover:text-on-surface transition-colors"
                    title="Reload page"
                >
                    <RotateCw className={`h-3.5 w-3.5 ${tab.isLoading ? 'animate-spin text-primary' : ''}`} />
                </button>
                <button
                    type="button"
                    onClick={onHome}
                    className="flex h-7 w-7 items-center justify-center rounded hover:bg-surface-container text-on-surface-variant hover:text-on-surface transition-colors"
                    title="New Tab / Frontend Hub"
                >
                    <Home className="h-3.5 w-3.5" />
                </button>
            </div>

            {/* Middle Address Bar */}
            <form onSubmit={handleSubmit} className="flex flex-1 min-w-[200px] max-w-2xl items-center">
                <div className="flex w-full items-center gap-1.5 rounded-lg border border-outline-variant/40 bg-surface-container-low px-2 py-1 text-[11px] font-mono focus-within:border-primary/60 focus-within:bg-surface-container transition-all">
                    {getProtocolBadge()}

                    <input
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        placeholder="Enter URL (e.g. localhost:5173, workspace://frontend/index.html)"
                        className="w-full bg-transparent text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none"
                    />

                    <button
                        type="button"
                        onClick={onToggleBookmark}
                        className={`rounded p-0.5 transition-colors ${
                            isBookmarked ? 'text-yellow-400' : 'text-on-surface-variant/60 hover:text-yellow-400'
                        }`}
                        title={isBookmarked ? 'Remove bookmark' : 'Bookmark this app'}
                    >
                        <Star className="h-3 w-3 fill-current" />
                    </button>

                    <button
                        type="button"
                        onClick={handleCopy}
                        className="rounded p-0.5 text-on-surface-variant/60 hover:text-on-surface transition-colors"
                        title="Copy URL"
                    >
                        {copied ? <Check className="h-3 w-3 text-primary" /> : <Copy className="h-3 w-3" />}
                    </button>
                </div>
            </form>

            {/* Right Controls: Viewport, Zoom, DevTools, External */}
            <div className="flex items-center gap-1 shrink-0">
                {/* Device Viewport Selector */}
                <div className="flex items-center border border-outline-variant/30 rounded bg-surface-container-low px-1 py-0.5">
                    <select
                        value={tab.device}
                        onChange={(e) => onChangeDevice(e.target.value as DeviceType)}
                        className="bg-transparent text-[10.5px] font-mono text-on-surface-variant hover:text-on-surface focus:outline-none cursor-pointer pr-1"
                        title="Emulate device viewport"
                    >
                        {DEVICE_PRESETS.map((preset) => (
                            <option key={preset.id} value={preset.id} className="bg-surface-container text-on-surface">
                                {preset.name}
                            </option>
                        ))}
                    </select>

                    {tab.device !== 'responsive' && tab.device !== 'desktop' && tab.device !== 'laptop' && (
                        <button
                            type="button"
                            onClick={onToggleLandscape}
                            className={`rounded p-1 transition-colors ${
                                tab.isLandscape ? 'text-primary bg-primary/10' : 'text-on-surface-variant hover:text-on-surface'
                            }`}
                            title="Toggle portrait / landscape orientation"
                        >
                            <RotateCcw className="h-2.5 w-2.5" />
                        </button>
                    )}
                </div>

                {/* Zoom Selector */}
                <select
                    value={tab.zoom}
                    onChange={(e) => onChangeZoom(Number(e.target.value))}
                    className="h-7 rounded border border-outline-variant/30 bg-surface-container-low px-1.5 text-[10.5px] font-mono text-on-surface-variant hover:text-on-surface focus:outline-none cursor-pointer"
                    title="Zoom level"
                >
                    <option value={0.5} className="bg-surface-container">50%</option>
                    <option value={0.75} className="bg-surface-container">75%</option>
                    <option value={1} className="bg-surface-container">100%</option>
                    <option value={1.25} className="bg-surface-container">125%</option>
                    <option value={1.5} className="bg-surface-container">150%</option>
                </select>

                {/* DevTools Toggle Button */}
                <button
                    type="button"
                    onClick={onToggleDevTools}
                    className={`flex h-7 items-center gap-1 rounded border px-2 text-[10.5px] font-mono transition-colors ${
                        tab.devToolsOpen
                            ? 'border-primary bg-primary/15 text-primary font-medium'
                            : 'border-outline-variant/30 bg-surface-container-low text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
                    }`}
                    title="Toggle Developer Tools (Console, Elements, Network, Storage)"
                >
                    <Terminal className="h-3 w-3" />
                    <span className="hidden sm:inline">DevTools</span>
                    {errorLogsCount > 0 && (
                        <span className="rounded-full bg-error px-1 py-0.1 text-[9px] font-bold text-on-error">
                            {errorLogsCount}
                        </span>
                    )}
                </button>

                {/* Open in external tab */}
                <button
                    type="button"
                    onClick={handleOpenExternal}
                    className="flex h-7 w-7 items-center justify-center rounded border border-outline-variant/30 bg-surface-container-low hover:bg-surface-container text-on-surface-variant hover:text-primary transition-colors"
                    title="Open in new window / copy link"
                >
                    <ExternalLink className="h-3 w-3" />
                </button>
            </div>
        </div>
    );
}
