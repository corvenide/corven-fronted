// src/features/ai/assistant-bridge.tsx
//
// Lets other IDE panels hand a question to the Claude panel, e.g. the Build
// and Tests panels' "Ask Claude" button, which attaches the failing output.

import { createContext, useContext } from 'react';

export interface AssistantRequest {
    /** Changes for every request, so the same question can be asked twice. */
    id: number;
    prompt: string;
    output?: { kind: 'build' | 'test' | 'terminal'; content: string };
}

export interface AssistantBridge {
    ask: (request: Omit<AssistantRequest, 'id'>) => void;
}

export const AssistantBridgeContext = createContext<AssistantBridge | null>(null);

/** Null outside the IDE (the button then isn't shown). */
export function useAssistantBridge(): AssistantBridge | null {
    return useContext(AssistantBridgeContext);
}
