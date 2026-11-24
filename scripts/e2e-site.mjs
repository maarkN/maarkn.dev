#!/usr/bin/env node
/**
 * A régua de ponta a ponta do site público: o que só se sabe com a página
 * servida, hidratada e rolada de verdade.
 *
 * Mesma mecânica de scripts/a11y-admin-axe.mjs: Chrome headless por CDP,
 * WebSocket nativo do Node, zero dependência nova. A lista do que precisa
 * estar coberto ao fim do rebranding é docs/design/verificacoes.md; cada
 * change `rebrand-*` acrescenta os seus casos em CASES.
 *
 *   pnpm build && pnpm start              # 5050, sem DATABASE_URL serve
 *   node scripts/e2e-site.mjs             # ou: pnpm test:e2e
 *   … --width 390 --height 844            # viewport estreita
 *   … --only home:pt-BR                   # só os casos cujo nome contém isso
 *   … --verbose                           # lista também o que passou
 *   … --json
 *
 * E2E_BASE troca o endereço, CHROME_PATH o navegador, CDP_PORT a porta.
 *
 * Sai 0 quando tudo passou, 1 quando alguma asserção falhou e 2 quando nada
 * pôde ser medido (servidor fora do ar, Chrome ausente, `--only` sem caso).
 * Página que não responde 200 e caso sem nenhuma asserção são FALHA: uma
 * página 404 não tem erro nenhum e passaria por limpa.
 *
 * Não roda no CI (.github/workflows/pr.yml): as verificações da projeção
 * dependem de navegador com GPU. Pelo mesmo motivo, e ao contrário dos
 * scripts de acessibilidade, o Chrome aqui sobe SEM `--disable-gpu`.
 */
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const CHROME =
  process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = Number(process.env.CDP_PORT ?? 9335);
const BASE = process.env.E2E_BASE ?? "http://localhost:5050";

const argv = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  const next = i === -1 ? undefined : argv[i + 1];
  return next && !next.startsWith("--") ? next : fallback;
};
const WIDTH = Number(flag("width", 1440));
const HEIGHT = Number(flag("height", 900));
const ONLY = flag("only", null);
const AS_JSON = argv.includes("--json");
const VERBOSE = argv.includes("--verbose");

/* ── os casos ────────────────────────────────────────────────────────────── */

/**
 * A home de hoje (versão CLI): termina o boot, imprime cada bloco de conteúdo
 * pelo menu e percorre a tela do topo ao fim com a roda do mouse. Quem rola é
 * o `main`; o documento é travado (`html:has([data-terminal-route])`).
 */
const CONTENT_COMMANDS = ["whoami", "experience", "skills", "projects", "writing", "contact"];

async function walkHome(page, t, locale) {
  await page.open(`/${locale}`);
  await page.waitFor(`!document.querySelector("[data-boot]")`, "o boot terminar");

  t.equal(await page.evaluate(`document.documentElement.lang`), locale, "idioma do documento");
  t.equal(await page.evaluate(`document.querySelectorAll("h1").length`), 1, "um único h1");
  t.ok(
    (await page.evaluate(`document.querySelectorAll('nav[aria-label="sitemap"] a[href]').length`)) > 0,
    "a saída inicial traz os links das páginas internas",
  );

  for (const name of CONTENT_COMMANDS) {
    const before = await page.evaluate(`document.querySelectorAll("main section").length`);
    await page.click(`nav button[data-cmd="${name}"]`);
    /* O nome acessível do bloco ("output of skills", "saída de skills") sai do
       dicionário; o que não muda com o idioma é o nome do comando no fim. */
    const printed = await page
      .waitFor(
        `(() => {
          const blocks = document.querySelectorAll("main section");
          const last = blocks[blocks.length - 1];
          return blocks.length === ${before + 1}
            && (last.getAttribute("aria-label") || "").endsWith(${JSON.stringify(` ${name}`)})
            && last.children.length > 1;
        })()`,
        `o bloco de ${name}`,
        5000,
      )
      .then(() => true, () => false);
    t.ok(printed, `o menu imprime o bloco de ${name}`);
  }

  const start = await page.scroll({ within: "main", to: "top" });
  t.ok(start.max > 0, "há o que rolar", `scrollHeight − clientHeight = ${start.max}`);
  t.equal(start.top, 0, "a rolagem chega ao topo");
  t.ok(await page.inView("h1", "main"), "no topo, o h1 está à vista");

  const seen = new Set();
  const end = await page.scroll({
    within: "main",
    to: "bottom",
    onStep: async () => {
      const visible = await page.evaluate(
        `(() => {
          const box = document.querySelector("main").getBoundingClientRect();
          return [...document.querySelectorAll("main section")].flatMap((el, i) => {
            const r = el.getBoundingClientRect();
            return r.bottom > box.top && r.top < box.bottom ? [i] : [];
          });
        })()`,
      );
      for (const i of visible) seen.add(i);
    },
  });
  t.ok(end.max - end.top <= 1, "a rolagem chega ao fim", `faltam ${end.max - end.top}px`);
  t.equal(
    seen.size,
    await page.evaluate(`document.querySelectorAll("main section").length`),
    "todo bloco passou pela tela",
  );
  t.ok(await page.inView("main label[for=cmd]", "main"), "no fim, o prompt está à vista");
  t.equal((await page.scrollState(null)).top, 0, "o documento não rolou junto");

  const doc = await page.evaluate(`document.documentElement.scrollWidth`);
  t.ok(doc <= WIDTH + 1, "sem rolagem horizontal", `${doc}px em ${WIDTH}`);
  t.equal(page.errors, [], "nenhum erro no console");
}

