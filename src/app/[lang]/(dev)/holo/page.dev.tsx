import { Reference } from "./reference";

/** The hologram reference: every primitive, every state, one page. Not a public screen. */
export default async function HoloPage({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  return <Reference lang={lang} />;
}
