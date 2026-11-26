"use client";

import { useId, useState, useTransition, type ReactNode } from "react";
import { Trash2 } from "lucide-react";
import type { ActionResult } from "@/app/_actions/action-result";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCommonLabels } from "./admin-locale";
import { useNotify } from "./notify";

/**
 * Deleting asks for the name of the record, typed (AGENTS.md §6): the button
 * that deletes stays off until what was typed is the name, the window says what
 * is lost, and the default is not to go ahead (the cancel button has the focus,
 * and `Esc` cancels, giving the focus back to whoever opened it).
 *
 * `action` is a REFERENCE to a Server Action, which is serializable: a Server
 * Component can pass it, and the `id` travels apart (AGENTS.md §6).
 */
export function ConfirmDelete({
  id,
  name,
  title,
  lost,
  confirmLabel,
  triggerLabel,
  trigger,
  action,
}: {
  id: string;
  /** What has to be typed: the name of the record as the list shows it. */
  name: string;
  /** The question, as the title of the window: "Excluir a candidatura Acme?". */
  title: string;
  /** What goes with it, in one or two sentences. */
  lost: ReactNode;
  /** The verb of the button: "Excluir candidatura". */
  confirmLabel: string;
  /** The name of the icon button that opens the window. */
  triggerLabel: string;
  /** Another opener, with its own name; the icon button by default. */
  trigger?: ReactNode;
  action: (id: string) => Promise<ActionResult>;
}) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [isPending, startTransition] = useTransition();
  const notify = useNotify();
  const common = useCommonLabels();
  const field = useId();
  const matches = typed.trim() === name.trim();
  const [before, after] = common.confirm.type.split("{name}");

  function run() {
    startTransition(async () => {
      const result = await action(id).catch((): ActionResult => ({ ok: false, message: common.failed }));
      if (!result.ok) {
        notify.error(result.message, { action: { label: common.retry, onClick: run } });
        return;
      }
      setOpen(false);
      setTyped("");
      if (result.message) notify.success(result.message);
    });
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setTyped("");
      }}
    >
      <AlertDialogTrigger asChild>
        {trigger ?? (
          <Button variant="ghost" size="icon-sm" aria-label={triggerLabel} title={triggerLabel}>
            <Trash2 aria-hidden="true" />
          </Button>
        )}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>
            {lost} {common.confirm.lost}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-2">
          <Label htmlFor={field} className="block">
            {before}
            <strong className="font-semibold break-all">{name}</strong>
            {after}
          </Label>
          <Input
            id={field}
            value={typed}
            onChange={(event) => setTyped(event.target.value)}
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            disabled={isPending}
          />
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>{common.cancel}</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={!matches || isPending}
            onClick={(event) => {
              // The action closes the window on click; held open to show the
              // pending state and a refusal without the window going away.
              event.preventDefault();
              run();
            }}
          >
            <Trash2 aria-hidden="true" />
            {isPending ? common.confirm.pending : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
