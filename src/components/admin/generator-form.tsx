"use client";

/**
 * The generator: a job description in, a résumé, a cover letter and screening
 * answers out, grounded on the RAG over the CV and the dossiers.
 *
 * A refusal keeps what was pasted (`submitKeepingValues`, A15) and says why, in
 * the language of the screen: the action answers with a stable code
 * (`GenError`), and the sentence is the dictionary's. A failure offers to try
 * again.
 */

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { Check, Copy, Download, FileText, Sparkles } from "lucide-react";
import { generate, type GenError, type GenState } from "@/app/_actions/generator";
import { GENERATOR_LANGUAGES } from "@/app/admin/generator/languages";
import { useCommonLabels } from "@/components/admin/admin-locale";
import { FieldError, FieldHelp, RequiredHint, describedBy } from "@/components/admin/field-output";
import { submitKeepingValues, useFocusFirstInvalid } from "@/components/admin/form-submit";
import { useNotify } from "@/components/admin/notify";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { AdminDictionary } from "@/i18n/config";
import { fill } from "@/lib/admin/text";

const IDLE: GenState = { status: "idle" };

export type GeneratorWords = {
  generator: AdminDictionary["generator"];
  languages: AdminDictionary["vocab"]["generatorLanguage"];
};

/** The sentence of a code; the codes the action may add later still read. */
function errorText(code: GenError, codes: string | undefined, words: AdminDictionary["generator"]["errors"], noDatabase: string) {
  switch (code) {
    case "unauthorized":
      return words.unauthorized;
    case "db_unavailable":
      return noDatabase;
    case "short":
      return words.short;
    case "no_api_key":
      return words.noKey;
    case "no_context":
      return words.noContext;
    case "framing_down":
      return words.framingDown;
    case "framing_blocked":
      return fill(words.blocked, { codes: codes ?? "" });
    default:
      return words.failed;
  }
}

export function GeneratorForm({ words }: { words: GeneratorWords }) {
  const { generator: text, languages } = words;
  const common = useCommonLabels();
  const notify = useNotify();
  const [result, setResult] = useState<GenState>(IDLE);
  const [fieldError, setFieldError] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();
  const form = useRef<HTMLFormElement>(null);
  useFocusFirstInvalid(form, fieldError);

  function onSubmit(formData: FormData) {
    startTransition(async () => {
      const res = await generate(IDLE, formData).catch((): GenState => ({ status: "error", message: "failed" }));
      setResult(res);
      if (res.status === "error") {
        const sentence = errorText(res.message, res.codes, text.errors, common.noDatabase);
        if (res.message === "short") {
          // The field's own problem: next to it, and the focus goes there.
          setFieldError({ jobDescription: sentence });
          return;
        }
        setFieldError({});
        notify.error(sentence, { action: { label: common.retry, onClick: () => form.current?.requestSubmit() } });
        return;
      }
      setFieldError({});
      if (res.status === "success") notify.success(text.form.done);
    });
  }

  return (
    <>
      <form
        ref={form}
        noValidate
        aria-label={text.form.label}
        onSubmit={(event) => submitKeepingValues(event, onSubmit)}
        className="space-y-5"
      >
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="roleTitle">{text.form.roleTitle}</Label>
            <Input id="roleTitle" name="roleTitle" placeholder="Senior Backend Engineer" className="w-full" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="company">{text.form.company}</Label>
            <Input id="company" name="company" placeholder="Acme Inc." className="w-full" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="language">{text.form.language}</Label>
            {/* Radix renders a hidden native select for `name`, so the value
                reaches the FormData without a mirror input. */}
            <Select name="language" defaultValue="en">
              <SelectTrigger id="language" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {GENERATOR_LANGUAGES.map((language) => (
                  <SelectItem key={language} value={language}>
                    {languages[language]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="jobDescription">
            {text.form.jobDescription}
            <RequiredHint />
          </Label>
          <Textarea
            id="jobDescription"
            name="jobDescription"
            required
            rows={12}
            placeholder={text.form.jobPlaceholder}
            className="w-full [--field-min:16rem]"
            aria-invalid={Boolean(fieldError.jobDescription)}
            aria-describedby={describedBy("jobDescription-help", fieldError.jobDescription && "jobDescription-error")}
          />
          <FieldHelp id="jobDescription-help">{text.form.jobHelp}</FieldHelp>
          <FieldError id="jobDescription-error">{fieldError.jobDescription}</FieldError>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <FieldHelp>{text.form.grounded}</FieldHelp>
          <Button type="submit" disabled={isPending}>
            <Sparkles aria-hidden="true" />
            {isPending ? text.form.pending : text.form.submit}
          </Button>
        </div>
      </form>

      {result.status === "success" ? (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              {fill(text.result.sources, { sources: result.sources.join(" · ") || "—" })}
            </p>
            {result.id ? (
              <Button asChild variant="outline">
                <Link href={`/admin/generator/${result.id}`}>
                  <FileText aria-hidden="true" />
                  {text.result.open}
                </Link>
              </Button>
            ) : null}
          </div>
          <ResultBlock title={text.result.resume} filename="resume.md" content={result.resume} words={text.result} />
          <ResultBlock title={text.result.coverLetter} filename="cover-letter.md" content={result.coverLetter} words={text.result} />
          <ResultBlock title={text.result.screening} filename="screening-answers.md" content={result.screeningAnswers} words={text.result} />
        </div>
      ) : null}
    </>
  );
}

function ResultBlock({
  title,
  filename,
  content,
  words,
}: {
  title: string;
  filename: string;
  content: string;
  words: AdminDictionary["generator"]["result"];
}) {
  const [copied, setCopied] = useState(false);
  const notify = useNotify();

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      notify.success(fill(words.copied, { what: title }));
      setTimeout(() => setCopied(false), 1500);
    } catch {
      notify.error(words.copyFailed);
    }
  };

  const download = () => {
    const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-title text-xl font-[560] [font-stretch:104%]">{title}</h2>
        <div className="flex items-center gap-2">
          <Button type="button" variant="ghost" onClick={copy}>
            {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
            {fill(words.copy, { what: title.toLowerCase() })}
          </Button>
          <Button type="button" variant="ghost" onClick={download}>
            <Download aria-hidden="true" />
            {fill(words.download, { what: title.toLowerCase() })}
          </Button>
        </div>
      </div>
      {/* What was generated is content: Marco's words, never translated. */}
      <pre
        tabIndex={0}
        className="max-h-[30rem] overflow-auto border border-border bg-muted p-4 font-label text-sm leading-relaxed whitespace-pre-wrap"
      >
        {content || words.empty}
      </pre>
    </section>
  );
}