const CASES = ["en", "pt-BR"].map((locale) => ({
  name: `home:${locale}`,
  run: (page, t) => walkHome(page, t, locale),
}));

/* ── asserções ───────────────────────────────────────────────────────────── */

/** Anota em vez de lançar: um caso diz tudo o que está errado de uma vez. */
function createChecks() {
  const checks = [];
  return {
    checks,
    ok(condition, label, detail = "") {
      checks.push({ label, passed: Boolean(condition), detail });
    },
    equal(actual, expected, label) {
      const a = JSON.stringify(actual);
      const b = JSON.stringify(expected);
      checks.push({ label, passed: a === b, detail: a === b ? "" : `esperado ${b}, veio ${a}` });
    },
  };
}

/* ── CDP mínimo (o helper dos scripts de acessibilidade, mais eventos) ───── */

function connect(url) {
  const ws = new WebSocket(url);
  const pending = new Map();
  const listeners = new Set();
  let id = 0;
  const ready = new Promise((resolve, reject) => {
    ws.addEventListener("open", () => resolve());
    ws.addEventListener("error", (e) => reject(new Error(`websocket: ${e.message ?? "erro"}`)));
  });
  ws.addEventListener("message", (event) => {
    const msg = JSON.parse(event.data);
    if (msg.method) {
      for (const listener of [...listeners]) listener(msg);
      return;
    }
    const slot = pending.get(msg.id);
    if (!slot) return;
    pending.delete(msg.id);
    if (msg.error) slot.reject(new Error(`${slot.method}: ${msg.error.message}`));
    else slot.resolve(msg.result);
  });
  return {
    ready,
    close: () => ws.close(),
    on(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
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

async function browserWebSocketUrl(chrome) {
  for (let i = 0; i < 200; i++) {
    if (chrome.failure) throw new Error(`Chrome não subiu (${CHROME}): ${chrome.failure}`);
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/version`);
      const json = await res.json();
      if (json.webSocketDebuggerUrl) return json.webSocketDebuggerUrl;
    } catch {
      /* ainda subindo */
    }
    await sleep(100);
  }
  throw new Error(`Chrome não abriu a porta de depuração ${PORT} em 20s`);
}

/* ── a página ────────────────────────────────────────────────────────────── */

/**
 * Uma aba em contexto próprio: `sessionStorage`, cookies e cache de um caso
 * não chegam ao seguinte.
 */
async function createPage(cdp) {
  const { browserContextId } = await cdp.send("Target.createBrowserContext");
  const { targetId } = await cdp.send("Target.createTarget", { url: "about:blank", browserContextId });
  const { sessionId } = await cdp.send("Target.attachToTarget", { targetId, flatten: true });
  const call = (method, params) => cdp.send(method, params, sessionId);

  const errors = [];
  let response = null;
  const off = cdp.on((msg) => {
    if (msg.sessionId !== sessionId) return;
    const p = msg.params;
    if (msg.method === "Runtime.exceptionThrown") {
      errors.push(p.exceptionDetails.exception?.description ?? p.exceptionDetails.text);
    } else if (msg.method === "Runtime.consoleAPICalled" && p.type === "error") {
      errors.push(p.args.map((a) => a.value ?? a.description ?? a.type).join(" "));
    } else if (msg.method === "Log.entryAdded" && p.entry.level === "error") {
      errors.push(`${p.entry.text}${p.entry.url ? ` (${p.entry.url})` : ""}`);
    } else if (msg.method === "Network.responseReceived" && p.type === "Document") {
      response = p.response;
    }
  });

  await call("Page.enable");
  await call("Runtime.enable");
  await call("Log.enable");
  await call("Network.enable");
  /* `mobile: false` de propósito: em emulação mobile o Chrome alarga a
     viewport até caber o conteúdo e a rolagem horizontal nunca reprova
     (a história completa está em scripts/a11y-admin-axe.mjs). */
  await call("Emulation.setDeviceMetricsOverride", {
    width: WIDTH,
    height: HEIGHT,
    deviceScaleFactor: 1,
    mobile: false,
  });

  const evaluate = async (expression) => {
    const { result, exceptionDetails } = await call("Runtime.evaluate", {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    if (exceptionDetails) {
      throw new Error(exceptionDetails.exception?.description ?? exceptionDetails.text);
    }
    return result.value;
  };

  const waitFor = async (expression, label, timeout = 15000) => {
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
      if (await evaluate(expression)) return;
      await sleep(50);
    }
    throw new Error(`esperei ${timeout / 1000}s por: ${label}`);
  };

  const open = async (path) => {
    response = null;
    const loaded = new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        stop();
        reject(new Error(`${path} não carregou em 30s`));
      }, 30000);
      const stop = cdp.on((msg) => {
        if (msg.sessionId !== sessionId || msg.method !== "Page.loadEventFired") return;
        clearTimeout(timer);
        stop();
        resolve();
      });
    });
    /* Sem isto, um `navigate` que falha deixaria a espera rejeitar sozinha. */
    loaded.catch(() => {});
    const { errorText } = await call("Page.navigate", { url: `${BASE}${path}` });
    if (errorText) throw new Error(`${path}: ${errorText}`);
    await loaded;
    if (response?.status !== 200) throw new Error(`${path} respondeu ${response?.status ?? "nada"}`);
  };

  /** Centro do elemento na viewport. Elemento ausente ou sem área é erro. */
  const center = async (selector) => {
    const point = await evaluate(
      `(() => {
        const el = document.querySelector(${JSON.stringify(selector)});
        if (!el) return null;
        el.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "instant" });
        const r = el.getBoundingClientRect();
        return r.width && r.height ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : null;
      })()`,
    );
    if (!point) throw new Error(`nada para apontar em ${selector}`);
    return point;
  };

  /** Clique de mouse de verdade: se algo cobrir o elemento, quem recebe é o que cobre. */
  const click = async (selector) => {
    const { x, y } = await center(selector);
    const mouse = { x, y, button: "left", clickCount: 1 };
    await call("Input.dispatchMouseEvent", { type: "mousePressed", ...mouse });
    await call("Input.dispatchMouseEvent", { type: "mouseReleased", ...mouse });
  };

  /** Posição de quem rola: um seletor, ou o documento quando `within` é null. */
  const scrollState = (within) =>
    evaluate(
      `(() => {
        const el = ${within ? `document.querySelector(${JSON.stringify(within)})` : "document.scrollingElement"};
        return { top: Math.round(el.scrollTop), max: el.scrollHeight - el.clientHeight, view: el.clientHeight };
      })()`,
    );

  /** Espera a rolagem (que pode ser suave) parar de andar. */
  const settled = async (within) => {
    let last = await scrollState(within);
    for (let still = 0; still < 3; ) {
      await sleep(40);
      const now = await scrollState(within);
      still = now.top === last.top ? still + 1 : 0;
      last = now;
    }
    return last;
  };

  /**
   * Rola com a roda do mouse, meia tela por vez, até o topo, o fim ou um
   * deslocamento em px. `onStep` roda em cada parada, inclusive na primeira.
   */
  const scroll = async ({ within = null, to, onStep }) => {
    const at = within
      ? await evaluate(
          `(() => { const r = document.querySelector(${JSON.stringify(within)}).getBoundingClientRect();
             return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`,
        )
      : { x: WIDTH / 2, y: HEIGHT / 2 };
    let state = await settled(within);
    await onStep?.(state);
    for (let i = 0; i < 400; i++) {
      const target = to === "top" ? 0 : to === "bottom" ? state.max : Math.min(to, state.max);
      const left = target - state.top;
      if (Math.abs(left) <= 1) break;
      const step = Math.min(Math.abs(left), Math.max(1, Math.floor(state.view / 2)));
      await call("Input.dispatchMouseEvent", {
        type: "mouseWheel",
        ...at,
        deltaX: 0,
        deltaY: Math.sign(left) * step,
      });
      const next = await settled(within);
      const stuck = next.top === state.top;
      state = next;
      if (stuck) break; // a roda não move mais nada: quem chamou confere a posição
      await onStep?.(state);
    }
    return state;
  };

  /** O elemento aparece dentro da área visível de quem o contém? */
  const inView = (selector, within) =>
    evaluate(
      `(() => {
        const el = document.querySelector(${JSON.stringify(selector)});
        if (!el) return false;
        const r = el.getBoundingClientRect();
        const box = ${within ? `document.querySelector(${JSON.stringify(within)}).getBoundingClientRect()` : `{ top: 0, bottom: innerHeight }`};
        return r.bottom > box.top && r.top < box.bottom;
      })()`,
    );

  return {
    errors,
    open,
    evaluate,
    waitFor,
    click,
    scroll,
    scrollState,
    inView,
    async close() {
      off();
      await cdp.send("Target.disposeBrowserContext", { browserContextId });
    },
  };
}

/* ── execução ────────────────────────────────────────────────────────────── */

/** Não deu para medir: nunca se confunde com "mediu e passou". */
function unmeasured(message) {
  console.error(`não medido: ${message}`);
  process.exit(2);
}

const selected = CASES.filter((c) => !ONLY || c.name.includes(ONLY));
if (selected.length === 0) {
  unmeasured(`nenhum caso contém "${ONLY}" (existem: ${CASES.map((c) => c.name).join(", ")})`);
}
try {
  await fetch(BASE, { redirect: "manual" });
} catch {
  unmeasured(`${BASE} não responde; suba o site com "pnpm build && pnpm start"`);
}

const profile = mkdtempSync(join(tmpdir(), "e2e-site-"));
const chrome = spawn(
  CHROME,
  [
    "--headless=new",
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-extensions",
    `--window-size=${WIDTH},${HEIGHT}`,
    `--user-data-dir=${profile}`,
    `--remote-debugging-port=${PORT}`,
    "about:blank",
  ],
  { stdio: "ignore" },
);
chrome.on("error", (error) => {
  chrome.failure = error.message;
});

const results = [];
let cdp;
let broken = null;

try {
  cdp = connect(await browserWebSocketUrl(chrome));
  await cdp.ready;

  for (const { name, run } of selected) {
    const t = createChecks();
    const startedAt = Date.now();
    const page = await createPage(cdp);
    try {
      await run(page, t);
    } catch (error) {
      t.ok(false, "o caso chegou ao fim", error.message);
    }
    await page.close();
    if (t.checks.length === 0) t.ok(false, "o caso confere alguma coisa");
    results.push({ name, ms: Date.now() - startedAt, checks: t.checks });
  }
} catch (error) {
  broken = error;
} finally {
  cdp?.close();
  chrome.kill();
  // O Chrome ainda escreve no perfil por alguns ms depois do kill; a limpeza
  // é higiene, nunca motivo de falha.
  await sleep(300);
  try {
    rmSync(profile, { recursive: true, force: true });
  } catch {
    /* perfil temporário; o SO recolhe */
  }
}

if (broken) unmeasured(broken.message);

/* ── relatório ───────────────────────────────────────────────────────────── */

const failed = results.flatMap((r) => r.checks.filter((c) => !c.passed));

if (AS_JSON) {
  console.log(JSON.stringify(results, null, 2));
} else {
  console.log(`ponta a ponta em ${BASE} · viewport ${WIDTH}×${HEIGHT}\n`);
  for (const r of results) {
    const bad = r.checks.some((c) => !c.passed);
    console.log(
      `${bad ? "✗" : "✓"} ${r.name.padEnd(28)} ${r.checks.length} asserções · ${(r.ms / 1000).toFixed(1)}s`,
    );
    for (const c of r.checks) {
      if (c.passed && !VERBOSE) continue;
      console.log(`    ${c.passed ? "✓" : "✗"} ${c.label}${c.detail && !c.passed ? ` (${c.detail})` : ""}`);
    }
  }
  const total = results.reduce((n, r) => n + r.checks.length, 0);
  console.log(`\n${results.length} caso(s) · ${total} asserções · ${failed.length} falha(s)`);
}
process.exit(failed.length > 0 ? 1 : 0);
