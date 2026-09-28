// src/app/providers.tsx
import type { CSSProperties, ReactNode } from 'react';
import { useMemo } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { ccc } from '@ckb-ccc/connector-react';

import { queryClient } from '../lib/query-client';
import { AuthProvider } from '../features/auth/context/AuthContext';

// Styles the CCC wallet picker to match the rest of Corven.
const connectorStyles = {
    '--background': '#0f1114',
    '--divider': 'rgba(255, 255, 255, 0.08)',
    '--btn-primary': '#171a1f',
    '--btn-primary-hover': '#1d2127',
    '--btn-secondary': '#171a1f',
    '--btn-secondary-hover': '#1d2127',
    '--icon-primary': '#ecebe6',
    '--icon-secondary': 'rgba(236, 235, 230, 0.6)',
    '--tip-color': '#9a9ea6',
    color: '#ecebe6',
} as CSSProperties;

export default function AppProviders({ children }: { children: ReactNode }) {
    const defaultClient = useMemo(() => new ccc.ClientPublicTestnet(), []);

    const clientOptions = useMemo(
        () => [
            { name: 'CKB Testnet', client: new ccc.ClientPublicTestnet() },
            { name: 'CKB Mainnet', client: new ccc.ClientPublicMainnet() },
        ],
        [],
    );

    return (
        <QueryClientProvider client={queryClient}>
            {/* The wallet provider sits outside AuthProvider so sign-out can
                also disconnect the wallet. */}
            <ccc.Provider
                defaultClient={defaultClient}
                clientOptions={clientOptions}
                connectorProps={{ style: connectorStyles }}
                name="Corven"
            >
                <AuthProvider>{children}</AuthProvider>
            </ccc.Provider>
        </QueryClientProvider>
    );
}
