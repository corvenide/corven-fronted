import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ConfirmDialog } from './ConfirmDialog';

function renderDialog(overrides: Partial<Parameters<typeof ConfirmDialog>[0]> = {}) {
    const props = {
        isOpen: true,
        onClose: vi.fn(),
        onConfirm: vi.fn(),
        title: 'Delete workspace',
        description: 'Delete "demo"? This cannot be undone.',
        confirmLabel: 'Delete',
        ...overrides,
    };

    render(<ConfirmDialog {...props} />);
    return props;
}

describe('ConfirmDialog', () => {
    it('renders nothing when closed', () => {
        renderDialog({ isOpen: false });
        expect(screen.queryByText('Delete workspace')).not.toBeInTheDocument();
    });

    it('shows the title and description', () => {
        renderDialog();
        expect(screen.getByText('Delete workspace')).toBeInTheDocument();
        expect(screen.getByText('Delete "demo"? This cannot be undone.')).toBeInTheDocument();
    });

    it('calls onConfirm from the confirm button', async () => {
        const props = renderDialog();
        await userEvent.click(screen.getByRole('button', { name: 'Delete' }));

        expect(props.onConfirm).toHaveBeenCalledTimes(1);
        expect(props.onClose).not.toHaveBeenCalled();
    });

    it('closes from Cancel and from Escape without confirming', async () => {
        const props = renderDialog();

        await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
        await userEvent.keyboard('{Escape}');

        expect(props.onClose).toHaveBeenCalledTimes(2);
        expect(props.onConfirm).not.toHaveBeenCalled();
    });
});
