/* eslint-disable react/jsx-key -- every OutputLine is rendered on its own
   inside <Line>, never as a React child array, so keys are meaningless here. */
import { submitContact, type ContactState } from "@/app/_actions/contact";
import { A, D, G, O, R } from "@/components/terminal/primitives";
import s from "@/components/terminal/terminal.module.css";
import type { TerminalLabels } from "@/components/terminal/types";
import {
  companySchema,
  emailSchema,
  messageSchema,
  nameSchema,
  type ContactInput,
} from "@/lib/contact-schema";
import { site } from "@/lib/site";
import { isAbortError } from "./abort";
import { rich } from "./rich";
import type { AskOptions, Command, CommandContext, OutputLine } from "./types";

/*
 * `mail`: the contact form as a conversation. Each answer is validated with
 * the same sub-schema the server action uses, so nothing the terminal accepts
 * is refused later; the message goes out through `submitContact` (Resend when
 * `RESEND_API_KEY` is set, a server log otherwise). Answers are typed through
 * `ctx.ask`, which keeps them out of the command history.
 */

/** Minimum gap between two messages from the same tab. */
export const MAIL_COOLDOWN_MS = 60_000;
/** `sessionStorage` key holding the epoch ms of the last successful send. */
export const MAIL_SENT_AT_KEY = "maarkn-mail-at";
/** Invalid answers tolerated on one field before the flow is cancelled. */
const MAIL_MAX_ATTEMPTS = 3;

type StorageLike = Pick<Storage, "getItem" | "setItem">;

export type MailDeps = {
  /** The transport; defaults to the contact server action. */
  send?: (data: FormData) => Promise<ContactState>;
  now?: () => number;
  /** `undefined` = `sessionStorage` when available; `null` = no rate limit memory. */
  storage?: StorageLike | null;
};

type Answers = Pick<ContactInput, "name" | "email" | "company" | "message">;

/** A field refused `MAIL_MAX_ATTEMPTS` times in a row. */
class TooManyAttemptsError extends Error {
  constructor() {
    super("too many invalid attempts");
    this.name = "TooManyAttemptsError";
  }
}

/* ── rate limit ────────────────────────────────────────────────── */

function defaultStorage(): StorageLike | null {
  try {
    return typeof sessionStorage === "undefined" ? null : sessionStorage;
  } catch {
    return null;
  }
}

/** Milliseconds until another message may be sent; `0` when allowed now. */
function cooldownLeft(now: number, storage: StorageLike | null): number {
  if (!storage) return 0;
  try {
    const at = Number(storage.getItem(MAIL_SENT_AT_KEY));
    if (!Number.isFinite(at) || at <= 0) return 0;
    return Math.max(0, at + MAIL_COOLDOWN_MS - now);
  } catch {
    return 0;
  }
}

function rememberSent(now: number, storage: StorageLike | null) {
  try {
    storage?.setItem(MAIL_SENT_AT_KEY, String(now));
  } catch {
    /* quota / private mode: the server-side limit still applies */
  }
}

/* ── answers ───────────────────────────────────────────────────── */

/** `Y/n` in either language; an empty answer means yes (the capital default). */
const YES = new Set(["", "y", "yes", "s", "sim"]);
const NO = new Set(["n", "no", "não", "nao"]);

type Parse<T> = (raw: string) => { value: T } | null;

const viaSchema =
  (schema: { safeParse: (v: string) => { success: boolean; data?: string } }): Parse<string> =>
  (raw) => {
    const result = schema.safeParse(raw);
    return result.success ? { value: result.data ?? "" } : null;
  };

const parseConfirm: Parse<boolean> = (raw) => {
  const answer = raw.trim().toLowerCase();
  if (YES.has(answer)) return { value: true };
  if (NO.has(answer)) return { value: false };
  return null;
};

function toFormData(answers: Answers): FormData {
  const data = new FormData();
  data.set("name", answers.name);
  data.set("email", answers.email);
  data.set("company", answers.company);
  data.set("message", answers.message);
  data.set("source", "terminal");
  return data;
}

