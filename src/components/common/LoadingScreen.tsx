// src/components/common/LoadingScreen.tsx
import { Terminal } from 'lucide-react';

export default function LoadingScreen() {
    return (
        <div className="min-h-screen bg-[#0d1117] flex flex-col items-center justify-center font-mono text-gray-400 p-6 select-none">
            <div className="max-w-md w-full space-y-4 text-center">
                <h2 className="text-white font-bold text-base">
                    BOOTING CORVEN IDE...
                </h2>

                <div className="w-full bg-[#161b22] h-1.5 rounded-full overflow-hidden border border-[#30363d]">
                    <div className="bg-[#1f6feb] h-full w-2/3 rounded-full animate-pulse" />
                </div>

                <p className="text-[10px] text-gray-500">
                    Restoring your secure development session...
                </p>
            </div>
        </div>
    );
}