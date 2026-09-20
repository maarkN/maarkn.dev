#!/usr/bin/env node
/**
 * A régua de acessibilidade do backoffice — três medições sobre o admin REAL.
 *
 * Mesma mecânica de scripts/a11y-dialog-accname.mjs: Chrome headless por CDP,
 * WebSocket nativo do Node, zero dependência nova. A diferença é que aqui a
 * página é o admin servido pelo `next dev`, não uma fixture — contraste, foco
 * e movimento só são mensuráveis com o CSS compilado, os tokens de
 * `.admin-root` e os dados do Postgres no lugar.
 *
 * Três modos, um percurso:
 *   (padrão)    axe-core em cada superfície + rolagem horizontal do documento.
 *               `target-size` (WCAG 2.2 SC 2.5.8, AA) é LIGADA à mão: vem
 *               `enabled: false` no conjunto padrão do axe e, sem isso, a
 *               varredura dizia zero enquanto havia 11 violações serious.
 *   --motion    `prefers-reduced-motion: reduce`: nada pode continuar se
 *               mexendo. `--motion no-preference` é o CONTROLE NEGATIVO — a
 *               mesma sonda tem de acusar movimento quando a preferência está
 *               desligada, senão o zero do outro lado não prova nada.
 *   --keyboard  só Tab e Escape: foco sempre visível, sem vazar do overlay,
 *               Escape fecha e o foco volta ao gatilho.
 *
 * axe-core NÃO é dependência declarada: já está na store do pnpm como
 * dependência transitiva do eslint-plugin-jsx-a11y, e este script é auditoria
 * manual, não parte do `pnpm lint`. Se sumir da store, o script diz isso.
 *
 *   pnpm dev                                       # 5050, com o Postgres de pé
 *   ADMIN_EMAIL=… ADMIN_PASSWORD=… node scripts/a11y-admin-axe.mjs
 *   … --width 390 --height 844                     # varredura estreita
 *   … --motion | --motion no-preference | --keyboard [--verbose]
 *   … --only applications | --json
 *
 * O login tem trava de dez tentativas por 15 min por IP
 * (src/lib/login-throttle.ts). Rodar o script várias vezes seguidas esbarra
 * nela; a mensagem de erro traz o DELETE que a solta.
 *
 * Sai 0 quando o modo não encontrou nada. Gatilho de overlay que não abre é
 * FALHA nos três modos: antes a rota de fundo era medida no lugar do overlay
 * e entrava na conta como uma superfície limpa a mais. Rota de detalhe que
 * responde 404 (id morto) também é FALHA, pelo mesmo motivo.
 *
 * Os ids das rotas de detalhe NÃO são chumbados: depois do login o script lê
 * o primeiro id de cada listagem (`/admin/applications`, `/admin/projects`,
 * `/admin/generator`) e imprime de onde veio cada um. `A11Y_APPLICATION_ID`,
 * `A11Y_PROJECT_ID` e `A11Y_GENERATION_ID` sobrescrevem; o valor chumbado só
 * entra se a listagem estiver vazia. Uma régua que quebra a cada
 * `pnpm db:seed:demo` não é régua.
 *
 * Reflow (SC 1.4.10) é medido SEM emulação mobile e contra a largura pedida.
 * Com `mobile: true` o Chrome alarga a viewport layout até caber o conteúdo:
 * `documentElement.scrollWidth` e `window.innerWidth` crescem juntos e a
 * comparação nunca pode reprovar.
 */
import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = Number(process.env.CDP_PORT ?? 9334);
const BASE = process.env.A11Y_BASE ?? "http://localhost:5050";

const argv = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  const next = i === -1 ? undefined : argv[i + 1];
  return next && !next.startsWith("--") ? next : fallback;
};
const WIDTH = Number(flag("width", 1440));
const HEIGHT = Number(flag("height", 900));
const ONLY = flag("only", null);
const TAB_LIMIT = Number(flag("tabs", 80));
const AS_JSON = argv.includes("--json");
const VERBOSE = argv.includes("--verbose");
const MOTION = argv.includes("--motion");
const KEYBOARD = argv.includes("--keyboard");
const MOTION_VALUE = argv.includes("no-preference") ? "no-preference" : "reduce";

