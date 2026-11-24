import type { Metadata } from "next";
import { SiteThemeSync } from "@/components/site-theme";
import { siteFontVars } from "../../site-fonts";
import "../../site.css";

export const metadata: Metadata = {
  title: "Holo",
  robots: { index: false, follow: false },
};

/** Internal pages, dressed as the site will be. Never part of production: see `pageExtensions` in next.config.ts. */
export default function DevLayout({ children }: LayoutProps<"/[lang]">) {
  return (
    <div className={`site-root ${siteFontVars}`}>
      <SiteThemeSync />
      {children}
    </div>
  );
}
