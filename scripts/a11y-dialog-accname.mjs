#!/usr/bin/env node
/**
 * A régua do título do diálogo, medida onde ela de fato existe: no navegador.
 *
 * O título de um diálogo Radix É o nome acessível dele (`aria-labelledby` do
 * conteúdo aponta para o título), e o algoritmo de accname inclui conteúdo
 * gerado por `::before`/`::after` — `overflow: hidden` recorta o desenho, não
 * a árvore de acessibilidade. Sem o alt-text `content: "─" / ""` o nome do
 * diálogo vira `── excluir candidatura ─────────…`.
 *
 * O jsdom não computa `content`, então esta prova não cabe no vitest. Aqui:
 * Chrome headless por CDP (WebSocket nativo do Node, zero dependência), o CSS
 * REAL de `src/app/admin/admin.css` e os três slots de título. Lê o nome
 * calculado pelo próprio Chrome (`Accessibility.getPartialAXTree`).
 *
 *   node scripts/a11y-dialog-accname.mjs        # sai 0 se os nomes estão limpos
 *   node scripts/a11y-dialog-accname.mjs --json # despeja o que foi medido
 */
import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = Number(process.env.CDP_PORT ?? 9333);
const RULE = "─"; // U+2500 BOX DRAWINGS LIGHT HORIZONTAL

const SLOTS = [
  { slot: "dialog-title", title: "Excluir candidatura" },
  { slot: "alert-dialog-title", title: "Excluir projeto" },
  { slot: "sheet-title", title: "Acme Tecnologia e Serviços Digitais" },
];

const css = readFileSync(new URL("../src/app/admin/admin.css", import.meta.url), "utf8");

const fixture = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<title>accname da régua</title><style>${css}</style></head>
<body class="admin-root">
${SLOTS.map(
  ({ slot, title }, i) => `<div role="dialog" aria-labelledby="t${i}" data-slot="${slot.replace("-title", "-content")}">
  <h2 id="t${i}" data-slot="${slot}">${title}</h2>
  <p data-slot="${slot.replace("-title", "-description")}">Descrição do diálogo.</p>
</div>`,
).join("\n")}
</body></html>`;

/* ── CDP mínimo ──────────────────────────────────────────────────────────── */

function connect(url) {
  const ws = new WebSocket(url);
  const pending = new Map();
  let id = 0;
  const ready = new Promise((resolve, reject) => {
    ws.addEventListener("open", () => resolve());
    ws.addEventListener("error", (e) => reject(new Error(`websocket: ${e.message ?? "erro"}`)));
  });
  ws.addEventListener("message", (event) => {
    const msg = JSON.parse(event.data);
    const slot = pending.get(msg.id);
    if (!slot) return;
    pending.delete(msg.id);
    if (msg.error) slot.reject(new Error(`${slot.method}: ${msg.error.message}`));
    else slot.resolve(msg.result);
  });
  return {
    ready,
    close: () => ws.close(),
    send(method, params = {}, sessionId) {
      const messageId = ++id;
      return new Promise((resolve, reject) => {
        pending.set(messageId, { resolve, reject, method });
        ws.send(JSON.stringify({ id: messageId, method, params, sessionId }));
      });
    },
  };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function browserWebSocketUrl() {
  for (let i = 0; i < 100; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/version`);
      const json = await res.json();
      if (json.webSocketDebuggerUrl) return json.webSocketDebuggerUrl;
    } catch {
      /* ainda subindo */
    }
    await sleep(100);
  }
  throw new Error(`Chrome não abriu a porta de depuração ${PORT} em 10s`);
}

/* ── medição ─────────────────────────────────────────────────────────────── */

const profile = mkdtempSync(join(tmpdir(), "accname-"));
const chrome = spawn(
  CHROME,
  [
    "--headless=new",
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-extensions",
    `--user-data-dir=${profile}`,
    `--remote-debugging-port=${PORT}`,
    "about:blank",
  ],
  { stdio: "ignore" },
);

let cdp;
let failures = [];
const measured = [];

try {
  cdp = connect(await browserWebSocketUrl());
  await cdp.ready;

  const { targetId } = await cdp.send("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await cdp.send("Target.attachToTarget", { targetId, flatten: true });
  const call = (method, params) => cdp.send(method, params, sessionId);

  await call("Page.enable");
  await call("Runtime.enable");
  await call("DOM.enable");
  await call("Accessibility.enable");

  const url = `data:text/html;charset=utf-8;base64,${Buffer.from(fixture, "utf8").toString("base64")}`;
  await call("Page.navigate", { url });
  await sleep(600);

  const { root } = await call("DOM.getDocument", { depth: -1 });

  for (const { slot, title } of SLOTS) {
    const { nodeId } = await call("DOM.querySelector", {
      nodeId: root.nodeId,
      selector: `[data-slot="${slot}"]`,
    });
    if (!nodeId) throw new Error(`fixture sem [data-slot="${slot}"]`);

    const { nodeId: dialogId } = await call("DOM.querySelector", {
      nodeId: root.nodeId,
      selector: `[aria-labelledby="t${SLOTS.findIndex((s) => s.slot === slot)}"]`,
    });

    const { nodes } = await call("Accessibility.getPartialAXTree", {
      nodeId: dialogId,
      fetchRelatives: false,
    });
    const name = nodes.find((n) => n.name)?.name?.value ?? "";

    const { result } = await call("Runtime.evaluate", {
      expression: `JSON.stringify({
        before: getComputedStyle(document.querySelector('[data-slot="${slot}"]'), '::before').content,
        after: getComputedStyle(document.querySelector('[data-slot="${slot}"]'), '::after').content,
      })`,
      returnByValue: true,
    });
    const drawn = JSON.parse(result.value);

    measured.push({ slot, name, ...drawn });

    if (!drawn.before.includes(RULE) || !drawn.after.includes(RULE)) {
      failures.push(`${slot}: a régua NÃO está sendo desenhada (${drawn.before} / ${drawn.after})`);
    }
    if (name !== title) {
      failures.push(`${slot}: nome acessível é ${JSON.stringify(name)}, esperado ${JSON.stringify(title)}`);
    }
    if (name.includes(RULE)) {
      failures.push(`${slot}: a régua vazou para o nome acessível`);
    }
  }
} finally {
  cdp?.close();
  chrome.kill();
  // O Chrome ainda escreve no perfil por alguns milissegundos depois do kill;
  // sem a espera o `rmSync` estoura ENOTEMPTY e a limpeza mascara o resultado
  // da medição. A limpeza é higiene, nunca motivo de falha.
  await sleep(300);
  try {
    rmSync(profile, { recursive: true, force: true });
  } catch {
    /* perfil temporário; o SO recolhe */
  }
}

if (process.argv.includes("--json")) {
  console.log(JSON.stringify(measured, null, 2));
} else {
  for (const m of measured) {
    console.log(`${m.slot}\n  desenhado: ${m.before} + ${m.after}\n  nome:      ${JSON.stringify(m.name)}`);
  }
}

if (failures.length > 0) {
  console.error(`\n${failures.length} falha(s):`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log(`\n✓ ${measured.length} títulos: régua desenhada, nome acessível limpo.`);
