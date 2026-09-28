// src/components/HomeView.tsx
import {
    ArrowRight,
    ArrowUpRight,
    Bot,
    Boxes,
    ChevronRight,
    Circle,
    FileCode2,
    Folder,
    FolderOpen,
    Github,
    Menu,
    Play,
    ShieldCheck,
    TerminalSquare,
    TestTube2,
    Wallet,
    X,
} from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
    AnimatePresence,
    motion,
    useInView,
    useReducedMotion,
} from 'framer-motion';

interface HomeViewProps {
    onStartBuilding: () => void;
    activeBlock: number;
}

const LOGO_URL =
    'https://res.cloudinary.com/dswyz4vpp/image/upload/v1785082590/ChatGPT_Image_Jul_26__2026__01_05_52_PM-removebg-preview_wua44l.png';

const NAV_ITEMS = [
    { label: 'Product', href: '#product' },
    { label: 'Workflow', href: '#workflow' },
    { label: 'Platform', href: '#platform' },
    { label: 'Compare', href: '#compare' },
];

/* ------------------------------------------------------------------ */
/*  Content                                                            */
/* ------------------------------------------------------------------ */

const SOURCE = `#![no_std]
#![no_main]

use ckb_std::{debug, high_level::load_script};

ckb_std::entry!(program_entry);
ckb_std::default_alloc!();

pub fn program_entry() -> i8 {
    let script = match load_script() {
        Ok(script) => script,
        Err(_) => return 1,
    };

    let args = script.args().raw_data();
    debug!("lock args: {:?}", args);

    // expect a 20-byte blake160 hash
    if args.len() != 20 {
        return 2;
    }

    0
}`;

type TermLine = { text: string; kind: 'cmd' | 'out' | 'ok' | 'dim' };

const TERMINAL: TermLine[] = [
    { text: 'make build', kind: 'cmd' },
    { text: '   Compiling hello-world v0.1.0 (contracts/hello-world)', kind: 'out' },
    { text: '    Finished release [optimized] target(s) in 4.82s', kind: 'ok' },
    { text: 'make test', kind: 'cmd' },
    { text: 'running 3 tests', kind: 'dim' },
    { text: 'test tests::test_valid_args ... ok', kind: 'ok' },
    { text: 'test tests::test_short_args ... ok', kind: 'ok' },
    { text: 'test result: ok. 3 passed; 0 failed', kind: 'ok' },
    { text: 'ckb-debugger --bin build/release/hello-world', kind: 'cmd' },
    { text: 'Run result: 0', kind: 'ok' },
];

const SPECS = [
    { label: 'Target', value: 'riscv64imac', note: 'unknown-none-elf' },
    { label: 'Toolchain', value: 'Rust 1.96', note: 'Clang / LLVM 18' },
    { label: 'Chain', value: 'Local devnet', note: 'offckb, per workspace' },
    { label: 'Debugger', value: 'ckb-debugger', note: 'cycles & exit codes' },
];

const STEPS = [
    {
        n: '01',
        title: 'Scaffold',
        body: 'Every workspace starts from the official ckb-script-templates, with a contract crate generated and ready to compile.',
        cmd: 'cargo generate ckb-script-templates',
    },
    {
        n: '02',
        title: 'Write',
        body: 'A Rust-aware editor with syntax checks, a file tree and tabs. Edits are saved straight into the workspace.',
        cmd: 'contracts/hello-world/src/main.rs',
    },
    {
        n: '03',
        title: 'Build & test',
        body: 'Build for RISC-V and run the test suite from one panel. Results come back parsed: which tests passed, which failed and why.',
        cmd: 'make build && make test',
    },
    {
        n: '04',
        title: 'Run on devnet',
        body: 'Run the binary in ckb-debugger to check exit codes and cycles, and test against a CKB node that belongs to this workspace only.',
        cmd: 'ckb-debugger --bin build/release/…',
    },
];

const LOCAL_SETUP = [
    'Install rustup and pin a toolchain',
    'Add the riscv64imac-unknown-none-elf target',
    'Install Clang / LLVM 18 and wire up CC',
    'Install cargo-generate and pull templates',
    'Build ckb-debugger from source',
    'Install and run a local CKB devnet',
    'Repeat on every new machine',
];

/* ------------------------------------------------------------------ */
/*  Tiny Rust highlighter for the product shot                         */
/* ------------------------------------------------------------------ */

const KEYWORDS = new Set([
    'use', 'pub', 'fn', 'let', 'match', 'return', 'if', 'else', 'mut',
]);