/* ── axe-core, resolvido na store do pnpm ────────────────────────────────── */

function axeSource() {
  const direct = new URL("../node_modules/axe-core/axe.min.js", import.meta.url);
  if (existsSync(direct)) return readFileSync(direct, "utf8");
  const store = new URL("../node_modules/.pnpm/", import.meta.url);
  const dir = readdirSync(store).find((d) => d.startsWith("axe-core@"));
  if (!dir) throw new Error("axe-core não encontrado em node_modules/.pnpm");
  return readFileSync(join(store.pathname, dir, "node_modules/axe-core/axe.min.js"), "utf8");
}

/* ── credenciais ─────────────────────────────────────────────────────────── */

function env(name) {
  if (process.env[name]) return process.env[name];
  const file = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
  const line = file.split("\n").find((l) => l.startsWith(`${name}=`));
  const value = line ? line.slice(name.length + 1).trim().replace(/^["']|["']$/g, "") : "";
  if (!value) {
    throw new Error(`${name} vazio: exporte ${name} antes de rodar (a .env.local do dev não guarda a senha).`);
  }
  return value;
}

/* ── o roteiro: as 18 rotas + os overlays que só existem depois de um clique ─ */

/* Os ids das rotas de detalhe são DESCOBERTOS em tempo de execução, lidos da
   própria listagem do admin depois do login. Chumbar id é ter uma régua que
   quebra a cada `pnpm db:seed:demo`: o id morre, a rota vira 404 e — pior —
   a superfície entrava na conta como limpa. Precedência: `A11Y_*_ID` do
   ambiente > id descoberto na listagem > o valor chumbado, que fica só como
   último recurso. Id que não aparece em lugar nenhum é FALHA declarada, e a
   superfície não é medida. */
const ID_KINDS = {
  application: {
    env: "A11Y_APPLICATION_ID",
    list: "/admin/applications",
    /* a listagem só linka `/admin/applications/<id>/edit`; `new` e `board`
       são rotas fixas, não ids. */
    pattern: String.raw`^/admin/applications/(?!new$|board$)([^/?#]+)`,
    fallback: "cmu89ib6c001cce4g78lhbjfn",
  },
  project: {
    env: "A11Y_PROJECT_ID",
    list: "/admin/projects",
    pattern: String.raw`^/admin/projects/(?!new$)([^/?#]+)`,
    fallback: "a11yproj0000000000000001",
  },
  generation: {
    env: "A11Y_GENERATION_ID",
    list: "/admin/generator",
    pattern: String.raw`^/admin/generator/([^/?#]+)`,
    fallback: "a11ygen00000000000000001",
  },
};

const ROUTES = [
  { name: "login", path: "/admin/login" },
  { name: "dashboard", path: "/admin" },
  { name: "applications", path: "/admin/applications" },
  { name: "applications:board", path: "/admin/applications/board" },
  { name: "applications:new", path: "/admin/applications/new" },
  { name: "applications:detail", needs: "application", path: (id) => `/admin/applications/${id}` },
  { name: "applications:edit", needs: "application", path: (id) => `/admin/applications/${id}/edit` },
  { name: "jobs", path: "/admin/jobs" },
  { name: "contacts", path: "/admin/contacts" },
  { name: "projects", path: "/admin/projects" },
  { name: "projects:new", path: "/admin/projects/new" },
  { name: "projects:edit", needs: "project", path: (id) => `/admin/projects/${id}/edit` },
  { name: "generator", path: "/admin/generator" },
  { name: "generator:detail", needs: "generation", path: (id) => `/admin/generator/${id}` },
  { name: "api-keys", path: "/admin/api-keys" },
  { name: "audit", path: "/admin/audit" },
  { name: "chat", path: "/admin/chat" },
  { name: "settings", path: "/admin/settings" },

  /* Overlays. O gatilho é procurado por `aria-label`/texto porque o `asChild`
     do Radix entrega o `data-slot` do Button, não o do trigger. */
  {
    name: "overlay:alert-dialog excluir candidatura",
    path: "/admin/applications",
    openSelector: 'button[aria-label^="Excluir a candidatura"]',
  },
  {
    name: "overlay:alert-dialog excluir projeto",
    path: "/admin/projects",
    openSelector: 'button[aria-label^="Excluir "]',
  },
  {
    name: "overlay:alert-dialog excluir contato",
    path: "/admin/contacts",
    openSelector: 'button[aria-label^="Excluir "]',
  },
  {
    name: "overlay:dialog registrar evento",
    needs: "application",
    path: (id) => `/admin/applications/${id}`,
    openText: "registrar evento",
  },
  {
    name: "overlay:dialog editar campos-chave",
    needs: "application",
    path: (id) => `/admin/applications/${id}`,
    openText: "editar campos-chave",
  },
];

/* O Sheet (`ApplicationQuickSheet`) NÃO está montado em nenhuma rota — o
   `grep` só o encontra na própria definição e num comentário. Ele NÃO entra
   no roteiro por padrão: uma superfície cujo gatilho não existe seria medida
   como duplicata da rota de detalhe e contada como limpa, inflando o total
   com uma superfície que ninguém consegue abrir. Quando o Sheet voltar a ser
   montado, `A11Y_SHEET_PATH=/admin/…` o traz de volta à varredura. */
if (process.env.A11Y_SHEET_PATH) {
  ROUTES.push({
    name: "overlay:sheet inspecionar",
    path: process.env.A11Y_SHEET_PATH,
    openSelector: 'button[aria-label^="Inspecionar"]',
  });
}

/* ── sondas injetadas ────────────────────────────────────────────────────── */

const OVERLAY_SELECTOR =
  '[data-slot="dialog-content"],[data-slot="alert-dialog-content"],[data-slot="sheet-content"]';

/* Sob `reduce`, nenhuma duração efetiva pode passar de 1ms e nenhuma animação
   pode repetir. A regra global de globals.css usa 0.01ms com `!important`. */
const MOTION_PROBE = String.raw`JSON.stringify((() => {
  const offenders = [];
  const seen = new Set();
  /* As animações transientes do admin — a barra de progresso da listagem
     (.admin-progress), o Loader2 (animate-spin) e o Skeleton (animate-pulse) —
     só existem enquanto algo carrega, então uma varredura do DOM estável nunca
     as encontraria. Montadas aqui de propósito, medidas junto e removidas. */
  const probeHost = document.createElement("div");
  probeHost.innerHTML =
    '<span class="admin-progress" data-motion-probe="admin-progress">████</span>' +
    '<span class="animate-spin" data-motion-probe="animate-spin">·</span>' +
    '<span class="animate-pulse" data-motion-probe="animate-pulse">·</span>';
  document.body.appendChild(probeHost);
  const ms = (v) => v.split(",").map((x) => {
    const n = parseFloat(x);
    return /ms\s*$/.test(x.trim()) ? n : n * 1000;
  });
  const label = (el) => {
    const cls = (el.getAttribute("class") || "").split(/\s+/).filter(Boolean).slice(0, 4).join(".");
    return el.tagName.toLowerCase() + (el.id ? "#" + el.id : "") + (cls ? "." + cls : "");
  };
  for (const el of document.querySelectorAll("*")) {
    if (probeHost.contains(el)) continue;
    for (const pseudo of [null, "::before", "::after"]) {
      const cs = getComputedStyle(el, pseudo);
      const names = cs.animationName.split(",").map((s) => s.trim());
      const durs = ms(cs.animationDuration);
      const iters = cs.animationIterationCount.split(",").map((s) => s.trim());
      names.forEach((name, i) => {
        if (name === "none") return;
        const d = durs[i % durs.length];
        const it = iters[i % iters.length];
        if (d > 1 || it === "infinite") {
          const key = label(el) + (pseudo || "") + name;
          if (!seen.has(key)) {
            seen.add(key);
            offenders.push({ kind: "animation", el: label(el) + (pseudo || ""), name, durationMs: d, iterations: it });
          }
        }
      });
      const tDurs = ms(cs.transitionDuration);
      const props = cs.transitionProperty.split(",").map((s) => s.trim());
      tDurs.forEach((d, i) => {
        const prop = props[i % props.length];
        if (d > 1 && prop !== "none") {
          const key = label(el) + (pseudo || "") + "T" + prop;
          if (!seen.has(key)) {
            seen.add(key);
            offenders.push({ kind: "transition", el: label(el) + (pseudo || ""), name: prop, durationMs: d });
          }
        }
      });
    }
  }
  const scanned = document.querySelectorAll("*").length;
  const probed = [...probeHost.children].map((el) => {
    const cs = getComputedStyle(el);
    return {
      name: el.dataset.motionProbe,
      animation: cs.animationName,
      durationMs: ms(cs.animationDuration)[0],
      iterations: cs.animationIterationCount,
    };
  });
  probeHost.remove();
  return { offenders, probed, scanned, matches: matchMedia("(prefers-reduced-motion: reduce)").matches };
})())`;

/* O `:focus-visible` só acende com tecla de verdade, por isso o Tab é
   despachado pelo CDP (`Input.dispatchKeyEvent`) e nunca por `el.focus()`. */
const FOCUS_SNAPSHOT = String.raw`JSON.stringify((() => {
  const el = document.activeElement;
  if (!el || el === document.body) return { none: true };
  /* <nextjs-portal> é o indicador de erro do next dev: não existe em
     produção e não é superfície do admin. */
  if (el.tagName.toLowerCase() === "nextjs-portal") return { none: true, devOverlay: true };
  const cs = getComputedStyle(el);
  const outline = parseFloat(cs.outlineWidth) || 0;
  const hasOutline = outline > 0 && cs.outlineStyle !== "none";
  const shadow = Boolean(cs.boxShadow) && cs.boxShadow !== "none";
  const name = (el.getAttribute("aria-label") || el.getAttribute("title") ||
    (el.labels && el.labels[0] && el.labels[0].textContent) ||
    (el.textContent || "")).trim().replace(/\s+/g, " ").slice(0, 46);
  const overlay = document.querySelector(OVERLAY_SELECTOR_PLACEHOLDER);
  let path = [], n = el;
  while (n && path.length < 4) { path.unshift(n.tagName.toLowerCase()); n = n.parentElement; }
  return {
    tag: el.tagName.toLowerCase(),
    slot: el.getAttribute("data-slot") || "",
    cls: (el.getAttribute("class") || "").slice(0, 70),
    name,
    hasOutline, outlineWidth: outline, outlineColor: cs.outlineColor,
    shadow: shadow ? cs.boxShadow.slice(0, 60) : "",
    inOverlay: overlay ? overlay.contains(el) : null,
    overlayOpen: Boolean(overlay),
    path: path.join(">"),
  };
})())`.replace("OVERLAY_SELECTOR_PLACEHOLDER", JSON.stringify(OVERLAY_SELECTOR));

const ESCAPE_SNAPSHOT = String.raw`JSON.stringify((() => {
  const el = document.activeElement;
  return {
    stillOpen: Boolean(document.querySelector(OVERLAY_SELECTOR_PLACEHOLDER)),
    tag: el === document.body ? "body" : el.tagName.toLowerCase(),
    focus: el === document.body ? "" :
      (el.getAttribute("aria-label") || (el.textContent || "")).trim().replace(/\s+/g, " ").slice(0, 46),
  };
})())`.replace("OVERLAY_SELECTOR_PLACEHOLDER", JSON.stringify(OVERLAY_SELECTOR));

/* ── CDP mínimo (mesmo helper do accname) ────────────────────────────────── */

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
  throw new Error(`Chrome não abriu a porta de depuração ${PORT} em 20s`);
}

/* ── execução ────────────────────────────────────────────────────────────── */

const AXE = MOTION || KEYBOARD ? "" : axeSource();
const profile = mkdtempSync(join(tmpdir(), "admin-axe-"));
const chrome = spawn(
  CHROME,
  [
    "--headless=new",
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

const results = [];
/** Preenchido depois do login: `{ application: { value, source } }`. */
const ids = {};
let cdp;

try {
  cdp = connect(await browserWebSocketUrl());
  await cdp.ready;
  const { targetId } = await cdp.send("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await cdp.send("Target.attachToTarget", { targetId, flatten: true });
  const call = (m, p) => cdp.send(m, p, sessionId);

  await call("Page.enable");
  await call("Runtime.enable");
  /* `mobile: true` NÃO pode ser usado aqui. Nessa emulação o Chrome aplica
     o viewport meta do documento e ALARGA a viewport layout até caber o
     conteúdo: numa rota que rolava, `documentElement.scrollWidth` e
     `window.innerWidth` viravam os dois 898 e a comparação abaixo nunca
     podia reprovar. Com `mobile: false` a viewport fica travada em WIDTH e
     o mesmo par vira 874 × 390 — que é o defeito de verdade. */
  await call("Emulation.setDeviceMetricsOverride", {
    width: WIDTH,
    height: HEIGHT,
    deviceScaleFactor: 1,
    mobile: false,
  });
  if (MOTION) {
    await call("Emulation.setEmulatedMedia", {
      features: [{ name: "prefers-reduced-motion", value: MOTION_VALUE }],
    });
  }

  const evaluate = async (expression, awaitPromise = true) => {
    const { result, exceptionDetails } = await call("Runtime.evaluate", {
      expression,
      returnByValue: true,
      awaitPromise,
    });
    if (exceptionDetails) {
      throw new Error(exceptionDetails.exception?.description ?? exceptionDetails.text);
    }
    return result.value;
  };

  const KEYS = {
    Tab: { key: "Tab", code: "Tab", windowsVirtualKeyCode: 9, text: "\t" },
    Escape: { key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 },
  };
  const press = async (name) => {
    const k = KEYS[name];
    await call("Input.dispatchKeyEvent", { type: "rawKeyDown", ...k });
    if (k.text) await call("Input.dispatchKeyEvent", { type: "char", ...k });
    await call("Input.dispatchKeyEvent", { type: "keyUp", ...k });
    await sleep(45);
  };

  const goto = async (path) => {
    await call("Page.navigate", { url: `${BASE}${path}` });
    // `next dev` compila sob demanda: a primeira visita pode levar segundos.
    for (let i = 0; i < 300; i++) {
      const state = await evaluate("document.readyState", false).catch(() => "loading");
      if (state === "complete") break;
      await sleep(100);
    }
    await sleep(700);
  };

  /** Percorre a superfície atual só com Tab; devolve paradas + efeito do Esc. */
  const walkKeyboard = async (opened) => {
    /* Com overlay aberto NÃO se tira o foco de onde o Radix o colocou: o
       percurso realista começa dentro do diálogo, e um `blur()` para o body
       testaria um estado que nenhum usuário produz. Sem overlay, começa do
       topo do documento. */
    if (!opened) {
      await evaluate("document.activeElement && document.activeElement.blur(); true", false);
    }
    const stops = [];
    const seen = new Set();
    for (let i = 0; i < TAB_LIMIT; i++) {
      await press("Tab");
      const snap = JSON.parse(await evaluate(FOCUS_SNAPSHOT, false));
      if (snap.none) {
        stops.push(snap);
        continue;
      }
      const key = `${snap.path}|${snap.name}|${snap.tag}`;
      if (seen.has(key) && stops.length > 2) {
        snap.wrapped = true;
        stops.push(snap);
        break; // o ciclo fechou: o percurso é finito e volta ao início
      }
      seen.add(key);
      stops.push(snap);
    }
    let escaped = null;
    if (opened) {
      await press("Escape");
      await sleep(400);
      escaped = JSON.parse(await evaluate(ESCAPE_SNAPSHOT, false));
    }
    return { stops, escaped };
  };

  /** A medição de uma superfície já montada. */
  const measure = async (route, opened) => {
    const overflow = JSON.parse(
      await evaluate(
        `JSON.stringify({ doc: document.documentElement.scrollWidth, win: window.innerWidth, body: document.body.scrollWidth })`,
        false,
      ),
    );
    if (KEYBOARD) {
      return { ...route, opened, overflow, violations: [], keyboard: await walkKeyboard(opened) };
    }
    if (MOTION) {
      return { ...route, opened, overflow, violations: [], motion: JSON.parse(await evaluate(MOTION_PROBE, false)) };
    }
    await evaluate(AXE, false);
    /* A11Y_RULES liga regras que não estão no conjunto padrão do axe
       (`td-has-header`, `label-content-name-mismatch`…) para investigar um
       apontamento do Lighthouse com o detalhe que o Lighthouse não dá. */
    /* OFF_BY_DEFAULT: regras que o axe conhece mas NÃO roda no conjunto
       padrão (`axe.getRules()` devolve `enabled: false`). `target-size` é
       WCAG 2.2 SC 2.5.8, nível AA, impacto serious — sem esta linha a
       varredura inteira dizia zero enquanto havia 11 violações no board e
       nos contatos. Ligá-las por `rules` (e não por `runOnly: [tags]`)
       ACRESCENTA ao conjunto padrão em vez de substituí-lo. */
    const OFF_BY_DEFAULT = ["target-size"];
    const enabled = Object.fromEntries(OFF_BY_DEFAULT.map((id) => [id, { enabled: true }]));
    const options = process.env.A11Y_RULES
      ? `{ resultTypes: ["violations"], runOnly: ${JSON.stringify(process.env.A11Y_RULES.split(","))} }`
      : `{ resultTypes: ["violations"], rules: ${JSON.stringify(enabled)} }`;
    const raw = await evaluate(
      `axe.run(document, ${options}).then((r) => JSON.stringify(r.violations))`,
    );
    return { ...route, opened, overflow, violations: JSON.parse(raw) };
  };

  /* Login. A tela só existe antes do submit: é agora ou nunca. */
  await goto("/admin/login");
  if (!ONLY || "login".includes(ONLY)) {
    results.push(await measure(ROUTES[0], false));
  }

  await evaluate(
    `(() => {
      const set = (sel, value) => {
        const el = document.querySelector(sel);
        const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
        setter.call(el, value);
        el.dispatchEvent(new Event("input", { bubbles: true }));
      };
      set('input[name="email"]', ${JSON.stringify(env("ADMIN_EMAIL"))});
      set('input[name="password"]', ${JSON.stringify(env("ADMIN_PASSWORD"))});
      document.querySelector('form button[type="submit"]').click();
      return true;
    })()`,
    false,
  );
  await sleep(2500);
  const landed = await evaluate("location.pathname", false);
  if (landed.includes("/admin/login")) {
    throw new Error(
      `login não passou: ainda em ${landed}. A trava é de 10 tentativas por 15 min por IP ` +
        `(src/lib/login-throttle.ts); solte com: delete from "McpRateLimit" where bucket like 'login:%';`,
    );
  }

  /* Descoberta dos ids, agora que existe sessão. Só descobre o que o recorte
     pedido realmente usa: com `--only contacts` nada disso roda. */
  const selected = ROUTES.slice(1).filter((r) => !ONLY || r.name.includes(ONLY));
  for (const kind of new Set(selected.map((r) => r.needs).filter(Boolean))) {
    const spec = ID_KINDS[kind];
    if (process.env[spec.env]) {
      ids[kind] = { value: process.env[spec.env], source: spec.env };
      continue;
    }
    await goto(spec.list);
    const found = await evaluate(
      `(() => { const re = new RegExp(${JSON.stringify(spec.pattern)});
         for (const a of document.querySelectorAll("a[href]")) {
           const m = (a.getAttribute("href") || "").match(re);
           if (m) return m[1];
         }
         return ""; })()`,
      false,
    );
    ids[kind] = found
      ? { value: found, source: `listagem ${spec.list}` }
      : { value: spec.fallback, source: "valor chumbado (último recurso)" };
  }

  for (const route of selected) {
    const id = route.needs ? ids[route.needs] : null;
    const path = typeof route.path === "function" ? route.path(id.value) : route.path;
    await goto(path);
    /* Uma rota de detalhe com id morto renderiza o 404 do Next — que não tem
       violação nenhuma e entraria na conta como superfície limpa. */
    const notFound = await evaluate(`Boolean(document.querySelector(".next-error-h1"))`, false);
    if (notFound) {
      results.push({ ...route, path, opened: false, notFound: true, violations: [] });
      continue;
    }

    let opened = false;
    if (route.openSelector) {
      opened = await evaluate(
        `(() => { const el = document.querySelector(${JSON.stringify(route.openSelector)});
           if (!el) return false; el.click(); return true; })()`,
        false,
      );
      await sleep(900);
    } else if (route.openText) {
      opened = await evaluate(
        `(() => { const t = ${JSON.stringify(route.openText)}.toLowerCase();
           const el = [...document.querySelectorAll("button")]
             .find((b) => (b.textContent || "").toLowerCase().includes(t));
           if (!el) return false; el.click(); return true; })()`,
        false,
      );
      await sleep(900);
    }

    results.push(await measure({ ...route, path }, opened));
  }
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

/* ── relatório ───────────────────────────────────────────────────────────── */

const needsTrigger = (r) => Boolean(r.openSelector || r.openText);
/* Gatilho que não abriu é FALHA, não nota de rodapé: antes o overlay não era
   medido, a rota de fundo era medida no lugar dele e o resultado entrava na
   conta como uma superfície limpa a mais. */
const missingTrigger = (r) => needsTrigger(r) && !r.opened && !r.notFound;
const triggerNote = (r) => (needsTrigger(r) ? (r.opened ? " [aberto]" : " [GATILHO NÃO ENCONTRADO]") : "");
/* Id de rota de detalhe que já morreu (seed novo, fixture removida) leva ao
   404 do Next: página sem violação nenhuma, que antes entrava na conta como
   uma superfície limpa. Também é falha. */
const notFoundNote = (r) => (r.notFound ? ` [404 em ${r.path} — superfície NÃO medida]` : "");

/* De onde veio cada id de rota de detalhe — a linha que separa "medi a rota
   de detalhe" de "medi o que o id chumbado ainda alcançava". */
const idLine = Object.entries(ids)
  .map(([kind, { value, source }]) => `${kind}=${value} [${source}]`)
  .join(" · ");
const header = (title) =>
  console.log(`${title}\n${idLine ? `ids: ${idLine}\n` : ""}`);

if (AS_JSON) {
  console.log(JSON.stringify(results, null, 2));
  process.exit(0);
}

if (KEYBOARD) {
  header(`percurso só com teclado · ${BASE} · viewport ${WIDTH}×${HEIGHT}`);
  const problems = [];
  for (const r of results) {
    if (r.notFound) {
      problems.push(`${r.name}: 404 em ${r.path} — superfície NÃO medida`);
      console.log(`✗ ${r.name.padEnd(38)}${notFoundNote(r)}`);
      continue;
    }
    const k = r.keyboard;
    const blind = k.stops.filter((s) => !s.none && !s.hasOutline && !s.shadow);
    const leaked = k.stops.filter((s) => s.overlayOpen && s.inOverlay === false);
    for (const s of blind) problems.push(`${r.name}: sem foco visível em ${s.tag} "${s.name}"`);
    for (const s of leaked) problems.push(`${r.name}: foco escapou do overlay para ${s.tag} "${s.name}"`);
    if (k.escaped?.stillOpen) problems.push(`${r.name}: Escape não fechou o overlay`);
    if (k.escaped && !k.escaped.stillOpen && k.escaped.tag === "body") {
      problems.push(`${r.name}: o foco não voltou ao gatilho`);
    }
    if (missingTrigger(r)) {
      problems.push(`${r.name}: gatilho não encontrado — superfície NÃO medida`);
    }
    const ok = blind.length === 0 && leaked.length === 0 &&
      !(k.escaped && (k.escaped.stillOpen || k.escaped.tag === "body"));
    const esc = k.escaped
      ? ` · esc→${k.escaped.stillOpen ? "AINDA ABERTO" : "fechou"}, foco em ${k.escaped.tag} "${k.escaped.focus}"`
      : "";
    console.log(`${ok ? "✓" : "✗"} ${r.name.padEnd(38)} ${k.stops.length} paradas${esc}${triggerNote(r)}`);
    for (const s of blind) console.log(`    SEM FOCO VISÍVEL: ${s.tag}[${s.slot}].${s.cls} "${s.name}" (${s.path})`);
    for (const s of leaked) console.log(`    FOCO FORA DO OVERLAY: ${s.tag} "${s.name}" (${s.path})`);
    if (VERBOSE) {
      for (const s of k.stops) {
        console.log(
          `    ${s.none ? "(nenhum)" : `${s.tag.padEnd(8)} outline ${s.outlineWidth}px ${s.outlineColor}${s.inOverlay === false ? " [FORA]" : ""} "${s.name}"`}`,
        );
      }
    }
  }
  console.log(`\n${results.length} superfícies · ${problems.length} problema(s) de teclado`);
  for (const p of problems) console.error(`  ✗ ${p}`);
  process.exit(problems.length > 0 ? 1 : 0);
}

if (MOTION) {
  header(`prefers-reduced-motion: ${MOTION_VALUE} · ${BASE} · viewport ${WIDTH}×${HEIGHT}`);
  const moving = [];
  for (const r of results) {
    const o = r.motion?.offenders ?? [];
    for (const x of o) moving.push(`${r.name}: ${x.kind} ${x.name}`);
    console.log(
      `${o.length === 0 && !r.notFound ? "✓" : "✗"} ${r.name.padEnd(38)} ${r.motion?.scanned ?? 0} nós · media ${r.motion?.matches}${triggerNote(r)}${notFoundNote(r)}`,
    );
    for (const x of o) console.log(`    ${x.kind} ${x.name} ${x.durationMs}ms ×${x.iterations ?? ""} — ${x.el}`);
    if (VERBOSE || o.length === 0) {
      for (const x of r.motion?.probed ?? []) {
        console.log(`    · ${x.name.padEnd(16)} ${x.animation} ${x.durationMs}ms ×${x.iterations}`);
      }
    }
  }
  const absent = results.filter(missingTrigger);
  for (const m of absent) console.error(`  ✗ ${m.name}: gatilho não encontrado — superfície NÃO medida`);
  const dead = results.filter((r) => r.notFound);
  for (const m of dead) console.error(`  ✗ ${m.name}: 404 em ${m.path} — superfície NÃO medida`);
  console.log(
    `\n${results.length} superfícies · ${moving.length} animação/transição NÃO colapsada · ${absent.length} gatilho(s) não encontrado(s)` +
      ` · ${dead.length} rota(s) 404`,
  );
  process.exit(moving.length > 0 || absent.length > 0 || dead.length > 0 ? 1 : 0);
}

/* Reflow (SC 1.4.10) é medido contra a largura PEDIDA, não contra
   `window.innerWidth`: se algum dia a emulação voltar a alargar a viewport,
   os dois lados cresceriam juntos e a guarda ficaria muda. O `win` continua
   sendo coletado só para denunciar essa divergência. */
const scrolls = (r) => Boolean(r.overflow) && r.overflow.doc > WIDTH + 1;

header(`axe-core em ${BASE} · viewport ${WIDTH}×${HEIGHT}`);
for (const r of results) {
  const by = (impact) => r.violations.filter((v) => v.impact === impact);
  const counts = ["critical", "serious", "moderate", "minor"].map((i) => `${i[0]}${by(i).length}`).join(" ");
  const over = scrolls(r) ? ` ⟂${r.overflow.doc}px em ${WIDTH}` : "";
  console.log(
    `${r.violations.length === 0 && !r.notFound ? "✓" : "✗"} ${r.name.padEnd(38)} ${counts}${over}${triggerNote(r)}${notFoundNote(r)}`,
  );
  for (const v of r.violations) {
    console.log(`    ${v.impact}: ${v.id} (${v.nodes.length}) — ${v.help}`);
    for (const n of v.nodes.slice(0, 3)) {
      console.log(`      ${n.target.join(" ")}`);
      const msg = (n.any[0]?.message ?? n.all[0]?.message ?? "").split("\n")[0];
      if (msg) console.log(`        ${msg}`);
    }
  }
}

const blocking = results.flatMap((r) =>
  r.violations
    .filter((v) => v.impact === "critical" || v.impact === "serious")
    .map((v) => `${r.name}: ${v.id}`),
);
const overflows = results.filter(scrolls);
const deadRoutes = results.filter((r) => r.notFound);
console.log(
  `\n${results.length} superfícies · ${blocking.length} violação(ões) critical/serious · ${overflows.length} com rolagem horizontal` +
    ` · ${results.filter(missingTrigger).length} gatilho(s) não encontrado(s) · ${deadRoutes.length} rota(s) 404`,
);
for (const b of blocking) console.error(`  ✗ ${b}`);
const missing = results.filter(missingTrigger);
for (const m of missing) console.error(`  ✗ ${m.name}: gatilho não encontrado — superfície NÃO medida`);
for (const m of deadRoutes) console.error(`  ✗ ${m.name}: 404 em ${m.path} — superfície NÃO medida`);
process.exit(
  blocking.length > 0 || overflows.length > 0 || missing.length > 0 || deadRoutes.length > 0 ? 1 : 0,
);
