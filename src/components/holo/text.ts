import { Children, isValidElement, type ReactNode } from "react";

/** The text inside a node, for seeding a frame: `<b>Falar</b> comigo` → "Falar comigo". */
export function textOf(node: ReactNode): string {
  let text = "";
  Children.forEach(node, (child) => {
    if (typeof child === "string" || typeof child === "number") text += child;
    else if (isValidElement<{ children?: ReactNode }>(child)) text += textOf(child.props.children);
  });
  return text;
}