function highlight(line: string): ReactNode[] {
    const out: ReactNode[] = [];
    const commentAt = line.indexOf('//');
    const code = commentAt >= 0 ? line.slice(0, commentAt) : line;
    const comment = commentAt >= 0 ? line.slice(commentAt) : '';

    const re =
        /("(?:[^"\\]|\\.)*")|(#!\[[^\]]*\])|\b([a-z_][a-z0-9_]*!)|\b([A-Za-z_][A-Za-z0-9_]*)\b|\b(\d+)\b/g;

    let last = 0;
    let m: RegExpExecArray | null;
    let i = 0;

    while ((m = re.exec(code)) !== null) {
        if (m.index > last) out.push(code.slice(last, m.index));
        const [tok, str, attr, mac, ident, num] = m;
        let cls = '';
        if (str) cls = 'text-[#c3e88d]';
        else if (attr) cls = 'text-[#7a7f89]';
        else if (mac) cls = 'text-[#82aaff]';
        else if (num) cls = 'text-[#f78c6c]';
        else if (ident && KEYWORDS.has(ident)) cls = 'text-[#c792ea]';
        else if (ident && /^[A-Z]/.test(ident)) cls = 'text-[#ffcb6b]';
        else if (ident === 'i8') cls = 'text-[#ffcb6b]';
        out.push(
            <span key={i++} className={cls}>
                {tok}
            </span>,
        );
        last = m.index + tok.length;
    }
    if (last < code.length) out.push(code.slice(last));
    if (comment)
        out.push(
            <span key="c" className="italic text-[#5c6370]">
                {comment}
            </span>,
        );
    return out;
}

/* ------------------------------------------------------------------ */
/*  Primitives                                                         */
/* ------------------------------------------------------------------ */

function Reveal({
    children,
    delay = 0,
    className,
}: {
    children: ReactNode;
    delay?: number;
    className?: string;
}) {
    const ref = useRef<HTMLDivElement>(null);
    const inView = useInView(ref, { once: true, margin: '-80px' });
    const reduce = useReducedMotion();

    return (
        <motion.div
            ref={ref}
            className={className}
            initial={reduce ? false : { opacity: 0, y: 18 }}
            animate={inView ? { opacity: 1, y: 0 } : undefined}
            transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
        >
            {children}
        </motion.div>
    );
}

function Eyebrow({ index, children }: { index: string; children: ReactNode }) {
    return (
        <div className="cv-mono flex items-center gap-3 text-[11px] uppercase tracking-[0.18em] text-[var(--dim)]">
            <span className="text-[var(--accent)]">§ {index}</span>
            <span className="h-px w-8 bg-[var(--line-strong)]" />
            <span>{children}</span>
        </div>
    );
}

function PrimaryButton({
    onClick,
    children,
}: {
    onClick: () => void;
    children: ReactNode;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="group inline-flex h-11 items-center gap-2 rounded-md bg-[var(--accent)] px-5 text-[14px] font-medium text-[#07120c] transition-[background,transform] duration-200 hover:bg-[var(--accent-hi)] active:translate-y-px"
        >
            {children}
            <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
        </button>
    );
}

function GhostLink({ href, children }: { href: string; children: ReactNode }) {
    return (
        <a
            href={href}
            className="inline-flex h-11 items-center gap-2 rounded-md border border-[var(--line-strong)] px-5 text-[14px] font-medium text-[var(--text)] transition-colors hover:border-[var(--muted)] hover:bg-white/[0.03]"
        >
            {children}
        </a>
    );
}

/* ------------------------------------------------------------------ */
/*  Navigation                                                         */
/* ------------------------------------------------------------------ */

