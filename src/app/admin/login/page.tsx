import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/admin/login-form";
import styles from "@/components/admin/login.module.css";
import { HoloWindow } from "@/components/holo/window";
import { Mark } from "@/components/site/icons";
import { getAdminLabels } from "@/lib/admin/request";
import { auth } from "@/lib/auth";
import { dbConfigured } from "@/lib/db";

export async function generateMetadata(): Promise<Metadata> {
  const { meta } = await getAdminLabels();
  return { title: meta.login, robots: { index: false, follow: false } };
}

export const dynamic = "force-dynamic";

/** One window, and no navigation: there is nowhere to go before there is a session. */
export default async function LoginPage() {
  const session = await auth();
  if (session?.user) redirect("/admin");
  const { login } = await getAdminLabels();

  return (
    <main className={styles.page}>
      <div className={styles.column}>
        <p className={styles.brand}>
          <Mark />
          <span>
            <strong>maarkn</strong>.dev
          </span>
        </p>
        <HoloWindow title={login.title} className={styles.window}>
          <p className={styles.lead}>{login.lead}</p>
          {dbConfigured ? <LoginForm labels={login} /> : <p>{login.noDatabase}</p>}
        </HoloWindow>
      </div>
    </main>
  );
}
