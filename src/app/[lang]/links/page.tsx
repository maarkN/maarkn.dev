import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDictionary, hasLocale } from "@/i18n/config";
import { LinksHub } from "@/components/links-hub";

export const metadata: Metadata = {
  title: "Links",
  description: "All the ways to find and reach Marco Filho on the internet.",
};

export default async function LinksPage({ params }: PageProps<"/[lang]/links">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();

  const dict = await getDictionary(lang);
  return <LinksHub labels={dict.links} />;
}
