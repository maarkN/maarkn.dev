import type { Metadata } from "next";
import "../globals.css";
import { fontVars } from "../fonts";
import { ThemeProvider, themeBootScript } from "@/components/theme-provider";

export const metadata: Metadata = {
  title: "Admin · maarkn.dev",
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="soft" data-font="caskaydia" suppressHydrationWarning className={fontVars}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body className="min-h-dvh bg-[var(--bg)] antialiased">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
