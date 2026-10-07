import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { KeepWorkspacesDialog } from './KeepWorkspacesDialog';

const auth = vi.hoisted(() => ({
    claimedWorkspaces: [] as { id: string; name: string; temporary: boolean }[],
    clearClaimedWorkspaces: vi.fn(),
}));

const api = vi.hoisted(() => ({ setTemporary: vi.fn() }));

vi.mock('../../auth/hooks/useAuth', () => ({ useAuth: () => auth }));
vi.mock('../api/workspace.api', () => ({ workspaceApi: api }));

function renderDialog() {
    return render(
        <QueryClientProvider client={new QueryClient()}>
            <KeepWorkspacesDialog />
        </QueryClientProvider>,
    );
}

describe('KeepWorkspacesDialog', () => {
    beforeEach(() => {
        auth.claimedWorkspaces = [
            { id: 'w1', name: 'amm-swap', temporary: true },
            { id: 'w2', name: 'scratch', temporary: true },
        ];
        auth.clearClaimedWorkspaces = vi.fn();
        api.setTemporary = vi.fn().mockResolvedValue({});
    });

    it('renders nothing when there is nothing to keep', () => {
        auth.claimedWorkspaces = [];
        const { container } = renderDialog();
        expect(container).toBeEmptyDOMElement();
    });

    it('keeps every workspace by default', async () => {
        renderDialog();
        expect(screen.getByRole('dialog', { name: 'Keep your workspaces?' })).toBeInTheDocument();

        await userEvent.click(screen.getByRole('button', { name: 'Keep all 2 permanently' }));

        await waitFor(() => expect(auth.clearClaimedWorkspaces).toHaveBeenCalled());
        expect(api.setTemporary).toHaveBeenCalledWith('w1', false);
        expect(api.setTemporary).toHaveBeenCalledWith('w2', false);
    });

    it('keeps only the ticked ones; the rest stay temporary', async () => {
        renderDialog();
        await userEvent.click(screen.getByRole('checkbox', { name: /scratch/ }));
        await userEvent.click(screen.getByRole('button', { name: 'Keep 1 permanently' }));

        await waitFor(() => expect(auth.clearClaimedWorkspaces).toHaveBeenCalled());
        expect(api.setTemporary).toHaveBeenCalledTimes(1);
        expect(api.setTemporary).toHaveBeenCalledWith('w1', false);
    });

    it('can leave them all temporary', async () => {
        renderDialog();
        await userEvent.click(screen.getByRole('button', { name: 'Keep all temporary' }));

        await waitFor(() => expect(auth.clearClaimedWorkspaces).toHaveBeenCalled());
        expect(api.setTemporary).not.toHaveBeenCalled();
    });

    it('shows an error and stays open when saving fails', async () => {
        api.setTemporary = vi.fn().mockRejectedValue(new Error('Network down'));
        renderDialog();
        await userEvent.click(screen.getByRole('button', { name: 'Keep all 2 permanently' }));

        expect(await screen.findByRole('alert')).toHaveTextContent('Network down');
        expect(auth.clearClaimedWorkspaces).not.toHaveBeenCalled();
    });
});
