import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Space_Grotesk } from "next/font/google";
import { notFound } from "next/navigation";
import Script from "next/script";
import "../globals.css";
import { ThemeProvider, themeBootScript } from "@/components/theme-provider";
import { ChatLauncher } from "@/components/chat/chat-launcher";
import { DevMarqueeStrip } from "@/components/dev/marquee-strip";
import { ConsoleEgg } from "@/components/dev/console-egg";
import { KonamiEgg } from "@/components/dev/konami-egg";
import { getDictionary, hasLocale, locales, defaultLocale, type Locale } from "@/i18n/config";
import {
  SITE_URL,
  SITE_NAME,
  AUTHOR,
  KEYWORDS,
  seoByLocale,
  websiteLd,
  personLd,
} from "@/lib/seo";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

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
      icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
      shortcut: "/icon.svg",
      apple: "/icon.svg",
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

  const dict = await getDictionary(lang);
  const fontVars = `${inter.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable}`;

  return (
    <html
      lang={lang as Locale}
      data-theme="dark"
      suppressHydrationWarning
      className={fontVars}
    >
      <body className="min-h-dvh font-sans antialiased">
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
          <DevMarqueeStrip />
          {children}
          <ChatLauncher
            labels={dict.chat.panel}
            locale={lang}
            buttonLabel={dict.chat.buttonLabel}
          />
          <KonamiEgg />
          <ConsoleEgg />
        </ThemeProvider>
      </body>
    </html>
  );
}
