import { notFound } from "next/navigation";
import { getDictionary, hasLocale } from "@/i18n/config";
import { Nav } from "@/components/nav";
import { Hero } from "@/components/hero";
import { BigNumbers } from "@/components/big-numbers";
import { Footer } from "@/components/footer";

export default async function HomePage({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();

  const dict = await getDictionary(lang);

  return (
    <>
      <Nav locale={lang} nav={dict.nav} themes={dict.themes} />
      <main>
        <Hero labels={dict.hero} cardLabels={dict.card} />
        <BigNumbers labels={dict.bigNumbers} />
      </main>
      <Footer labels={dict.footer} socials={dict.social} />
    </>
  );
}
