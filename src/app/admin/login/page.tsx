import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Terminal } from "lucide-react";
import { auth } from "@/lib/auth";
import { dbConfigured } from "@/lib/db";
import { LoginForm } from "@/components/admin/login-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Entrar · admin · maarkn.dev",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) redirect("/admin");

  return (
    <main className="relative isolate flex min-h-dvh items-center justify-center bg-background px-6 py-24">
      <div className="bg-grid pointer-events-none absolute inset-0 -z-10" aria-hidden />
      <span
        className="pointer-events-none absolute left-1/2 top-1/2 -z-10 size-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand opacity-20 blur-[120px]"
        aria-hidden
      />

      <Card className="w-full max-w-[400px]">
        <CardHeader>
          <div className="mb-2 flex items-center gap-2">
            <Terminal className="size-5 text-primary" />
            <span className="font-display font-semibold tracking-tight">
              maarkn<span className="text-brand">.dev</span>
            </span>
          </div>
          <CardTitle className="text-lg">Entrar no backoffice</CardTitle>
          <CardDescription>
            Acesso restrito ao administrador. A troca de senha fica em
            Configurações, depois de entrar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {dbConfigured ? (
            <LoginForm />
          ) : (
            <p className="text-destructive">
              DATABASE_URL não está definida. Configure o Postgres antes de
              entrar.
            </p>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