/* ── command ───────────────────────────────────────────────────── */

export function createMailCommand(labels: TerminalLabels, deps: MailDeps = {}): Command {
  const m = labels.mail;
  const send = deps.send ?? ((data: FormData) => submitContact({ status: "idle" }, data));
  const now = deps.now ?? Date.now;
  const storage = () => (deps.storage === undefined ? defaultStorage() : deps.storage);

  const failure: OutputLine = (
    <>
      <R>{m.failed}</R>{" "}
      <D>· {rich(m.direct, { email: <A href={`mailto:${site.email}`}>{site.email}</A> })}</D>
    </>
  );

  /** Asks until `parse` accepts the answer; gives up after `MAIL_MAX_ATTEMPTS`. */
  async function askValid<T>(
    ctx: CommandContext,
    label: string,
    parse: Parse<T>,
    invalid: string,
    options: AskOptions,
  ): Promise<T> {
    for (let attempt = 1; ; attempt += 1) {
      const raw = await ctx.ask!(label, options);
      const parsed = parse(raw);
      if (parsed) return parsed.value;
      if (attempt >= MAIL_MAX_ATTEMPTS) throw new TooManyAttemptsError();
      ctx.print(
        <>
          <R>{invalid}</R>{" "}
          <D>{rich(m.attemptsLeft, { n: String(MAIL_MAX_ATTEMPTS - attempt) })}</D>
        </>,
      );
    }
  }

  /** The questions, in order. `null` when the visitor answered `n` at the end. */
  async function interview(ctx: CommandContext): Promise<Answers | null> {
    const next = { enterKeyHint: "next" } as const;
    const name = await askValid(ctx, m.name, viaSchema(nameSchema), m.invalidName, next);
    const email = await askValid(ctx, m.email, viaSchema(emailSchema), m.invalidEmail, {
      ...next,
      inputMode: "email",
    });
    const company = await askValid(ctx, m.company, viaSchema(companySchema), m.invalidCompany, next);
    const message = await askValid(ctx, m.message, viaSchema(messageSchema), m.invalidMessage, {
      ...next,
      multiline: true,
      hint: m.messageHint,
    });
    const confirmed = await askValid(ctx, m.confirm, parseConfirm, m.invalidConfirm, {
      enterKeyHint: "send",
    });
    return confirmed ? { name, email, company, message } : null;
  }

  return {
    name: "mail",
    describe: labels.help.describe.mail ?? "mail",
    run: async (_, ctx) => {
      // No interactive prompt on this host: point to the address instead.
      if (!ctx.ask) return [failure];

      const left = cooldownLeft(now(), storage());
      if (left > 0) {
        return [<O>{rich(m.wait, { seconds: String(Math.ceil(left / 1000)) })}</O>];
      }

      let answers: Answers | null;
      try {
        answers = await interview(ctx);
      } catch (error) {
        if (isAbortError(error)) {
          return [
            <>
              <R>^C</R> <D>· {m.cancelled}</D>
            </>,
          ];
        }
        if (error instanceof TooManyAttemptsError) {
          return [
            <>
              <R>{m.tooMany}</R> <D>· {m.cancelled}</D>
            </>,
          ];
        }
        throw error;
      }
      if (!answers) return [<D>{m.notSent}</D>];

      ctx.print(
        <D>
          {m.sending}
          <span className={s.cursor} aria-hidden="true" />
        </D>,
      );
      let result: ContactState;
      try {
        result = await send(toFormData(answers));
      } catch {
        result = { status: "error", errors: {}, message: "send_failed" };
      }
      if (ctx.signal.aborted) return null;

      if (result.status !== "success") {
        ctx.replaceLast(failure);
        return null;
      }
      rememberSent(now(), storage());
      ctx.replaceLast(
        <>
          <G>{m.sent}</G> <D>· {labels.contact.footer}</D>
        </>,
      );
      return null;
    },
  };
}
