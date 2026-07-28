import {
    ArrowRight,
    Check,
    ChevronDown,
    ChevronRight,
    CirclePlay,
    Code2,
    FileCode2,
    Folder,
    Github,
    Menu,
    PanelLeft,
    Play,
    ShieldCheck,
    Sparkles,
    TerminalSquare,
    X,
    Cloud,
    Monitor,
    Smartphone,
    Globe,
    Clock,
    Zap,
    Laptop,
    Bug,
    Coffee,
    Heart,
    Coins,
} from "lucide-react";
import { useEffect, useState } from "react";
import { motion, AnimatePresence, useMotionValue, useSpring, useInView } from "framer-motion";

interface HomeViewProps {
    onStartBuilding: () => void;
    activeBlock: number;
}

// Made the code more realistic with TODOs and comments
const EDITOR_LINES = [
    { number: 1, content: "#![no_std]", tone: "text-[#60a5fa]" },
    { number: 2, content: "#![no_main]", tone: "text-[#60a5fa]" },
    { number: 3, content: "", tone: "" },
    { number: 4, content: "use ckb_std::{", tone: "text-[#e2e8f0]" },
    { number: 5, content: "    ckb_constants::Source,", tone: "text-[#e2e8f0]" },
    { number: 6, content: "    high_level::load_script,", tone: "text-[#e2e8f0]" },
    { number: 7, content: "};", tone: "text-[#e2e8f0]" },
    { number: 8, content: "", tone: "" },
    { number: 9, content: "ckb_std::entry!(program_entry);", tone: "text-[#38bdf8]" },
    { number: 10, content: "", tone: "" },
    { number: 11, content: "fn program_entry() -> i8 {", tone: "text-[#93c5fd]" },
    { number: 12, content: "    let script = load_script().unwrap();", tone: "text-[#e2e8f0]" },
    { number: 13, content: "    let args = script.args().raw_data();", tone: "text-[#e2e8f0]" },
    { number: 14, content: "", tone: "" },
    { number: 15, content: "    // FIXME: This is a temporary hack - revisit later", tone: "text-[#fbbf24]" },
    { number: 16, content: "    debug!(\"Corven contract ready 🚀\");", tone: "text-[#34d399]" },
    { number: 17, content: "    // TODO: Add proper error handling for edge cases", tone: "text-[#fbbf24]" },
    { number: 18, content: "    verify_args(args.as_ref())", tone: "text-[#e2e8f0]" },
    { number: 19, content: "}", tone: "text-[#e2e8f0]" },
];

const TERMINAL_LINES = [
    "$ corven test contracts/hello-ckb",
    "Compiling hello-ckb v0.1.0",
    "Running CKB script tests",
    "✓ 8 checks passed",
    "✓ cycles: 1,824,607",
    "Ready on local devnet",
    "🔥 Hot reload enabled - code changes detected!",
];

// Added some personality to features with different colors
const FEATURES = [
    {
        icon: Code2,
        title: "CKB-ready workspaces",
        body: "Open a complete Rust workspace with CKB libraries, RISC-V targets and project templates already configured. I spent way too much time setting this up so you don't have to.",
        accentColor: "from-blue-500 to-cyan-400",
    },
    {
        icon: ShieldCheck,
        title: "Compile, test and debug",
        body: "Run contracts against mock transactions, inspect cycles and diagnose script failures without leaving the browser. And yes, it actually works most of the time 😅",
        accentColor: "from-emerald-500 to-teal-400",
    },
    {
        icon: TerminalSquare,
        title: "A real development terminal",
        body: "Use familiar commands, Git workflows and project tools inside an isolated cloud runtime built for each workspace. No more 'works on my machine'!",
        accentColor: "from-purple-500 to-pink-400",
    },
];

const OS_LOGOS = [
    { name: "Windows", icon: "https://pngimg.com/uploads/windows_logos/windows_logos_PNG9.png", color: "bg-[#1a2332]" },
    { name: "macOS", icon: "https://freepngimg.com/save/70230-macos-apple-lion-system-mac-operating-logo/3456x3960", color: "bg-[#1a1a2e]" },
    { name: "Linux", icon: "https://www.freepnglogos.com/uploads/linux-png/file-icons-flat-linux-svg-wikimedia-commons-6.png", color: "bg-[#1a2332]" },
    { name: "Browser", icon: "https://www.transparentpng.com/thumb/browsers/Km1MWK-browsers-transparent-background.png", color: "bg-[#1a1a2e]" },
];

const WORK_ANYWHERE_FEATURES = [
    {
        icon: Cloud,
        title: "Cloud-native workspace",
        description: "Your entire development environment lives in the cloud. It's like having a superpower - code from anywhere, even that one coffee shop with terrible WiFi.",
    },
    {
        icon: Monitor,
        title: "Cross-platform",
        description: "Works seamlessly on Windows, macOS, Linux, and in your browser. Because who wants to be locked into one OS? Not me.",
    },
    {
        icon: Smartphone,
        title: "Mobile ready",
        description: "Review code, check builds, monitor deployments, and manage your projects from your phone. Perfect for those 'emergency fixes' at 3 AM.",
    },
    {
        icon: Globe,
        title: "Global access",
        description: "Access your workspace from anywhere in the world. Your projects are always available - no excuses for not shipping! 🌍",
    },
    {
        icon: Clock,
        title: "24/7 availability",
        description: "Your cloud workspace is always on. Pick up where you left off, any time of day or night. Yes, I know you're nocturnal.",
    },
    {
        icon: Zap,
        title: "Instant setup",
        description: "No installation, no configuration. Start coding in seconds. I literally timed it - it's faster than making coffee.",
    },
];

