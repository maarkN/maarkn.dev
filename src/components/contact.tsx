"use client";

import { useActionState, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Check, Mail, MessageCircle } from "lucide-react";
import { submitContact, type ContactState } from "@/app/_actions/contact";
import { site } from "@/lib/site";
import { cn } from "@/lib/utils";

type Labels = {
  kicker: string;
  title: string;
  sub: string;
  channels: { linkedin: string; email: string; whatsapp: string };
  channelHints: { available: string; timezone: string };
  form: {
    name: string;
    email: string;
    company: string;
    type: string;
    typeOptions: { freelance: string; "full-time": string; consulting: string; audit: string; other: string };
    typePlaceholder: string;
    message: string;
    submit: string;
    submitting: string;
    successTitle: string;
    successBody: string;
    sendAnother: string;
    errorRequired: string;
    errorInvalidEmail: string;
    errorMessage: string;
    errorTooLong: string;
    errorSendFailed: string;
  };
};

const initialState: ContactState = { status: "idle" };

function LinkedinIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
      <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.95v5.66H9.36V9h3.41v1.56h.05c.48-.9 1.65-1.85 3.4-1.85 3.63 0 4.3 2.39 4.3 5.5v6.24zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM3.56 20.45h3.56V9H3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.45c.99 0 1.78-.77 1.78-1.72V1.72C24 .77 23.21 0 22.22 0z" />
    </svg>
  );
}

export function Contact({ labels }: { labels: Labels }) {
  const [state, action, isPending] = useActionState(submitContact, initialState);
  const [tz, setTz] = useState<string>("");

  useEffect(() => {
    try {
      const z = Intl.DateTimeFormat().resolvedOptions().timeZone;
      setTz(z.replace(/_/g, " "));
    } catch {
      setTz("America/Sao_Paulo");
    }
  }, []);

  const errorMap = errorLabels(labels);

  return (
    <section
      id="contact"
      className="relative border-t border-[var(--border)] bg-[var(--bg-low)]"
    >
      <div className="mx-auto w-full max-w-[1280px] px-4 py-16 sm:px-6 sm:py-24 md:px-12 md:py-32">
        <div className="grid gap-16 md:grid-cols-[minmax(0,1fr)_minmax(0,440px)] md:gap-20">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--accent)]">
              {labels.kicker}
            </p>
            <h2 className="mt-3 font-display text-[clamp(2rem,3.6vw,3.2rem)] font-bold leading-[1.1] tracking-[-0.025em] text-[var(--text)]">
              {labels.title}
            </h2>
            <p className="mt-5 max-w-xl text-[1.02rem] font-light leading-[1.75] text-[var(--text-2)]">
              {labels.sub}
            </p>

            <div className="mt-10 flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inset-0 animate-ping rounded-full bg-[var(--green)] opacity-60" />
                <span className="relative h-2 w-2 rounded-full bg-[var(--green)]" />
              </span>
              <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--green)]">
                {labels.channelHints.available}
              </p>
            </div>
            <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--muted)]">
              {labels.channelHints.timezone}: {tz || "—"}
            </p>

            <ul className="mt-10 space-y-2">
              <ChannelLink
                href={site.social.linkedin}
                label={labels.channels.linkedin}
                icon={LinkedinIcon}
              />
              <ChannelLink
                href={`mailto:${site.email}`}
                label={`${labels.channels.email} — ${site.email}`}
                icon={Mail}
              />
              <ChannelLink
                href={site.social.whatsapp}
                label={labels.channels.whatsapp}
                icon={MessageCircle}
              />
            </ul>
          </div>

          {state.status === "success" ? (
            <SuccessCard
              title={labels.form.successTitle}
              body={labels.form.successBody}
              cta={labels.form.sendAnother}
            />
          ) : (
            <motion.form
              key="form"
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.45, ease: "easeOut" }}
              action={action}
              className="flex flex-col gap-4 border border-[var(--border)] bg-[var(--surface)] p-6 md:p-8"
              noValidate
            >
              <input
                type="text"
                name="website"
                tabIndex={-1}
                autoComplete="off"
                aria-hidden
                className="absolute left-[-9999px] h-0 w-0 opacity-0"
              />

              <Field
                name="name"
                label={labels.form.name}
                error={errorMap.byField(state, "name")}
                required
              />
              <Field
                name="email"
                type="email"
                label={labels.form.email}
                error={errorMap.byField(state, "email")}
                required
              />
              <Field
                name="company"
                label={labels.form.company}
                error={errorMap.byField(state, "company")}
              />

              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="contact-type"
                  className="font-display text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]"
                >
                  {labels.form.type}
                </label>
                <select
                  id="contact-type"
                  name="type"
                  defaultValue=""
                  className="border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5 font-sans text-[14px] text-[var(--text)] focus:border-[var(--accent)] focus:outline-none"
                >
                  <option value="">{labels.form.typePlaceholder}</option>
                  {(Object.keys(labels.form.typeOptions) as Array<keyof typeof labels.form.typeOptions>).map(
                    (k) => (
                      <option key={k} value={k}>
                        {labels.form.typeOptions[k]}
                      </option>
                    )
                  )}
                </select>
              </div>

              <Field
                as="textarea"
                name="message"
                label={labels.form.message}
                error={errorMap.byField(state, "message")}
                required
              />

              {state.status === "error" && state.message === "send_failed" ? (
                <p className="border border-[var(--red)]/40 bg-[var(--red)]/10 px-3 py-2 font-mono text-[11px] tracking-[0.04em] text-[var(--red)]">
                  {labels.form.errorSendFailed}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={isPending}
                className={cn(
                  "group mt-2 inline-flex items-center justify-center gap-2 border border-[var(--accent)] bg-[var(--accent)] px-5 py-3 font-display text-[12px] font-semibold uppercase tracking-[0.06em] text-white transition disabled:cursor-not-allowed disabled:opacity-60",
                  !isPending && "hover:opacity-90 hover:shadow-[0_8px_28px_var(--accent-glow)]"
                )}
              >
                {isPending ? labels.form.submitting : labels.form.submit}
                {!isPending ? (
                  <ArrowRight
                    className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                    strokeWidth={2.2}
                  />
                ) : null}
              </button>
            </motion.form>
          )}
        </div>
      </div>
    </section>
  );
}

