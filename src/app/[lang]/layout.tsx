import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import Script from "next/script";
import "../globals.css";
import { fontVars } from "../fonts";
import { ThemeProvider, themeBootScript } from "@/components/theme-provider";
import { ConsoleEgg } from "@/components/dev/console-egg";
import { hasLocale, locales, defaultLocale, type Locale } from "@/i18n/config";
import {
  SITE_URL,
  SITE_NAME,
  AUTHOR,
  KEYWORDS,
  seoByLocale,
  websiteLd,
  personLd,
} from "@/lib/seo";

export const viewport: Viewport = {
  themeColor: "#282A36",
  colorScheme: "dark",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const l: Locale = hasLocale(lang) ? lang : defaultLocale;
  const { title, description, ogLocale } = seoByLocale[l];

  return {
    metadataBase: new URL(SITE_URL),
    title: { default: title, template: "%s · maarkn.dev" },
    description,
    applicationName: SITE_NAME,
    authors: [{ name: AUTHOR, url: SITE_URL }],
    creator: AUTHOR,
    publisher: AUTHOR,
    keywords: KEYWORDS,
    category: "technology",
    formatDetection: { email: false, telephone: false, address: false },
    icons: {
      icon: [
        { url: "/favicon/favicon.ico", sizes: "48x48" },
        { url: "/favicon/favicon.svg", type: "image/svg+xml" },
        { url: "/favicon/favicon-16x16.png", type: "image/png", sizes: "16x16" },
        { url: "/favicon/favicon-32x32.png", type: "image/png", sizes: "32x32" },
      ],
      apple: [{ url: "/favicon/apple-touch-icon.png", sizes: "180x180" }],
    },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      title,
      description,
      url: `/${l}`,
      locale: ogLocale,
      alternateLocale: l === "en" ? ["pt_BR"] : ["en_US"],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      creator: "@maarkn",
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
  };
}

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export default async function LocaleLayout({
  children,
  params,
}: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();

  return (
    <html
      lang={lang as Locale}
      data-theme="soft"
      data-font="caskaydia"
      suppressHydrationWarning
      className={fontVars}
    >
      <body className="min-h-dvh antialiased">
        <Script id="theme-boot" strategy="beforeInteractive">
          {themeBootScript}
        </Script>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify([websiteLd(), personLd(lang as Locale)]),
          }}
        />
        <ThemeProvider>
          {children}
          <ConsoleEgg />
        </ThemeProvider>
      </body>
    </html>
  );
}
