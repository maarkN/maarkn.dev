import type { Metadata } from "next";
import "../globals.css";
import "../site.css";
import "./admin.css";
import { AdminLocaleProvider } from "@/components/admin/admin-locale";
import { SiteThemeSync } from "@/components/site-theme";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { getAdminDictionary } from "@/i18n/config";
import { UNTRANSLATED } from "@/lib/admin/locale";
import { getAdminLabels, getAdminSettings } from "@/lib/admin/request";
import { siteThemeBootScript } from "@/lib/site-theme";
import { caskaydia } from "../fonts";
import { siteFontVars } from "../site-fonts";

export async function generateMetadata(): Promise<Metadata> {
  const { meta } = await getAdminLabels();
  return { title: meta.title, robots: { index: false, follow: false } };
}

/**
 * Root layout of the backoffice, apart from the site's `[lang]` one. It has the
 * theme of the site, by the same script and the same saved choice, and nothing of
 * the CLI version: its palette and its font stay where they are.
 *
 * Language and time zone are resolved here, on the server, and go to the browser
 * as data (`AdminLocaleProvider`), so that the two never disagree about a date.
 */
export default async function AdminRootLayout({ children }: { children: React.ReactNode }) {
  const [{ locale, timeZone }, labels, untranslated] = await Promise.all([
    getAdminSettings(),
    getAdminLabels(),
    getAdminDictionary(UNTRANSLATED),
  ]);

  return (
    <html lang={locale} suppressHydrationWarning className={caskaydia.variable}>
      <body className={`site-root admin-root ${siteFontVars} min-h-dvh antialiased`}>
        {/* A plain <script>, not next/script: the parser runs it before it paints
            anything (see src/app/[lang]/layout.tsx). */}
        <script id="theme-boot" dangerouslySetInnerHTML={{ __html: siteThemeBootScript }} />
        <SiteThemeSync />
        <AdminLocaleProvider
          locale={locale}
          timeZone={timeZone}
          // The shared words of the screens, and of the ones still in Portuguese.
          common={{ [UNTRANSLATED]: untranslated.common, [locale]: labels.common }}
        >
          <TooltipProvider>{children}</TooltipProvider>
          {/* A8: the only one. Each notice says the language of its own words
              (`useNotify`), which is the screen's. */}
          <Toaster containerAriaLabel={labels.shell.notices} />
        </AdminLocaleProvider>
      </body>
    </html>
  );
}
