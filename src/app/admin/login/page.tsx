import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { dbConfigured } from "@/lib/db";
import { LoginForm } from "@/components/admin/login-form";
import s from "@/components/admin/terminal/admin-chrome.module.css";

export const metadata: Metadata = {
  title: "Entrar · admin · maarkn.dev",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * The console you get before there is a session: no status bar, no directory
 * tree, no `cd ..` — there is nothing to navigate to yet, and a menu on a
 * login screen is noise. Just the tty banner and the two prompts.
 */
export default async function LoginPage() {
  const session = await auth();
  if (session?.user) redirect("/admin");

  return (
    <main className={s.tty}>
      <div className={s.ttyInner}>
        <p className={s.ttyBanner} lang="en">
          <span className={s.ttyHost}>maarkn.dev</span> tty1
        </p>

        {dbConfigured ? (
          <LoginForm />
        ) : (
          <p className={s.ttyOut}>
            DATABASE_URL não está definida. Configure o Postgres antes de entrar.
          </p>
        )}

        <p className={s.ttyNote}>
          {"# acesso restrito ao administrador · a troca de senha fica em "}
          {"~/admin/settings, depois de entrar"}
        </p>
      </div>
    </main>
  );
}
