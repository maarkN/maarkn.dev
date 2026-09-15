import { Fragment, type ReactNode } from "react";
import { Cmd, D } from "@/components/terminal/primitives";

/*
 * Tiny template renderer for dictionary strings that need inline styling:
 * `{name}` is replaced by the node given in `values` (left as-is when
 * unknown), `{{text}}` renders `text` dimmed, the mockup's parenthetical
 * asides, and `` `name` `` renders a command or file name as
 * `<code lang="en">` (see `Cmd`). Everything else is printed literally.
 */

const TOKEN = /(\{\{[^{}]*\}\}|\{[a-zA-Z]+\}|`[^`]+`)/g;

export function rich(template: string, values: Record<string, ReactNode> = {}): ReactNode {
  const parts = template.split(TOKEN);
  if (parts.length === 1) return template;
  return parts.map((part, i) => {
    if (part.startsWith("{{") && part.endsWith("}}")) {
      return <D key={i}>{part.slice(2, -2)}</D>;
    }
    if (part.length > 2 && part.startsWith("`") && part.endsWith("`")) {
      return <Cmd key={i}>{part.slice(1, -1)}</Cmd>;
    }
    if (part.startsWith("{") && part.endsWith("}")) {
      const name = part.slice(1, -1);
      if (name in values) return <Fragment key={i}>{values[name]}</Fragment>;
    }
    return part;
  });
}
