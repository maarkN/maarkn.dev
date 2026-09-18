"use client";

/**
 * CV + cover letter generator form.
 *
 * `useTransition` instead of `useActionState` (AGENTS.md §5): the result is in
 * hand inside the same callback, so the toast fires without a `useEffect`
 * watching state — the pattern `react-hooks/set-state-in-effect` flags.
 * `generate` keeps its legacy `(prevState, formData)` signature, so the idle
 * state is passed explicitly; the action module belongs to another workstream
 * and is intentionally untouched here.
 */

import Link from "next/link";
import { useState, useTransition } from "react";
import { Download, Copy, Check, FileText, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { generate, type GenState } from "@/app/_actions/generator";
import { GENERATOR_LANGUAGES } from "@/app/admin/generator/languages";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const IDLE: GenState = { status: "idle" };

/**
 * `src/app/_actions/generator.ts` still returns English strings (and two
 * machine keys). The backoffice is pt-BR (A4), so the copy is mapped here.
 * An unmapped message falls through unchanged rather than being swallowed.
 */
const ERROR_MESSAGES: Record<string, string> = {
  unauthorized: "Sessão expirada — entre novamente.",
  db_unavailable: "Banco de dados não configurado.",
  "Paste a fuller job description (40+ characters).":
    "Cole uma descrição de vaga mais completa (mínimo de 40 caracteres).",
  "OPENAI_API_KEY is not set on the server.":
    "OPENAI_API_KEY não está definida no servidor.",
  "Knowledge base is empty — run `npm run db:ingest`.":
    "A base de conhecimento está vazia — rode `pnpm db:ingest`.",
  "Generation failed. Check the server logs and try again.":
    "A geração falhou. Confira os logs do servidor e tente de novo.",
};

function errorMessage(raw: string): string {
  return ERROR_MESSAGES[raw] ?? raw;
}

export function GeneratorForm() {
  const [result, setResult] = useState<GenState>(IDLE);
  const [isPending, startTransition] = useTransition();

  function onSubmit(formData: FormData) {
    startTransition(async () => {
      const res = await generate(IDLE, formData);
      setResult(res);
      if (res.status === "error") {
        toast.error(errorMessage(res.message));
        return;
      }
      if (res.status === "success") {
        toast.success("Materiais gerados.");
      }
    });
  }

  return (
    <>
      <Card>
        <CardContent>
          <form action={onSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="roleTitle">Vaga</Label>
                <Input
                  id="roleTitle"
                  name="roleTitle"
                  placeholder="Senior Backend Engineer"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="company">Empresa</Label>
                <Input id="company" name="company" placeholder="Acme Inc." />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="language">Idioma</Label>
                {/* Radix renders a hidden native select for `name`, so the
                    value reaches the FormData without a mirror input. */}
                <Select name="language" defaultValue="en">
                  <SelectTrigger id="language" className="w-full">
                    <SelectValue placeholder="Idioma" />
                  </SelectTrigger>
                  <SelectContent>
                    {GENERATOR_LANGUAGES.map((l) => (
                      <SelectItem key={l.value} value={l.value}>
                        {l.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="jobDescription">Descrição da vaga *</Label>
              <Textarea
                id="jobDescription"
                name="jobDescription"
                required
                rows={12}
                placeholder="Cole aqui a descrição completa da vaga…"
                className="min-h-64 resize-y font-mono"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">
                Ancorado no seu CV e dossiês — nunca inventa fatos nem diploma.
              </p>
              <Button type="submit" disabled={isPending}>
                <Sparkles className="size-4" />
                {isPending ? "Gerando…" : "Gerar"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {result.status === "success" ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              Fontes: {result.sources.join(" · ") || "—"}
            </p>
            {result.id ? (
              <Button asChild variant="outline" size="sm">
                <Link href={`/admin/generator/${result.id}`}>
                  <FileText className="size-4" />
                  Abrir versão de impressão (PDF)
                </Link>
              </Button>
            ) : null}
          </div>
          <ResultBlock
            title="Currículo"
            filename="resume.md"
            content={result.resume}
          />
          <ResultBlock
            title="Carta de apresentação"
            filename="cover-letter.md"
            content={result.coverLetter}
          />
          <ResultBlock
            title="Respostas de triagem"
            filename="screening-answers.md"
            content={result.screeningAnswers}
          />
        </div>
      ) : null}
    </>
  );
}

function ResultBlock({
  title,
  filename,
  content,
}: {
  title: string;
  filename: string;
  content: string;
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      toast.success("Copiado para a área de transferência.");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("O navegador bloqueou o acesso à área de transferência.");
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
    <Card>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-medium">{title}</h3>
          <div className="flex items-center gap-1">
            <Button type="button" variant="ghost" size="sm" onClick={copy}>
              {copied ? (
                <Check className="size-4" />
              ) : (
                <Copy className="size-4" />
              )}
              {copied ? "Copiado" : "Copiar"}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={download}>
              <Download className="size-4" />
              .md
            </Button>
          </div>
        </div>
        <pre className="max-h-[30rem] overflow-auto border border-border bg-muted/30 p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap">
          {content || "(vazio)"}
        </pre>
      </CardContent>
    </Card>
  );
}
