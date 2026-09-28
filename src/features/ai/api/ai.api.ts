// src/features/ai/api/ai.api.ts
//
// Talks to the gateway's Claude endpoints. The API key never reaches the
// browser: /api/ai/chat proxies to Anthropic and streams the reply back as
// server-sent events.

import { env } from '../../../config/env';
import { apiClient, ApiError } from '../../../lib/api-client';
import { refreshSession } from '../../../lib/session';
import { tokenStorage } from '../../../lib/token-storage';

export interface AiModel {
    id: string;
    name: string;
    description: string;
}

export interface AiStatus {
    enabled: boolean;
    defaultModel: string;
    models: AiModel[];
}

export interface AiChatMessage {
    role: 'user' | 'assistant';
    content: string;
}

export interface AiChatRequest {
    workspaceId?: string;
    model?: string;
    messages: AiChatMessage[];
    activeFile?: { path: string; content: string; selection?: string };
    output?: { kind: 'build' | 'test' | 'terminal'; content: string };
}

export interface AiChatResult {
    model: string;
    stopReason: string | null;
    inputTokens: number;
    outputTokens: number;
}

function post(body: AiChatRequest, signal: AbortSignal): Promise<Response> {
    const token = tokenStorage.get();

    return fetch(`${env.apiUrl}/ai/chat`, {
        method: 'POST',
        credentials: 'include',
        signal,
        headers: {
            'Content-Type': 'application/json',
            Accept: 'text/event-stream',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
    });
}

export const aiApi = {
    status(): Promise<AiStatus> {
        return apiClient<AiStatus>('/ai/status');
    },

    /** Streams a reply; calls onText with each chunk. Resolves with usage. */
    async chat(
        body: AiChatRequest,
        handlers: { onText: (text: string) => void; signal: AbortSignal },
    ): Promise<AiChatResult> {
        let response: Response;

        try {
            response = await post(body, handlers.signal);

            if (response.status === 401 && (await refreshSession().catch(() => null))) {
                response = await post(body, handlers.signal);
            }
        } catch (error) {
            if (handlers.signal.aborted) throw error;
            throw new ApiError("Can't reach Corven right now. Check your connection and try again.", 0);
        }

        if (!response.ok || !response.body) {
            const data = await response.json().catch(() => null);
            const message = typeof data?.message === 'string' ? data.message : `Request failed (${response.status})`;
            throw new ApiError(message, response.status, data);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let result: AiChatResult | null = null;

        const handle = (raw: string) => {
            let event = 'message';
            let data = '';

            for (const line of raw.split('\n')) {
                if (line.startsWith('event:')) event = line.slice(6).trim();
                else if (line.startsWith('data:')) data += line.slice(5).trim();
            }

            if (!data) return;
            const payload = JSON.parse(data);

            if (event === 'delta') handlers.onText(payload.text ?? '');
            else if (event === 'done') result = payload;
            else if (event === 'error') throw new ApiError(payload.message ?? 'The reply failed.', 502);
        };

        for (;;) {
            const { value, done } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });

            let boundary: number;
            while ((boundary = buffer.indexOf('\n\n')) !== -1) {
                handle(buffer.slice(0, boundary));
                buffer = buffer.slice(boundary + 2);
            }
        }

        if (buffer.trim()) handle(buffer);

        if (!result) throw new ApiError('The reply was cut off. Try again.', 502);
        return result;
    },
};
