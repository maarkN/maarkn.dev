/**
 * The home route group: only the terminal lives here. Its marker lets
 * globals.css lock the document (`html:has([data-terminal-route])`) so the
 * screen scrolls instead of the page — with or without JavaScript. Inner
 * pages sit in `(pages)` and keep the document scrolling normally.
 */
export default function TerminalLayout({ children }: LayoutProps<"/[lang]">) {
  return (
    <div data-terminal-route="" className="contents">
      {children}
    </div>
  );
}
