// src/pages/ConnectDocsPage.tsx
//
// Corven Connect docs: /connect/docs/:slug. Public, no sign-in needed.

import { useEffect } from 'react';
import { Link, Navigate, NavLink, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight } from 'lucide-react';

import { DOC_GROUPS, DOCS, findDoc } from '../features/connect/docs/pages';
import { slugify } from '../features/connect/docs/primitives';

export default function ConnectDocsPage() {
    const { slug } = useParams();
    const navigate = useNavigate();
    const doc = findDoc(slug);

    useEffect(() => {
        if (!doc) return;
        document.title = `${doc.title} · Corven Connect docs`;
        if (!window.location.hash) window.scrollTo({ top: 0 });
    }, [doc]);

    if (!doc) return <Navigate to="/connect/docs" replace />;

    const index = DOCS.indexOf(doc);
    const prev = DOCS[index - 1];
    const next = DOCS[index + 1];

    return (
        <div className="mx-auto flex w-full max-w-7xl gap-10 px-4 py-8 sm:px-6 lg:py-12">
            {/* Sidebar */}
            <aside className="hidden w-56 shrink-0 lg:block">
                <nav className="sticky top-24 flex flex-col gap-6" aria-label="Docs">
                    {DOC_GROUPS.map((group) => (
                        <div key={group}>
                            <div className="mb-2 px-2 font-mono text-[10.5px] uppercase tracking-[0.14em] text-on-surface-variant/70">{group}</div>
                            <ul className="flex flex-col gap-0.5">
                                {DOCS.filter((d) => d.group === group).map((d) => (
                                    <li key={d.slug}>
                                        <NavLink
                                            to={`/connect/docs/${d.slug}`}
                                            className={() =>
                                                `block rounded-lg px-2 py-1.5 text-[13.5px] transition-colors ${
                                                    d.slug === doc.slug
                                                        ? 'bg-primary/10 font-medium text-primary'
                                                        : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                                                }`
                                            }
                                        >
                                            {d.title}
                                        </NavLink>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </nav>
            </aside>

            {/* Content */}
            <article className="min-w-0 flex-1 max-w-3xl">
                <label className="mb-6 block lg:hidden">
                    <span className="sr-only">Docs page</span>
                    <select
                        value={doc.slug}
                        onChange={(e) => navigate(`/connect/docs/${e.target.value}`)}
                        className="w-full rounded-lg border border-outline-variant/40 bg-surface-container px-3 py-2 text-[14px] text-on-surface"
                    >
                        {DOC_GROUPS.map((group) => (
                            <optgroup key={group} label={group}>
                                {DOCS.filter((d) => d.group === group).map((d) => (
                                    <option key={d.slug} value={d.slug}>
                                        {d.title}
                                    </option>
                                ))}
                            </optgroup>
                        ))}
                    </select>
                </label>

                <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-primary">{doc.group}</div>
                <h1 className="mt-2 text-[30px] font-semibold tracking-[-0.025em] text-on-surface">{doc.title}</h1>
                <p className="mt-2 text-[16px] text-on-surface-variant">{doc.summary}</p>

                <div className="mt-8 border-t border-outline-variant/30 pt-8">{doc.body}</div>

                <div className="mt-16 grid gap-3 border-t border-outline-variant/30 pt-6 sm:grid-cols-2">
                    {prev ? (
                        <Link to={`/connect/docs/${prev.slug}`} className="group rounded-xl border border-outline-variant/30 p-4 transition-colors hover:border-primary/40">
                            <div className="flex items-center gap-1 text-[12px] text-on-surface-variant">
                                <ArrowLeft className="h-3.5 w-3.5" /> Previous
                            </div>
                            <div className="mt-1 text-[14.5px] font-medium text-on-surface group-hover:text-primary">{prev.title}</div>
                        </Link>
                    ) : (
                        <span />
                    )}
                    {next && (
                        <Link to={`/connect/docs/${next.slug}`} className="group rounded-xl border border-outline-variant/30 p-4 text-right transition-colors hover:border-primary/40">
                            <div className="flex items-center justify-end gap-1 text-[12px] text-on-surface-variant">
                                Next <ArrowRight className="h-3.5 w-3.5" />
                            </div>
                            <div className="mt-1 text-[14.5px] font-medium text-on-surface group-hover:text-primary">{next.title}</div>
                        </Link>
                    )}
                </div>
            </article>

            {/* On this page */}
            <aside className="hidden w-48 shrink-0 xl:block">
                <div className="sticky top-24">
                    <div className="mb-2 font-mono text-[10.5px] uppercase tracking-[0.14em] text-on-surface-variant/70">On this page</div>
                    <ul className="flex flex-col gap-1.5 border-l border-outline-variant/30 pl-3">
                        {doc.sections.map((s) => (
                            <li key={s}>
                                <a href={`#${slugify(s)}`} className="text-[12.5px] text-on-surface-variant hover:text-on-surface">
                                    {s}
                                </a>
                            </li>
                        ))}
                    </ul>
                </div>
            </aside>
        </div>
    );
}
