"use client";

import { useMemo } from "react";
import { toast } from "sonner";
import { HoloNotice, type NoticeTone } from "@/components/holo/notice";
import { useCommonLabels, useWrittenLanguage } from "./admin-locale";

/** The next step a result offers: undo it, try it again. */
export type NoticeAction = { label: string; onClick: () => void };

type Show = (title: string, options?: { detail?: string; action?: NoticeAction }) => void;

export type Notify = { success: Show; error: Show; info: Show; warning: Show };

/** Long enough to read the sentence and reach its button; it waits while pointed at or focused. */
const DURATION: Record<NoticeTone, number> = { ok: 6000, info: 6000, warn: 9000, bad: 10000 };

/**
 * The result of an action, as a notice (A8): solid, with its buttons as
 * holograms, in the corner, leaving on its own and dismissable. It lands in the
 * live region of the one `<Toaster/>`, which reads it once; the notice itself
 * has no role, or it would be read twice.
 *
 * Bound to the screen that calls it: the notice says the language of that
 * screen, which is the language of its words.
 */
export function useNotify(): Notify {
  const lang = useWrittenLanguage();
  const { dismiss } = useCommonLabels();
  return useMemo(() => {
    const show =
      (tone: NoticeTone): Show =>
      (title, { detail, action } = {}) => {
        toast.custom(
          (id) => (
            <HoloNotice
              tone={tone}
              title={title}
              announce={false}
              lang={lang}
              action={
                action && {
                  label: action.label,
                  onClick: () => {
                    toast.dismiss(id);
                    action.onClick();
                  },
                }
              }
              onDismiss={() => toast.dismiss(id)}
              dismissLabel={dismiss}
            >
              {detail && <p>{detail}</p>}
            </HoloNotice>
          ),
          { duration: DURATION[tone] },
        );
      };
    return { success: show("ok"), error: show("bad"), info: show("info"), warning: show("warn") };
  }, [lang, dismiss]);
}
