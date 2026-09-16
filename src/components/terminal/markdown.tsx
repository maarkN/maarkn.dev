import type { ReactNode } from "react";
import { A, B, D, P } from "./primitives";
import s from "./terminal.module.css";

/*
 * Small markdown renderer for assistant replies, in the terminal's own
 * vocabulary: paragraphs, `- ` / `1. ` lists, `#` headings, fenced code,
 * **bold**, *italic*, `code` and [links](url) (bare URLs are linked too).
 * It never leaves the monospace face and tolerates the half-written input
 * it gets while a reply streams (an open fence or an unfinished list just
 * render as far as they go). Loaded on demand by the `ask` command.
 */

const LIST_ITEM = /^\s*(?:[-*•]|\d+[.)])\s+/;
const FENCE = /^\s*```/;
const HEADING = /^\s*#{1,6}\s+(.*)$/;

/** Inline tokens, first match wins: link, bold, code, italic, bare URL. */
const INLINE =
  /(\[([^\]\n]+)\]\(([^)\s]+)\)|\*\*([^*\n]+)\*\*|__([^_\n]+)__|`([^`\n]+)`|\*([^*\n]+)\*|_([^_\n]+)_|(https?:\/\/[^\s<>()]+[^\s<>().,;:!?'"]))/g;

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let last = 0;
  let i = 0;
  INLINE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = INLINE.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    const key = `${keyPrefix}${i++}`;
    const [, , linkText, linkHref, bold, bold2, code, italic, italic2, url] = m;
    if (linkText !== undefined) {
      nodes.push(
        <A key={key} href={linkHref}>
          {linkText}
        </A>,
      );
    } else if (bold !== undefined || bold2 !== undefined) {
      nodes.push(<B key={key}>{bold ?? bold2}</B>);
    } else if (code !== undefined) {
      nodes.push(
        <code key={key} className={s.mdCode}>
          {code}
        </code>,
      );
    } else if (italic !== undefined || italic2 !== undefined) {
      nodes.push(<em key={key}>{italic ?? italic2}</em>);
    } else if (url !== undefined) {
      nodes.push(<A key={key} href={url} />);
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

function Markdown({ text }: { text: string }) {
  const lines = text.split("\n");
  const out: ReactNode[] = [];
  let para: string[] = [];
  let key = 0;

  const flushPara = () => {
    if (!para.length) return;
    const p = para;
    para = [];
    const k = key++;
    out.push(
      <p key={k} className={s.mdP}>
        {p.map((l, li) => (
          <span key={li}>
            {li > 0 ? <br /> : null}
            {renderInline(l, `${k}-${li}-`)}
          </span>
        ))}
      </p>,
    );
  };

  for (let i = 0; i < lines.length; ) {
    const line = lines[i];

    if (FENCE.test(line)) {
      flushPara();
      const lang = line.replace(FENCE, "").trim();
      const code: string[] = [];
      i++;
      while (i < lines.length && !FENCE.test(lines[i])) code.push(lines[i++]);
      i++; // closing fence (or end of input while streaming)
      out.push(
        <pre key={key++} className={s.mdPre} data-lang={lang || undefined}>
          {code.join("\n")}
        </pre>,
      );
      continue;
    }

    const heading = HEADING.exec(line);
    if (heading) {
      flushPara();
      const k = key++;
      out.push(
        <p key={k} className={s.mdP}>
          <P>
            <B>{renderInline(heading[1], `${k}-h-`)}</B>
          </P>
        </p>,
      );
      i++;
      continue;
    }

    if (LIST_ITEM.test(line)) {
      flushPara();
      const items: { marker: string; text: string }[] = [];
      while (i < lines.length && LIST_ITEM.test(lines[i])) {
        const raw = lines[i++];
        const marker = raw.match(LIST_ITEM)![0].trim();
        items.push({ marker: /^\d/.test(marker) ? marker : "-", text: raw.replace(LIST_ITEM, "") });
      }
      const k = key++;
      out.push(
        <ul key={k} className={s.mdList}>
          {items.map((it, li) => (
            <li key={li}>
              <D>{it.marker}</D> {renderInline(it.text, `${k}-${li}-`)}
            </li>
          ))}
        </ul>,
      );
      continue;
    }

    if (line.trim() === "") {
      flushPara();
      i++;
      continue;
    }
    para.push(line);
    i++;
  }
  flushPara();

  return <div className={s.md}>{out}</div>;
}

export default Markdown;
