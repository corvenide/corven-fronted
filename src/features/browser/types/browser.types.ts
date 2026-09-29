// src/features/browser/types/browser.types.ts

export type DeviceType = 'responsive' | 'desktop' | 'laptop' | 'tablet' | 'mobile' | 'mobile-small';

export interface DevicePreset {
    id: DeviceType;
    name: string;
    width: number | null; // null for responsive (100%)
    height: number | null;
    icon: string;
    deviceFrame?: boolean;
}

export interface ConsoleLogEntry {
    id: string;
    level: 'log' | 'info' | 'warn' | 'error';
    message: string;
    args?: any[];
    timestamp: number;
}

export interface NetworkLogEntry {
    id: string;
    method: string;
    url: string;
    status: number;
    durationMs: number;
    timestamp: number;
    type: string;
    size?: string;
}

export interface BrowserTab {
    id: string;
    title: string;
    url: string;
    displayUrl: string;
    favicon?: string;
    isLoading: boolean;
    canGoBack: boolean;
    canGoForward: boolean;
    history: string[];
    historyIndex: number;
    device: DeviceType;
    isLandscape: boolean;
    zoom: number; // 0.5 to 1.5
    devToolsOpen: boolean;
    devToolsTab: 'console' | 'elements' | 'network' | 'storage';
    consoleLogs: ConsoleLogEntry[];
    networkLogs: NetworkLogEntry[];
    error?: string | null;
}

export interface Bookmark {
    id: string;
    title: string;
    url: string;
    category?: string;
    icon?: string;
}

export interface PresetApp {
    id: string;
    title: string;
    description: string;
    url: string;
    badge: string;
    badgeColor: string;
    icon: string;
    category: 'devnet' | 'localhost' | 'templates' | 'tools';
}
