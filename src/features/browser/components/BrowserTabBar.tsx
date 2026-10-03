// src/features/browser/components/BrowserTabBar.tsx
import React from 'react';
import { Plus, X, Globe, Copy, RefreshCw } from 'lucide-react';
import type { BrowserTab } from '../types/browser.types';

interface BrowserTabBarProps {
    tabs: BrowserTab[];
    activeTabId: string;
    onSelectTab: (id: string) => void;
    onCloseTab: (id: string, e: React.MouseEvent) => void;
    onNewTab: () => void;
    onDuplicateTab: (id: string) => void;
}

export function BrowserTabBar({
    tabs,
    activeTabId,
    onSelectTab,
    onCloseTab,
    onNewTab,
    onDuplicateTab,
}: BrowserTabBarProps) {
    const getTabIcon = (tab: BrowserTab) => {
        if (tab.isLoading) {
            return <RefreshCw className="h-3 w-3 animate-spin text-primary" />;
        }
        if (tab.url.startsWith('workspace://')) {
            return <span className="material-symbols-outlined text-[13px] text-primary">deployed_code</span>;
        }
        if (tab.url.startsWith('sandbox://ckb')) {
            return <span className="material-symbols-outlined text-[13px] text-secondary">token</span>;
        }
        if (tab.url.startsWith('sandbox://fiber')) {
            return <span className="material-symbols-outlined text-[13px] text-tertiary">api</span>;
        }
        if (tab.url.startsWith('sandbox://')) {
            return <span className="material-symbols-outlined text-[13px] text-primary">code</span>;
        }
        if (tab.url.includes('localhost') || tab.url.includes('127.0.0.1')) {
            return <span className="material-symbols-outlined text-[13px] text-yellow-400">computer</span>;
        }
        if (tab.url.startsWith('https://')) {
            return <span className="material-symbols-outlined text-[13px] text-primary">lock</span>;
        }
        return <Globe className="h-3 w-3 text-on-surface-variant" />;
    };

    return (
        <div className="flex h-9 items-center bg-surface-container-lowest border-b border-outline-variant/30 px-2 gap-1 overflow-x-auto no-scrollbar select-none">
            <div className="flex items-center gap-1 min-w-0">
                {tabs.map((tab) => {
                    const isActive = tab.id === activeTabId;
                    return (
                        <div
                            key={tab.id}
                            onClick={() => onSelectTab(tab.id)}
                            onContextMenu={(e) => {
                                e.preventDefault();
                                onDuplicateTab(tab.id);
                            }}
                            title={`${tab.title} (${tab.displayUrl || tab.url})\nRight click to duplicate`}
                            className={`group relative flex h-7 max-w-[210px] min-w-[110px] cursor-pointer items-center justify-between gap-1.5 rounded-t-md px-2.5 text-[11px] font-mono transition-colors ${
                                isActive
                                    ? 'bg-surface text-on-surface border-t-2 border-primary border-x border-outline-variant/30 font-medium'
                                    : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
                            }`}
                        >
                            <div className="flex min-w-0 items-center gap-1.5 truncate">
                                <span className="shrink-0 flex items-center justify-center">
                                    {getTabIcon(tab)}
                                </span>
                                <span className="truncate">{tab.title || 'New Tab'}</span>
                            </div>

                            <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onDuplicateTab(tab.id);
                                    }}
                                    className="rounded p-0.5 text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
                                    title="Duplicate tab"
                                >
                                    <Copy className="h-2.5 w-2.5" />
                                </button>
                                {tabs.length > 1 && (
                                    <button
                                        type="button"
                                        onClick={(e) => onCloseTab(tab.id, e)}
                                        className="rounded p-0.5 text-on-surface-variant hover:bg-error/20 hover:text-error"
                                        title="Close tab"
                                    >
                                        <X className="h-2.5 w-2.5" />
                                    </button>
                                )}
                            </div>

                            {/* Active bottom connector bar to blend with viewport */}
                            {isActive && (
                                <div className="absolute -bottom-[1px] left-0 right-0 h-[2px] bg-surface z-10" />
                            )}
                        </div>
                    );
                })}
            </div>

            {/* New Tab Button */}
            <button
                type="button"
                onClick={onNewTab}
                className="flex h-6 w-6 items-center justify-center rounded hover:bg-surface-container text-on-surface-variant hover:text-primary transition-colors shrink-0 ml-0.5"
                title="Open new tab"
            >
                <Plus className="h-3.5 w-3.5" />
            </button>
        </div>
    );
}
