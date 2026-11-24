/**
 * The CLI version's route group: only the terminal lives here. Its marker lets
 * globals.css lock the document (`html:has([data-terminal-route])`) so the
 * screen scrolls instead of the page — with or without JavaScript. The site
 * sits in `(site)` and keeps the document scrolling normally.
 */
export default function TerminalLayout({ children }: LayoutProps<"/[lang]">) {
  return (
    <div data-terminal-route="" className="contents">
      {children}
    </div>
  );
}
