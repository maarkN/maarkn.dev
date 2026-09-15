import type { Metadata } from "next";
import "../globals.css";
import "./admin.css";
import { caskaydia } from "../fonts";

export const metadata: Metadata = {
  title: "Admin · maarkn.dev",
  robots: { index: false, follow: false },
};

/**
 * Admin root layout. Independent from the public `[lang]` layout: the palette
 * is pinned to `soft` server-side and no theme boot script or provider runs,
 * so a visitor's saved `classic` preference never reaches `/admin/**`.
 */
export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="soft" data-font="caskaydia" className={caskaydia.variable}>
      <body className="admin-root min-h-dvh antialiased">{children}</body>
    </html>
  );
}