function TopNav({
    onStartBuilding,
    activeBlock,
}: {
    onStartBuilding: () => void;
    activeBlock: number;
}) {
    const [open, setOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 8);
        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    return (
        <header
            className={`sticky top-0 z-50 transition-colors duration-300 ${
                scrolled
                    ? 'border-b border-[var(--line)] bg-[var(--ink)]/85 backdrop-blur-md'
                    : 'border-b border-transparent'
            }`}
        >
            <div className="mx-auto flex h-16 max-w-[1280px] items-center justify-between px-5 sm:px-8">
                <a href="#top" className="flex items-center gap-2.5" aria-label="Corven home">
                    <img src={LOGO_URL} alt="" className="h-7 w-7 object-contain" />
                    <span className="text-[17px] font-semibold tracking-[-0.02em] text-[var(--text)]">
                        Corven
                    </span>
                    <span className="cv-mono ml-1 hidden rounded border border-[var(--line-strong)] px-1.5 py-0.5 text-[10px] text-[var(--dim)] sm:inline">
                        BETA
                    </span>
                </a>

                <nav className="hidden items-center gap-8 lg:flex">
                    {NAV_ITEMS.map((item) => (
                        <a
                            key={item.href}
                            href={item.href}
                            className="text-[14px] text-[var(--muted)] transition-colors hover:text-[var(--text)]"
                        >
                            {item.label}
                        </a>
                    ))}
                </nav>

                <div className="hidden items-center gap-5 sm:flex">
                    <BlockIndicator block={activeBlock} />
                    <a
                        href="/donate"
                        className="text-[14px] text-[var(--muted)] transition-colors hover:text-[var(--text)]"
                    >
                        Support
                    </a>
                    <button
                        type="button"
                        onClick={onStartBuilding}
                        className="inline-flex h-9 items-center gap-1.5 rounded-md bg-[var(--text)] px-4 text-[13px] font-medium text-[var(--ink)] transition-opacity hover:opacity-90"
                    >
                        Open IDE
                        <ArrowUpRight className="h-3.5 w-3.5" />
                    </button>
                </div>

                <button
                    type="button"
                    aria-label="Toggle navigation"
                    aria-expanded={open}
                    onClick={() => setOpen((v) => !v)}
                    className="rounded-md border border-[var(--line-strong)] p-2 text-[var(--muted)] sm:hidden"
                >
                    {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
                </button>
            </div>

            <AnimatePresence>
                {open && (
                    <motion.nav
                        className="overflow-hidden border-t border-[var(--line)] bg-[var(--ink)] px-5 sm:hidden"
                        initial={{ height: 0 }}
                        animate={{ height: 'auto' }}
                        exit={{ height: 0 }}
                        transition={{ duration: 0.25 }}
                    >
                        <div className="flex flex-col py-4">
                            {NAV_ITEMS.map((item) => (
                                <a
                                    key={item.href}
                                    href={item.href}
                                    onClick={() => setOpen(false)}
                                    className="border-b border-[var(--line)] py-3 text-[15px] text-[var(--muted)]"
                                >
                                    {item.label}
                                </a>
                            ))}
                            <a href="/donate" className="py-3 text-[15px] text-[var(--muted)]">
                                Support
                            </a>
                            <button
                                type="button"
                                onClick={onStartBuilding}
                                className="mt-2 h-11 rounded-md bg-[var(--accent)] text-[14px] font-medium text-[#07120c]"
                            >
                                Open IDE
                            </button>
                        </div>
                    </motion.nav>
                )}
            </AnimatePresence>
        </header>
    );
}

function BlockIndicator({ block }: { block: number }) {
    const live = block > 0;
    return (
        <div className="cv-mono flex items-center gap-2 text-[11px] text-[var(--dim)]">
            <span className="relative flex h-1.5 w-1.5">
                {live && (
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--accent)] opacity-60" />
                )}
                <span
                    className={`relative inline-flex h-1.5 w-1.5 rounded-full ${
                        live ? 'bg-[var(--accent)]' : 'bg-[var(--dim)]'
                    }`}
                />
            </span>
            {live ? `devnet #${block.toLocaleString()}` : 'devnet idle'}
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  Product shot                                                       */
/* ------------------------------------------------------------------ */

function ProductShot({ activeBlock }: { activeBlock: number }) {
    const reduce = useReducedMotion();
    const ref = useRef<HTMLDivElement>(null);
    const inView = useInView(ref, { once: true, margin: '-120px' });
    const [shown, setShown] = useState(reduce ? TERMINAL.length : 0);

    useEffect(() => {
        if (!inView || reduce) return;
        let n = 0;
        const id = window.setInterval(() => {
            n += 1;
            setShown(n);
            if (n >= TERMINAL.length) window.clearInterval(id);
        }, 420);
        return () => window.clearInterval(id);
    }, [inView, reduce]);

    const lines = SOURCE.split('\n');

    return (
        <div ref={ref} className="relative">
            {/* frame coordinates */}
            <div className="cv-mono pointer-events-none absolute -top-6 left-0 right-0 hidden justify-between text-[10px] tracking-[0.14em] text-[var(--dim)] md:flex">
                <span>WORKSPACE / ckb-rust-script</span>
                <span>fig. 1: the Corven editor</span>
            </div>

            <div className="overflow-hidden rounded-xl border border-[var(--line-strong)] bg-[#0c0e11] shadow-[0_40px_120px_-40px_rgba(0,0,0,0.9),0_0_0_1px_rgba(255,255,255,0.02)]">
                {/* title bar */}
                <div className="flex h-10 items-center justify-between border-b border-[var(--line)] bg-[#0f1216] px-4">
                    <div className="flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-full bg-[#2a2e35]" />
                        <span className="h-2.5 w-2.5 rounded-full bg-[#2a2e35]" />
                        <span className="h-2.5 w-2.5 rounded-full bg-[#2a2e35]" />
                    </div>
                    <div className="cv-mono truncate px-4 text-[11px] text-[var(--dim)]">
                        corven.dev/ide/ckb-rust-script
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="cv-mono hidden items-center gap-1.5 rounded border border-[var(--line-strong)] px-2 py-1 text-[10px] text-[var(--muted)] sm:flex">
                            <Play className="h-2.5 w-2.5" /> Build
                        </span>
                        <span className="cv-mono hidden items-center gap-1.5 rounded bg-[var(--accent)]/15 px-2 py-1 text-[10px] text-[var(--accent)] sm:flex">
                            <TestTube2 className="h-2.5 w-2.5" /> Test
                        </span>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-[220px_1fr]">
                    {/* file tree */}
                    <aside className="cv-mono hidden border-r border-[var(--line)] bg-[#0e1014] py-3 text-[12px] text-[var(--muted)] md:block">
                        <div className="px-4 pb-2 text-[10px] uppercase tracking-[0.16em] text-[var(--dim)]">
                            Explorer
                        </div>
                        <TreeRow depth={0} icon={<FolderOpen className="h-3.5 w-3.5 text-[#e5b567]" />}>
                            ckb-rust-script
                        </TreeRow>
                        <TreeRow depth={1} icon={<FolderOpen className="h-3.5 w-3.5 text-[#e5b567]" />}>
                            contracts
                        </TreeRow>
                        <TreeRow depth={2} icon={<FolderOpen className="h-3.5 w-3.5 text-[#e5b567]" />}>
                            hello-world
                        </TreeRow>
                        <TreeRow depth={3} icon={<FileCode2 className="h-3.5 w-3.5 text-[#f78c6c]" />} active>
                            main.rs
                        </TreeRow>
                        <TreeRow depth={3} icon={<FileCode2 className="h-3.5 w-3.5 text-[var(--dim)]" />}>
                            Cargo.toml
                        </TreeRow>
                        <TreeRow depth={1} icon={<Folder className="h-3.5 w-3.5 text-[var(--dim)]" />}>
                            tests
                        </TreeRow>
                        <TreeRow depth={1} icon={<Folder className="h-3.5 w-3.5 text-[var(--dim)]" />}>
                            build
                        </TreeRow>
                        <TreeRow depth={1} icon={<FileCode2 className="h-3.5 w-3.5 text-[var(--dim)]" />}>
                            Makefile
                        </TreeRow>
                    </aside>

                    <div className="flex min-w-0 flex-col">
                        {/* tabs */}
                        <div className="cv-mono flex h-9 items-end border-b border-[var(--line)] bg-[#0e1014] text-[11.5px]">
                            <div className="flex h-full items-center gap-2 border-r border-[var(--line)] border-t-2 border-t-[var(--accent)] bg-[#0c0e11] px-4 text-[var(--text)]">
                                <FileCode2 className="h-3 w-3 text-[#f78c6c]" /> main.rs
                            </div>
                            <div className="flex h-full items-center gap-2 border-r border-[var(--line)] px-4 text-[var(--dim)]">
                                tests.rs
                            </div>
                        </div>

                        {/* editor */}
                        <div className="cv-mono overflow-x-auto py-3 text-[12px] leading-[1.7] sm:text-[12.5px]">
                            {lines.map((line, i) => (
                                <div key={i} className={`flex ${i === 14 ? 'bg-white/[0.03]' : ''}`}>
                                    <span className="w-11 shrink-0 select-none pr-4 text-right text-[#3b4048]">
                                        {i + 1}
                                    </span>
                                    <span className="whitespace-pre text-[#c8ccd4]">
                                        {highlight(line)}
                                        {i === 14 && (
                                            <span className="cv-caret ml-px inline-block h-[1.05em] w-[2px] translate-y-[3px] bg-[var(--accent)]" />
                                        )}
                                    </span>
                                </div>
                            ))}
                        </div>

                        {/* terminal */}
                        <div className="border-t border-[var(--line)] bg-[#0a0b0e]">
                            <div className="cv-mono flex h-8 items-center gap-5 border-b border-[var(--line)] px-4 text-[10.5px] uppercase tracking-[0.14em]">
                                <span className="text-[var(--text)]">Terminal</span>
                                <span className="text-[var(--dim)]">Tests</span>
                                <span className="text-[var(--dim)]">Build</span>
                            </div>
                            <div className="cv-mono h-[196px] overflow-hidden px-4 py-3 text-[11.5px] leading-[1.75]">
                                {TERMINAL.slice(0, shown).map((l, i) => (
                                    <div key={i} className="whitespace-pre">
                                        {l.kind === 'cmd' ? (
                                            <>
                                                <span className="text-[var(--accent)]">~/ckb-rust-script</span>
                                                <span className="text-[var(--dim)]"> $ </span>
                                                <span className="text-[var(--text)]">{l.text}</span>
                                            </>
                                        ) : (
                                            <span
                                                className={
                                                    l.kind === 'ok'
                                                        ? 'text-[#8fd6ae]'
                                                        : l.kind === 'dim'
                                                          ? 'text-[var(--dim)]'
                                                          : 'text-[#a9b0bb]'
                                                }
                                            >
                                                {l.text}
                                            </span>
                                        )}
                                    </div>
                                ))}
                                {shown >= TERMINAL.length && (
                                    <div>
                                        <span className="text-[var(--accent)]">~/ckb-rust-script</span>
                                        <span className="text-[var(--dim)]"> $ </span>
                                        <span className="cv-caret inline-block h-[1em] w-[7px] translate-y-[2px] bg-[var(--text)]/80" />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* status bar */}
                <div className="cv-mono flex h-7 items-center justify-between border-t border-[var(--line)] bg-[#0f1216] px-4 text-[10.5px] text-[var(--dim)]">
                    <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1.5 text-[var(--accent)]">
                            <Circle className="h-2 w-2 fill-current" /> runtime ready
                        </span>
                        <span className="hidden sm:inline">rust · riscv64imac</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <span>
                            {activeBlock > 0 ? `devnet block #${activeBlock.toLocaleString()}` : 'devnet'}
                        </span>
                        <span className="hidden sm:inline">Ln 15, Col 38</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

function TreeRow({
    depth,
    icon,
    children,
    active,
}: {
    depth: number;
    icon: ReactNode;
    children: ReactNode;
    active?: boolean;
}) {
    return (
        <div
            className={`flex items-center gap-2 py-[3px] pr-3 ${
                active ? 'bg-white/[0.05] text-[var(--text)]' : ''
            }`}
            style={{ paddingLeft: 16 + depth * 12 }}
        >
            {depth < 3 && children !== 'Makefile' ? (
                <ChevronRight className="h-3 w-3 rotate-90 text-[var(--dim)]" />
            ) : (
                <span className="w-3" />
            )}
            {icon}
            <span className="truncate">{children}</span>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function HomeView({ onStartBuilding, activeBlock }: HomeViewProps) {
    const reduce = useReducedMotion();

    return (
        <div id="top" className="cv-root min-h-screen bg-[var(--ink)] text-[var(--text)] antialiased">
            <style>{`
                .cv-root {
                    --ink: #0a0b0d;
                    --surface: #0f1114;
                    --text: #ecebe6;
                    --muted: #9a9ea6;
                    --dim: #62676f;
                    --line: rgba(255,255,255,0.07);
                    --line-strong: rgba(255,255,255,0.12);
                    --accent: #3cc68a;
                    --accent-hi: #5ad8a0;
                    font-family: 'Geist', ui-sans-serif, system-ui, sans-serif;
                    font-feature-settings: 'ss01', 'cv11';
                }
                .cv-root ::selection { background: rgba(60,198,138,0.3); }
                .cv-mono { font-family: 'Geist Mono', ui-monospace, SFMono-Regular, Menlo, monospace; }
                .cv-serif { font-family: 'Instrument Serif', ui-serif, Georgia, serif; font-weight: 400; }
                .cv-grid {
                    background-image:
                        linear-gradient(to right, rgba(255,255,255,0.045) 1px, transparent 1px),
                        linear-gradient(to bottom, rgba(255,255,255,0.045) 1px, transparent 1px);
                    background-size: 64px 64px;
                    mask-image: radial-gradient(ellipse 70% 60% at 50% 0%, #000 30%, transparent 75%);
                    -webkit-mask-image: radial-gradient(ellipse 70% 60% at 50% 0%, #000 30%, transparent 75%);
                }
                @keyframes cv-blink { 0%, 49% { opacity: 1 } 50%, 100% { opacity: 0 } }
                .cv-caret { animation: cv-blink 1.1s steps(1) infinite; }
                @media (prefers-reduced-motion: reduce) { .cv-caret { animation: none; } }
                html { scroll-behavior: smooth; }
            `}</style>

            <TopNav onStartBuilding={onStartBuilding} activeBlock={activeBlock} />

            <main>
                {/* ------------------------------------------------ HERO */}
                <section id="product" className="relative overflow-hidden">
                    <div className="cv-grid pointer-events-none absolute inset-0" />
                    <div className="pointer-events-none absolute left-1/2 top-0 h-px w-[min(900px,90%)] -translate-x-1/2 bg-gradient-to-r from-transparent via-[var(--accent)]/50 to-transparent" />

                    <div className="relative mx-auto max-w-[1280px] px-5 pb-24 pt-16 sm:px-8 sm:pt-24 lg:pb-32">
                        <motion.div
                            initial={reduce ? false : { opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6 }}
                        >
                            <a
                                href="#workflow"
                                className="cv-mono group inline-flex items-center gap-2.5 rounded-full border border-[var(--line-strong)] bg-white/[0.02] py-1 pl-1 pr-3 text-[11.5px] text-[var(--muted)] transition-colors hover:border-[var(--muted)]"
                            >
                                <span className="rounded-full bg-[var(--accent)]/15 px-2 py-0.5 text-[var(--accent)]">
                                    NEW
                                </span>
                                Cloud IDE for Nervos CKB scripts
                                <ChevronRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                            </a>
                        </motion.div>

                        <motion.h1
                            className="mt-8 max-w-[1100px] text-[2.75rem] font-medium leading-[1.02] tracking-[-0.045em] sm:text-[4rem] lg:text-[5.4rem]"
                            initial={reduce ? false : { opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
                        >
                            Write, test and ship CKB scripts{' '}
                            <span className="cv-serif italic tracking-[-0.02em] text-[var(--accent)]">
                                from a browser tab.
                            </span>
                        </motion.h1>

                        <motion.div
                            className="mt-10 flex flex-col gap-8 border-t border-[var(--line)] pt-8 lg:flex-row lg:items-center lg:justify-between"
                            initial={reduce ? false : { opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8, delay: 0.18, ease: [0.22, 1, 0.36, 1] }}
                        >
                            <p className="max-w-[560px] text-[16.5px] leading-[1.65] text-[var(--muted)]">
                                Corven gives every project its own Rust and RISC-V toolchain, a
                                real terminal and a private CKB devnet. There's nothing to install
                                and nothing to configure, and it works the same on every machine.
                            </p>
                            <div className="flex shrink-0 flex-wrap items-center gap-3">
                                <PrimaryButton onClick={onStartBuilding}>Start building</PrimaryButton>
                                <GhostLink href="#workflow">See the workflow</GhostLink>
                            </div>
                        </motion.div>

                        <motion.div
                            className="mt-20 sm:mt-24"
                            initial={reduce ? false : { opacity: 0, y: 40 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 1, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
                        >
                            <ProductShot activeBlock={activeBlock} />
                        </motion.div>
                    </div>
                </section>

                {/* ------------------------------------------------ SPEC STRIP */}
                <section className="border-y border-[var(--line)] bg-[var(--surface)]">
                    <div className="mx-auto grid max-w-[1280px] grid-cols-2 lg:grid-cols-4">
                        {SPECS.map((s, i) => (
                            <Reveal
                                key={s.label}
                                delay={i * 0.06}
                                className={`px-5 py-8 sm:px-8 ${
                                    i % 2 === 0 ? 'border-r' : ''
                                } ${i < 2 ? 'border-b lg:border-b-0' : ''} ${
                                    i === 1 ? 'lg:border-r' : ''
                                } border-[var(--line)]`}
                            >
                                <div className="cv-mono text-[10.5px] uppercase tracking-[0.18em] text-[var(--dim)]">
                                    {s.label}
                                </div>
                                <div className="mt-2 text-[20px] font-medium tracking-[-0.02em] sm:text-[22px]">
                                    {s.value}
                                </div>
                                <div className="cv-mono mt-1 text-[11.5px] text-[var(--muted)]">{s.note}</div>
                            </Reveal>
                        ))}
                    </div>
                </section>

                {/* ------------------------------------------------ WORKFLOW */}
                <section id="workflow" className="mx-auto max-w-[1280px] px-5 py-24 sm:px-8 lg:py-32">
                    <Reveal>
                        <Eyebrow index="01">Workflow</Eyebrow>
                        <h2 className="mt-6 max-w-[820px] text-[2.2rem] font-medium leading-[1.08] tracking-[-0.035em] sm:text-[3rem]">
                            From template to transaction,{' '}
                            <span className="cv-serif italic text-[var(--muted)]">without leaving the tab.</span>
                        </h2>
                    </Reveal>

                    <div className="mt-16 grid border-t border-[var(--line)] md:grid-cols-2 lg:grid-cols-4">
                        {STEPS.map((s, i) => (
                            <Reveal
                                key={s.n}
                                delay={i * 0.08}
                                className={`group relative border-b border-[var(--line)] py-8 md:px-6 lg:border-b-0 ${
                                    i > 0 ? 'lg:border-l' : ''
                                } ${i % 2 === 1 ? 'md:border-l lg:border-l' : ''} lg:first:pl-0`}
                            >
                                <div className="flex items-baseline justify-between">
                                    <span className="cv-mono text-[12px] text-[var(--accent)]">{s.n}</span>
                                    <span className="h-px w-10 bg-[var(--line-strong)] transition-all duration-500 group-hover:w-16 group-hover:bg-[var(--accent)]" />
                                </div>
                                <h3 className="mt-10 text-[22px] font-medium tracking-[-0.02em]">{s.title}</h3>
                                <p className="mt-3 text-[14.5px] leading-[1.65] text-[var(--muted)]">{s.body}</p>
                                <div className="cv-mono mt-6 truncate rounded border border-[var(--line)] bg-white/[0.02] px-3 py-2 text-[11.5px] text-[var(--dim)]">
                                    <span className="text-[var(--accent)]">›</span> {s.cmd}
                                </div>
                            </Reveal>
                        ))}
                    </div>
                </section>

                {/* ------------------------------------------------ PLATFORM (bento) */}
                <section id="platform" className="border-t border-[var(--line)] bg-[var(--surface)]">
                    <div className="mx-auto max-w-[1280px] px-5 py-24 sm:px-8 lg:py-32">
                        <Reveal className="grid gap-8 lg:grid-cols-[1fr_1fr] lg:items-end">
                            <div>
                                <Eyebrow index="02">Platform</Eyebrow>
                                <h2 className="mt-6 max-w-[560px] text-[2.2rem] font-medium leading-[1.08] tracking-[-0.035em] sm:text-[3rem]">
                                    Everything a CKB project needs,{' '}
                                    <span className="cv-serif italic text-[var(--muted)]">and nothing it doesn't.</span>
                                </h2>
                            </div>
                            <p className="max-w-[460px] text-[15.5px] leading-[1.7] text-[var(--muted)] lg:justify-self-end">
                                Each workspace runs in its own isolated container with its own
                                devnet, so a mistake in one project can't break another.
                            </p>
                        </Reveal>

                        <div className="mt-16 grid gap-px overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--line)] md:grid-cols-6">
                            <Tile
                                className="md:col-span-4"
                                icon={<TerminalSquare className="h-4 w-4" />}
                                label="Terminal"
                                title="A real shell, not a simulation"
                                body="A full terminal connected to your workspace runtime. Run cargo, make and git, and anything else you'd use locally."
                            >
                                <div className="cv-mono mt-8 rounded-lg border border-[var(--line)] bg-[#0a0b0e] p-4 text-[12px] leading-[1.8]">
                                    <div>
                                        <span className="text-[var(--accent)]">$</span> git checkout -b feat/timelock
                                    </div>
                                    <div className="text-[var(--dim)]">Switched to a new branch 'feat/timelock'</div>
                                    <div>
                                        <span className="text-[var(--accent)]">$</span> make generate CRATE=timelock
                                    </div>
                                    <div className="text-[#8fd6ae]">✓ contracts/timelock created</div>
                                </div>
                            </Tile>

                            <Tile
                                className="md:col-span-2"
                                icon={<TestTube2 className="h-4 w-4" />}
                                label="Tests"
                                title="Readable test results"
                                body="Test output is parsed into a clear pass/fail list, so you can find the failing case without scrolling through logs."
                            >
                                <div className="mt-8 space-y-2">
                                    {[
                                        ['test_valid_args', true],
                                        ['test_short_args', true],
                                        ['test_empty_witness', false],
                                    ].map(([name, ok]) => (
                                        <div
                                            key={name as string}
                                            className="cv-mono flex items-center justify-between rounded border border-[var(--line)] px-3 py-2 text-[11.5px]"
                                        >
                                            <span className="text-[var(--muted)]">{name as string}</span>
                                            <span className={ok ? 'text-[var(--accent)]' : 'text-[#f07178]'}>
                                                {ok ? 'pass' : 'fail'}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </Tile>

                            <Tile
                                className="md:col-span-2"
                                icon={<Boxes className="h-4 w-4" />}
                                label="Devnet"
                                title="A chain per workspace"
                                body="Every workspace gets its own CKB node, so your test state is never shared or reset by someone else."
                            />
                            <Tile
                                className="md:col-span-2"
                                icon={<Wallet className="h-4 w-4" />}
                                label="Identity"
                                title="Sign in with your CKB wallet"
                                body="Use a CKB wallet or email. Wallet sign-in works by signing a message, and no password is stored."
                            />
                            <Tile
                                className="md:col-span-2"
                                icon={<Bot className="h-4 w-4" />}
                                label="Assistant"
                                title="An AI pair that knows CKB"
                                body="Ask about ckb-std, the cell model or a failing script, right next to the file you're working on."
                            />

                            <Tile
                                className="md:col-span-6"
                                icon={<ShieldCheck className="h-4 w-4" />}
                                label="Isolation"
                                title="Locked-down containers by default"
                                body="Runtimes drop all Linux capabilities, can't escalate privileges, and have fixed CPU, memory and process limits. Your code runs in a sandbox built for untrusted builds."
                                wide
                            />
                        </div>
                    </div>
                </section>

                {/* ------------------------------------------------ COMPARE */}
                <section id="compare" className="mx-auto max-w-[1280px] px-5 py-24 sm:px-8 lg:py-32">
                    <Reveal>
                        <Eyebrow index="03">Setup</Eyebrow>
                        <h2 className="mt-6 max-w-[820px] text-[2.2rem] font-medium leading-[1.08] tracking-[-0.035em] sm:text-[3rem]">
                            Seven steps on your machine.{' '}
                            <span className="cv-serif italic text-[var(--accent)]">One on Corven.</span>
                        </h2>
                    </Reveal>

                    <div className="mt-14 grid gap-px overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--line)] lg:grid-cols-2">
                        <Reveal className="bg-[var(--ink)] p-6 sm:p-10">
                            <div className="cv-mono text-[11px] uppercase tracking-[0.18em] text-[var(--dim)]">
                                Local setup
                            </div>
                            <ol className="mt-6">
                                {LOCAL_SETUP.map((step, i) => (
                                    <li
                                        key={step}
                                        className="flex items-baseline gap-4 border-b border-[var(--line)] py-3.5 text-[15px] text-[var(--muted)] last:border-b-0"
                                    >
                                        <span className="cv-mono w-6 text-[11px] text-[var(--dim)]">
                                            {String(i + 1).padStart(2, '0')}
                                        </span>
                                        <span className={i === LOCAL_SETUP.length - 1 ? 'italic' : ''}>{step}</span>
                                    </li>
                                ))}
                            </ol>
                        </Reveal>

                        <Reveal delay={0.1} className="relative flex flex-col justify-between overflow-hidden bg-[var(--ink)] p-6 sm:p-10">
                            <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full border border-[var(--accent)]/15" />
                            <div className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full border border-[var(--accent)]/20" />
                            <div>
                                <div className="cv-mono text-[11px] uppercase tracking-[0.18em] text-[var(--accent)]">
                                    Corven
                                </div>
                                <div className="mt-6 flex items-baseline gap-4 border-b border-[var(--line)] py-3.5 text-[15px]">
                                    <span className="cv-mono w-6 text-[11px] text-[var(--accent)]">01</span>
                                    Open a workspace
                                </div>
                                <p className="mt-8 max-w-[380px] text-[15px] leading-[1.7] text-[var(--muted)]">
                                    The toolchain, templates, debugger and devnet are already there
                                    when your workspace opens.
                                </p>
                            </div>
                            <div className="mt-12">
                                <PrimaryButton onClick={onStartBuilding}>Open a workspace</PrimaryButton>
                            </div>
                        </Reveal>
                    </div>
                </section>

                {/* ------------------------------------------------ CTA */}
                <section className="relative overflow-hidden border-t border-[var(--line)]">
                    <div className="cv-grid pointer-events-none absolute inset-0 rotate-180" />
                    <div className="relative mx-auto max-w-[1280px] px-5 py-28 text-center sm:px-8 lg:py-40">
                        <Reveal>
                            <h2 className="mx-auto max-w-[900px] text-[2.6rem] font-medium leading-[1.02] tracking-[-0.045em] sm:text-[4.2rem]">
                                Your next script is
                                <br />
                                <span className="cv-serif italic text-[var(--accent)]">one tab away.</span>
                            </h2>
                            <p className="mx-auto mt-6 max-w-[480px] text-[16px] leading-[1.65] text-[var(--muted)]">
                                Sign in with a CKB wallet or email and open your first workspace.
                            </p>
                            <div className="mt-9 flex flex-wrap justify-center gap-3">
                                <PrimaryButton onClick={onStartBuilding}>Start building</PrimaryButton>
                                <GhostLink href="/donate">Support the project</GhostLink>
                            </div>
                        </Reveal>
                    </div>
                </section>
            </main>

            {/* ------------------------------------------------ FOOTER */}
            <footer className="border-t border-[var(--line)] bg-[var(--surface)]">
                <div className="mx-auto grid max-w-[1280px] gap-12 px-5 py-16 sm:px-8 md:grid-cols-[1.4fr_repeat(3,1fr)]">
                    <div>
                        <div className="flex items-center gap-2.5">
                            <img src={LOGO_URL} alt="" className="h-6 w-6 object-contain" />
                            <span className="text-[16px] font-semibold tracking-[-0.02em]">Corven</span>
                        </div>
                        <p className="mt-4 max-w-[280px] text-[14px] leading-[1.65] text-[var(--muted)]">
                            A cloud IDE for building on Nervos CKB.
                        </p>
                        <a
                            href="https://github.com/lestonEth"
                            target="_blank"
                            rel="noreferrer"
                            className="mt-6 inline-flex items-center gap-2 text-[13px] text-[var(--muted)] transition-colors hover:text-[var(--text)]"
                        >
                            <Github className="h-4 w-4" /> GitHub
                        </a>
                    </div>

                    {[
                        { h: 'Product', l: [['Workspaces', '#product'], ['Workflow', '#workflow'], ['Platform', '#platform'], ['Nodes', '/nodes']] },
                        { h: 'Resources', l: [['Documentation', '#'], ['CKB docs', 'https://docs.nervos.org'], ['Script templates', 'https://github.com/cryptape/ckb-script-templates'], ['Changelog', '#']] },
                        { h: 'Project', l: [['Support Corven', '/donate'], ['Feedback', '#'], ['Privacy', '#'], ['Terms', '#']] },
                    ].map((col) => (
                        <div key={col.h}>
                            <div className="cv-mono text-[10.5px] uppercase tracking-[0.18em] text-[var(--dim)]">
                                {col.h}
                            </div>
                            <ul className="mt-5 space-y-3">
                                {col.l.map(([label, href]) => (
                                    <li key={label}>
                                        <a
                                            href={href}
                                            {...(href.startsWith('http') ? { target: '_blank', rel: 'noreferrer' } : {})}
                                            className="text-[14px] text-[var(--muted)] transition-colors hover:text-[var(--text)]"
                                        >
                                            {label}
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>

                <div className="border-t border-[var(--line)]">
                    <div className="cv-mono mx-auto flex max-w-[1280px] flex-col justify-between gap-3 px-5 py-6 text-[11px] text-[var(--dim)] sm:flex-row sm:px-8">
                        <span>© {new Date().getFullYear()} Corven. All rights reserved.</span>
                        <BlockIndicator block={activeBlock} />
                    </div>
                </div>
            </footer>
        </div>
    );
}

function Tile({
    icon,
    label,
    title,
    body,
    className = '',
    wide,
    children,
}: {
    icon: ReactNode;
    label: string;
    title: string;
    body: string;
    className?: string;
    wide?: boolean;
    children?: ReactNode;
}) {
    return (
        <div
            className={`group relative bg-[var(--ink)] p-6 transition-colors duration-300 hover:bg-[#0d0f12] sm:p-8 ${className}`}
        >
            <div className={wide ? 'grid gap-6 md:grid-cols-[1fr_1.4fr] md:items-end' : ''}>
                <div>
                    <div className="cv-mono flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-[var(--dim)]">
                        <span className="flex h-7 w-7 items-center justify-center rounded-md border border-[var(--line-strong)] text-[var(--muted)] transition-colors group-hover:border-[var(--accent)]/50 group-hover:text-[var(--accent)]">
                            {icon}
                        </span>
                        {label}
                    </div>
                    <h3 className="mt-6 text-[19px] font-medium tracking-[-0.02em]">{title}</h3>
                </div>
                <p className={`text-[14.5px] leading-[1.65] text-[var(--muted)] ${wide ? '' : 'mt-3'}`}>{body}</p>
            </div>
            {children}
        </div>
    );
}
