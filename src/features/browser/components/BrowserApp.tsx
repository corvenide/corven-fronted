// src/features/browser/components/BrowserApp.tsx
import React, { useState, useCallback, useEffect } from 'react';
import { BrowserTabBar } from './BrowserTabBar';
import { BrowserAddressBar } from './BrowserAddressBar';
import { BrowserNewTab } from './BrowserNewTab';
import { BrowserViewport } from './BrowserViewport';
import { BrowserDevTools } from './BrowserDevTools';
import type {
    BrowserTab,
    ConsoleLogEntry,
    NetworkLogEntry,
    Bookmark,
    DeviceType,
} from '../types/browser.types';
import { DEFAULT_BOOKMARKS } from '../data/presetApps';

interface BrowserAppProps {
    initialUrl?: string;
    workspaceFiles?: Array<{ path: string; content?: string }>;
    onClose?: () => void;
    compact?: boolean;
    /** Workspace whose dev servers `localhost:<port>` URLs should open. */
    workspaceId?: string;
}

export function BrowserApp({
    initialUrl,
    workspaceFiles = [],
    onClose,
    compact = false,
    workspaceId,
}: BrowserAppProps) {
    const createNewTab = useCallback((url = 'corven://newtab', title = 'New Tab'): BrowserTab => {
        return {
            id: `tab-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            title,
            url,
            displayUrl: url === 'corven://newtab' ? '' : url,
            isLoading: false,
            canGoBack: false,
            canGoForward: false,
            history: [url],
            historyIndex: 0,
            device: 'responsive',
            isLandscape: false,
            zoom: 1,
            devToolsOpen: false,
            devToolsTab: 'console',
            consoleLogs: [
                {
                    id: `log-init-${Date.now()}`,
                    level: 'info',
                    message: '[Corven Browser] Runtime ready. Intercepting console and network calls.',
                    timestamp: Date.now(),
                },
            ],
            networkLogs: [],
        };
    }, []);

    const [tabs, setTabs] = useState<BrowserTab[]>(() => {
        const startUrl = initialUrl || 'corven://newtab';
        return [createNewTab(startUrl, startUrl === 'corven://newtab' ? 'New Tab' : 'App Preview')];
    });

    const [activeTabId, setActiveTabId] = useState<string>(() => tabs[0]?.id || 'tab-1');
    const [bookmarks, setBookmarks] = useState<Bookmark[]>(DEFAULT_BOOKMARKS);
    const [devToolsHeight, setDevToolsHeight] = useState<number>(240);

    const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0];

    // Listen to initialUrl changes if supplied
    useEffect(() => {
        if (initialUrl && activeTab && activeTab.url !== initialUrl) {
            handleNavigate(initialUrl);
        }
    }, [initialUrl]);

    const handleSelectTab = (id: string) => {
        setActiveTabId(id);
    };

    const handleNewTab = () => {
        const newTab = createNewTab();
        setTabs((prev) => [...prev, newTab]);
        setActiveTabId(newTab.id);
    };

    const handleCloseTab = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (tabs.length <= 1) return;
        const newTabs = tabs.filter((t) => t.id !== id);
        setTabs(newTabs);
        if (activeTabId === id) {
            setActiveTabId(newTabs[newTabs.length - 1].id);
        }
    };

    const handleDuplicateTab = (id: string) => {
        const target = tabs.find((t) => t.id === id);
        if (!target) return;
        const duplicated: BrowserTab = {
            ...target,
            id: `tab-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            title: `${target.title} (Copy)`,
        };
        setTabs((prev) => [...prev, duplicated]);
        setActiveTabId(duplicated.id);
    };

    // Navigation logic
    const handleNavigate = (rawUrl: string) => {
        let url = rawUrl.trim();
        // Smart normalization
        if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('workspace://') && !url.startsWith('sandbox://') && !url.startsWith('corven://')) {
            if (/^\d{2,5}$/.test(url)) {
                url = `http://localhost:${url}`;
            } else if (url.startsWith('localhost') || url.startsWith('127.0.0.1')) {
                url = `http://${url}`;
            } else if (url.includes('.') && !url.includes(' ')) {
                url = `https://${url}`;
            } else {
                url = `https://www.google.com/search?q=${encodeURIComponent(url)}`;
            }
        }

        setTabs((prev) =>
            prev.map((t) => {
                if (t.id !== activeTabId) return t;
                const newHistory = t.history.slice(0, t.historyIndex + 1);
                newHistory.push(url);
                return {
                    ...t,
                    url,
                    displayUrl: url === 'corven://newtab' ? '' : url,
                    history: newHistory,
                    historyIndex: newHistory.length - 1,
                    canGoBack: newHistory.length > 1,
                    canGoForward: false,
                    isLoading: false,
                };
            })
        );
    };

    const handleBack = () => {
        setTabs((prev) =>
            prev.map((t) => {
                if (t.id !== activeTabId || t.historyIndex <= 0) return t;
                const nextIndex = t.historyIndex - 1;
                const nextUrl = t.history[nextIndex];
                return {
                    ...t,
                    url: nextUrl,
                    displayUrl: nextUrl === 'corven://newtab' ? '' : nextUrl,
                    historyIndex: nextIndex,
                    canGoBack: nextIndex > 0,
                    canGoForward: true,
                };
            })
        );
    };

    const handleForward = () => {
        setTabs((prev) =>
            prev.map((t) => {
                if (t.id !== activeTabId || t.historyIndex >= t.history.length - 1) return t;
                const nextIndex = t.historyIndex + 1;
                const nextUrl = t.history[nextIndex];
                return {
                    ...t,
                    url: nextUrl,
                    displayUrl: nextUrl === 'corven://newtab' ? '' : nextUrl,
                    historyIndex: nextIndex,
                    canGoBack: true,
                    canGoForward: nextIndex < t.history.length - 1,
                };
            })
        );
    };

    const handleReload = () => {
        setTabs((prev) =>
            prev.map((t) => {
                if (t.id !== activeTabId) return t;
                return { ...t, isLoading: true };
            })
        );
        setTimeout(() => {
            setTabs((prev) =>
                prev.map((t) => {
                    if (t.id !== activeTabId) return t;
                    return { ...t, isLoading: false };
                })
            );
        }, 300);
    };

    const handleHome = () => {
        handleNavigate('corven://newtab');
    };

    const handleChangeDevice = (device: DeviceType) => {
        setTabs((prev) =>
            prev.map((t) => (t.id === activeTabId ? { ...t, device } : t))
        );
    };

    const handleToggleLandscape = () => {
        setTabs((prev) =>
            prev.map((t) => (t.id === activeTabId ? { ...t, isLandscape: !t.isLandscape } : t))
        );
    };

    const handleChangeZoom = (zoom: number) => {
        setTabs((prev) =>
            prev.map((t) => (t.id === activeTabId ? { ...t, zoom } : t))
        );
    };

    const handleToggleDevTools = () => {
        setTabs((prev) =>
            prev.map((t) => (t.id === activeTabId ? { ...t, devToolsOpen: !t.devToolsOpen } : t))
        );
    };

    const handleChangeDevToolsTab = (devToolsTab: 'console' | 'elements' | 'network' | 'storage') => {
        setTabs((prev) =>
            prev.map((t) => (t.id === activeTabId ? { ...t, devToolsTab } : t))
        );
    };

    const handleAddConsoleLog = (log: ConsoleLogEntry) => {
        setTabs((prev) =>
            prev.map((t) => (t.id === activeTabId ? { ...t, consoleLogs: [...t.consoleLogs, log] } : t))
        );
    };

    const handleAddNetworkLog = (net: NetworkLogEntry) => {
        setTabs((prev) =>
            prev.map((t) => (t.id === activeTabId ? { ...t, networkLogs: [net, ...t.networkLogs] } : t))
        );
    };

    const handleClearConsole = () => {
        setTabs((prev) =>
            prev.map((t) => (t.id === activeTabId ? { ...t, consoleLogs: [] } : t))
        );
    };

    const handleClearNetwork = () => {
        setTabs((prev) =>
            prev.map((t) => (t.id === activeTabId ? { ...t, networkLogs: [] } : t))
        );
    };

    const handleUpdateTitle = useCallback(
        (title: string) => {
            setTabs((prev) => {
                // Return the same array when nothing changed. BrowserViewport
                // calls this from an effect, so a fresh array here re-renders,
                // re-runs the effect and loops forever.
                const target = prev.find((t) => t.id === activeTabId);
                if (!target || target.title === title) return prev;
                return prev.map((t) => (t.id === activeTabId ? { ...t, title } : t));
            });
        },
        [activeTabId]
    );

    const isCurrentBookmarked = bookmarks.some((b) => b.url === activeTab?.url);

    const handleToggleBookmark = () => {
        if (!activeTab) return;
        if (isCurrentBookmarked) {
            setBookmarks(bookmarks.filter((b) => b.url !== activeTab.url));
        } else {
            setBookmarks([
                ...bookmarks,
                {
                    id: `bm-${Date.now()}`,
                    title: activeTab.title || 'App Bookmark',
                    url: activeTab.url,
                    category: 'User',
                    icon: 'bookmark',
                },
            ]);
        }
    };

    return (
        <div className="flex h-full w-full flex-col min-h-0 min-w-0 overflow-hidden bg-surface">
            {/* Browser Top Tabs Bar */}
            <BrowserTabBar
                tabs={tabs}
                activeTabId={activeTabId}
                onSelectTab={handleSelectTab}
                onCloseTab={handleCloseTab}
                onNewTab={handleNewTab}
                onDuplicateTab={handleDuplicateTab}
            />

            {/* Address Bar */}
            {activeTab && (
                <BrowserAddressBar
                    tab={activeTab}
                    onNavigate={handleNavigate}
                    onBack={handleBack}
                    onForward={handleForward}
                    onReload={handleReload}
                    onHome={handleHome}
                    onChangeDevice={handleChangeDevice}
                    onToggleLandscape={handleToggleLandscape}
                    onChangeZoom={handleChangeZoom}
                    onToggleDevTools={handleToggleDevTools}
                    isBookmarked={isCurrentBookmarked}
                    onToggleBookmark={handleToggleBookmark}
                />
            )}

            {/* Main Content Area */}
            <div className="relative flex-1 min-h-0 min-w-0 overflow-hidden flex flex-col">
                {activeTab?.url === 'corven://newtab' ? (
                    <BrowserNewTab
                        onNavigate={handleNavigate}
                        bookmarks={bookmarks}
                        onSelectBookmark={handleNavigate}
                        recentUrls={tabs.map((t) => t.url).filter((u) => u !== 'corven://newtab')}
                    />
                ) : (
                    activeTab && (
                        <div className="flex-1 min-h-0 overflow-hidden">
                            <BrowserViewport
                                tab={activeTab}
                                onLog={handleAddConsoleLog}
                                onNetwork={handleAddNetworkLog}
                                onUpdateTitle={handleUpdateTitle}
                                workspaceFiles={workspaceFiles}
                                workspaceId={workspaceId}
                            />
                        </div>
                    )
                )}

                {/* DevTools Drawer if Open */}
                {activeTab?.devToolsOpen && (
                    <div
                        className="shrink-0 z-20 border-t border-outline-variant/30"
                        style={{ height: `${devToolsHeight}px` }}
                    >
                        <BrowserDevTools
                            tab={activeTab}
                            onClose={handleToggleDevTools}
                            onChangeTab={handleChangeDevToolsTab}
                            onClearConsole={handleClearConsole}
                            onClearNetwork={handleClearNetwork}
                            onExecCommand={(cmd) => {
                                handleAddConsoleLog({
                                    id: `eval-${Date.now()}`,
                                    level: 'info',
                                    message: `> ${cmd}`,
                                    timestamp: Date.now(),
                                });
                                try {
                                    // Eval safely
                                    const result = eval(cmd);
                                    handleAddConsoleLog({
                                        id: `eval-res-${Date.now()}`,
                                        level: 'log',
                                        message: `< ${typeof result === 'object' ? JSON.stringify(result) : String(result)}`,
                                        timestamp: Date.now(),
                                    });
                                } catch (err: any) {
                                    handleAddConsoleLog({
                                        id: `eval-err-${Date.now()}`,
                                        level: 'error',
                                        message: `< Uncaught: ${err.message}`,
                                        timestamp: Date.now(),
                                    });
                                }
                            }}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
