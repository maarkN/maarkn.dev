/**
 * A question the visitor typed in the site's search and sent to the assistant,
 * which today lives in the CLI version. It travels in the tab's storage and
 * never in the URL: a link must not be able to spend the assistant's quota
 * (see `PREFILL_ONLY` in deeplink.ts).
 */
const KEY = "maarkn-ask";

export function leaveQuestion(text: string): void {
  try {
    sessionStorage.setItem(KEY, text);
  } catch {
    /* blocked storage: the terminal opens with `ask ` typed, as from a link */
  }
}

/** The question, once. */
export function takeQuestion(): string | null {
  try {
    const text = sessionStorage.getItem(KEY)?.trim() ?? "";
    sessionStorage.removeItem(KEY);
    return text || null;
  } catch {
    return null;
  }
}
