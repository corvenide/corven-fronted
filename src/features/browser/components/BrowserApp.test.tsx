import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { BrowserApp } from './BrowserApp';
import { BrowserTabBar } from './BrowserTabBar';
import { BrowserAddressBar } from './BrowserAddressBar';
import type { BrowserTab } from '../types/browser.types';

describe('BrowserApp Component', () => {
    it('renders the BrowserApp with New Tab view', () => {
        render(<BrowserApp />);
        expect(screen.getByText(/Corven Browser & Frontend Runner/i)).toBeInTheDocument();
        expect(screen.getByText(/Quick Bookmarks/i)).toBeInTheDocument();
        expect(screen.getByText(/Frontend Applications & Presets/i)).toBeInTheDocument();
    });

    it('displays preset applications like Vite, CKB DApp and Go Fiber Tester', () => {
        render(<BrowserApp />);
        expect(screen.getByText(/CKB & Fiber DApp Client/i)).toBeInTheDocument();
        expect(screen.getByText(/Go Fiber REST & UI Tester/i)).toBeInTheDocument();
        expect(screen.getByText(/Vite Dev Server \(:5173\)/i)).toBeInTheDocument();
    });

    it('allows opening a new browser tab', async () => {
        render(<BrowserApp />);
        const newTabBtn = screen.getByTitle('Open new tab');
        expect(newTabBtn).toBeInTheDocument();
        await userEvent.click(newTabBtn);
        // Now there should be two tabs with title 'New Tab'
        const tabTitles = screen.getAllByText('New Tab');
        expect(tabTitles.length).toBeGreaterThanOrEqual(2);
    });

    it('toggles DevTools panel', async () => {
        render(<BrowserApp initialUrl="sandbox://ckb-dapp" />);
        const devToolsBtn = screen.getByTitle(/Toggle Developer Tools/i);
        await userEvent.click(devToolsBtn);

        // DevTools header tabs should appear
        expect(screen.getByText('Console')).toBeInTheDocument();
        expect(screen.getByText('Elements / DOM')).toBeInTheDocument();
        expect(screen.getByText(/Network/i)).toBeInTheDocument();
    });
});

describe('BrowserTabBar Component', () => {
    const mockTabs: BrowserTab[] = [
        {
            id: 'tab-1',
            title: 'Tab 1',
            url: 'http://localhost:5173',
            displayUrl: 'http://localhost:5173',
            isLoading: false,
            canGoBack: false,
            canGoForward: false,
            history: ['http://localhost:5173'],
            historyIndex: 0,
            device: 'responsive',
            isLandscape: false,
            zoom: 1,
            devToolsOpen: false,
            devToolsTab: 'console',
            consoleLogs: [],
            networkLogs: [],
        },
        {
            id: 'tab-2',
            title: 'Tab 2',
            url: 'sandbox://ckb-dapp',
            displayUrl: 'sandbox://ckb-dapp',
            isLoading: false,
            canGoBack: false,
            canGoForward: false,
            history: ['sandbox://ckb-dapp'],
            historyIndex: 0,
            device: 'responsive',
            isLandscape: false,
            zoom: 1,
            devToolsOpen: false,
            devToolsTab: 'console',
            consoleLogs: [],
            networkLogs: [],
        },
    ];

    it('renders all tabs and handles tab selection', async () => {
        const onSelect = vi.fn();
        const onClose = vi.fn();
        const onNewTab = vi.fn();
        const onDuplicate = vi.fn();

        render(
            <BrowserTabBar
                tabs={mockTabs}
                activeTabId="tab-1"
                onSelectTab={onSelect}
                onCloseTab={onClose}
                onNewTab={onNewTab}
                onDuplicateTab={onDuplicate}
            />
        );

        expect(screen.getByText('Tab 1')).toBeInTheDocument();
        expect(screen.getByText('Tab 2')).toBeInTheDocument();

        await userEvent.click(screen.getByText('Tab 2'));
        expect(onSelect).toHaveBeenCalledWith('tab-2');
    });
});
