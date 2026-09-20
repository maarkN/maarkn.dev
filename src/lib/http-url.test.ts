import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { httpHref, httpUrlSchema, isHttpUrl } from "@/lib/http-url";

/** Payloads que viram XSS quando um `href` os aceita. */
const HOSTILE = [
  "javascript:alert(document.domain)",
  "JavaScript:alert(1)",
  "  javascript:alert(1)  ",
  "java\tscript:alert(1)",
  "data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==",
  "data:text/html,<script>alert(1)</script>",
  "vbscript:msgbox(1)",
  "file:///etc/passwd",
  "//evil.example/pwn",
];

describe("http-url", () => {
  it("documenta o defeito: z.string().url() aceita esquema executavel", () => {
    // Se este teste quebrar, o zod passou a travar sozinho — otimo, mas a
    // allowlist explicita continua sendo a defesa que nao depende da versao.
    expect(z.string().url().safeParse("javascript:alert(1)").success).toBe(true);
    expect(z.url().safeParse("data:text/html,<script>alert(1)</script>").success).toBe(true);
  });

  it.each(HOSTILE)("httpUrlSchema recusa %s", (value) => {
    expect(httpUrlSchema.safeParse(value).success).toBe(false);
  });

  it.each([
    "https://github.com/maarkN/maarkn.dev",
    "http://localhost:5050/demo",
    "https://example.com/a?b=1#c",
  ])("httpUrlSchema aceita %s", (value) => {
    expect(httpUrlSchema.safeParse(value).success).toBe(true);
  });

  it("recusa URL acima do teto", () => {
    expect(httpUrlSchema.safeParse(`https://e.com/${"a".repeat(2100)}`).success).toBe(false);
  });

  it.each(HOSTILE)("httpHref descarta %s no render", (value) => {
    expect(httpHref(value)).toBeUndefined();
    expect(isHttpUrl(value)).toBe(false);
  });

  it("httpHref preserva http(s) e normaliza espacos das pontas", () => {
    expect(httpHref(" https://example.com/x ")).toBe("https://example.com/x");
    expect(httpHref(null)).toBeUndefined();
    expect(httpHref("")).toBeUndefined();
  });
});

describe("os campos de URL do admin de projetos usam a allowlist", () => {
  // Contrato de UM arquivo (`"use server"` nao pode exportar o schema para o
  // teste importar): se `repoUrl`/`demoUrl`/`caseUrl` voltarem para
  // `z.string().url()`, o site publico volta a aceitar `javascript:` num href.
  const action = readFileSync(
    fileURLToPath(new URL("../app/_actions/admin-projects.ts", import.meta.url)),
    "utf8",
  );

  it.each(["repoUrl", "demoUrl", "caseUrl"])("%s usa httpUrlSchema", (field) => {
    expect(action).toMatch(new RegExp(`${field}: httpUrlSchema`));
    expect(action).not.toMatch(new RegExp(`${field}: z\\.string\\(\\)\\.url`));
  });
});
