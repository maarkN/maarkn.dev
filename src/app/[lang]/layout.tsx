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
import { getDictionary, hasLocale, locales, type Locale } from "@/i18n/config";

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

export const metadata: Metadata = {
  metadataBase: new URL("https://maarkn.dev"),
  title: {
    default: "Marco Filho · Senior Fullstack Engineer · maarkn.dev",
    template: "%s · maarkn.dev",
  },
  description:
    "I help companies turn ideas into clean, fast and reliable digital products. Senior fullstack engineer with 6 years of experience, working remotely from Brazil.",
  openGraph: {
    title: "Marco Filho · Senior Fullstack Engineer",
    description:
      "I help companies turn ideas into clean, fast and reliable digital products.",
    url: "https://maarkn.dev",
    siteName: "maarkn.dev",
    type: "website",
  },
  twitter: { card: "summary_large_image" },
  icons: { icon: "/favicon.ico" },
};

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
