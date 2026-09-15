import { clsx } from "clsx";
import { site } from "@/lib/site";
import s from "./page.module.css";
import t from "./terminal.module.css";

const quiet = clsx(t.link, t.quiet);

/**
 * One comment line with the four ways to reach out, as a labelled `nav`
 * inside the page's `<footer>` (rendered by `PageChrome`). Server component.
 */
export function PageFooter({ label }: { label: string }) {
  return (
    <nav className={s.footer} aria-label={label}>
      {"# "}
      <a href={`mailto:${site.email}`} className={quiet}>
        email
      </a>
      {" · "}
      <a href={site.social.linkedin} className={quiet} target="_blank" rel="noopener noreferrer">
        linkedin
      </a>
      {" · "}
      <a href={site.social.github} className={quiet} target="_blank" rel="noopener noreferrer">
        github
      </a>
      {" · "}
      <a href={site.cvPath} className={quiet} target="_blank" rel="noopener noreferrer">
        cv
      </a>
    </nav>
  );
}
