import { whoamiLines } from "@/lib/terminal/content-commands";
import type { OutputLine, TerminalData } from "@/lib/terminal/types";
import { site } from "@/lib/site";
import { A, D } from "./primitives";
import type { TerminalLabels } from "./types";

/*
 * The output the home already shows when the HTML arrives — before (or
 * without) JavaScript: what `whoami` prints, followed by a sitemap line with
 * the inner routes and the external profiles. It is rendered on the server
 * and handed to the shell as `initialLines`, so the hydrated terminal keeps
 * it as the first result of the session instead of painting it twice.
 */

const INNER_ROUTES = ["projects", "career", "blog", "links"] as const;

/** One dim comment line: `# projects · career · … · github`. Server-safe. */
function Sitemap({ locale }: { locale: string }) {
  const cvFile = site.cvPath.split("/").pop() ?? site.cvPath;
  return (
    <nav aria-label="sitemap">
      <D>
        {"# "}
        {INNER_ROUTES.map((route) => (
          <span key={route}>
            <A href={`/${locale}/${route}`} quiet>
              {route}
            </A>
            {" · "}
          </span>
        ))}
        <A href={site.cvPath} quiet external>
          {cvFile}
        </A>
        {" · "}
        <A href={site.social.linkedin} quiet>
          linkedin
        </A>
        {" · "}
        <A href={site.social.github} quiet>
          github
        </A>
      </D>
    </nav>
  );
}

/** `whoami` output plus the sitemap, as the shell's first printed lines. */
export function initialOutput({
  labels,
  locale,
  data,
}: {
  labels: TerminalLabels;
  locale: string;
  data: TerminalData;
}): OutputLine[] {
  return [...whoamiLines(labels, data), "", <Sitemap key="sitemap" locale={locale} />];
}
