import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDictionary, hasLocale } from "@/i18n/config";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { ChatPanel } from "@/components/chat/chat-panel";

export const metadata: Metadata = {
  title: "Chat with maarkn",
  description: "Ask the maarkn.dev assistant anything about Marco's work, stack and availability.",
};

export default async function ChatPage({ params }: PageProps<"/[lang]/chat">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();

  const dict = await getDictionary(lang);

  return (
    <>
      <Nav locale={lang} nav={dict.nav} themes={dict.themes} />
      <main className="border-t border-[var(--border)]">
        <section className="mx-auto w-full max-w-[860px] px-6 pt-32 pb-12 md:px-12 md:pt-40">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--accent)]">
            {dict.chat.kicker}
          </p>
          <h1 className="mt-3 font-display text-[clamp(2.2rem,4vw,3.6rem)] font-bold leading-[1.05] tracking-[-0.03em] text-[var(--text)]">
            {dict.chat.title}
          </h1>
          <p className="mt-5 max-w-2xl text-[1.02rem] font-light leading-[1.75] text-[var(--text-2)]">
            {dict.chat.sub}
          </p>
        </section>

        <section className="mx-auto w-full max-w-[860px] px-6 pb-32 md:px-12">
          <ChatPanel labels={dict.chat.panel} locale={lang} variant="page" />
        </section>
      </main>
      <Footer labels={dict.footer} socials={dict.social} />
    </>
  );
}
