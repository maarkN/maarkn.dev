import { Fragment, type ReactNode } from "react";
import { D } from "@/components/terminal/primitives";

/*
 * Tiny template renderer for dictionary strings that need inline styling:
 * `{name}` is replaced by the node given in `values` (left as-is when
 * unknown) and `{{text}}` renders `text` dimmed, the mockup's parenthetical
 * asides. Everything else is printed literally.
 */

const TOKEN = /(\{\{[^{}]*\}\}|\{[a-zA-Z]+\})/g;

export function rich(template: string, values: Record<string, ReactNode> = {}): ReactNode {
  const parts = template.split(TOKEN);
  if (parts.length === 1) return template;
  return parts.map((part, i) => {
    if (part.startsWith("{{") && part.endsWith("}}")) {
      return <D key={i}>{part.slice(2, -2)}</D>;
    }
    if (part.startsWith("{") && part.endsWith("}")) {
      const name = part.slice(1, -1);
      if (name in values) return <Fragment key={i}>{values[name]}</Fragment>;
    }
    return part;
  });
}
