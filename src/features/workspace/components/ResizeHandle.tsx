'use client';
import React from 'react'

interface ResizeHandleProps {
    axis: 'horizontal' | 'vertical';
    onPointerDown: (e: React.PointerEvent) => void;
    isDragging: boolean;
}

/**
 * Thin invisible hit-area with a 1px visible border, matching the
 * "grab the border" affordance of VS Code / most IDEs. The hit area is
 * wider than the visible line so it's actually easy to grab.
 */
export function ResizeHandle({
    axis,
    onPointerDown,
    isDragging,
}: ResizeHandleProps) {
    const isHorizontal = axis === 'horizontal';

    return (
        <div
            role="separator"
            aria-orientation={isHorizontal ? 'vertical' : 'horizontal'}
            onPointerDown={onPointerDown}
            className={
                isHorizontal
                    ? 'relative w-0 shrink-0 cursor-col-resize'
                    : 'relative h-0 shrink-0 cursor-row-resize'
            }
            style={{ zIndex: 20 }}
        >
            {/* wide invisible hit area */}
            <div
                className={
                    isHorizontal
                        ? 'absolute top-0 h-full w-3 -translate-x-1/2'
                        : 'absolute left-0 h-3 w-full -translate-y-1/2'
                }
            />
            {/* visible line, highlights on hover/drag */}
            <div
                className={
                    (isHorizontal
                        ? 'absolute top-0 h-full w-px -translate-x-1/2 '
                        : 'absolute left-0 h-px w-full -translate-y-1/2 ') +
                    (isDragging
                        ? 'bg-primary'
                        : 'bg-outline-variant/40 hover:bg-primary/70')
                }
            />
        </div>
    );
}