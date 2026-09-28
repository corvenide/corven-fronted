// src/components/common/LoadingScreen.tsx

export default function LoadingScreen({ label = 'Restoring your session' }: { label?: string }) {
    return (
        <div
            className="flex min-h-screen flex-col items-center justify-center bg-[#0a0b0d] text-[#9a9ea6]"
            role="status"
            aria-live="polite"
        >
            <span className="relative flex h-10 w-10 items-center justify-center">
                <span className="absolute inset-0 rounded-full border border-white/10" />
                <span className="absolute inset-0 animate-spin rounded-full border border-transparent border-t-[#3cc68a]" />
            </span>
            <p
                className="mt-5 text-[11px] uppercase tracking-[0.18em] text-[#62676f]"
                style={{ fontFamily: "'Geist Mono', ui-monospace, monospace" }}
            >
                {label}
            </p>
        </div>
    );
}