const FOOTER_LINKS = {
    Product: ["Workspaces", "Contract debugger", "Local devnet", "Templates"],
    Resources: ["Documentation", "CKB guide", "Examples", "Changelog"],
    Community: ["GitHub", "Discord", "Feedback", "Contact"],
};

const CKB_JOKES = [
    "Why did the CKB developer break up? Too many hashes!",
    "CKB: Because 'CryptoKitties But Better' 😺",
    "What's a CKB dev's favorite game? 'MineCKBraft' ⛏️",
    "How many CKB devs does it take to change a lightbulb? None - they prefer decentralized lighting 🌟",
];

const KNOWN_ISSUES = [
    "Sometimes the debugger hangs on large contracts - working on it!",
    "Hot reload doesn't work with some Rust macros (they're just too powerful)",
    "The AI assistant occasionally suggests silly things - but it's learning!",
];

// Realistic test data with personality
const TEST_RESULTS = [
    { name: "Cell structure validation", time: "0.2s", passed: true },
    { name: "Signature verification", time: "0.8s", passed: true },
    { name: "Type ID matching", time: "1.1s", passed: true },
    { name: "Cycles optimization", time: "0.5s", passed: true },
    { name: "Edge case handling", time: "0.3s", passed: false, note: "Known issue - will fix next sprint" },
];

// Animation variants
const fadeInUp = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" as const } }
};

const fadeInScale = {
    hidden: { opacity: 0, scale: 0.9 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: "easeOut" as const } }
};

const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1
        }
    }
};

const floatAnimation = {
    y: [0, -10, 0],
    transition: {
        duration: 4,
        repeat: Infinity,
        ease: "easeInOut" as const
    }
};

const pulseGlow = {
    scale: [1, 1.05, 1],
    transition: {
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut" as const
    }
};

function CorvenLogo({ compact = false }: { compact?: boolean }) {
    return (
        <motion.div
            className="flex items-center gap-2.5 group"
            whileHover={{ scale: 1.05 }}
            transition={{ type: "spring", stiffness: 400, damping: 10 }}
        >
            <img
                src="https://res.cloudinary.com/dswyz4vpp/image/upload/v1785082590/ChatGPT_Image_Jul_26__2026__12_57_32_PM-removebg-preview_bjfxlf.png"
                alt="Corven IDE logo"
                className={compact ? "h-28 w-auto object-contain" : "h-20 w-auto object-contain"}
            />
            {!compact && (
                <motion.span
                    className="text-xs text-[#6b7f99] opacity-0 transition-opacity group-hover:opacity-100 select-none"
                    initial={{ opacity: 0, x: -10 }}
                    whileHover={{ opacity: 1, x: 0 }}
                >
                    🐦‍⬛
                </motion.span>
            )}
        </motion.div>
    );
}

