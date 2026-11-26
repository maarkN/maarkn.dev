import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";
import { PageHeader } from "@/components/admin/page-header";
import { StateMessage } from "@/components/admin/table-pager";
import { auth } from "@/lib/auth";
import { dbConfigured } from "@/lib/db";
import { getAdminLabels, getAdminSettings } from "@/lib/admin/request";
import { timeZones } from "@/lib/admin/time-zone";
import { PasswordForm } from "./password-form";
import { TimeZoneForm } from "./time-zone-form";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export const dynamic = "force-dynamic";

/** The account of the backoffice, its time zone and its password. */
export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/admin/login"); // A1

  const email = session.user.email ?? "admin";
  const [{ timeZone }, { settings: words, timeZone: zone }] = await Promise.all([getAdminSettings(), getAdminLabels()]);
  const role = (session.user as { role?: string }).role ?? "admin";

  return (
    <AdminShell email={email} translated>
      <div className="max-w-3xl space-y-10 font-text">
        <PageHeader title={words.title} description={words.description} />

        <Section title={words.account.title} description={words.account.description}>
          <dl className="grid grid-cols-[6rem_1fr] gap-y-2">
            <dt className="text-muted-foreground">{words.account.email}</dt>
            <dd className="font-label text-sm">{email}</dd>
            <dt className="text-muted-foreground">{words.account.role}</dt>
            <dd className="font-label text-sm">{role}</dd>
          </dl>
        </Section>

        <Section title={zone.title} description={zone.description}>
          <TimeZoneForm key={timeZone} current={timeZone} zones={timeZones()} labels={zone} />
        </Section>

        <Section title={words.password.title} description={words.password.description}>
          {dbConfigured ? (
            <PasswordForm words={words.password} />
          ) : (
            <StateMessage state="failed" message={words.password.noDatabase} />
          )}
        </Section>
      </div>
    </AdminShell>
  );
}

/** A part of the settings: content, so solid, with its heading. */
function Section({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4 border-t border-border pt-6">
      <div className="space-y-1">
        <h2 className="font-title text-2xl font-[560] [font-stretch:108%]">{title}</h2>
        <p className="max-w-[64ch] text-muted-foreground">{description}</p>
      </div>
      {children}
    </section>
  );
}
