import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { dbConfigured } from "@/lib/db";
import { PageHeader } from "@/components/admin/page-header";
import { AdminShell } from "@/components/admin/admin-shell";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PasswordForm } from "./password-form";

export const metadata: Metadata = {
  title: "Configurações · admin · maarkn.dev",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/admin/login"); // A1

  const email = session.user.email ?? "admin";
  const role = (session.user as { role?: string }).role ?? "admin";

  return (
    <AdminShell email={email}>
      <div className="space-y-4">
        <PageHeader
          title="Configurações"
          description="Conta do painel. O acesso é único: só existe o usuário administrador criado pelo seed."
        />

        <Card>
          <CardHeader>
            <CardTitle>Conta</CardTitle>
            <CardDescription>
              Identidade usada para entrar no backoffice.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex flex-wrap items-baseline gap-2">
              <span className="w-20 shrink-0 text-muted-foreground">
                E-mail
              </span>
              <span className="font-mono text-xs">{email}</span>
            </div>
            <div className="flex flex-wrap items-baseline gap-2">
              <span className="w-20 shrink-0 text-muted-foreground">Papel</span>
              <span className="font-mono text-xs">{role}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Trocar senha</CardTitle>
            <CardDescription>
              A senha atual é reconferida no servidor antes da troca — uma sessão
              válida sozinha não basta. A nova senha é regravada com bcrypt de
              custo 12, o mesmo do seed.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {dbConfigured ? (
              <PasswordForm />
            ) : (
              <p className="text-destructive">
                DATABASE_URL não está definida — a troca de senha fica
                indisponível.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminShell>
  );
}
