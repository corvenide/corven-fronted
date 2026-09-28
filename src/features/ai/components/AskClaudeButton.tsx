// src/features/ai/components/AskClaudeButton.tsx
import { Sparkles } from 'lucide-react';

import { useAssistantBridge } from '../assistant-bridge';

interface AskClaudeButtonProps {
    kind: 'build' | 'test' | 'terminal';
    prompt: string;
    output: string;
}

/** Sends failing output to the Claude panel. Hidden outside the IDE. */
export function AskClaudeButton({ kind, prompt, output }: AskClaudeButtonProps) {
    const bridge = useAssistantBridge();
    if (!bridge || !output.trim()) return null;

    return (
        <button
            type="button"
            onClick={() => bridge.ask({ prompt, output: { kind, content: output } })}
            className="inline-flex h-6 items-center gap-1 rounded border border-[#d97757]/40 bg-[#d97757]/10 px-2 text-[10.5px] font-medium text-[#f0b49a] transition-colors hover:bg-[#d97757]/20"
        >
            <Sparkles className="h-3 w-3" />
            Ask Claude
        </button>
    );
}
