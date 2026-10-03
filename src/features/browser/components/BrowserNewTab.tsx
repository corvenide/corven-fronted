// src/features/browser/components/BrowserNewTab.tsx
import React, { useState } from 'react';
import {
    Search,
    Globe,
    Terminal,
    Sparkles,
    ArrowRight,
    ExternalLink,
    Star,
    Layers,
    Code,
    Cpu,
    CheckCircle2,
} from 'lucide-react';
import { PRESET_APPS, DEFAULT_BOOKMARKS } from '../data/presetApps';
import type { Bookmark, PresetApp } from '../types/browser.types';

interface BrowserNewTabProps {
    onNavigate: (url: string) => void;
    bookmarks: Bookmark[];
    onSelectBookmark: (url: string) => void;
    recentUrls: string[];
}

export function BrowserNewTab({
    onNavigate,
    bookmarks,
    onSelectBookmark,
    recentUrls,
}: BrowserNewTabProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [filterCategory, setFilterCategory] = useState<string>('all');

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = searchQuery.trim();
        if (!trimmed) return;
        onNavigate(trimmed);
    };

    const filteredApps = PRESET_APPS.filter((app) => {
        if (filterCategory !== 'all' && app.category !== filterCategory) return false;
        if (!searchQuery) return true;
        return (
            app.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            app.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
            app.url.toLowerCase().includes(searchQuery.toLowerCase())
        );
    });

    return (
        <div className="flex h-full w-full flex-col overflow-y-auto bg-surface-container-lowest p-6 select-text">
            <div className="mx-auto flex w-full max-w-4xl flex-col items-center">
                {/* Hero Header */}
                <div className="my-8 flex flex-col items-center text-center">
                    <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-container border border-outline-variant/50 text-primary shadow-lg shadow-primary/5">
                        <span className="material-symbols-outlined text-[28px]">deployed_code</span>
                    </div>
                    <h1 className="font-headline-lg text-headline-lg font-bold text-on-surface tracking-tight sm:text-2xl">
                        Corven Browser &amp; Frontend Runner
                    </h1>
                    <p className="mt-2 max-w-lg text-[13px] text-on-surface-variant font-body-md">
                        Preview, test, and debug web frontends, dApps, and microservices connecting to your CKB smart contracts and Fiber node.
                    </p>

                    {/* Quick Search / URL Bar in Hero */}
                    <form
                        onSubmit={handleSearchSubmit}
                        className="mt-6 flex w-full max-w-xl items-center rounded-xl border border-outline-variant/50 bg-surface-container px-3.5 py-2 shadow-md transition-all focus-within:border-primary focus-within:ring-1 focus-within:ring-primary"
                    >
                        <Search className="h-4 w-4 text-on-surface-variant shrink-0 mr-2.5" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Enter localhost URL (e.g. localhost:5173), workspace path, or filter presets..."
                            className="w-full bg-transparent text-[12.5px] font-mono text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none"
                        />
                        <button
                            type="submit"
                            className="ml-2 flex items-center gap-1 rounded-lg bg-primary px-3 py-1 text-[11px] font-medium text-on-primary hover:bg-primary/90 transition-colors shrink-0"
                        >
                            <span>Open</span>
                            <ArrowRight className="h-3 w-3" />
                        </button>
                    </form>
                </div>

                {/* Bookmarks Strip */}
                {(bookmarks.length > 0 || DEFAULT_BOOKMARKS.length > 0) && (
                    <div className="w-full mb-8">
                        <div className="flex items-center gap-2 mb-2.5 text-[11px] font-mono uppercase tracking-wider text-on-surface-variant font-medium">
                            <Star className="h-3.5 w-3.5 text-yellow-400" />
                            <span>Quick Bookmarks</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {(bookmarks.length > 0 ? bookmarks : DEFAULT_BOOKMARKS).map((bm) => (
                                <button
                                    key={bm.id}
                                    type="button"
                                    onClick={() => onSelectBookmark(bm.url)}
                                    className="flex items-center gap-2 rounded-lg border border-outline-variant/30 bg-surface-container px-3 py-1.5 text-[11.5px] font-mono text-on-surface hover:border-primary/50 hover:bg-surface-container-high transition-colors"
                                >
                                    <span className="material-symbols-outlined text-[14px] text-primary">
                                        {bm.icon || 'star'}
                                    </span>
                                    <span>{bm.title}</span>
                                    <span className="text-[10px] text-on-surface-variant/60">({bm.category})</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Preset Applications Category Filter */}
                <div className="w-full">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-outline-variant/20 pb-3 mb-4">
                        <div className="flex items-center gap-2">
                            <Layers className="h-4 w-4 text-primary" />
                            <h2 className="text-[13px] font-bold text-on-surface uppercase tracking-wider font-mono">
                                Frontend Applications &amp; Presets
                            </h2>
                        </div>

                        {/* Filter Tabs */}
                        <div className="flex items-center gap-1">
                            {[
                                { id: 'all', label: 'All' },
                                { id: 'templates', label: 'Workspaces & Sandbox' },
                                { id: 'devnet', label: 'Web3 & dApps' },
                                { id: 'localhost', label: 'Local Dev Servers' },
                                { id: 'tools', label: 'APIs & Tools' },
                            ].map((tab) => (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => setFilterCategory(tab.id)}
                                    className={`px-2.5 py-1 rounded text-[11px] font-mono transition-colors ${
                                        filterCategory === tab.id
                                            ? 'bg-surface-container-high text-primary border border-outline-variant/50 font-semibold'
                                            : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
                                    }`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Apps Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                        {filteredApps.map((app) => (
                            <div
                                key={app.id}
                                onClick={() => onNavigate(app.url)}
                                className="group relative flex flex-col justify-between rounded-xl border border-outline-variant/30 bg-surface-container p-4 hover:border-primary/50 hover:bg-surface-container-high cursor-pointer transition-all hover:shadow-lg hover:shadow-primary/5"
                            >
                                <div>
                                    <div className="flex items-start justify-between gap-2 mb-2">
                                        <div className="flex items-center gap-2">
                                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-container-low border border-outline-variant/40 text-primary group-hover:scale-105 transition-transform">
                                                <span className="material-symbols-outlined text-[18px]">
                                                    {app.icon}
                                                </span>
                                            </div>
                                            <div>
                                                <h3 className="text-[13px] font-semibold text-on-surface group-hover:text-primary transition-colors">
                                                    {app.title}
                                                </h3>
                                                <span className="text-[10px] font-mono text-on-surface-variant/80">
                                                    {app.url}
                                                </span>
                                            </div>
                                        </div>

                                        <span className={`px-1.5 py-0.5 rounded text-[9.5px] font-mono border ${app.badgeColor}`}>
                                            {app.badge}
                                        </span>
                                    </div>

                                    <p className="text-[11.5px] text-on-surface-variant line-clamp-2">
                                        {app.description}
                                    </p>
                                </div>

                                <div className="mt-3 flex items-center justify-between border-t border-outline-variant/20 pt-2 text-[10.5px] font-mono text-primary group-hover:translate-x-0.5 transition-transform">
                                    <span className="flex items-center gap-1">
                                        <span>Launch Application</span>
                                        <ArrowRight className="h-3 w-3" />
                                    </span>
                                    <span className="material-symbols-outlined text-[14px] text-on-surface-variant group-hover:text-primary">
                                        open_in_new
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Developer Info & Quick Tips */}
                <div className="mt-8 w-full rounded-xl border border-outline-variant/20 bg-surface-container p-4">
                    <h3 className="flex items-center gap-1.5 text-[12px] font-semibold text-on-surface font-mono uppercase tracking-wider mb-2">
                        <Sparkles className="h-3.5 w-3.5 text-primary" />
                        <span>How Corven Frontend Runner Works</span>
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11px] text-on-surface-variant">
                        <div className="rounded-lg bg-surface-container-low p-2.5 border border-outline-variant/20">
                            <span className="font-semibold text-on-surface block mb-1">1. Local Dev Servers</span>
                            <span>Run <code>npm run dev</code> or <code>vite</code> in your terminal. Navigate to <code>http://localhost:5173</code> to preview with HMR.</span>
                        </div>
                        <div className="rounded-lg bg-surface-container-low p-2.5 border border-outline-variant/20">
                            <span className="font-semibold text-on-surface block mb-1">2. Workspace Frontends</span>
                            <span>Create a <code>frontend/index.html</code> in your workspace. Corven dynamically renders it in an isolated sandbox.</span>
                        </div>
                        <div className="rounded-lg bg-surface-container-low p-2.5 border border-outline-variant/20">
                            <span className="font-semibold text-on-surface block mb-1">3. In-App DevTools</span>
                            <span>Inspect DOM elements, view live <code>console.log</code> events, monitor network traffic, and inspect state.</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
