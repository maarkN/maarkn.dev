import { notFound } from "next/navigation";
import { getDictionary, hasLocale } from "@/i18n/config";
import { PageChrome } from "@/components/terminal/page-chrome";
import { PageFooter } from "@/components/terminal/page-footer";
import "@/components/terminal/prose.css";

/**
 * Inner pages (`/projects`, `/career`, `/blog`, `/links`): files opened in the
 * same terminal. The chrome (status bar with the path, `ps1 + command`
 * breadcrumb, `cd ..`, footer) is applied once here; pages only render their
 * content. The document scrolls normally — only the terminal route locks it.
 */
export default async function PagesLayout({ children, params }: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();

  const dict = await getDictionary(lang);
  const pages = dict.terminal.pages;

  return (
    <PageChrome
      labels={dict.terminal.bar}
      a11y={dict.terminal.a11y}
      backLabel={pages.back}
      footer={<PageFooter label={pages.footer} />}
    >
      {children}
    </PageChrome>
  );
}
