import { notFound, redirect } from "next/navigation";
import { hasLocale } from "@/i18n/config";

/**
 * The chat page is gone: the assistant lives in the terminal as `ask`.
 * Old links land on the home with the command already typed in the prompt.
 */
export default async function ChatRedirect({ params }: PageProps<"/[lang]/chat">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  redirect(`/${lang}?cmd=ask`);
}
