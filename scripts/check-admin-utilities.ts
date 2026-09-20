/**
 * Guarda contra o vazamento do vocabulário shadcn para fora do admin.
 *
 *   pnpm exec tsx scripts/check-admin-utilities.ts   (roda dentro de `pnpm lint`)
 *
 * ── Por que isto existe ───────────────────────────────────────────────────
 * A bko-01 declarou os nomes de token do shadcn (`--color-background`,
 * `--color-muted-foreground`…) no `@theme inline` de src/app/globals.css,
 * porque o Tailwind v4 só lê `@theme` no arquivo que traz
 * `@import "tailwindcss"`. Os VALORES ficam em src/app/admin/admin.css, dentro
 * de `.admin-root`. O efeito colateral é que as utilities existem no site
 * inteiro e resolvem para NADA fora do admin: uma classe dessas numa página
 * pública não é um erro de compilação, é um painel invisível em produção.
 *
 * ── Por que um script no lint e não um teste ──────────────────────────────
 * É uma regra sobre o repositório, não sobre um componente: quem a quebra é
 * um arquivo novo que nenhum teste existente importa. No `pnpm lint` ela roda
 * no CI e reprova o PR; num teste, só rodaria se alguém lembrasse de escrevê-lo.
 *
 * ── A lista de tokens NÃO é digitada aqui ─────────────────────────────────
 * Ela é lida do próprio `@theme inline`, a partir do comentário
 * `shadcn vocabulary`. Um token novo declarado lá passa a ser vigiado sem que
 * ninguém precise lembrar deste arquivo.
 *
 * Sai 1 listando arquivo:linha:classe de cada ocorrência proibida.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

const ROOT = process.cwd();
const SRC = join(ROOT, "src");
const GLOBALS = join(SRC, "app", "globals.css");

/**
 * Onde o vocabulário é legítimo, e por quê:
 *  - `src/app/admin`         — as rotas do backoffice; `.admin-root` está no
 *                              <body> desse layout, então os tokens resolvem.
 *  - `src/components/ui`     — os primitives shadcn. Hoje nenhum arquivo fora
 *                              de /admin os importa (a verificação de import
 *                              está no relatório da bko-05); se um dia o site
 *                              público importar um deles, é ESTA lista que
 *                              precisa ser revista, não a exceção ampliada.
 *  - `src/components/admin`  — os componentes que só o backoffice monta.
 */
const ALLOWED = [
  join("src", "app", "admin"),
  join("src", "components", "ui"),
  join("src", "components", "admin"),
];

/** Prefixos de utility que aceitam um nome de cor. */
const PREFIXES = [
  "bg",
  "text",
  "border",
  "ring",
  "outline",
  "fill",
  "stroke",
  "shadow",
  "caret",
  "accent",
  "decoration",
  "divide",
  "placeholder",
  "from",
  "via",
  "to",
];

const EXTENSIONS = [".ts", ".tsx", ".js", ".jsx", ".css", ".mdx"];

/** Lê os nomes de token do bloco `shadcn vocabulary` do @theme inline. */
function shadcnTokens(): string[] {
  const css = readFileSync(GLOBALS, "utf8");
  const marker = css.indexOf("shadcn vocabulary");
  if (marker === -1) {
    console.error(
      "check-admin-utilities: o bloco `shadcn vocabulary` sumiu de src/app/globals.css — " +
        "sem ele não há lista de tokens para vigiar.",
    );
    process.exit(1);
  }
  // O fim é o fecho do `@theme`, não a primeira chave: o próprio comentário
  // do bloco cita `src/components/{ui,admin}`.
  const end = css.indexOf("\n}", marker);
  const block = css.slice(marker, end === -1 ? undefined : end);
  const names = [...block.matchAll(/--color-([a-z0-9-]+)\s*:/g)].map((m) => m[1]);
  if (names.length === 0) {
    console.error("check-admin-utilities: nenhum --color-* encontrado no bloco shadcn.");
    process.exit(1);
  }
  return names;
}

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      walk(full, out);
    } else if (EXTENSIONS.some((e) => entry.endsWith(e))) {
      out.push(full);
    }
  }
  return out;
}

const tokens = shadcnTokens();
// Nomes mais longos primeiro: `muted-foreground` tem de casar antes de `muted`.
const alternation = [...tokens].sort((a, b) => b.length - a.length).join("|");
/**
 * `hover:`, `data-open:`, `sm:`, `*:`, `group-has-[…]:` e afins entram no
 * prefixo; `/50` e `/[.12]` no sufixo. A borda à esquerda evita casar o meio
 * de uma palavra (`--color-background`, `bg-background-alt`).
 */
const RULE = new RegExp(
  String.raw`(^|[^\w-/])((?:[\w[\]()&*.<>=^$~|-]+:)*)(${PREFIXES.join("|")})-(${alternation})(?![\w-])(/[\w.[\]%]+)?`,
  "g",
);

const files = walk(SRC).filter((file) => {
  const rel = relative(ROOT, file);
  return !ALLOWED.some((dir) => rel === dir || rel.startsWith(dir + sep));
});

const problems: string[] = [];
for (const file of files) {
  const text = readFileSync(file, "utf8");
  text.split("\n").forEach((line, i) => {
    for (const match of line.matchAll(RULE)) {
      problems.push(
        `${relative(ROOT, file)}:${i + 1}: ${match[2]}${match[3]}-${match[4]}${match[5] ?? ""}`,
      );
    }
  });
}

if (problems.length > 0) {
  console.error(
    `check-admin-utilities: ${problems.length} uso(s) do vocabulário shadcn fora do admin.\n` +
      "Esses tokens só têm valor dentro de `.admin-root` (src/app/admin/admin.css);\n" +
      "no site público a utility resolve para nada. Use os nomes da paleta\n" +
      "(bg-bg, text-fg, text-comment, border-line…) declarados em globals.css.\n" +
      problems.map((p) => `  - ${p}`).join("\n"),
  );
  process.exit(1);
}

console.log(
  `check-admin-utilities: ${files.length} arquivos varridos, ${tokens.length} tokens vigiados, nenhum vazamento.`,
);
