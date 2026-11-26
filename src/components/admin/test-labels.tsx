import type { ReactNode } from "react";
import en from "@/dictionaries/en.json";
import ptBR from "@/dictionaries/pt-BR.json";
import type { AdminLocale } from "@/lib/admin/locale";
import { AdminLocaleProvider } from "./admin-locale";

/** For tests: the backoffice's words, as the layout gives them. */
export const ADMIN_WORDS = { en: en.admin, "pt-BR": ptBR.admin } as const;

/** A screen inside the provider of the layout, with the shared words of both languages. */
export function WithAdminWords({ locale = "pt-BR", children }: { locale?: AdminLocale; children: ReactNode }) {
  return (
    <AdminLocaleProvider
      locale={locale}
      timeZone="America/Sao_Paulo"
      common={{ "pt-BR": ptBR.admin.common, [locale]: ADMIN_WORDS[locale].common }}
    >
      {children}
    </AdminLocaleProvider>
  );
}