function ChannelLink({
  href,
  label,
  icon: Icon,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
}) {
  return (
    <li>
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className="group flex items-center gap-3 border border-transparent py-3 transition-colors hover:border-[var(--accent)] hover:px-4"
      >
        <span className="inline-flex h-9 w-9 items-center justify-center text-[var(--muted)] transition-colors group-hover:text-[var(--accent)]">
          <Icon className="h-4 w-4" strokeWidth={1.8} />
        </span>
        <span className="font-display text-[13px] font-medium tracking-tight text-[var(--text-2)] transition-colors group-hover:text-[var(--text)]">
          {label}
        </span>
      </a>
    </li>
  );
}

function Field({
  name,
  label,
  type = "text",
  required,
  as = "input",
  error,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  as?: "input" | "textarea";
  error?: string;
}) {
  const id = `contact-${name}`;
  const baseClass =
    "border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5 font-sans text-[14px] text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none";
  const focusClass = error
    ? "border-[var(--red)] focus:border-[var(--red)]"
    : "focus:border-[var(--accent)]";

  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={id}
        className="flex items-center gap-1 font-display text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]"
      >
        {label}
        {required ? <span className="text-[var(--accent)]">*</span> : null}
      </label>
      {as === "textarea" ? (
        <textarea
          id={id}
          name={name}
          required={required}
          rows={5}
          className={cn(baseClass, focusClass, "resize-y")}
        />
      ) : (
        <input
          id={id}
          name={name}
          type={type}
          required={required}
          autoComplete={
            name === "email" ? "email" : name === "name" ? "name" : "off"
          }
          className={cn(baseClass, focusClass)}
        />
      )}
      {error ? (
        <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--red)]">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function SuccessCard({
  title,
  body,
  cta,
}: {
  title: string;
  body: string;
  cta: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="flex flex-col items-start gap-4 border border-[var(--accent)] bg-[var(--surface)] p-8"
    >
      <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[var(--accent)]/15 text-[var(--accent)]">
        <Check className="h-5 w-5" strokeWidth={2.4} />
      </span>
      <div>
        <h3 className="font-display text-[1.2rem] font-bold tracking-tight text-[var(--text)]">
          {title}
        </h3>
        <p className="mt-2 max-w-md text-[14px] font-light leading-[1.7] text-[var(--text-2)]">
          {body}
        </p>
      </div>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="font-display text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)] transition-colors hover:text-[var(--accent)]"
      >
        {cta}
      </button>
    </motion.div>
  );
}

function errorLabels(labels: Labels) {
  return {
    byField(state: ContactState, field: keyof Labels["form"] | "name" | "email" | "company" | "type" | "message"): string | undefined {
      if (state.status !== "error") return undefined;
      const code = state.errors[field as never];
      if (!code) return undefined;
      switch (code) {
        case "required":
          return labels.form.errorRequired;
        case "invalid":
          return labels.form.errorInvalidEmail;
        case "too_long":
          return labels.form.errorTooLong;
        default:
          return labels.form.errorMessage;
      }
    },
  };
}
