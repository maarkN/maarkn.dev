import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { dbConfigured } from "@/lib/db";
import { LoginForm } from "@/components/admin/login-form";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) redirect("/admin");

  return (
    <main className="relative isolate flex min-h-dvh items-center justify-center px-6 py-24">
      <div className="bg-grid pointer-events-none absolute inset-0 -z-10" aria-hidden />
      <span
        className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-20 blur-[120px]"
        style={{ background: "var(--accent)" }}
        aria-hidden
      />

      <div className="w-full max-w-[400px] border border-[var(--border)] bg-[var(--surface)] p-8">
        <div className="mb-8">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--accent)]">
            maarkn.dev
          </p>
          <h1 className="mt-2 font-display text-[1.4rem] font-bold tracking-tight text-[var(--text)]">
            Admin sign in
          </h1>
          <p className="mt-2 text-sm font-light text-[var(--muted)]">
            Use the credentials seeded into the database.
          </p>
        </div>

        {!dbConfigured ? (
          <div className="border border-[var(--red)]/40 bg-[var(--red)]/10 p-3 font-mono text-[11px] tracking-[0.04em] text-[var(--red)]">
            DATABASE_URL is not set. Configure Postgres before signing in.
          </div>
        ) : (
          <LoginForm />
        )}
      </div>
    </main>
  );
}
