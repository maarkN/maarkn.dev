import type { Metadata } from "next";
import "../globals.css";
import "./admin.css";
import { caskaydia } from "../fonts";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

export const metadata: Metadata = {
  title: "Admin · maarkn.dev",
  robots: { index: false, follow: false },
};

/**
 * Admin root layout. Independent from the public `[lang]` layout: the palette
 * is pinned to `soft` server-side and no theme boot script or provider runs,
 * so a visitor's saved `classic` preference never reaches `/admin/**`.
 *
 * The two providers below are the only thing the backoffice adds on top of
 * that: `TooltipProvider` (the shadcn primitives expect one in scope) and
 * sonner's `Toaster`, which every Server Action in the backoffice writes to.
 * The admin palette is pinned server-side, so sonner's own theme is pinned
 * too instead of being read from `next-themes` — there is no provider here.
 */
export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="soft" data-font="caskaydia" className={caskaydia.variable}>
      <body className="admin-root min-h-dvh antialiased">
        <TooltipProvider>{children}</TooltipProvider>
        {/* Posição, tema e marcadores vivem no próprio componente (bko-04):
            o toast é uma linha de saída, e `richColors` foi retirado porque
            tingia o cartão inteiro. */}
        <Toaster />
      </body>
    </html>
  );
}
