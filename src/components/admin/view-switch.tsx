import Link from "next/link";
import { Kanban, List } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Two ways to see the applications. The current one is marked, for the eye and
 * for a screen reader (`aria-current`), and is still a link: it reloads the view.
 */
export function ViewSwitch({
  current,
  listHref,
  boardHref,
  words,
}: {
  current: "list" | "board";
  listHref: string;
  boardHref: string;
  words: { label: string; list: string; board: string };
}) {
  return (
    <div role="group" aria-label={words.label} className="flex items-center gap-2">
      <Button asChild variant="ghost">
        <Link href={listHref} aria-current={current === "list" ? "page" : undefined}>
          <List aria-hidden="true" />
          {words.list}
        </Link>
      </Button>
      <Button asChild variant="ghost">
        <Link href={boardHref} aria-current={current === "board" ? "page" : undefined}>
          <Kanban aria-hidden="true" />
          {words.board}
        </Link>
      </Button>
    </div>
  );
}
