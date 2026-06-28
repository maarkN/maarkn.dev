import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { AdminShell } from "@/components/admin/admin-shell";
import { GeneratorForm } from "@/components/admin/generator-form";

export const metadata: Metadata = {
  title: "Generator · admin · maarkn.dev",
  robots: { index: false, follow: false },
};

export default async function GeneratorPage() {
  const session = await auth();
  if (!session?.user) redirect("/admin/login");

  const recent = await db.generation.findMany({
    orderBy: { createdAt: "desc" },
    take: 12,
    select: {
      id: true,
      company: true,
      roleTitle: true,
      language: true,
      createdAt: true,
    },
  });

  return (
    <AdminShell email={session.user.email ?? ""}>
      <div className="mx-auto max-w-5xl">
        <header className="mb-8">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--accent)]">
            Application generator
          </p>
          <h1 className="mt-2 font-display text-2xl font-bold tracking-tight text-[var(--text)]">
            Résumé + cover letter from a job post
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">
            Paste a job description. It pulls the most relevant slices of your real
            CV and dossiers (RAG) and drafts a tailored résumé, cover letter and
            screening answers — grounded in your own material, never invented.
          </p>
        </header>

        <GeneratorForm />

        <section className="mt-12">
          <h2 className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">
            Recent generations
          </h2>
          {recent.length === 0 ? (
            <p className="mt-3 text-sm text-[var(--muted)]">Nothing generated yet.</p>
          ) : (
            <ul className="mt-3 divide-y divide-[var(--border)] border border-[var(--border)]">
              {recent.map((g) => (
                <li key={g.id}>
                  <Link
                    href={`/admin/generator/${g.id}`}
                    className="flex items-center justify-between gap-4 px-4 py-3 transition-colors hover:bg-[var(--surface)]"
                  >
                    <span className="text-sm text-[var(--text)]">
                      {g.roleTitle || "Untitled role"}
                      {g.company ? ` · ${g.company}` : ""}
                    </span>
                    <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--muted)]">
                      {g.language} · {g.createdAt.toISOString().slice(0, 10)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </AdminShell>
  );
}
