#!/usr/bin/env node
/**
 * Smoke de ESCRITA do backoffice — o admin autenticado, dirigido de verdade.
 *
 * ── O que ele mede, e por que existe ──────────────────────────────────────
 * A bko-04 trocou a voz dos formulários, dos diálogos e do retorno de ação
 * (toast como linha de saída, `attach:` no upload, eco `rm -rf` na exclusão).
 * Três das suas verificações não se fecham em jsdom: elas pedem uma ESCRITA
 * real — Server Action de verdade, linha de verdade no Postgres, toast de
 * verdade nascido do retorno dessa action. Este script faz exatamente isso e
 * nada além: cria, edita, move, exclui, sobe um arquivo, provoca um erro de
 * servidor, e confere em cada passo o par (feedback na tela ⟷ estado no
 * banco).
 *
 * Mecânica idêntica a `scripts/a11y-admin-axe.mjs`: Chrome headless por CDP
 * com o WebSocket nativo do Node, zero dependência nova, login real pela tela
 * de login. A diferença é que aqui o DOM é só metade da prova — a outra metade
 * é uma consulta Prisma feita pelo próprio script, com o mesmo `DATABASE_URL`
 * do dev server.
 *
 * ── As oito coisas que ele afirma ─────────────────────────────────────────
 *   1. criar candidatura            → recusa do servidor sem perder o que foi
 *                                     digitado, depois feedback + linha no banco
 *   2. editar candidatura (dialog)  → toast de sucesso + persistência
 *   3. mover estágio pelo board     → toast + estágio + `ApplicationEvent`
 *   4. criar contato                → ERRO de servidor primeiro, depois sucesso
 *   5. excluir contato              → eco `rm -rf`, trava por digitação, toast
 *   6. upload de imagem no projeto  → `attach:` + arquivo em disco + servido
 *      (e, na sequência, criar / editar / excluir o projeto)
 *   7. gerar CV com vaga curta      → toast de erro da action do gerador
 *   8. excluir a candidatura        → o banco volta como estava
 * Em todo toast: `data-type`, o marcador (`✓`/`✗`) como TEXTO `aria-hidden`, o
 * texto que sobra para o leitor de tela, e a REGIÃO VIVA que o embrulha.
 *
 * ── Não há passo silencioso ───────────────────────────────────────────────
 * Passo que não dá para percorrer derruba o script com mensagem dizendo o quê
 * e onde. Nada é "pulado porque não deu".
 *
 * ── Limpeza ───────────────────────────────────────────────────────────────
 * Tudo que o script cria leva o mesmo carimbo (`smoke-<base36>`) no nome, e o
 * bloco final apaga o que sobrou — inclusive a `Company` que a criação da
 * candidatura cria de lambuja (a UI não tem tela de empresa) e o arquivo
 * gravado em `UPLOAD_DIR`. O relatório termina dizendo o que restou; se restar
 * alguma coisa, o exit code acusa.
 *
 *   pnpm dev                                       # 5050, com o Postgres de pé
 *   ADMIN_EMAIL=… ADMIN_PASSWORD=… node scripts/smoke-admin-write.mjs
 *   … --only contato,projeto      # subconjunto (marca a execução como PARCIAL)
 *   … --verbose                   # imprime cada toast e cada consulta
 *   … --json                      # as verificações como dados
 *   … --headful                   # abre o Chrome para assistir
 *
 * O login tem trava de 10 tentativas por 15 min por IP
 * (`src/lib/login-throttle.ts`) — o script faz UM login por execução.
 *
 * Exit code:
 *   0  todas as verificações passaram e o banco voltou ao estado inicial
 *   1  alguma verificação falhou (defeito de implementação ou de dado)
 *   2  não foi possível medir (dev server fora do ar, login recusado, passo
 *      impossível) — nenhuma conclusão sobre a bko-04 pode ser tirada
 *   3  as verificações passaram mas sobrou resíduo no banco / em disco
 */
import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";

/* ── flags e configuração ────────────────────────────────────────────────── */

const argv = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  const next = i === -1 ? undefined : argv[i + 1];
  return next && !next.startsWith("--") ? next : fallback;
};
const BASE = flag("base", process.env.SMOKE_BASE ?? "http://localhost:5050");
const PORT = Number(flag("cdp-port", process.env.CDP_PORT ?? 9337));
const WIDTH = Number(flag("width", 1440));
const HEIGHT = Number(flag("height", 900));
const ONLY = (flag("only", "") || "")
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);
const VERBOSE = argv.includes("--verbose");
const AS_JSON = argv.includes("--json");
const HEADFUL = argv.includes("--headful");

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

/** Carimbo único desta execução — entra em TODO nome criado. */
const STAMP = `smoke-${Date.now().toString(36)}`;
const COMPANY = `Smoke QA ${STAMP}`;
const ROLE = "Engenheira de Verificacao";
const CONTACT_NAME = `Smoke Contato ${STAMP}`;
const PROJECT_NAME = `Smoke Projeto ${STAMP}`;
const PROJECT_SLUG = `smoke-projeto-${STAMP}`;

/* ── segredos: do ambiente, nunca do repositório ─────────────────────────── */

