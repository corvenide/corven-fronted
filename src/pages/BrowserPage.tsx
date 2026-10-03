// src/pages/BrowserPage.tsx
import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { BrowserApp } from '../features/browser/components/BrowserApp';

export default function BrowserPage() {
    const [searchParams] = useSearchParams();
    const initialUrl = searchParams.get('url') || undefined;
    const workspaceId = searchParams.get('workspace') || undefined;

    return (
        <div className="flex h-[calc(100vh-3.5rem)] w-full flex-col min-h-0 min-w-0 overflow-hidden bg-surface">
            <BrowserApp initialUrl={initialUrl} workspaceId={workspaceId} />
        </div>
    );
}