function TopNav({ onStartBuilding }: { onStartBuilding: () => void }) {
    const [mobileOpen, setMobileOpen] = useState(false);
    const [isHovering, setIsHovering] = useState(false);

    return (
        <motion.header
            className="sticky top-0 z-50"
            initial={{ y: -100 }}
            animate={{ y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
        >
            <div className="mx-auto flex h-[72px] w-full max-w-[1540px] items-center justify-between px-5 sm:px-8">
                <a href="#top" aria-label="Corven home">
                    <CorvenLogo compact />
                </a>

                <nav className="hidden items-center gap-8 text-[14px] font-medium text-[#94a3b8] lg:flex">
                    {['Product', 'How it works', 'Features', 'Work anywhere', 'Docs', 'Community'].map((item, index) => (
                        <motion.a
                            key={item}
                            href={`#${item.toLowerCase().replace(/\s+/g, '-')}`}
                            className="transition-colors hover:text-[#60a5fa] hover:scale-105 transform"
                            whileHover={{ scale: 1.1, color: "#60a5fa" }}
                            whileTap={{ scale: 0.95 }}
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                        >
                            {item}
                        </motion.a>
                    ))}
                </nav>

                <div className="hidden items-center gap-3 sm:flex">
                    <motion.a
                        href="/donate"
                        className="rounded-xl px-4 py-2.5 text-[14px] font-semibold text-[#94a3b8] transition-colors hover:bg-[#1a2744] flex items-center gap-1"
                        whileHover={{ scale: 1.05, backgroundColor: "#1a2744" }}
                        whileTap={{ scale: 0.95 }}
                    >
                        <Coins size={15} />
                        Donations
                    </motion.a>
                    <motion.button
                        type="button"
                        onClick={onStartBuilding}
                        onMouseEnter={() => setIsHovering(true)}
                        onMouseLeave={() => setIsHovering(false)}
                        className="rounded-xl bg-[#2563eb] px-5 py-2.5 text-[14px] font-semibold text-white shadow-[0_8px_20px_rgba(37,99,235,0.4)] transition-all hover:-translate-y-0.5 hover:bg-[#1d4ed8]"
                        whileHover={{ scale: 1.05, y: -2 }}
                        whileTap={{ scale: 0.95 }}
                        animate={isHovering ? { scale: 1.05 } : { scale: 1 }}
                    >
                        {isHovering ? "🚀 Let's go!" : "Launch App"}
                    </motion.button>
                </div>

                <button
                    type="button"
                    aria-label="Toggle navigation"
                    onClick={() => setMobileOpen((open) => !open)}
                    className="rounded-lg border border-[#1a2744] p-2 text-[#94a3b8] sm:hidden"
                >
                    {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </button>
            </div>

            <AnimatePresence>
                {mobileOpen && (
                    <motion.div
                        className="border-t border-[#1a2744] bg-[#0a0e1a] px-5 py-5 sm:hidden"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                    >
                        <nav className="flex flex-col gap-4 text-sm font-medium text-[#94a3b8]">
                            {['Product', 'How it works', 'Features', 'Work anywhere', 'Docs'].map((item) => (
                                <motion.a
                                    key={item}
                                    href={`#${item.toLowerCase().replace(/\s+/g, '-')}`}
                                    onClick={() => setMobileOpen(false)}
                                    whileHover={{ x: 10, color: "#60a5fa" }}
                                >
                                    {item}
                                </motion.a>
                            ))}
                            <motion.button
                                type="button"
                                onClick={onStartBuilding}
                                className="mt-2 rounded-xl bg-[#2563eb] px-5 py-3 font-semibold text-white"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                Launch App 🚀
                            </motion.button>
                        </nav>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.header>
    );
}

function IdePreview({ visibleTerm }: { visibleTerm: number }) {
    const [editorHover, setEditorHover] = useState(false);

    return (
        <motion.div
            className="relative mx-auto w-full max-w-[1640px]"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
        >
            <motion.div
                className="absolute -inset-12 -z-10 rounded-[48px] bg-[radial-gradient(circle_at_center,rgba(37,99,235,0.2),transparent_68%)] blur-2xl"
                animate={pulseGlow}
            />

            <motion.div
                className="overflow-hidden rounded-[22px] border border-[#1a2744] bg-[#0d1117] shadow-[0_35px_90px_rgba(0,0,0,0.7)] transition-all hover:border-[#2563eb]/30"
                onMouseEnter={() => setEditorHover(true)}
                onMouseLeave={() => setEditorHover(false)}
                whileHover={{ scale: 1.01 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
                <div className="flex h-11 items-center justify-between border-b border-[#1a2744] bg-[#161b22] px-4">
                    <div className="flex items-center gap-2">
                        <motion.span
                            className="h-3 w-3 rounded-full bg-[#ff665f]"
                            animate={editorHover ? { scale: [1, 1.2, 1] } : {}}
                            transition={{ duration: 0.5 }}
                        />
                        <motion.span
                            className="h-3 w-3 rounded-full bg-[#ffbd44]"
                            animate={editorHover ? { scale: [1, 1.2, 1] } : {}}
                            transition={{ duration: 0.5, delay: 0.1 }}
                        />
                        <motion.span
                            className="h-3 w-3 rounded-full bg-[#00ca4e]"
                            animate={editorHover ? { scale: [1, 1.2, 1] } : {}}
                            transition={{ duration: 0.5, delay: 0.2 }}
                        />
                    </div>
                    <div className="cv-mono text-[11px] text-[#8b9bb5]">
                        {editorHover ? "🔴 app.corven.dev (active)" : "app.corven.dev"}
                    </div>
                    <div className="w-12" />
                </div>

                <div className="flex h-[520px] min-h-0">
                    <aside className="hidden w-14 shrink-0 flex-col items-center gap-5 border-r border-[#1a2744] bg-[#0d1117] py-4 sm:flex">
                        {[PanelLeft, FileCode2, CirclePlay, ShieldCheck].map((Icon, index) => (
                            <motion.div
                                key={index}
                                whileHover={{ scale: 1.2, color: "#60a5fa" }}
                                whileTap={{ scale: 0.9 }}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.05 }}
                            >
                                <Icon className={`h-5 w-5 ${index === 0 ? 'text-[#60a5fa]' : 'text-[#6b7f99]'}`} />
                            </motion.div>
                        ))}
                        <motion.div
                            className="mt-auto"
                            whileHover={{ scale: 1.2, color: "#60a5fa" }}
                            whileTap={{ scale: 0.9 }}
                        >
                            <Github className="h-5 w-5 text-[#6b7f99]" />
                        </motion.div>
                    </aside>

                    <aside className="hidden w-[210px] shrink-0 border-r border-[#1a2744] bg-[#0d1117] md:block">
                        <div className="flex h-10 items-center justify-between border-b border-[#1a2744] px-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#8b9bb5]">
                            Explorer
                            <span className="text-lg font-normal">•••</span>
                        </div>
                        <div className="cv-mono py-2 text-[11px] text-[#8b9bb5]">
                            <motion.div
                                className="flex items-center gap-1.5 px-3 py-1.5 font-semibold text-white"
                                whileHover={{ backgroundColor: "#1a2744" }}
                            >
                                <ChevronDown className="h-3.5 w-3.5" />
                                <Folder className="h-3.5 w-3.5 text-[#60a5fa]" />
                                hello-ckb
                            </motion.div>
                            <motion.div
                                className="flex items-center gap-1.5 px-6 py-1.5"
                                whileHover={{ backgroundColor: "#1a2744" }}
                            >
                                <ChevronDown className="h-3 w-3" />
                                <Folder className="h-3.5 w-3.5 text-[#6b7f99]" />
                                contracts
                            </motion.div>
                            <motion.div
                                className="flex items-center gap-2 bg-[#1a2744] px-10 py-1.5 text-white"
                                whileHover={{ backgroundColor: "#2a3a5a" }}
                            >
                                <FileCode2 className="h-3.5 w-3.5 text-[#f59e0b]" />
                                main.rs
                            </motion.div>
                            <motion.div
                                className="flex items-center gap-1.5 px-6 py-1.5"
                                whileHover={{ backgroundColor: "#1a2744" }}
                            >
                                <ChevronRight className="h-3 w-3" />
                                <Folder className="h-3.5 w-3.5 text-[#6b7f99]" />
                                tests
                            </motion.div>
                            {['Cargo.toml', 'corven.toml'].map((file, index) => (
                                <motion.div
                                    key={file}
                                    className="flex items-center gap-2 px-10 py-1.5"
                                    whileHover={{ backgroundColor: "#1a2744" }}
                                >
                                    <FileCode2 className={`h-3.5 w-3.5 ${index === 0 ? 'text-[#38bdf8]' : 'text-[#60a5fa]'}`} />
                                    {file}
                                </motion.div>
                            ))}
                        </div>
                    </aside>

                    <div className="flex min-w-0 flex-1 flex-col bg-[#0d1117]">
                        <div className="flex h-10 items-center border-b border-[#1a2744] bg-[#161b22]">
                            <div className="flex h-full items-center gap-2 border-r border-[#1a2744] bg-[#0d1117] px-4 text-[12px] text-[#e2e8f0]">
                                <FileCode2 className="h-3.5 w-3.5 text-[#f59e0b]" />
                                main.rs
                                <X className="ml-2 h-3 w-3 text-[#6b7f99]" />
                            </div>
                            <div className="ml-2 flex items-center gap-2 text-[10px] text-[#6b7f99]">
                                <motion.span
                                    animate={{ opacity: [1, 0, 1] }}
                                    transition={{ duration: 2, repeat: Infinity }}
                                >
                                    ●
                                </motion.span>
                                <span>Rust</span>
                            </div>
                        </div>

                        <div className="min-h-0 flex-1 overflow-hidden bg-[#0d1117] px-3 py-4 sm:px-5">
                            <div className="cv-mono text-[11px] leading-[1.58] sm:text-[12px]">
                                {EDITOR_LINES.map((line, index) => (
                                    <motion.div
                                        key={line.number}
                                        className="grid grid-cols-[26px_1fr] gap-3 transition-colors hover:bg-[#1a2744]/30"
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: index * 0.02 }}
                                    >
                                        <span className="select-none text-right text-[#4a5a72]">{line.number}</span>
                                        <span className={`whitespace-pre ${line.tone}`}>{line.content || " "}</span>
                                    </motion.div>
                                ))}
                            </div>
                        </div>

                        <div className="h-[150px] border-t border-[#1a2744] bg-[#0d1117]">
                            <div className="flex h-9 items-center gap-5 border-b border-[#1a2744] px-4 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#6b7f99]">
                                <span className="border-b-2 border-[#60a5fa] py-3 text-[#e2e8f0]">Terminal</span>
                                <span>Test</span>
                                <span>Build</span>
                            </div>
                            <div className="cv-mono px-4 py-3 text-[10px] leading-5 sm:text-[11px]">
                                {TERMINAL_LINES.slice(0, visibleTerm).map((line, index) => (
                                    <motion.div
                                        key={`${line}-${index}`}
                                        className={
                                            index === 0
                                                ? "text-[#e2e8f0]"
                                                : index === visibleTerm - 1
                                                    ? "text-[#34d399]"
                                                    : "text-[#6b7f99]"
                                        }
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.1 }}
                                    >
                                        {line}
                                        {index === visibleTerm - 1 && (
                                            <motion.span
                                                className="cv-caret text-[#60a5fa]"
                                                animate={{ opacity: [1, 0, 1] }}
                                                transition={{ duration: 1, repeat: Infinity }}
                                            >
                                                {" "}▍
                                            </motion.span>
                                        )}
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <aside className="hidden w-[225px] shrink-0 border-l border-[#1a2744] bg-[#0d1117] xl:block">
                        <div className="border-b border-[#1a2744] p-4">
                            <div className="flex items-center gap-2 text-[12px] font-semibold text-white">
                                <Sparkles className="h-4 w-4 text-[#60a5fa]" />
                                Corven Assistant
                                <span className="ml-auto rounded bg-[#2563eb] px-1.5 py-0.5 text-[8px] font-bold">AI</span>
                            </div>
                        </div>
                        <div className="space-y-3 p-4 text-[11px] leading-relaxed text-[#8b9bb5]">
                            <motion.p
                                className="text-white"
                                animate={{ opacity: [0.7, 1, 0.7] }}
                                transition={{ duration: 3, repeat: Infinity }}
                            >
                                Reviewing your contract... 👀
                            </motion.p>
                            <motion.div
                                className="rounded-lg border border-[#1a2744] bg-[#161b22] p-3"
                                whileHover={{ scale: 1.02, borderColor: "#34d399" }}
                            >
                                <div className="mb-2 flex items-center gap-2 font-semibold text-[#34d399]">
                                    <Check className="h-3.5 w-3.5" />
                                    Build ready
                                </div>
                                The script entry point and argument loading look solid! 🔒
                            </motion.div>
                            <motion.div
                                className="rounded-lg border border-[#1a2744] bg-[#161b22] p-3"
                                whileHover={{ scale: 1.02, borderColor: "#fbbf24" }}
                            >
                                <div className="mb-2 font-semibold text-[#fbbf24]">💡 Suggestion</div>
                                Add explicit error codes for invalid argument lengths.
                                Trust me, future you will thank me.
                            </motion.div>
                            <motion.button
                                className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#2563eb] px-3 py-2.5 font-semibold text-white transition-all hover:bg-[#1d4ed8]"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                Apply suggestion
                                <ArrowRight className="h-3.5 w-3.5" />
                            </motion.button>
                        </div>
                    </aside>
                </div>

                <div className="flex h-7 items-center justify-between bg-[#161b22] px-3 text-[9px] font-medium text-[#8b9bb5] sm:text-[10px]">
                    <div className="flex items-center gap-4">
                        <span>main</span>
                        <span className="text-[#34d399]">0 errors</span>
                        <span className="text-[#fbbf24]">1 warning</span>
                        <span className="text-[#6b7f99]">(who cares 😅)</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <span>CKB Devnet</span>
                        <span>Rust</span>
                        <span>Ln 16, Col 5</span>
                        <motion.span
                            className="text-[#6b7f99]"
                            animate={floatAnimation}
                        >
                            🐦‍⬛
                        </motion.span>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
}

export default function HomeView({ onStartBuilding, activeBlock }: HomeViewProps) {
    const [visibleTerm, setVisibleTerm] = useState(1);
    const [jokeIndex, setJokeIndex] = useState(0);
    const [buildCount, setBuildCount] = useState(42);
    const [uptime, setUptime] = useState("2h 14m");

    useEffect(() => {
        const timer = window.setInterval(() => {
            setVisibleTerm((previous) =>
                previous >= TERMINAL_LINES.length ? 1 : previous + 1,
            );
        }, 1050);

        const jokeTimer = window.setInterval(() => {
            setJokeIndex((prev) => (prev + 1) % CKB_JOKES.length);
        }, 30000);

        const buildTimer = window.setInterval(() => {
            setBuildCount((prev) => prev + Math.floor(Math.random() * 3));
        }, 45000);

        const uptimeTimer = window.setInterval(() => {
            const hours = Math.floor(Math.random() * 24);
            const minutes = Math.floor(Math.random() * 60);
            setUptime(`${hours}h ${minutes}m`);
        }, 120000);

        return () => {
            window.clearInterval(timer);
            window.clearInterval(jokeTimer);
            window.clearInterval(buildTimer);
            window.clearInterval(uptimeTimer);
        };
    }, []);

    return (
        <div id="top" className="min-h-screen w-full overflow-x-hidden bg-[#0a0e1a] text-[#e2e8f0]">
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');
                .cv-display { font-family: 'DM Sans', ui-sans-serif, system-ui, sans-serif; }
                .cv-mono { font-family: 'JetBrains Mono', ui-monospace, SFMono-Regular, monospace; }
                @keyframes cv-caret { 0%, 45% { opacity: 1; } 50%, 100% { opacity: 0; } }
                .cv-caret { animation: cv-caret 1s steps(1) infinite; }
                @media (prefers-reduced-motion: reduce) { .cv-caret { animation: none; opacity: 1; } }
                
                @keyframes float {
                    0%, 100% { transform: translateY(0px) rotate(-2deg); }
                    50% { transform: translateY(-10px) rotate(2deg); }
                }
                .float-animation {
                    animation: float 6s ease-in-out infinite;
                }
                
                @keyframes shimmer {
                    0% { background-position: -200% 0; }
                    100% { background-position: 200% 0; }
                }
                .shimmer {
                    background: linear-gradient(90deg, transparent, rgba(37,99,235,0.1), transparent);
                    background-size: 200% 100%;
                    animation: shimmer 3s infinite;
                }
                
                @keyframes gradient-flow {
                    0% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                    100% { background-position: 0% 50%; }
                }
                .gradient-flow {
                    background-size: 200% 200%;
                    animation: gradient-flow 6s ease infinite;
                }
            `}</style>

            <TopNav onStartBuilding={onStartBuilding} />

            <main>
                <section
                    id="product"
                    className="relative overflow-hidden bg-[#0a0e1a] px-5 pb-28 pt-20 sm:px-8 sm:pt-28"
                >
                    <motion.div
                        className="pointer-events-none absolute left-[-120px] top-[110px] h-[360px] w-[360px] rounded-full bg-[#1d4ed8]/15 blur-[90px]"
                        animate={{
                            x: [0, 30, 0],
                            y: [0, -20, 0],
                        }}
                        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                    />
                    <motion.div
                        className="pointer-events-none absolute right-[-100px] top-[20px] h-[420px] w-[420px] rounded-full bg-[#2563eb]/10 blur-[105px]"
                        animate={{
                            x: [0, -30, 0],
                            y: [0, 20, 0],
                        }}
                        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
                    />

                    <div className="relative mx-auto max-w-[1240px] text-center">
                        <motion.div
                            className="mx-auto mb-7 inline-flex items-center gap-2 rounded-full border border-[#1a2744] bg-[#0d1117]/80 px-4 py-2 text-[12px] font-semibold text-[#60a5fa] shadow-sm backdrop-blur"
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6 }}
                            whileHover={{ scale: 1.05 }}
                        >
                            <Sparkles className="h-3.5 w-3.5" />
                            Browser-native CKB development
                            <ChevronRight className="h-3.5 w-3.5" />
                        </motion.div>

                        <motion.h1
                            className="cv-display mx-auto max-w-[950px] text-[3.3rem] font-bold leading-[0.98] tracking-[-0.055em] text-[#f0f4f8] sm:text-6xl lg:text-[5.35rem]"
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8, delay: 0.2 }}
                        >
                            Code the contract.
                            <motion.span
                                className="block bg-[linear-gradient(90deg,#60a5fa,#38bdf8,#2563eb)] bg-clip-text text-transparent gradient-flow"
                                animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
                                transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
                            >
                                Ship on CKB. 🚀
                            </motion.span>
                        </motion.h1>

                        <motion.p
                            className="mx-auto mt-7 max-w-[720px] text-[17px] leading-7 text-[#94a3b8] sm:text-[19px] sm:leading-8"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, delay: 0.4 }}
                        >
                            Corven is the browser-based IDE for building, testing and debugging CKB applications — zero local setup, ready in seconds.
                            <span className="block mt-2 text-sm text-[#6b7f99]">
                                (Actually tested on a real CKB devnet, not just a demo 💪)
                            </span>
                        </motion.p>

                        <motion.div
                            className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, delay: 0.6 }}
                        >
                            <motion.button
                                type="button"
                                onClick={onStartBuilding}
                                className="flex min-w-[175px] items-center justify-center gap-2 rounded-xl bg-[#2563eb] px-6 py-3.5 text-[15px] font-semibold text-white shadow-[0_12px_28px_rgba(37,99,235,0.4)] transition-all hover:-translate-y-0.5 hover:bg-[#1d4ed8] hover:scale-105 transform"
                                whileHover={{ scale: 1.05, y: -2 }}
                                whileTap={{ scale: 0.95 }}
                                animate={{ boxShadow: ["0 12px 28px rgba(37,99,235,0.4)", "0 12px 40px rgba(37,99,235,0.6)", "0 12px 28px rgba(37,99,235,0.4)"] }}
                                transition={{ duration: 2, repeat: Infinity }}
                            >
                                Launch App
                                <ArrowRight className="h-4 w-4" />
                            </motion.button>
                            <motion.a
                                href="#workflow"
                                className="flex min-w-[175px] items-center justify-center gap-2 rounded-xl border border-[#1a2744] bg-[#0d1117] px-6 py-3.5 text-[15px] font-semibold text-[#e2e8f0] shadow-sm transition-all hover:-translate-y-0.5 hover:border-[#2563eb] hover:bg-[#1a2744]/50"
                                whileHover={{ scale: 1.05, y: -2 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                <CirclePlay className="h-4 w-4 text-[#60a5fa]" />
                                See how it works
                            </motion.a>
                        </motion.div>

                        <motion.div
                            className="mt-7 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[12px] font-medium text-[#6b7f99]"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.6, delay: 0.8 }}
                        >
                            <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-[#34d399]" />Free to start</span>
                            <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-[#34d399]" />No installation</span>
                            <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-[#34d399]" />Local CKB devnet</span>
                            <span className="flex items-center gap-1.5 text-[#6b7f99]"><Coffee className="h-3.5 w-3.5" />Caffeine included</span>
                        </motion.div>

                        <div className="mt-16 sm:mt-20">
                            <IdePreview visibleTerm={visibleTerm} />
                        </div>
                    </div>
                </section>

                <motion.section
                    id="workflow"
                    className="bg-[#0a0e1a] px-5 py-24 sm:px-8 sm:py-28 border-t border-[#1a2744]"
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8 }}
                >
                    <div className="mx-auto max-w-[1180px]">
                        <motion.div
                            className="mx-auto max-w-[720px] text-center"
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6 }}
                        >
                            <div className="mb-4 text-[12px] font-bold uppercase tracking-[0.15em] text-[#60a5fa]">One complete workflow</div>
                            <h2 className="cv-display text-4xl font-bold tracking-[-0.04em] text-[#f0f4f8] sm:text-5xl">
                                From first line to a tested CKB contract
                            </h2>
                            <p className="mt-5 text-[17px] leading-7 text-[#94a3b8]">
                                Corven brings your editor, runtime, compiler, debugger and local network into one focused workspace.
                                <span className="block mt-2 text-sm text-[#6b7f99]">(It only took 37 iterations to get here 😅)</span>
                            </p>
                        </motion.div>

                        <motion.div
                            className="mt-16 grid gap-6 lg:grid-cols-3"
                            variants={staggerContainer}
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: true }}
                        >
                            {FEATURES.map((feature, index) => {
                                const Icon = feature.icon;
                                return (
                                    <motion.article
                                        key={feature.title}
                                        variants={fadeInUp}
                                        className="group rounded-[22px] border border-[#1a2744] bg-[#0d1117] p-7 shadow-[0_14px_45px_rgba(0,0,0,0.3)] transition-all hover:-translate-y-1 hover:border-[#2563eb] hover:shadow-[0_20px_55px_rgba(37,99,235,0.1)]"
                                        whileHover={{ y: -4, scale: 1.02 }}
                                    >
                                        <div className="flex items-center justify-between">
                                            <motion.div
                                                className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-r ${feature.accentColor} p-0.5`}
                                                whileHover={{ rotate: 360 }}
                                                transition={{ duration: 0.6 }}
                                            >
                                                <div className="flex h-full w-full items-center justify-center rounded-2xl bg-[#0d1117]">
                                                    <Icon className="h-6 w-6 text-[#60a5fa]" />
                                                </div>
                                            </motion.div>
                                            <span className="cv-mono text-[11px] text-[#4a5a72]">0{index + 1}</span>
                                        </div>
                                        <h3 className="cv-display mt-6 text-xl font-bold tracking-[-0.02em] text-[#f0f4f8]">{feature.title}</h3>
                                        <p className="mt-3 text-[15px] leading-6 text-[#94a3b8]">{feature.body}</p>
                                    </motion.article>
                                );
                            })}
                        </motion.div>

                        {/* Easter egg: CKB joke carousel */}
                        <motion.div
                            className="mt-12 text-center"
                            initial={{ opacity: 0 }}
                            whileInView={{ opacity: 1 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6, delay: 0.4 }}
                        >
                            <motion.div
                                className="inline-flex items-center gap-3 rounded-full border border-[#1a2744] bg-[#0d1117] px-6 py-3"
                                whileHover={{ scale: 1.05 }}
                            >
                                <Heart className="h-4 w-4 text-[#60a5fa]" />
                                <span className="text-sm text-[#94a3b8]">CKB joke of the day:</span>
                                <motion.span
                                    className="text-sm font-medium text-[#e2e8f0]"
                                    key={jokeIndex}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.5 }}
                                >
                                    {CKB_JOKES[jokeIndex]}
                                </motion.span>
                            </motion.div>
                        </motion.div>
                    </div>
                </motion.section>

                <motion.section
                    id="features"
                    className="bg-[#0a0e1a] px-5 py-24 sm:px-8 sm:py-28 border-t border-[#1a2744]"
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8 }}
                >
                    <div className="mx-auto grid max-w-[1180px] items-center gap-14 lg:grid-cols-[0.92fr_1.08fr]">
                        <motion.div
                            initial={{ opacity: 0, x: -30 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6 }}
                        >
                            <div className="mb-4 text-[12px] font-bold uppercase tracking-[0.15em] text-[#60a5fa]">Built for CKB builders</div>
                            <h2 className="cv-display max-w-[520px] text-4xl font-bold leading-[1.08] tracking-[-0.045em] text-[#f0f4f8] sm:text-5xl">
                                Everything you need, already connected.
                            </h2>
                            <p className="mt-6 max-w-[540px] text-[17px] leading-7 text-[#94a3b8]">
                                Create a workspace and start coding. Corven provisions the runtime, restores the project and connects every tool automatically.
                                <span className="block mt-2 text-sm text-[#6b7f99]">(It's like magic, but with more Rust 🦀)</span>
                            </p>

                            <div className="mt-8 space-y-4">
                                {[
                                    "Rust and RISC-V toolchains preinstalled",
                                    "CKB Debugger and mock transaction testing",
                                    "Automatic workspace provisioning",
                                    "Persistent files, terminal and build output",
                                    "24/7 support for existential coding crises",
                                ].map((item, index) => (
                                    <motion.div
                                        key={item}
                                        className="flex items-center gap-3 text-[15px] font-medium text-[#e2e8f0]"
                                        initial={{ opacity: 0, x: -20 }}
                                        whileInView={{ opacity: 1, x: 0 }}
                                        viewport={{ once: true }}
                                        transition={{ delay: index * 0.1 }}
                                    >
                                        <motion.span
                                            className="flex h-6 w-6 items-center justify-center rounded-full bg-[#1a2744] text-[#60a5fa]"
                                            whileHover={{ scale: 1.2, rotate: 90 }}
                                        >
                                            <Check className="h-3.5 w-3.5" />
                                        </motion.span>
                                        {item}
                                    </motion.div>
                                ))}
                            </div>

                            <motion.button
                                type="button"
                                onClick={onStartBuilding}
                                className="mt-9 flex items-center gap-2 rounded-xl bg-[#1a2744] px-6 py-3.5 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-[#2a3a5a] hover:scale-105 transform"
                                whileHover={{ scale: 1.05, y: -2 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                Start building
                                <ArrowRight className="h-4 w-4" />
                            </motion.button>
                        </motion.div>

                        <motion.div
                            className="rounded-[26px] p-3"
                            initial={{ opacity: 0, scale: 0.9 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6, delay: 0.2 }}
                            whileHover={{ scale: 1.02 }}
                        >
                            <img
                                src="/assets/image2.png"
                                alt="Corven IDE features"
                                className="rounded-lg"
                            />
                        </motion.div>
                    </div>
                </motion.section>

                {/* Work Anywhere Section */}
                <motion.section
                    id="work-anywhere"
                    className="bg-[#0a0e1a] px-5 py-24 sm:px-8 sm:py-28 border-t border-[#1a2744]"
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8 }}
                >
                    <div className="mx-auto max-w-[1180px]">
                        <motion.div
                            className="text-center mb-16"
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6 }}
                        >
                            <div className="mb-4 text-[12px] font-bold uppercase tracking-[0.15em] text-[#60a5fa]">Work anywhere, anytime</div>
                            <h2 className="cv-display text-4xl font-bold tracking-[-0.04em] text-[#f0f4f8] sm:text-5xl">
                                Your IDE, wherever you are
                            </h2>
                            <p className="mt-5 max-w-[640px] mx-auto text-[17px] leading-7 text-[#94a3b8]">
                                Access your entire development environment from any device, any operating system, at any time.
                                <span className="block mt-2 text-sm text-[#6b7f99]">(Even from your phone while pretending to work 👀)</span>
                            </p>
                        </motion.div>

                        {/* OS Logos Grid */}
                        <motion.div
                            className="grid gap-6 md:grid-cols-4 mb-16"
                            variants={staggerContainer}
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: true }}
                        >
                            {OS_LOGOS.map((os, index) => (
                                <motion.div
                                    key={os.name}
                                    variants={fadeInScale}
                                    className="group flex flex-col items-center justify-center rounded-2xl border border-[#1a2744] p-8 transition-all hover:-translate-y-1 hover:border-[#2563eb] hover:shadow-[0_12px_40px_rgba(37,99,235,0.1)]"
                                    whileHover={{ y: -4, scale: 1.05 }}
                                >
                                    <motion.img
                                        src={os.icon}
                                        alt={os.name}
                                        className="w-16 h-16 object-contain mb-4"
                                        whileHover={{ rotate: 360 }}
                                        transition={{ duration: 0.6 }}
                                    />
                                    <span className="text-sm font-semibold text-[#e2e8f0]">{os.name}</span>
                                    <span className="mt-1 text-xs text-[#6b7f99]">Supported</span>
                                </motion.div>
                            ))}
                        </motion.div>

                        {/* CTA */}
                        <motion.div
                            className="mt-12 text-center"
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6, delay: 0.2 }}
                        >
                            <motion.div
                                className="inline-flex items-center gap-3 rounded-full border border-[#1a2744] bg-[#0d1117] px-6 py-3"
                                whileHover={{ scale: 1.05 }}
                            >
                                <Laptop className="h-5 w-5 text-[#60a5fa]" />
                                <span className="text-sm text-[#94a3b8]">Start coding from any device —</span>
                                <motion.button
                                    type="button"
                                    onClick={onStartBuilding}
                                    className="font-semibold text-[#60a5fa] transition-colors hover:text-[#38bdf8] hover:scale-105 transform"
                                    whileHover={{ scale: 1.05, color: "#38bdf8" }}
                                    whileTap={{ scale: 0.95 }}
                                >
                                    Launch Corven now
                                    <ArrowRight className="inline h-4 w-4 ml-1" />
                                </motion.button>
                            </motion.div>
                        </motion.div>
                    </div>
                </motion.section>

                <motion.section
                    id="docs"
                    className="relative overflow-hidden bg-[#0a0e1a] px-5 py-24 text-white sm:px-8 sm:py-28 border-t border-[#1a2744]"
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8 }}
                >
                    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_0%,rgba(37,99,235,0.15),transparent_32%),radial-gradient(circle_at_85%_100%,rgba(37,99,235,0.08),transparent_30%)]" />
                    <div className="relative mx-auto flex max-w-[980px] flex-col items-center text-center">
                        <motion.div
                            className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#1a2744] text-[#60a5fa] float-animation"
                            animate={floatAnimation}
                        >
                            <Sparkles className="h-7 w-7" />
                        </motion.div>
                        <motion.h2
                            className="cv-display mt-7 text-4xl font-bold tracking-[-0.045em] sm:text-5xl"
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6, delay: 0.1 }}
                        >
                            Build your next CKB project in the browser.
                        </motion.h2>
                        <motion.p
                            className="mt-5 max-w-[660px] text-[17px] leading-7 text-[#94a3b8]"
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6, delay: 0.2 }}
                        >
                            Start with a template, open the terminal and ship a tested contract without spending hours configuring a local environment.
                            <span className="block mt-2 text-sm text-[#6b7f99]">(Your future self will appreciate not fighting with compiler versions)</span>
                        </motion.p>
                        <motion.div
                            className="mt-9 flex flex-col gap-3 sm:flex-row"
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6, delay: 0.3 }}
                        >
                            <motion.button
                                type="button"
                                onClick={onStartBuilding}
                                className="flex items-center justify-center gap-2 rounded-xl bg-[#2563eb] px-6 py-3.5 text-[15px] font-semibold text-white shadow-[0_12px_28px_rgba(37,99,235,0.4)] transition-all hover:-translate-y-0.5 hover:bg-[#1d4ed8] hover:scale-105 transform"
                                whileHover={{ scale: 1.05, y: -2 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                Launch Corven
                                <ArrowRight className="h-4 w-4" />
                            </motion.button>
                            <motion.a
                                href="#workflow"
                                className="rounded-xl border border-[#1a2744] px-6 py-3.5 text-[15px] font-semibold text-white transition-colors hover:bg-white/10 hover:scale-105 transform"
                                whileHover={{ scale: 1.05, backgroundColor: "rgba(255,255,255,0.1)" }}
                                whileTap={{ scale: 0.95 }}
                            >
                                Explore the workflow
                            </motion.a>
                        </motion.div>

                        {/* Known issues section - makes it feel real */}
                        <motion.div
                            className="mt-12 text-left w-full max-w-2xl"
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6, delay: 0.4 }}
                        >
                            <div className="p-4 border border-[#1a2744] rounded-xl bg-[#0d1117]/50">
                                <div className="flex items-center gap-2 text-xs font-semibold text-[#6b7f99] uppercase tracking-wider">
                                    <Bug className="h-4 w-4" />
                                    Known quirks (we're working on 'em)
                                </div>
                                <div className="mt-2 space-y-1">
                                    {KNOWN_ISSUES.map((issue, i) => (
                                        <motion.div
                                            key={i}
                                            className="text-xs text-[#94a3b8] flex items-start gap-2"
                                            initial={{ opacity: 0, x: -20 }}
                                            whileInView={{ opacity: 1, x: 0 }}
                                            viewport={{ once: true }}
                                            transition={{ delay: 0.1 * i }}
                                        >
                                            <span className="text-[#6b7f99]">•</span>
                                            {issue}
                                        </motion.div>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </motion.section>
            </main>

            <motion.footer
                id="community"
                className="border-t border-[#1a2744] bg-[#0a0e1a] px-5 py-14 sm:px-8"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8 }}
            >
                <div className="mx-auto max-w-[1180px]">
                    <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
                        <div>
                            <CorvenLogo compact />
                            <p className="mt-4 max-w-[290px] text-[14px] leading-6 text-[#94a3b8]">
                                A browser-based IDE for building, testing and debugging CKB applications.
                                <span className="block mt-2 text-sm text-[#6b7f99]">Made with ☕ and 🦀</span>
                            </p>
                        </div>

                        {Object.entries(FOOTER_LINKS).map(([heading, links]) => (
                            <div key={heading}>
                                <h3 className="text-[13px] font-bold text-[#e2e8f0]">{heading}</h3>
                                <ul className="mt-4 space-y-3">
                                    {links.map((link) => (
                                        <li key={link}>
                                            <motion.a
                                                href="#"
                                                className="text-[13px] text-[#94a3b8] transition-colors hover:text-[#60a5fa] hover:translate-x-1 inline-block"
                                                whileHover={{ x: 4, color: "#60a5fa" }}
                                            >
                                                {link}
                                            </motion.a>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>

                    <motion.div
                        className="mt-12 flex flex-col gap-3 border-t border-[#1a2744] pt-6 text-[12px] text-[#6b7f99] sm:flex-row sm:items-center sm:justify-between"
                        initial={{ opacity: 0, y: 10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6 }}
                    >
                        <span>© {new Date().getFullYear()} Corven. All rights reserved.</span>
                        <motion.span
                            className="cv-mono"
                            whileHover={{ scale: 1.05 }}
                        >
                            CKB devnet · block #{activeBlock}
                        </motion.span>
                        <motion.span
                            className="text-[#4a5a72]"
                            animate={floatAnimation}
                        >
                            🐦‍⬛ v2.3.0 · {buildCount} builds today
                        </motion.span>
                    </motion.div>
                </div>
            </motion.footer>
        </div>
    );
}