function env(name) {
  if (process.env[name]) return process.env[name];
  for (const file of [".env.local", ".env"]) {
    const url = new URL(`../${file}`, import.meta.url);
    if (!existsSync(url)) continue;
    const line = readFileSync(url, "utf8")
      .split("\n")
      .find((l) => l.startsWith(`${name}=`));
    const value = line
      ? line.slice(name.length + 1).trim().replace(/^["']|["']$/g, "")
      : "";
    if (value) return value;
  }
  throw new Blocked(
    `${name} não está no ambiente. Exporte ${name} antes de rodar — ` +
      `a .env.local do dev não guarda a senha do admin.`,
  );
}

/** Onde `src/lib/uploads.ts` grava. Mesma regra, para o script achar o arquivo. */
const UPLOAD_DIR =
  process.env.UPLOAD_DIR || join(new URL("..", import.meta.url).pathname, "uploads");

/* ── erros com significado ───────────────────────────────────────────────── */

/** Não deu para medir: nada se conclui sobre a implementação. */
class Blocked extends Error {}
/** Deu para medir e a tela/banco não fez o que a change promete. */
class Failed extends Error {}

/* ── coletor de verificações ─────────────────────────────────────────────── */

const checks = [];
let currentStep = "—";

function step(name) {
  currentStep = name;
  if (!AS_JSON) console.log(`\n── ${name} ${"─".repeat(Math.max(0, 58 - name.length))}`);
}

function ok(label, detail = "") {
  checks.push({ step: currentStep, label, ok: true, detail });
  if (!AS_JSON) console.log(`  ✓ ${label}${detail ? `  ${detail}` : ""}`);
}

function bad(label, detail = "") {
  checks.push({ step: currentStep, label, ok: false, detail });
  if (!AS_JSON) console.log(`  ✗ ${label}${detail ? `  ${detail}` : ""}`);
}

/** A asserção padrão: registra e segue. */
function expect(cond, label, detail = "") {
  if (cond) ok(label, detail);
  else bad(label, detail);
  return Boolean(cond);
}

/** Asserção que, falhando, invalida o resto do passo. */
function require_(cond, label, detail = "") {
  if (!expect(cond, label, detail)) {
    throw new Failed(`${label}${detail ? ` — ${detail}` : ""}`);
  }
}

function note(text) {
  if (!AS_JSON) console.log(`  · ${text}`);
}

function wants(name) {
  return ONLY.length === 0 || ONLY.some((o) => name.toLowerCase().includes(o));
}

/* ── CDP mínimo (mesmo helper de a11y-admin-axe.mjs) ─────────────────────── */

function connect(url) {
  const ws = new WebSocket(url);
  const pending = new Map();
  let id = 0;
  const ready = new Promise((resolve, reject) => {
    ws.addEventListener("open", () => resolve());
    ws.addEventListener("error", (e) => reject(new Blocked(`websocket: ${e.message ?? "erro"}`)));
  });
  ws.addEventListener("message", (event) => {
    const msg = JSON.parse(event.data);
    const slot = pending.get(msg.id);
    if (!slot) return;
    pending.delete(msg.id);
    if (msg.error) slot.reject(new Blocked(`${slot.method}: ${msg.error.message}`));
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
const js = (value) => JSON.stringify(value);

async function browserWebSocketUrl() {
  for (let i = 0; i < 200; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/version`);
      const json = await res.json();
      if (json.webSocketDebuggerUrl) return json.webSocketDebuggerUrl;
    } catch {
      /* ainda subindo */
    }
    await sleep(100);
  }
  throw new Blocked(`Chrome não abriu a porta de depuração ${PORT} em 20s`);
}

/* ── o gravador de toasts ────────────────────────────────────────────────── */

/**
 * Um toast do sonner vive ~4s e some. Ler o DOM "depois do clique" é uma
 * corrida que às vezes se perde — e um toast perdido viraria "não apareceu",
 * que é a conclusão errada. Então o registro é feito por `MutationObserver`
 * instalado ANTES de qualquer script da página
 * (`Page.addScriptToEvaluateOnNewDocument`), e guardado em `sessionStorage`
 * para sobreviver às navegações da própria aplicação — é assim que dá para
 * afirmar que a criação de candidatura, que REDIRECIONA, não emite toast.
 *
 * De cada toast sai: o tipo, o texto, o marcador, se o marcador é
 * `aria-hidden`, o TEXTO QUE SOBRA depois de descartar tudo que é
 * `aria-hidden` (o que o leitor de tela anuncia), e a região viva que o
 * embrulha.
 */
const TOAST_RECORDER = String.raw`(() => {
  if (window.__smokeRecorder) return;
  window.__smokeRecorder = true;
  const KEY = "__smokeToasts";
  const push = (entry) => {
    let all = [];
    try { all = JSON.parse(sessionStorage.getItem(KEY) || "[]"); } catch { all = []; }
    all.push(entry);
    sessionStorage.setItem(KEY, JSON.stringify(all));
  };
  /* O texto que o leitor de tela recebe: tudo menos o que é aria-hidden. */
  const atText = (root) => {
    let out = "";
    const walk = (node) => {
      if (node.nodeType === 3) { out += node.nodeValue; return; }
      if (node.nodeType !== 1) return;
      if (node.getAttribute("aria-hidden") === "true") return;
      for (const child of node.childNodes) walk(child);
    };
    walk(root);
    return out.replace(/\s+/g, " ").trim();
  };
  const liveOf = (el) => {
    let n = el;
    while (n && n !== document.documentElement) {
      const live = n.getAttribute ? n.getAttribute("aria-live") : null;
      const role = n.getAttribute ? n.getAttribute("role") : null;
      if (live || role === "status" || role === "alert" || role === "log") {
        return {
          tag: n.tagName.toLowerCase(),
          ariaLive: live || "",
          role: role || "",
          atomic: n.getAttribute("aria-atomic") || "",
          label: n.getAttribute("aria-label") || "",
        };
      }
      n = n.parentElement;
    }
    return null;
  };
  const capture = (li) => {
    if (li.__smokeSeen) return;
    li.__smokeSeen = true;
    const icon = li.querySelector("[data-icon]");
    const title = li.querySelector("[data-title]");
    const cs = icon ? getComputedStyle(icon) : null;
    push({
      at: Date.now(),
      path: location.pathname + location.search,
      type: li.getAttribute("data-type") || "",
      text: (title ? title.textContent : li.textContent || "").replace(/\s+/g, " ").trim(),
      visible: (li.textContent || "").replace(/\s+/g, " ").trim(),
      announced: atText(li),
      marker: icon ? (icon.textContent || "").trim() : "",
      markerClass: icon ? icon.getAttribute("class") || "" : "",
      markerAriaHidden: icon
        ? icon.getAttribute("aria-hidden") === "true" ||
          [...icon.querySelectorAll("*")].every((n) => n.getAttribute("aria-hidden") === "true")
        : null,
      markerColor: cs ? cs.color : "",
      live: liveOf(li),
    });
  };
  const scan = (root) => {
    if (!root || root.nodeType !== 1) return;
    if (root.matches && root.matches("li[data-sonner-toast]")) setTimeout(() => capture(root), 40);
    if (root.querySelectorAll) {
      for (const li of root.querySelectorAll("li[data-sonner-toast]")) setTimeout(() => capture(li), 40);
    }
  };
  const start = () => {
    scan(document.body);
    new MutationObserver((records) => {
      for (const r of records) for (const n of r.addedNodes) scan(n);
    }).observe(document.documentElement, { childList: true, subtree: true });
  };
  if (document.body) start();
  else document.addEventListener("DOMContentLoaded", start);
})()`;

/* ── um PNG de verdade, fora do repositório ──────────────────────────────── */

/** 1×1 PNG opaco. Pequeno, mas um PNG legítimo — o upload valida a extensão. */
const PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

/* ── execução ────────────────────────────────────────────────────────────── */

const prisma = new PrismaClient({
  datasources: { db: { url: env("DATABASE_URL") } },
});

const workdir = mkdtempSync(join(tmpdir(), "smoke-admin-"));
const pngPath = join(workdir, `capa-${STAMP}.png`);
writeFileSync(pngPath, Buffer.from(PNG_BASE64, "base64"));

const profile = mkdtempSync(join(tmpdir(), "smoke-chrome-"));
let chrome;
let cdp;
/** Arquivos gravados em UPLOAD_DIR por este script — apagados no fim. */
const uploaded = [];
let exitCode = 0;
let fatal = null;
/** Preenchido assim que o CDP está de pé; usado só quando um passo falha. */
let diagnose = null;

try {
  if (!AS_JSON) {
    console.log(`smoke de escrita do admin · ${BASE} · ${WIDTH}×${HEIGHT}`);
    console.log(`carimbo desta execução: ${STAMP}`);
    if (ONLY.length) console.log(`EXECUÇÃO PARCIAL — só: ${ONLY.join(", ")}`);
  }

  /* O dev server tem de estar de pé ANTES do Chrome: sem isso o erro que o
     usuário vê seria "elemento não encontrado", que mente sobre a causa. */
  const ping = await fetch(`${BASE}/admin/login`).catch(() => null);
  if (!ping || !ping.ok) {
    throw new Blocked(
      `${BASE}/admin/login não respondeu (pnpm dev está de pé na 5050?).`,
    );
  }

  /* Porta de depuração já ocupada é ARMADILHA, não conveniência: o script
     atacharia no Chrome de outra execução (ou de outro script), dirigiria a
     aba errada e culparia a aplicação pelo que não aconteceu. Já custou uma
     rodada de diagnóstico. */
  const squatter = await fetch(`http://127.0.0.1:${PORT}/json/version`).catch(() => null);
  if (squatter) {
    throw new Blocked(
      `a porta de depuração ${PORT} já está ocupada por outro Chrome. ` +
        `Feche-o (pkill -f "remote-debugging-port=${PORT}") ou passe --cdp-port <outra>.`,
    );
  }

  chrome = spawn(
    CHROME,
    [
      ...(HEADFUL ? [] : ["--headless=new"]),
      "--disable-gpu",
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

  cdp = connect(await browserWebSocketUrl());
  await cdp.ready;
  const { targetId } = await cdp.send("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await cdp.send("Target.attachToTarget", { targetId, flatten: true });
  const call = (m, p) => cdp.send(m, p, sessionId);

  await call("Page.enable");
  await call("Runtime.enable");
  await call("DOM.enable");
  await call("Emulation.setDeviceMetricsOverride", {
    width: WIDTH,
    height: HEIGHT,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await call("Page.addScriptToEvaluateOnNewDocument", { source: TOAST_RECORDER });

  /* ── primitivas de condução ───────────────────────────────────────────── */

  const evaluate = async (expression, awaitPromise = true) => {
    const { result, exceptionDetails } = await call("Runtime.evaluate", {
      expression,
      returnByValue: true,
      awaitPromise,
    });
    if (exceptionDetails) {
      throw new Blocked(
        `avaliação falhou em ${currentStep}: ${
          exceptionDetails.exception?.description ?? exceptionDetails.text
        }`,
      );
    }
    return result.value;
  };

  const json = async (expression) => JSON.parse(await evaluate(`JSON.stringify(${expression})`, false));
  /** O mesmo, para uma expressão que devolve Promise (um `fetch`, por exemplo). */
  const jsonAsync = async (expression) =>
    JSON.parse(await evaluate(`(${expression}).then((v) => JSON.stringify(v))`, true));

  const goto = async (path) => {
    await call("Page.navigate", { url: `${BASE}${path}` });
    for (let i = 0; i < 400; i++) {
      const state = await evaluate("document.readyState", false).catch(() => "loading");
      if (state === "complete") break;
      await sleep(100);
    }
    // `next dev` compila sob demanda e hidrata depois do `complete`.
    await sleep(900);
  };

  /** Espera uma condição no DOM; estourar o prazo é FALHA de passo, não aviso. */
  const waitFor = async (expression, label, timeout = 15000) => {
    const t0 = Date.now();
    while (Date.now() - t0 < timeout) {
      const value = await evaluate(expression, false).catch(() => false);
      if (value) return value;
      await sleep(120);
    }
    throw new Failed(`tempo esgotado esperando ${label} (${timeout}ms)`);
  };

  const exists = async (sel) => Boolean(await evaluate(`Boolean(document.querySelector(${js(sel)}))`, false));

  /**
   * `exists` com paciência. `next dev` compila a rota na primeira visita e a
   * hidratação vem depois do `readyState: complete`: uma checagem única
   * transformava "a página demorou" em "o formulário não existe", que é a
   * conclusão errada — manda procurar defeito onde não há.
   */
  const waitExists = async (sel, timeout = 25000) => {
    const t0 = Date.now();
    while (Date.now() - t0 < timeout) {
      if (await exists(sel)) return true;
      await sleep(150);
    }
    return false;
  };

  /**
   * Clique de MOUSE de verdade (não `el.click()`): é o que o usuário faz, e é
   * o único jeito de o `:focus-visible` e os handlers de ponteiro do Radix
   * verem o que veriam em uso real.
   *
   * Duas armadilhas, as duas já custaram uma execução inteira:
   *
   * 1. `globals.css` liga `scroll-behavior: smooth`. Um `scrollIntoView()`
   *    sem `behavior: "instant"` ROLA ANIMADO, e o `getBoundingClientRect()`
   *    lido no mesmo turno devolve a posição de ANTES da rolagem — o clique
   *    cai num ponto que já não é o botão. O sintoma era mudo: nada acontecia.
   * 2. Coordenada não sabe o que há por cima. Por isso o `elementFromPoint`:
   *    se o ponto pertencer a outro elemento, o clique é ABORTADO com o nome
   *    de quem cobriu, em vez de clicar em algo que ninguém pediu.
   */
  const click = async (sel, what = sel) => {
    const found = await evaluate(
      `(() => { const el = document.querySelector(${js(sel)});
         if (!el) return false;
         el.scrollIntoView({ block: "center", inline: "center", behavior: "instant" });
         return true; })()`,
      false,
    );
    if (!found) throw new Failed(`não achei o elemento para clicar: ${what}`);
    await sleep(150);
    const box = await json(
      `(() => { const el = document.querySelector(${js(sel)});
         if (!el) return null;
         const r = el.getBoundingClientRect();
         const x = r.x + r.width / 2, y = r.y + r.height / 2;
         const top = document.elementFromPoint(x, y);
         return { x, y, w: r.width, h: r.height, disabled: Boolean(el.disabled),
                  onTarget: Boolean(top) && (el === top || el.contains(top) || top.contains(el)),
                  cover: top ? top.tagName.toLowerCase() +
                    (top.getAttribute("class") ? "." + top.getAttribute("class").slice(0, 40) : "") : "nada" }; })()`,
    );
    if (!box) throw new Failed(`não achei o elemento para clicar: ${what}`);
    if (box.w === 0 || box.h === 0) throw new Failed(`elemento invisível (0×0): ${what}`);
    if (!box.onTarget) {
      throw new Failed(`o ponto de clique de ${what} está coberto por ${box.cover} — clique abortado`);
    }
    for (const type of ["mousePressed", "mouseReleased"]) {
      await call("Input.dispatchMouseEvent", {
        type,
        x: box.x,
        y: box.y,
        button: "left",
        buttons: type === "mousePressed" ? 1 : 0,
        clickCount: 1,
      });
    }
    await sleep(180);
    return box;
  };

  /** O mesmo clique, para um elemento achado por texto. */
  const clickText = async (sel, text, what = `${sel} "${text}"`) => {
    const marked = await evaluate(
      `(() => { const t = ${js(text)}.toLowerCase();
         const el = [...document.querySelectorAll(${js(sel)})]
           .find((n) => (n.textContent || "").toLowerCase().includes(t));
         if (!el) return false;
         el.setAttribute("data-smoke-target", "1");
         return true; })()`,
      false,
    );
    if (!marked) throw new Failed(`não achei ${what}`);
    const box = await click("[data-smoke-target]", what);
    await evaluate(
      `(() => { const el = document.querySelector("[data-smoke-target]");
         if (el) el.removeAttribute("data-smoke-target"); return true; })()`,
      false,
    );
    return box;
  };

  /** Escreve num campo controlado pelo React sem fingir o evento. */
  const fill = async (sel, value) => {
    const done = await evaluate(
      `(() => { const el = document.querySelector(${js(sel)});
         if (!el) return false;
         const proto = el instanceof HTMLTextAreaElement
           ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
         Object.getOwnPropertyDescriptor(proto, "value").set.call(el, ${js(value)});
         el.dispatchEvent(new Event("input", { bubbles: true }));
         el.dispatchEvent(new Event("change", { bubbles: true }));
         return true; })()`,
      false,
    );
    if (!done) throw new Failed(`não achei o campo ${sel}`);
    await sleep(120);
  };

  /**
   * Teclado de verdade, caractere a caractere — é o que a trava por digitação
   * exige. `rawKeyDown` + `char` + `keyUp` (e não `keyDown` com `text`) porque
   * `keyDown` com texto JÁ insere o caractere: somado ao `char` ele digitaria
   * tudo em dobro.
   */
  const typeText = async (text) => {
    for (const ch of text) {
      await call("Input.dispatchKeyEvent", { type: "rawKeyDown", key: ch });
      await call("Input.dispatchKeyEvent", { type: "char", text: ch, key: ch });
      await call("Input.dispatchKeyEvent", { type: "keyUp", key: ch });
      await sleep(18);
    }
    await sleep(150);
  };

  const drainToasts = async () =>
    JSON.parse(
      await evaluate(
        `(() => { const raw = sessionStorage.getItem("__smokeToasts") || "[]";
           sessionStorage.setItem("__smokeToasts", "[]"); return raw; })()`,
        false,
      ),
    );

  /** Espera UM toast que case com o predicado; devolve ele e os que vieram junto. */
  const waitToast = async (match, label, timeout = 20000) => {
    const seen = [];
    const t0 = Date.now();
    while (Date.now() - t0 < timeout) {
      seen.push(...(await drainToasts()));
      const hit = seen.find(match);
      if (hit) {
        if (VERBOSE) note(`toast: ${JSON.stringify(hit)}`);
        return { hit, seen };
      }
      await sleep(120);
    }
    throw new Failed(
      `nenhum toast ${label} em ${timeout}ms. Vistos: ` +
        (seen.length ? seen.map((t) => `${t.type}:"${t.text}"`).join(" | ") : "(nenhum)"),
    );
  };

  diagnose = async () => ({
    url: await evaluate("location.pathname + location.search", false),
    errors: await json(
      `[...document.querySelectorAll('[role="alert"], p')]
         .map((n) => (n.textContent || "").replace(/\\s+/g, " ").trim())
         .filter((t) => t.startsWith("stderr:"))`,
    ),
    toasts: (await drainToasts()).map((t) => `${t.type}:"${t.text}"`),
    buttons: await json(
      `[...document.querySelectorAll("button")]
         .map((b) => (b.textContent || "").replace(/\\s+/g, " ").trim())
         .filter(Boolean).slice(0, 14)`,
    ),
  });

  /** As três perguntas que a tarefa 2.2 faz a TODO toast. */
  const assertToastShape = (toast, { type, marker }) => {
    expect(toast.type === type, `toast é data-type="${type}"`, `veio "${toast.type}"`);
    expect(toast.marker === marker, `marcador é "${marker}"`, `veio "${toast.marker}"`);
    expect(
      toast.markerAriaHidden === true,
      "marcador é aria-hidden (não entra no anúncio)",
      `markerAriaHidden=${toast.markerAriaHidden}`,
    );
    expect(
      toast.announced === toast.text,
      "o leitor de tela recebe só a mensagem, sem o marcador",
      `anunciado="${toast.announced}"`,
    );
    expect(
      Boolean(toast.live) && (toast.live.ariaLive !== "" || toast.live.role === "status"),
      "o toast nasce dentro de uma região viva",
      toast.live ? `<${toast.live.tag} aria-live="${toast.live.ariaLive}" role="${toast.live.role}">` : "nenhuma",
    );
    expect(
      (toast.markerClass || "").includes("admin-output-marker"),
      "marcador carrega a classe do tema do admin",
      toast.markerClass,
    );
  };

  /* ── login (uma vez por execução) ─────────────────────────────────────── */

  step("0. login real na tela de login");
  await goto("/admin/login");
  require_(await waitExists('input[name="email"]'), "a tela de login carregou");
  await fill('input[name="email"]', env("ADMIN_EMAIL"));
  await fill('input[name="password"]', env("ADMIN_PASSWORD"));
  await click('form button[type="submit"]', "[ entrar ]");
  for (let i = 0; i < 120; i++) {
    const path = await evaluate("location.pathname", false);
    if (!path.includes("/admin/login")) break;
    await sleep(120);
  }
  const landed = await evaluate("location.pathname", false);
  if (landed.includes("/admin/login")) {
    throw new Blocked(
      `login recusado: ainda em ${landed}. Confira ADMIN_EMAIL/ADMIN_PASSWORD. ` +
        `A trava é de 10 tentativas por 15 min por IP (src/lib/login-throttle.ts); ` +
        `solte com: delete from "McpRateLimit" where bucket like 'login:%';`,
    );
  }
  ok("sessão de admin obtida", `caiu em ${landed}`);
  await drainToasts();

  /* ── 1. criar candidatura ─────────────────────────────────────────────── */

  let applicationId = null;
  let folderName = null;

  if (wants("candidatura")) {
    step("1. candidatura · criar");
    await goto("/admin/applications/new");
    require_(await waitExists('input[name="company"]'), "o formulário de criação carregou");
    await fill('input[name="company"]', COMPANY);
    await fill('input[name="roleTitle"]', ROLE);
    folderName = await evaluate(`document.querySelector('input[name="folderName"]').value`, false);
    expect(
      /^[a-z0-9-]+--[a-z0-9-]+$/.test(folderName),
      "a chave natural nasce derivada de empresa--cargo",
      folderName,
    );
    /* Antes do caminho feliz, o caminho de ERRO do formulário completo — que
       é o outro recipiente do reset do React 19: aqui a action é uma Server
       Action via `useActionState`. `priority = 999` passa pela validação
       nativa do navegador e morre no zod do servidor. */
    await fill('input[name="locationText"]', "Toronto, ON");
    await fill('input[name="priority"]', "999");
    await fill("#notesMd", "nota que não pode sumir");
    await drainToasts();
    await clickText("button[type=submit]", "criar candidatura");
    await waitFor(
      `Boolean([...document.querySelectorAll('[role=alert]')].find((n) => n.textContent.includes("Prioridade")))`,
      "o erro de servidor no formulário completo",
      25000,
    );
    const recusa = await json(
      `(() => { const f = document.querySelector('input[name="company"]').form;
         const el = (n) => { const x = f.querySelector('[name="' + n + '"]'); return x ? x.value : "(ausente)"; };
         const alerts = [...document.querySelectorAll('[role=alert]')]
           .map((n) => n.textContent.replace(/\\s+/g, " ").trim());
         const trigger = document.getElementById("stage");
         return { company: el("company"), location: el("locationText"), priority: el("priority"),
                  notes: el("notesMd"), stage: el("stage"), source: el("source"),
                  stageVisivel: trigger ? trigger.textContent.trim() : "", alerts }; })()`,
    );
    expect(
      recusa.alerts.includes("stderr: Prioridade deve ser um número de 1 a 99."),
      "o erro do servidor aparece no campo como `stderr:`",
      recusa.alerts.join(" | "),
    );
    expect(
      recusa.alerts.includes("stderr: Confira os campos destacados."),
      "e o rodapé do formulário repete o resumo",
      recusa.alerts.join(" | "),
    );
    expect(
      recusa.company === COMPANY &&
        recusa.location === "Toronto, ON" &&
        recusa.priority === "999" &&
        recusa.notes === "nota que não pode sumir",
      "o erro NÃO apaga o que o usuário digitou (texto e notas)",
      JSON.stringify(recusa),
    );
    expect(
      recusa.stage === "radar" && recusa.source === "company_site" && recusa.stageVisivel === "Radar",
      "os seletores continuam com o valor escolhido, e o visível bate com o enviado",
      `stage=${recusa.stage} (mostra "${recusa.stageVisivel}") · source=${recusa.source}`,
    );
    const nadaAinda = await prisma.application.findFirst({
      where: { folderName: { contains: STAMP } },
      select: { id: true },
    });
    expect(!nadaAinda, "a recusa não gravou nada no banco", nadaAinda ? "gravou!" : "0 linhas");

    await fill('input[name="priority"]', "3");
    await drainToasts();
    await clickText("button[type=submit]", "criar candidatura");
    await waitFor(`location.search.includes("created=")`, "o redirecionamento da criação", 25000);

    const created = await json(
      `(() => ({ path: location.pathname, search: location.search,
                 notice: [...document.querySelectorAll("p")]
                   .map((p) => (p.textContent || "").trim())
                   .find((t) => t.includes("criada.")) || "" }))()`,
    );
    expect(
      created.path === "/admin/applications" &&
        created.search.includes(`created=${encodeURIComponent(folderName)}`),
      "a criação redireciona para a listagem com a chave criada",
      `${created.path}${created.search}`,
    );
    expect(
      created.notice === `Candidatura “${folderName}” criada.`,
      "o aviso de criação aparece na listagem",
      created.notice,
    );
    const afterCreate = await drainToasts();
    expect(
      afterCreate.length === 0,
      "criar NÃO emite toast — o feedback é a navegação (AGENTS.md §2/§5.2)",
      afterCreate.map((t) => t.text).join(" | ") || "0 toasts, como o contrato manda",
    );

    const row = await prisma.application.findUnique({
      where: { folderName },
      include: { company: { select: { name: true } } },
    });
    require_(Boolean(row), "a linha existe no Postgres", `folderName=${folderName}`);
    applicationId = row.id;
    expect(row.company?.name === COMPANY, "a empresa foi resolvida e vinculada", row.company?.name ?? "—");
    expect(row.stage === "radar", "nasce em `radar`", row.stage);
    expect(row.roleTitle === ROLE, "o cargo persistiu", String(row.roleTitle));
    /* `locationText` fica em `Job`, e sem `jobUrl` não nasce vaga — por isso a
       conferência é sobre `priority` e `notesMd`, que moram em `Application`. */
    expect(
      row.priority === 3 && row.notesMd === "nota que não pode sumir",
      "o que sobreviveu à recusa foi gravado na segunda tentativa",
      `priority=${row.priority} notas="${row.notesMd}"`,
    );
    note(`id=${applicationId}`);
  }

  /* ── 2. editar candidatura pelo dialog de campos-chave ────────────────── */

  if (wants("candidatura") && applicationId) {
    step("2. candidatura · editar (dialog campos-chave) → toast de sucesso");
    await goto(`/admin/applications/${applicationId}`);
    await clickText("button", "editar campos-chave");
    await waitFor(`Boolean(document.querySelector('[data-slot="dialog-content"]'))`, "o dialog abrir");
    await fill("#kf-market", "SMOKE-CA");
    await fill("#kf-priority", "7");
    await drainToasts();
    await clickText('[data-slot="dialog-content"] button[type=submit]', "salvar");

    const { hit } = await waitToast((t) => t.text.includes("Candidatura atualizada"), "de sucesso da edição");
    expect(hit.text === "Candidatura atualizada.", "o toast traz a mensagem da action", hit.text);
    assertToastShape(hit, { type: "success", marker: "✓" });
    expect(
      !(await exists('[data-slot="dialog-content"]')),
      "o dialog fecha no sucesso",
    );

    const row = await prisma.application.findUnique({ where: { id: applicationId } });
    expect(row.market === "SMOKE-CA", "o mercado persistiu no banco", String(row.market));
    expect(row.priority === 7, "a prioridade persistiu no banco", String(row.priority));
  }

  /* ── 3. mover o estágio pelo board ────────────────────────────────────── */

  if (wants("board") && applicationId) {
    step("3. board · mover estágio → toast + evento na timeline");
    await goto(`/admin/applications/board?q=${encodeURIComponent(COMPANY)}`);
    const triggers = await evaluate(
      `document.querySelectorAll('button[aria-label^="Mover "]').length`,
      false,
    );
    require_(triggers === 1, "o filtro deixou exatamente um card no board", `${triggers} gatilho(s)`);
    await drainToasts();
    await click('button[aria-label^="Mover "]', "menu mover para…");
    await waitFor(`Boolean(document.querySelector('[role="menu"]'))`, "o menu abrir");
    await clickText('[role="menuitem"]', "Enviada");

    const { hit } = await waitToast((t) => t.text.includes("movida para"), "de sucesso do board");
    expect(
      hit.text === `“${COMPANY}” movida para Enviada.`,
      "o toast nomeia a candidatura e o estágio de destino",
      hit.text,
    );
    assertToastShape(hit, { type: "success", marker: "✓" });

    const row = await prisma.application.findUnique({ where: { id: applicationId } });
    expect(row.stage === "applied", "o estágio mudou no banco", row.stage);
    expect(Boolean(row.appliedAt), "`appliedAt` foi carimbado uma vez", String(row.appliedAt));
    const event = await prisma.applicationEvent.findFirst({
      where: { applicationId, type: "stage_change" },
      orderBy: { occurredAt: "desc" },
    });
    expect(
      Boolean(event) && event.fromStage === "radar" && event.toStage === "applied",
      "a transição virou `ApplicationEvent` na mesma transação",
      event ? `${event.fromStage} → ${event.toStage}` : "nenhum evento",
    );
  }

  /* ── 4. contato: erro de servidor, depois sucesso ─────────────────────── */

  let contactId = null;

  if (wants("contato")) {
    step("4. contato · erro de servidor numa ação real, depois criar");
    await goto("/admin/contacts");
    await clickText("button", "novo contato");
    await waitFor(`Boolean(document.querySelector("#contact-name"))`, "o dialog de contato abrir");
    await fill("#contact-name", CONTACT_NAME);
    await fill("#contact-email", "isto-nao-e-email");
    await drainToasts();
    await clickText('[data-slot="dialog-content"] button[type=submit]', "salvar");

    const erro = await waitToast((t) => t.type === "error", "de ERRO vindo do servidor");
    expect(
      erro.hit.text === "Confira os campos destacados.",
      "o toast de erro traz a mensagem que a Server Action devolveu",
      erro.hit.text,
    );
    assertToastShape(erro.hit, { type: "error", marker: "✗" });

    const inline = await json(
      `(() => { const el = document.querySelector("#contact-email-error");
         if (!el) return null;
         const hidden = [...el.querySelectorAll('[aria-hidden="true"]')].map((n) => n.textContent.trim());
         const at = (() => { let out = ""; const walk = (n) => {
             if (n.nodeType === 3) { out += n.nodeValue; return; }
             if (n.nodeType !== 1) return;
             if (n.getAttribute("aria-hidden") === "true") return;
             for (const c of n.childNodes) walk(c); };
           walk(el); return out.replace(/\\s+/g, " ").trim(); })();
         const input = document.querySelector("#contact-email");
         return { visible: el.textContent.replace(/\\s+/g, " ").trim(), hidden, at,
                  role: el.getAttribute("role") || "",
                  invalid: input.getAttribute("aria-invalid"),
                  describedby: input.getAttribute("aria-describedby") || "" }; })()`,
    );
    require_(Boolean(inline), "o erro do campo foi renderizado", "#contact-email-error");
    expect(inline.visible.startsWith("stderr:"), "o erro do campo aparece como `stderr:`", inline.visible);
    expect(inline.hidden.includes("stderr:"), "o prefixo `stderr:` é aria-hidden", inline.hidden.join("|"));
    expect(inline.at === "E-mail inválido.", "o leitor de tela recebe só a mensagem", inline.at);
    expect(inline.role === "alert", "o erro do campo é `role=\"alert\"`", inline.role);
    expect(inline.invalid === "true", "o campo fica `aria-invalid`", String(inline.invalid));
    expect(
      inline.describedby.includes("contact-email-error"),
      "o campo aponta para o erro por `aria-describedby`",
      inline.describedby,
    );

    const refused = await prisma.contact.findFirst({ where: { name: CONTACT_NAME } });
    expect(!refused, "o servidor RECUSOU: nada foi gravado", refused ? "gravou!" : "0 linhas");

    /* A regressão que este smoke descobriu: o React 19 reseta o formulário ao
       fim de QUALQUER função de `action`, então o erro voltava com os campos
       em branco — e o campo obrigatório zerado nem deixava submeter de novo.
       Ver `src/components/admin/form-submit.ts`. */
    const kept = await json(
      `(() => { const f = document.getElementById("contact-name").form;
         return { name: f.elements.name.value, email: f.elements.email.value }; })()`,
    );
    expect(
      kept.name === CONTACT_NAME && kept.email === "isto-nao-e-email",
      "o erro NÃO apaga o que o usuário digitou",
      `name="${kept.name}" email="${kept.email}"`,
    );

    // Agora o caminho feliz, no mesmo dialog.
    await fill("#contact-email", `smoke.${STAMP}@local.test`);
    await drainToasts();
    await clickText('[data-slot="dialog-content"] button[type=submit]', "salvar");
    await sleep(3000);
    const sucesso = await waitToast((t) => t.type === "success", "de sucesso do contato");
    expect(
      sucesso.hit.text === "Contato criado.",
      "o toast de sucesso traz a mensagem da action",
      sucesso.hit.text,
    );
    assertToastShape(sucesso.hit, { type: "success", marker: "✓" });
    expect(!(await exists('[data-slot="dialog-content"]')), "o dialog fecha só no sucesso");

    const saved = await prisma.contact.findFirst({ where: { name: CONTACT_NAME } });
    require_(Boolean(saved), "o contato existe no Postgres", CONTACT_NAME);
    contactId = saved.id;
    expect(saved.email === `smoke.${STAMP}@local.test`, "o e-mail corrigido persistiu", String(saved.email));
    expect(saved.visibility === "private", "nasce privado por schema", saved.visibility);
  }

  /* ── 5. excluir contato: eco, trava por digitação, toast ──────────────── */

  if (wants("contato") && contactId) {
    step("5. contato · excluir (eco `rm -rf`, trava por digitação)");
    await goto(`/admin/contacts?q=${encodeURIComponent(CONTACT_NAME)}`);
    await click(`button[aria-label="Excluir contato ${CONTACT_NAME}"]`, "gatilho de exclusão do contato");
    await waitFor(`Boolean(document.querySelector('[data-slot="alert-dialog-content"]'))`, "o alert dialog abrir");

    const echo = await json(
      `(() => { const box = document.querySelector('[data-slot="alert-dialog-content"]');
         const p = [...box.querySelectorAll("p")].find((n) => (n.textContent || "").includes("rm -rf"));
         if (!p) return null;
         const hidden = [...p.querySelectorAll('[aria-hidden="true"]')].map((n) => n.textContent);
         const at = (() => { let out = ""; const walk = (n) => {
             if (n.nodeType === 3) { out += n.nodeValue; return; }
             if (n.nodeType !== 1) return;
             if (n.getAttribute("aria-hidden") === "true") return;
             for (const c of n.childNodes) walk(c); };
           walk(p); return out.replace(/\\s+/g, " ").trim(); })();
         const action = [...box.querySelectorAll("button")]
           .find((b) => (b.textContent || "").includes("excluir definitivamente"));
         const focus = document.activeElement;
         return { visible: p.textContent.replace(/\\s+/g, " ").trim(), hidden, at,
                  disabled: Boolean(action && action.disabled),
                  focus: (focus && focus.textContent || "").trim() }; })()`,
    );
    require_(Boolean(echo), "o eco do comando está no diálogo");
    expect(
      echo.visible === `$ rm -rf contacts/${CONTACT_NAME} [y/N]`,
      "o eco é `$ rm -rf contacts/<nome> [y/N]`",
      echo.visible,
    );
    expect(echo.hidden.some((h) => h.includes("[y/N]")), "o `[y/N]` é aria-hidden", echo.hidden.join("|"));
    expect(echo.at === `rm -rf contacts/${CONTACT_NAME}`, "o leitor recebe só o comando", echo.at);
    expect(echo.focus.includes("cancelar"), "o foco inicial cai no `[ cancelar ]`", echo.focus);
    expect(echo.disabled === true, "o botão de confirmar nasce DESABILITADO", `disabled=${echo.disabled}`);

    // Digitação de verdade: primeiro um prefixo (continua travado), depois o resto.
    const prefix = CONTACT_NAME.slice(0, -4);
    const rest = CONTACT_NAME.slice(-4);
    await click(`#confirm-delete-${contactId}`, "campo de confirmação");
    await typeText(prefix);
    const midway = await json(
      `(() => { const b = [...document.querySelectorAll('[data-slot="alert-dialog-content"] button')]
           .find((n) => (n.textContent || "").includes("excluir definitivamente"));
         return { typed: document.querySelector(${js(`#confirm-delete-${contactId}`)}).value,
                  disabled: Boolean(b && b.disabled) }; })()`,
    );
    expect(
      midway.typed === prefix && midway.disabled === true,
      "com o nome incompleto o botão continua desabilitado",
      `"${midway.typed}" → disabled=${midway.disabled}`,
    );
    await typeText(rest);
    const armed = await json(
      `(() => { const b = [...document.querySelectorAll('[data-slot="alert-dialog-content"] button')]
           .find((n) => (n.textContent || "").includes("excluir definitivamente"));
         return { typed: document.querySelector(${js(`#confirm-delete-${contactId}`)}).value,
                  disabled: Boolean(b && b.disabled) }; })()`,
    );
    require_(
      armed.typed === CONTACT_NAME && armed.disabled === false,
      "só com o nome EXATO o botão habilita",
      `"${armed.typed}" → disabled=${armed.disabled}`,
    );

    await drainToasts();
    await clickText('[data-slot="alert-dialog-content"] button', "excluir definitivamente");
    const { hit } = await waitToast((t) => t.type === "success", "de sucesso da exclusão do contato");
    expect(hit.text === "Contato excluído.", "o toast confirma a exclusão", hit.text);
    assertToastShape(hit, { type: "success", marker: "✓" });
    const gone = await prisma.contact.findUnique({ where: { id: contactId } });
    expect(!gone, "a linha sumiu do Postgres", gone ? "ainda existe!" : "0 linhas");
    if (!gone) contactId = null;
  }

  /* ── 6. projeto: upload real, criar, editar, excluir ──────────────────── */

  let projectId = null;
  let coverUrl = "";

  if (wants("projeto")) {
    step("6. projeto · upload de imagem (`attach:`) ponta a ponta");
    await goto("/admin/projects/new");
    require_(await waitExists("#coverImageFile"), "o formulário de projeto carregou");

    const before = await json(
      `(() => { const label = document.querySelector('label[for="coverImageFile"]');
         const line = [...document.querySelectorAll('p[aria-live]')]
           .find((p) => (p.textContent || "").includes("attach:"));
         const hidden = line ? [...line.querySelectorAll('[aria-hidden="true"]')].map((n) => n.textContent) : [];
         return { label: label ? label.textContent.trim() : null,
                  live: line ? line.getAttribute("aria-live") : null,
                  text: line ? line.textContent.replace(/\\s+/g, " ").trim() : null,
                  hidden }; })()`,
    );
    expect(before.label === "attach: imagem de capa", "o rótulo do campo é `attach: imagem de capa`", String(before.label));
    expect(before.live === "polite", "a linha de saída do anexo é região viva", String(before.live));
    expect(before.text === "attach: (nenhum arquivo)", "antes da escolha a linha diz `(nenhum arquivo)`", String(before.text));
    expect(before.hidden.some((h) => h.includes("attach:")), "o prefixo `attach: ` é aria-hidden", before.hidden.join("|"));

    // O arquivo entra pelo `<input type=file>` real, via CDP.
    const { result } = await call("Runtime.evaluate", {
      expression: `document.querySelector("#coverImageFile")`,
    });
    if (!result.objectId) throw new Failed("não consegui referenciar o <input type=file>");
    await drainToasts();
    await call("DOM.setFileInputFiles", { files: [pngPath], objectId: result.objectId });

    const up = await waitToast((t) => t.text.includes("Imagem enviada"), "de sucesso do upload");
    expect(up.hit.text === "Imagem enviada.", "o upload dá toast de sucesso", up.hit.text);
    assertToastShape(up.hit, { type: "success", marker: "✓" });

    const after = await json(
      `(() => { const line = [...document.querySelectorAll('p[aria-live]')]
           .find((p) => (p.textContent || "").includes("attach:"));
         const hiddenInput = document.querySelector('input[name="coverImage"]');
         const img = document.querySelector('img[alt="Pré-visualização da capa"]');
         return { text: line ? line.textContent.replace(/\\s+/g, " ").trim() : null,
                  url: hiddenInput ? hiddenInput.value : "",
                  preview: img ? img.getAttribute("src") : null }; })()`,
    );
    const fileName = pngPath.split("/").pop();
    expect(after.text === `attach: ${fileName}`, "a linha passa a mostrar o arquivo escolhido", String(after.text));
    require_(/^\/uploads\/[0-9a-f-]+\.png$/.test(after.url), "a rota devolveu um caminho público", after.url);
    expect(after.preview === after.url, "a pré-visualização aponta para o arquivo enviado", String(after.preview));
    coverUrl = after.url;

    const diskName = coverUrl.split("/").pop();
    if (diskName) uploaded.push(join(UPLOAD_DIR, diskName));
    expect(existsSync(join(UPLOAD_DIR, diskName)), "o arquivo foi gravado em UPLOAD_DIR", join(UPLOAD_DIR, diskName));
    const served = await jsonAsync(
      `fetch(${js(coverUrl)}).then(async (r) => ({ status: r.status, type: r.headers.get("content-type"),
         bytes: (await r.arrayBuffer()).byteLength }))`,
    );
    expect(
      served.status === 200 && served.type === "image/png" && served.bytes > 0,
      "e volta pela rota /uploads servido como imagem",
      `HTTP ${served.status} ${served.type} ${served.bytes}B`,
    );

    step("6b. projeto · criar com a capa enviada");
    await fill("#slug", PROJECT_SLUG);
    await fill("#name", PROJECT_NAME);
    await fill("#year", "2026");
    await fill("#monogram", "SMK");
    await fill("#stack", "Node\nPostgres");
    await drainToasts();
    await clickText("button[type=submit]", "criar projeto");
    const criado = await waitToast((t) => t.type === "success", "de sucesso da criação do projeto");
    expect(criado.hit.text === "Projeto criado.", "o toast é o da action de criação", criado.hit.text);
    assertToastShape(criado.hit, { type: "success", marker: "✓" });

    const proj = await prisma.project.findUnique({ where: { slug: PROJECT_SLUG } });
    require_(Boolean(proj), "o projeto existe no Postgres", PROJECT_SLUG);
    projectId = proj.id;
    expect(proj.coverImage === coverUrl, "a capa enviada ficou gravada na linha", String(proj.coverImage));
    expect(proj.name === PROJECT_NAME, "o nome persistiu", proj.name);

    step("6c. projeto · editar");
    await goto(`/admin/projects/${projectId}/edit`);
    require_(await waitExists("#tagline"), "o formulário de edição carregou");
    const keptLine = await evaluate(
      `(() => { const p = [...document.querySelectorAll('p[aria-live]')]
           .find((n) => (n.textContent || "").includes("attach:"));
         return p ? p.textContent.replace(/\\s+/g, " ").trim() : ""; })()`,
      false,
    );
    expect(
      keptLine === `attach: ${coverUrl.split("/").pop()}`,
      "na edição a linha de anexo mostra o arquivo já gravado",
      keptLine,
    );
    await fill("#tagline", `Tagline de verificação ${STAMP}`);
    await drainToasts();
    await clickText("button[type=submit]", "salvar alterações");
    const editado = await waitToast((t) => t.type === "success", "de sucesso da edição do projeto");
    expect(editado.hit.text === "Projeto atualizado.", "o toast é o da action de edição", editado.hit.text);
    assertToastShape(editado.hit, { type: "success", marker: "✓" });
    const proj2 = await prisma.project.findUnique({ where: { id: projectId } });
    expect(
      proj2.tagline === `Tagline de verificação ${STAMP}`,
      "a alteração persistiu no banco",
      String(proj2.tagline),
    );

    step("6d. projeto · excluir");
    await goto("/admin/projects");
    await click(`button[aria-label="Excluir ${PROJECT_NAME}"]`, "gatilho de exclusão do projeto");
    await waitFor(`Boolean(document.querySelector('[data-slot="alert-dialog-content"]'))`, "o alert dialog abrir");
    const echoP = await evaluate(
      `(() => { const p = [...document.querySelectorAll('[data-slot="alert-dialog-content"] p')]
           .find((n) => (n.textContent || "").includes("rm -rf"));
         return p ? p.textContent.replace(/\\s+/g, " ").trim() : ""; })()`,
      false,
    );
    expect(echoP === `$ rm -rf projects/${PROJECT_SLUG} [y/N]`, "o eco cita o slug do projeto", echoP);
    await click(`#confirm-delete-${projectId}`, "campo de confirmação do projeto");
    await typeText(PROJECT_NAME);
    const armedP = await evaluate(
      `(() => { const b = [...document.querySelectorAll('[data-slot="alert-dialog-content"] button')]
           .find((n) => (n.textContent || "").includes("excluir definitivamente"));
         return Boolean(b && b.disabled); })()`,
      false,
    );
    require_(armedP === false, "com o nome exato o botão habilita");
    await drainToasts();
    await clickText('[data-slot="alert-dialog-content"] button', "excluir definitivamente");
    const excluido = await waitToast((t) => t.type === "success", "de sucesso da exclusão do projeto");
    expect(
      excluido.hit.text === `Projeto "${PROJECT_NAME}" excluído.`,
      "o toast nomeia o projeto excluído",
      excluido.hit.text,
    );
    assertToastShape(excluido.hit, { type: "success", marker: "✓" });
    const goneP = await prisma.project.findUnique({ where: { id: projectId } });
    expect(!goneP, "o projeto sumiu do Postgres", goneP ? "ainda existe!" : "0 linhas");
    if (!goneP) projectId = null;
  }

  /* ── 7. gerador de CV: o erro que a action devolve ────────────────────── */

  if (wants("gerador")) {
    step("7. gerador · vaga curta demais → toast de erro da action");
    const generationsBefore = await prisma.generation.count();
    await goto("/admin/generator");
    require_(await waitExists("#jobDescription"), "o formulário do gerador carregou");
    await fill("#jobDescription", "vaga curta");
    await drainToasts();
    await clickText("button[type=submit]", "gerar");
    const { hit } = await waitToast((t) => t.type === "error", "de erro do gerador", 30000);
    expect(
      hit.text === "Cole uma descrição de vaga mais completa (mínimo de 40 caracteres).",
      "o toast traz o erro traduzido da action",
      hit.text,
    );
    assertToastShape(hit, { type: "error", marker: "✗" });
    const generationsAfter = await prisma.generation.count();
    expect(
      generationsAfter === generationsBefore,
      "nenhuma `Generation` foi gravada no caminho de erro",
      `${generationsBefore} → ${generationsAfter}`,
    );
    note(
      "o caminho de SUCESSO do gerador não é exercitado aqui: depende de " +
        "`KnowledgeChunk` ingerido (knowledge/ não está no repositório) e de uma " +
        "chamada paga ao OpenAI. Isso é dito, não escondido.",
    );
  }

  /* ── 8. excluir a candidatura: o banco volta como estava ──────────────── */

  if (wants("candidatura") && applicationId) {
    step("8. candidatura · excluir (eco com a chave natural)");
    await goto(`/admin/applications?q=${encodeURIComponent(COMPANY)}`);
    await click(
      `button[aria-label="Excluir a candidatura de ${COMPANY}"]`,
      "gatilho de exclusão da candidatura",
    );
    await waitFor(`Boolean(document.querySelector('[data-slot="alert-dialog-content"]'))`, "o alert dialog abrir");
    const echoA = await evaluate(
      `(() => { const p = [...document.querySelectorAll('[data-slot="alert-dialog-content"] p')]
           .find((n) => (n.textContent || "").includes("rm -rf"));
         return p ? p.textContent.replace(/\\s+/g, " ").trim() : ""; })()`,
      false,
    );
    expect(
      echoA === `$ rm -rf applications/${folderName} [y/N]`,
      "o eco usa a CHAVE NATURAL, não o nome da empresa",
      echoA,
    );
    await click(`#confirm-delete-${applicationId}`, "campo de confirmação da candidatura");
    await typeText(COMPANY);
    await drainToasts();
    await clickText('[data-slot="alert-dialog-content"] button', "excluir definitivamente");
    const { hit } = await waitToast((t) => t.type === "success", "de sucesso da exclusão da candidatura");
    expect(hit.text === `Candidatura “${COMPANY}” excluída.`, "o toast nomeia a candidatura", hit.text);
    assertToastShape(hit, { type: "success", marker: "✓" });

    const goneA = await prisma.application.findUnique({ where: { id: applicationId } });
    expect(!goneA, "a candidatura sumiu do Postgres", goneA ? "ainda existe!" : "0 linhas");
    const events = await prisma.applicationEvent.count({ where: { applicationId } });
    expect(events === 0, "os eventos foram junto (cascade)", `${events} evento(s)`);
    if (!goneA) applicationId = null;
  }
} catch (err) {
  fatal = err;
  /* Um passo que falha sem contexto manda o leitor abrir o Chrome à mão. O
     que costuma explicar a falha é: onde a página estava, que linha de
     `stderr:` estava na tela e que toast ficou no gravador. */
  if (diagnose) {
    try {
      const d = await diagnose();
      console.log("\n  diagnóstico do ponto da falha:");
      console.log(`    url: ${d.url}`);
      console.log(`    erros na tela: ${d.errors.length ? d.errors.join(" | ") : "(nenhum)"}`);
      console.log(`    toasts pendentes: ${d.toasts.length ? d.toasts.join(" | ") : "(nenhum)"}`);
      console.log(`    botões visíveis: ${d.buttons.join(" · ")}`);
    } catch {
      console.log("\n  (não foi possível coletar diagnóstico: a página já não responde)");
    }
  }
} finally {
  /* ── limpeza ───────────────────────────────────────────────────────────
     Dois baldes, e a diferença importa:
     - `byDesign` é o que a UI NÃO apaga de propósito. Excluir uma candidatura
       preserva `Company` e `Job` (são entidades compartilhadas, ver
       `deleteApplication`), e o admin não tem tela de empresa. Limpar isso é
       trabalho do script, não defeito da change.
     - `orphans` é o que algum passo deveria ter apagado e não apagou — aí sim
       o exit code acusa. */
  const byDesign = [];
  const orphans = [];
  try {
    const apps = await prisma.application.findMany({
      where: { folderName: { contains: STAMP } },
      select: { id: true, folderName: true },
    });
    for (const a of apps) {
      await prisma.application.delete({ where: { id: a.id } });
      orphans.push(`Application ${a.folderName}`);
    }
    const contacts = await prisma.contact.deleteMany({ where: { name: { contains: STAMP } } });
    if (contacts.count) orphans.push(`${contacts.count} Contact`);
    const projects = await prisma.project.deleteMany({ where: { slug: { contains: STAMP } } });
    if (projects.count) orphans.push(`${projects.count} Project`);
    const companies = await prisma.company.deleteMany({ where: { name: { contains: STAMP } } });
    if (companies.count) byDesign.push(`${companies.count} Company (a exclusão da candidatura preserva a empresa)`);
  } catch (err) {
    orphans.push(`FALHA ao limpar o banco: ${err.message}`);
  }
  for (const file of uploaded) {
    try {
      if (existsSync(file)) {
        rmSync(file);
        byDesign.push(`o arquivo enviado (${file.split("/").pop()}) — a exclusão do projeto não apaga a mídia`);
      }
    } catch (err) {
      orphans.push(`FALHA ao apagar ${file}: ${err.message}`);
    }
  }
  await prisma.$disconnect().catch(() => {});

  cdp?.close();
  chrome?.kill();
  await sleep(300);
  for (const dir of [profile, workdir]) {
    try {
      rmSync(dir, { recursive: true, force: true });
    } catch {
      /* diretório temporário; o SO recolhe */
    }
  }

  /* ── relatório ─────────────────────────────────────────────────────────── */
  const failed = checks.filter((c) => !c.ok);
  if (AS_JSON) {
    console.log(
      JSON.stringify(
        { stamp: STAMP, base: BASE, partial: ONLY, checks, byDesign, orphans, fatal: fatal?.message ?? null },
        null,
        2,
      ),
    );
  } else {
    console.log(`\n── resumo ${"─".repeat(50)}`);
    console.log(`  ${checks.length} verificação(ões) · ${failed.length} falha(s)`);
    for (const f of failed) console.log(`  ✗ [${f.step}] ${f.label}${f.detail ? ` — ${f.detail}` : ""}`);
    console.log(
      byDesign.length
        ? `  limpeza: o script apagou ${byDesign.join("; ")}`
        : "  limpeza: nada a apagar além do que a própria UI já apagou",
    );
    if (orphans.length) {
      console.log(`  RESÍDUO: sobrou ${orphans.join(", ")} — algum passo não apagou o que criou`);
    } else {
      console.log("  o banco voltou como estava: nenhuma linha do carimbo sobreviveu");
    }
    if (ONLY.length) console.log(`  ATENÇÃO: execução PARCIAL (--only ${ONLY.join(",")}); não conclui a change.`);
    if (fatal) {
      console.error(
        `\n  ${fatal instanceof Blocked ? "NÃO FOI POSSÍVEL MEDIR" : "PASSO FALHOU"}: ${fatal.message}`,
      );
    }
  }

  if (fatal instanceof Blocked) exitCode = 2;
  else if (fatal || failed.length) exitCode = 1;
  else if (orphans.length) exitCode = 3;
  process.exit(exitCode);
}
