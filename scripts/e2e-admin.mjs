/**
 * Casos do backoffice em scripts/e2e-site.mjs (`--admin`): entrada, tema, idioma
 * e a estrutura em volta das telas. Precisa do Postgres com dados e de um
 * usuário; a conta de auditoria de scripts/a11y-fixtures.mjs serve:
 *
 *   ADMIN_EMAIL=… ADMIN_PASSWORD=… E2E_BASE=… node scripts/e2e-site.mjs --admin
 *   … --width 390 --height 844 | --width 1024 --height 768
 *
 * O que depende de largura usa a do comando: nomes no menu a partir de 1360 px,
 * ícones de 768 a 1359, barra na base abaixo disso. Nenhum caso conta com uma
 * quantidade de registros; só `admin:acesso` quer um de cada, e é o que as
 * fixtures criam.
 */
import { randomInt } from "node:crypto";
import { axeSource, measureContrast } from "./e2e-holo.mjs";
import { save, themeAtFirstPaint, WATCH_FIRST_PAINT } from "./e2e-theme.mjs";

const THEMES = ["dusk", "light", "dracula"];
const BASE = process.env.E2E_BASE ?? "http://localhost:5050";
const NAMES = 1360;
const PHONE = 768;

/** As telas sem id; as de um registro são lidas das listas. */
const SCREENS = [
  "/admin",
  "/admin/applications",
  "/admin/applications/board",
  "/admin/applications/new",
  "/admin/jobs",
  "/admin/contacts",
  "/admin/projects",
  "/admin/projects/new",
  "/admin/generator",
  "/admin/api-keys",
  "/admin/audit",
  "/admin/chat",
  "/admin/settings",
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const js = JSON.stringify;
const $ = (selector) => `document.querySelector(${js(selector)})`;
/** O que está à vista, entre os que o seletor acha: há dois menus da conta. */
const shown = (selector) => `[...document.querySelectorAll(${js(selector)})].find((el) => el.checkVisibility())`;
const focused = `(() => { const el = document.activeElement; return (el.getAttribute("aria-label") || el.textContent).trim().replace(/\\s+/g, " ") })()`;
const overlay = `document.querySelector('[role="menu"], dialog[open]')`;

/* ── sessão ──────────────────────────────────────────────────────────────── */

/** Um IP por chamada: a trava do login conta por IP, e um caso a esgota. */
const someone = () => `10.${randomInt(256)}.${randomInt(256)}.${randomInt(1, 255)}`;

async function fillLogin(page, email, password) {
  await page.waitFor(`${$("form button[type=submit]")} !== null`, "o formulário");
  for (const [name, value] of [["email", email], ["password", password]]) {
    await page.evaluate(`(() => { const el = ${$(`input[name=${name}]`)}; el.focus(); el.value = ""; })()`);
    await page.type(value);
  }
}

const credentials = () => {
  const { ADMIN_EMAIL: email, ADMIN_PASSWORD: password } = process.env;
  if (!email || !password) throw new Error("exporte ADMIN_EMAIL e ADMIN_PASSWORD");
  return { email, password };
};

let cookies = null;

/** Entra uma vez e leva a sessão aos outros casos, que têm contexto próprio. */
async function signIn(page) {
  if (!cookies) {
    const { email, password } = credentials();
    await page.call("Network.setExtraHTTPHeaders", { headers: { "X-Forwarded-For": someone() } });
    await page.open("/admin/login");
    await fillLogin(page, email, password);
    await page.press("Enter");
    await page.waitFor(`location.pathname === "/admin"`, "entrar", 20000);
    await page.call("Network.setExtraHTTPHeaders", { headers: {} });
    const all = (await page.call("Network.getAllCookies")).cookies;
    cookies = all.filter(({ name }) => /session-token/.test(name));
    if (cookies.length === 0) throw new Error("a sessão não veio");
    await page.call("Network.clearBrowserCookies");
  }
  for (const { name, value, path, httpOnly } of cookies) {
    await page.call("Network.setCookie", { name, value, path, httpOnly, url: BASE });
  }
}

const cookie = (page, name, value, path = "/admin") =>
  page.call("Network.setCookie", { name, value, path, url: `${BASE}${path}` });

/** Abre já com sessão, tema e idioma escolhidos. */
async function enter(page, path, { theme = "dusk", lang = "pt-BR", menu } = {}) {
  await signIn(page);
  if (lang) await cookie(page, "admin-locale", lang);
  if (menu) await cookie(page, "admin-menu", menu);
  await page.beforeLoad(save({ "maarkn-site-theme": theme }));
  page.errors.length = 0;
  await page.open(path);
  await hydrated(page);
}

const hydrated = (page) =>
  page.waitFor(
    `(() => { const el = ${$("[data-search]")}; return el && Object.keys(el).some((key) => key.startsWith("__reactProps")) })()`,
    "React assumir a página",
  );

/**
 * Com a lista no lugar, e já do React: a que chega depois substitui o que tinha o
 * foco, e a que rola só vira parada de Tab quando ele a assume.
 */
const listed = (page) =>
  page.waitFor(
    `document.querySelector('main [role="status"]') === null &&
      [...document.querySelectorAll("[data-slot=table-container]")].every((el) => el.scrollWidth <= el.clientWidth || el.tabIndex === 0)`,
    "a lista",
  );

/** As telas de um registro, pela lista de cada um. */
async function records(page) {
  const first = (list, pattern) =>
    page
      .open(list)
      .then(() => page.evaluate(`[...document.querySelectorAll("a[href]")].map((a) => a.getAttribute("href").match(${pattern})?.[0]).find(Boolean) ?? null`));
  const edit = await first("/admin/applications", String.raw`/^\/admin\/applications\/(?!new|board)[^/]+\/edit$/`);
  const project = await first("/admin/projects", String.raw`/^\/admin\/projects\/(?!new)[^/]+\/edit$/`);
  const generation = await first("/admin/generator", String.raw`/^\/admin\/generator\/[^/]+$/`);
  return [edit, edit?.replace("/edit", ""), project, generation].filter(Boolean);
}

/* ── casos ───────────────────────────────────────────────────────────────── */

async function access(page, t) {
  await signIn(page);
  const inside = await records(page);
  t.equal(inside.length, 4, "há um registro de cada para abrir");
  await page.open("/admin/applications");
  const company = await page.evaluate(`${$("tbody .admin-row-link")}.textContent`);
  t.ok(company.length > 2, "há uma candidatura na lista", company);

  for (const path of [...SCREENS, ...inside]) {
    const response = await fetch(`${BASE}${path}`, { redirect: "manual" });
    const body = await response.text();
    t.ok(
      response.status === 307 && new URL(response.headers.get("location"), BASE).pathname === "/admin/login",
      `${path}: sem sessão vai para o login`,
      `${response.status} ${response.headers.get("location")}`,
    );
    t.ok(!body.includes(company) && !body.includes("<main"), `${path}: nada da tela é entregue`);
  }
}

async function login(page, t) {
  await page.call("Network.setExtraHTTPHeaders", { headers: { "X-Forwarded-For": someone() } });
  await cookie(page, "locale", "pt-BR", "/");
  await page.open("/admin/login");
  t.equal(await page.evaluate(`document.documentElement.lang`), "pt-BR", "no idioma do site");
  t.equal(await page.evaluate(`document.querySelectorAll("nav, aside, header, a[href]").length`), 0, "sem navegação");
  t.equal(await page.evaluate(`document.querySelectorAll("h1").length`), 1, "um h1");

  const order = [];
  await page.evaluate(`document.activeElement.blur()`);
  for (let i = 0; i < 3; i++) {
    await page.press("Tab");
    order.push(await page.evaluate(`document.activeElement.name || document.activeElement.type`));
  }
  t.equal(order, ["email", "password", "submit"], "Tab percorre na ordem em que se vê");

  const answers = [];
  for (const email of [credentials().email, "ninguem@example.com"]) {
    await page.open("/admin/login");
    await fillLogin(page, email, "senha-errada-mesmo");
    await page.press("Enter");
    await page.waitFor(`[...document.querySelectorAll("[role=alert]")].some((el) => el.textContent)`, "a recusa", 20000);
    answers.push(await page.evaluate(`[...document.querySelectorAll("[role=alert]")].map((el) => el.textContent).filter(Boolean).join("|")`));
    t.equal(
      await page.evaluate(`["email", "password"].map((n) => document.querySelector("input[name=" + n + "]").getAttribute("aria-invalid"))`),
      ["true", "true"],
      "nenhum campo é apontado sozinho",
    );
  }
  t.equal(answers[0], "E-mail ou senha incorretos.", "a recusa é genérica");
  t.equal(answers[0], answers[1], "a recusa não revela se o e-mail existe");

  const source = axeSource();
  for (const theme of THEMES) {
    await page.beforeLoad(save({ "maarkn-site-theme": theme }));
    await page.open("/admin/login");
    await sleep(300);
    await measureContrast(page, t, `${theme}, login`, "main", 5);
    await page.evaluate(`${source}; 0`);
    t.equal(await violations(page), [], `${theme}: axe sem violação no login`);
  }
  t.ok((await page.evaluate(`document.documentElement.scrollWidth`)) <= (await page.evaluate(`innerWidth`)), "sem rolagem horizontal");
  t.equal(page.errors, [], "nenhum erro no console");
}

async function throttle(page, t) {
  const { email, password } = credentials();
  await page.call("Network.setExtraHTTPHeaders", { headers: { "X-Forwarded-For": someone() } });
  const attempt = async (secret) => {
    await page.open("/admin/login");
    await fillLogin(page, email, secret);
    await page.press("Enter");
    await page.waitFor(
      `location.pathname === "/admin" || [...document.querySelectorAll("[role=alert]")].some((el) => el.textContent)`,
      "a resposta",
      20000,
    );
    return page.evaluate(`location.pathname === "/admin" ? "entrou" : [...document.querySelectorAll("[role=alert]")].map((el) => el.textContent).join("")`);
  };
  const refusals = new Set();
  for (let i = 0; i < 10; i++) refusals.add(await attempt(`errada-${i}-errada`));
  t.equal(refusals.size, 1, "todas as recusas são a mesma");
  t.ok(!refusals.has("entrou"), "nenhuma entrou");
  t.equal(await attempt(password), [...refusals][0], "atingido o limite, nem a senha certa entra, com a mesma recusa");
}

const BLOCK_STORAGE = `Object.defineProperty(window, "localStorage", { get() { throw new DOMException("denied", "SecurityError") } });`;

async function themes(page, t) {
  await signIn(page);
  const visit = async (path, { scheme = "dark", before = "", expected }) => {
    await page.prefer({ scheme });
    const { identifier } = await page.beforeLoad(before + WATCH_FIRST_PAINT);
    await page.open(path);
    await themeAtFirstPaint(page, t, expected);
    await page.call("Page.removeScriptToEvaluateOnNewDocument", { identifier });
  };
  for (const path of ["/admin", "/admin/settings"]) {
    for (const theme of THEMES) {
      await visit(path, { scheme: "light", before: save({ "maarkn-site-theme": theme }), expected: theme });
    }
    await visit(path, { scheme: "light", before: "localStorage.clear();", expected: "light" });
    await visit(path, { scheme: "dark", before: "localStorage.clear();", expected: "dusk" });
    await visit(path, { scheme: "light", before: save({ "maarkn-site-theme": "classic" }), expected: "light" });
    await visit(path, { scheme: "light", before: BLOCK_STORAGE, expected: "light" });
  }

  /* A Versão CLI em `classic`, com a outra fonte, não muda nada aqui. */
  await page.beforeLoad(save({ "maarkn-site-theme": "light", "maarkn-theme": "classic", "maarkn-font": "daddytime" }));
  await page.open("/admin");
  await hydrated(page);
  const bg = `getComputedStyle(document.body).backgroundColor`;
  t.equal(await page.evaluate(bg), "rgb(223, 228, 238)", "com a Versão CLI em classic, continua claro suave");
  t.equal(
    await page.evaluate(`performance.getEntriesByType("resource").map((r) => r.name).filter((name) => /daddy/i.test(name))`),
    [],
    "não baixa a fonte da Versão CLI",
  );

  await page.click(await visibleSelector(page, "[data-account]"));
  await page.waitFor(`${overlay} !== null`, "o menu da conta");
  await sleep(250); // ele ainda está indo para o lugar
  for (const theme of ["dracula", "dusk", "light"]) {
    await page.click(`[data-theme-option=${theme}]`);
    await page.waitFor(`document.documentElement.dataset.siteTheme === ${js(theme)}`, theme);
    t.equal(await page.evaluate(`localStorage.getItem("maarkn-site-theme")`), theme, `${theme}: a escolha é a do site`);
    t.ok(await page.evaluate(`${overlay} !== null`), `${theme}: o menu continua aberto`);
    await sleep(400); // a transição cobre a página enquanto dura
  }
  t.equal(
    await page.evaluate(`["maarkn-theme", "maarkn-font"].map((key) => localStorage.getItem(key))`),
    ["classic", "daddytime"],
    "e as preferências da Versão CLI ficam",
  );
  t.equal(page.errors, [], "nenhum erro no console");
}


/** Troca o tema com a tela aberta: nada pode ficar com a cor do anterior. */
async function change(page, t) {
  await enter(page, "/admin");
  const inside = await records(page);
  for (const path of [...SCREENS, ...inside]) {
    await page.open(path);
    await hydrated(page);
    await sleep(250);
    const left = await page.evaluate(`(async () => {
      const clear = (c) => c === "" || c === "none" || c === "transparent" || /, 0\\)$|\\/ 0\\)$/.test(c);
      /* A folha de papel do gerador e o monograma do projeto, as exceções escritas
         em src/lib/admin/color-audit.ts; e o ícone do tema, que mostra o tema dele. */
      const apart = (el) => el.closest("article, [style*=linear-gradient], dialog:not([open])") !== null || !el.checkVisibility();
      const elements = [...document.body.querySelectorAll("*")].filter((el) => !/^(SCRIPT|STYLE|NEXT-ROUTE-ANNOUNCER)$/.test(el.tagName));
      const read = () => elements.map((el) => {
        const s = getComputedStyle(el);
        return [s.color, s.backgroundColor, parseFloat(s.borderTopWidth) ? s.borderTopColor : "", parseFloat(s.borderBottomWidth) ? s.borderBottomColor : ""];
      });
      const seen = [];
      for (const theme of ${js(THEMES)}) {
        document.documentElement.setAttribute("data-site-theme", theme);
        await new Promise((r) => setTimeout(r, 250));
        seen.push(read());
      }
      const kept = new Set();
      elements.forEach((el, i) => {
        if (apart(el)) return;
        for (const [a, b] of [[0, 1], [1, 2], [0, 2]]) {
          seen[a][i].forEach((c, j) => {
            if (!clear(c) && c === seen[b][i][j]) kept.add(el.tagName + "." + String(el.className.baseVal ?? el.className).slice(0, 40) + " " + c);
          });
        }
      });
      return [...kept].slice(0, 6);
    })()`);
    t.equal(left, [], `${path}: tudo muda com o tema`);
  }
}

async function languages(page, t) {
  const lang = `document.documentElement.lang`;
  await signIn(page);

  /* Primeira visita: o idioma do site, e sem ele o do navegador. */
  await cookie(page, "locale", "en", "/");
  await page.call("Network.setExtraHTTPHeaders", { headers: { "Accept-Language": "pt-BR,pt;q=0.9" } });
  await page.open("/admin/projects");
  t.equal(await page.evaluate(lang), "en", "o site em inglês: o backoffice começa em inglês");
  await page.call("Network.deleteCookies", { name: "locale", url: BASE });
  await page.open("/admin/projects");
  t.equal(await page.evaluate(lang), "pt-BR", "sem escolha no site: o idioma do navegador");
  await page.call("Network.setExtraHTTPHeaders", { headers: { "Accept-Language": "en-US" } });
  await page.open("/admin/projects");
  t.equal(await page.evaluate(lang), "en", "e o dele em inglês");

  /* A troca, no menu da conta, com a tela aberta. */
  await hydrated(page);
  const date = `[...document.querySelectorAll("tbody td")].map((td) => td.textContent).find((text) => /\\d{4}, \\d\\d:\\d\\d$/.test(text))`;
  const before = await page.evaluate(`({ path: location.pathname, date: ${date}, name: ${$("tbody .admin-row-link")}.textContent })`);
  t.ok(/^[A-Z][a-z]{2} \d{1,2}, \d{4}, \d\d:\d\d$/.test(before.date), "datas em inglês, com o mês por nome", before.date);
  const pick = async (option) => {
    await page.evaluate(`${shown("[data-account]")}.focus()`);
    await page.press("Enter");
    await page.waitFor(`${overlay} !== null`, "o menu da conta");
    await sleep(250); // ele ainda está indo para o lugar
    await page.click(`[data-language-option=${js(option)}]`);
    /* O documento é carregado de novo. */
    await sleep(600);
    await page.waitFor(`${lang} === ${js(option)}`, option);
    await hydrated(page);
    await listed(page);
  };
  await pick("pt-BR");
  const after = await page.evaluate(`({ path: location.pathname, date: ${date}, name: ${$("tbody .admin-row-link")}.textContent })`);
  t.equal(after.path, before.path, "o endereço não muda");
  t.ok(/^\d\d\/\d\d\/\d{4}, \d\d:\d\d$/.test(after.date), "datas em português", after.date);
  t.equal(after.name, before.name, "o que foi escrito por Marco continua como foi escrito");
  const text = await page.evaluate(`document.body.innerText`);
  t.ok(text.includes("Candidaturas") && text.includes("Criar"), "a estrutura em português");
  t.ok(!/Search or run|Create|Resume generator|coming soon/.test(text), "e nada dela em inglês");

  await page.open("/admin/settings");
  t.equal(await page.evaluate(lang), "pt-BR", "vale nos próximos acessos, mesmo com o navegador em inglês");
  await hydrated(page);
  await pick("en");
  t.equal(await page.evaluate(`${$("main [lang]")}.lang`), "en", "a tela traduzida está em inglês");
  t.ok((await page.evaluate(`${$("main h1")}.textContent`)) === "Settings", "com as palavras dela em inglês");
  await page.open("/admin");
  t.equal(await page.evaluate(`${$("main [lang]")}.lang`), "pt-BR", "a tela ainda não traduzida diz que está em português");
  await page.open("/admin/settings");
  await hydrated(page);
  const site = await fetch(`${BASE}/en`);
  t.equal(site.status, 200, "e o site continua no idioma do endereço");

  /* O fuso, nas configurações. */
  const zone = async (value) => {
    await page.evaluate(`(() => { const el = ${$("input[name=timeZone]")}; el.focus(); el.select(); })()`);
    await page.type(value);
    await page.press("Enter");
  };
  await zone("Asia/Nowhere");
  await page.waitFor(`${$("#timeZone-error")} !== null`, "a recusa do fuso");
  t.equal(await page.evaluate(`${$("input[name=timeZone]")}.value`), "Asia/Nowhere", "o digitado fica");
  await zone("asia/tokyo");
  await page.waitFor(`${$("input[name=timeZone]")}.value === "Asia/Tokyo"`, "o fuso salvo");
  await page.open("/admin/projects");
  const tokyo = await page.evaluate(date);
  const hours = (text) => Date.parse(`${text.replace(/, (\d\d:\d\d)$/, " $1")} UTC`) / 36e5;
  t.equal(hours(tokyo) - hours(before.date), 12, "as horas são as do fuso: doze depois de São Paulo");
  t.equal(page.errors, [], "nenhum erro no console");
}

/** O navegador em outro fuso e outro idioma: servidor e navegador dizem o mesmo. */
async function hydration(page, t) {
  await page.call("Emulation.setTimezoneOverride", { timezoneId: "Pacific/Auckland" });
  await page.call("Emulation.setLocaleOverride", { locale: "de-DE" });
  for (const lang of ["pt-BR", "en"]) {
    await enter(page, "/admin", { lang });
    const inside = await records(page);
    page.errors.length = 0;
    for (const path of [...SCREENS, ...inside]) {
      await page.open(path);
      await hydrated(page);
      await sleep(150);
      t.equal(page.errors.splice(0), [], `${lang} ${path}: nada diverge, nenhum erro no console`);
    }
  }
}

const violations = (page) =>
  page.evaluate(`axe.run(document, { rules: { "target-size": { enabled: true } } }).then((r) => r.violations.map((v) => v.id + ": " + v.nodes.map((n) => n.target.join(" ")).slice(0, 3).join(" | ")))`);

/** Todo texto contra os pixels de trás, e axe, com o que a estrutura abre. */
async function look(page, t, { width }) {
  const source = axeSource();
  for (const theme of THEMES) {
    for (const lang of ["pt-BR", "en"]) {
      await enter(page, "/admin/applications/new", { theme, lang });
      await page.hover({ x: 4, y: 300 });
      await page.evaluate(`document.activeElement.blur()`);
      await sleep(400);
      const label = `${theme}, ${lang}`;
      t.ok((await page.evaluate(`document.documentElement.scrollWidth`)) <= width, `${label}: sem rolagem horizontal`);
      await page.evaluate(`${source}; 0`);
      t.equal(await violations(page), [], `${label}: axe sem violação`);
      if (width >= PHONE) await measureContrast(page, t, `${label}, menu`, "aside", 10);
      else await measureContrast(page, t, `${label}, barra`, 'nav[aria-label="Atalhos"], nav[aria-label="Shortcuts"]', 5);
      await measureContrast(page, t, `${label}, topo`, "header", width >= PHONE ? 3 : 2);
      await measureContrast(page, t, `${label}, caminho`, "nav ol", 2);

      const open = async (name, selector) => {
        await page.click(await visibleSelector(page, selector));
        await page.waitFor(`${overlay} !== null`, name);
        await page.hover({ x: 4, y: 4 });
        await sleep(400);
        t.equal(await violations(page), [], `${label}, ${name}: axe sem violação`);
        await measureContrast(page, t, `${label}, ${name}`, '[role="menu"], dialog[open]', 4);
        const face = await page.evaluate(`(() => { const el = ${$('[role="menu"]')}; return el && getComputedStyle(el).fontFamily === getComputedStyle(document.body).fontFamily })()`);
        t.ok(face !== false, `${label}, ${name}: o primitivo está na fonte das telas`);
        await page.press("Escape");
        await page.waitFor(`${overlay} === null`, `${name} fechar`);
        await sleep(250); // o foco volta ao botão depois de o menu sair
      };
      await open("criar", "[data-create]");
      await open("conta", "[data-account]");
      await open("busca", "[data-search]");
      if (width < PHONE) await open("mais", "[data-more]");
    }
  }
}

/** Um seletor que acha o elemento à vista. */
async function visibleSelector(page, selector) {
  await page.evaluate(`(() => {
    for (const el of document.querySelectorAll("[data-e2e]")) el.removeAttribute("data-e2e");
    ${shown(selector)}.setAttribute("data-e2e", "");
  })()`);
  return "[data-e2e]";
}

/** A quantos elementos Tab tem de chegar, haja na tela o que houver. Uma lista de abas passa o foco à aba. */
const STOPS = `[...document.querySelectorAll("a[href], button, input, select, textarea, summary, [tabindex]:not([role=tablist])")]
  .filter((el) => el.tabIndex >= 0 && !el.disabled && el.type !== "hidden" && el.checkVisibility({ visibilityProperty: true })).length`;

/** Tab por toda a tela: foco sempre visível, sem nada por cima, na ordem em que se vê. */
async function keyboard(page, t, { width, height }) {
  for (const theme of THEMES) {
    await enter(page, "/admin/projects", { theme });
    await listed(page);
    await page.evaluate(`window.__passed = new Set(); document.activeElement.blur()`);
    const stops = [];
    for (let i = 0; i < 300; i++) {
      await page.press("Tab");
      await sleep(30);
      const stop = await page.evaluate(`(() => {
        const el = document.activeElement;
        if (el === document.body || window.__passed.has(el)) return null;
        window.__passed.add(el);
        const r = el.getBoundingClientRect();
        /* Uma lista que rola é uma parada, e pode ser mais alta que a tela. */
        const tall = r.height > innerHeight;
        const [x, y] = [r.left + Math.min(r.width / 2, 60), tall ? Math.max(r.top + 4, 120) : r.top + r.height / 2];
        const hit = document.elementFromPoint(x, y);
        const s = getComputedStyle(el);
        /* A field's frame is around it, on the hologram that holds it. */
        const ring = [...(el.closest("[data-holo]") || el).querySelectorAll("svg path")].some((p) => { const c = getComputedStyle(p); return parseFloat(c.strokeWidth) >= 6 && parseFloat(c.opacity) > 0 });
        const outline = parseFloat(s.outlineWidth) > 0 && s.outlineStyle !== "none" && !/, 0\\)$/.test(s.outlineColor);
        return {
          name: (el.getAttribute("aria-label") || el.labels?.[0]?.textContent || el.textContent).trim().replace(/\\s+/g, " ").slice(0, 40),
          where: el.closest("aside") ? "menu" : el.closest("header") ? "topo" : el.closest("main") ? "tela" : el.closest("nav") ? "barra" : "salto",
          seen: ring || outline || /inset|rgb/.test(s.boxShadow),
          inside: tall
            ? r.top < innerHeight && r.bottom > 0
            : r.top >= -1 && r.bottom <= innerHeight + 1 && r.left >= -1 && r.right <= innerWidth + 1,
          covered: hit !== el && !el.contains(hit) && !hit?.contains(el),
        };
      })()`);
      if (!stop) break;
      stops.push(stop);
    }
    const expected = await page.evaluate(STOPS);
    t.equal(stops.length, expected, `${theme}: Tab passa por tudo, uma vez`);
    t.ok(expected > 10, `${theme}: há o que percorrer`, `${expected}`);
    t.equal(stops.filter((s) => !s.seen).map((s) => s.name), [], `${theme}: todo foco é visível`);
    t.equal(stops.filter((s) => !s.inside || s.covered).map((s) => `${s.where}: ${s.name}`), [], `${theme}: nada cobre o que tem foco`);
    const places = stops.map((s) => s.where).filter((where, i, all) => where !== all[i - 1]);
    t.equal(places.slice(0, 4), width >= PHONE ? ["salto", "menu", "topo", "tela"] : ["salto", "topo", "tela", "barra"], `${theme}: na ordem em que se vê`);
  }

  await page.open("/admin/projects");
  await hydrated(page);
  await page.evaluate(`document.activeElement.blur()`);
  await page.press("Tab");
  t.equal(await page.evaluate(focused), "Pular para o conteúdo", "o primeiro é o salto");
  await page.press("Enter");
  t.equal(await page.evaluate(`document.activeElement.id`), "content", "que leva o foco ao conteúdo");
  t.ok(height > 0, "altura");
}

/* ── foco ────────────────────────────────────────────────────────────────── */

/**
 * Onde está o que tem foco, contra o topo e a barra da base, que ficam por cima
 * da tela. O que cabe entre os dois tem de estar inteiro à vista; o que não cabe
 * (uma lista que rola), em parte. `null` quando o foco saiu da página ou voltou
 * a um elemento por onde já passou: o fim da volta.
 */
const FOCUS = `(() => {
  const el = document.activeElement;
  if (el === document.body) return null;
  /* Os segmentos de um campo de data são várias paradas no mesmo elemento. */
  if (el !== window.__last && window.__passed.has(el)) return null;
  const again = el === window.__last;
  window.__passed.add((window.__last = el));
  const name = (el.getAttribute("aria-label") || el.name || el.id || el.textContent).trim().replace(/\\s+/g, " ").slice(0, 40);
  const over = (bar) => bar?.checkVisibility() && !bar.contains(el) ? bar.getBoundingClientRect() : null;
  if (el.closest("header, aside, nav[aria-label=Atalhos]") || !el.closest("main, nav")) return { name, again, hidden: null };
  const top = Math.max(0, over(document.querySelector("header"))?.bottom ?? 0);
  const base = over(document.querySelector("nav[aria-label=Atalhos]"))?.top ?? innerHeight;
  /* O que sobra do elemento depois do que o recorta no caminho: célula, card, quadro. */
  const r = el.getBoundingClientRect();
  let left = Math.max(r.left, 0), right = Math.min(r.right, document.documentElement.clientWidth);
  for (let box = el.parentElement; box && box !== document.body; box = box.parentElement) {
    if (getComputedStyle(box).overflowX === "visible") continue;
    const b = box.getBoundingClientRect();
    left = Math.max(left, b.left);
    right = Math.min(right, b.right);
  }
  const from = Math.max(r.top, top), to = Math.min(r.bottom, base);
  const fits = r.height <= base - top - 32;
  const seen = right - left >= Math.min(16, r.width) && (fits ? to - from >= r.height - 1 : to - from >= Math.min(24, r.height));
  const hit = document.elementFromPoint((left + right) / 2, (from + to) / 2);
  const found = hit !== null && (hit === el || el.contains(hit) || hit.contains(el) || hit.closest("label")?.control === el);
  return { name, again, hidden: seen && found ? null : Math.round(r.top) + " a " + Math.round(r.bottom) + ", entre " + Math.round(top) + " e " + Math.round(base) + (found ? "" : ", sob " + (hit?.tagName ?? "nada")) };
})()`;

/** Percorre a tela inteira com a tecla, e devolve as paradas. */
async function walk(page, shift) {
  await page.evaluate(`(() => { window.__passed = new Set(); window.__last = null })()`);
  const stops = [];
  for (let i = 0; i < 600; i++) {
    await page.press("Tab", { shift });
    let stop = await page.evaluate(FOCUS);
    if (stop?.hidden) {
      /* Só conta o que fica assim: a rolagem pode ainda não ter chegado. */
      await sleep(500);
      stop = { ...(await page.evaluate(FOCUS)), again: stop.again };
    }
    if (!stop) return stops;
    if (!stop.again || stop.hidden) stops.push(stop);
  }
  throw new Error("Tab não chegou ao fim em 600 paradas");
}

/**
 * Toda tela, de ponta a ponta e de volta. A geometria não muda com o tema, então
 * é um só; muda com a largura, e com a altura que sobra num zoom de 400%.
 */
async function focus(page, t, { width, height }) {
  await enter(page, "/admin");
  const screens = [...SCREENS, ...(await records(page))];
  const sizes = width < PHONE ? [[width, height], [360, 640]] : [[width, height]];
  if (width >= NAMES) sizes.push([Math.round(width / 4), Math.round(height / 4)]);
  for (const [w, h] of sizes) {
    await page.density(1, { width: w, height: h });
    for (const path of screens) {
      await page.open(path);
      await hydrated(page);
      await listed(page);
      await page.evaluate(`document.activeElement.blur()`);
      for (const shift of [false, true]) {
        const stops = await walk(page, shift);
        const label = `${w}×${h} ${path}${shift ? ", de volta" : ""}`;
        t.equal(stops.length, await page.evaluate(STOPS), `${label}: Tab passa por tudo, uma vez`);
        const hidden = stops.filter((stop) => stop.hidden);
        t.ok(hidden.length === 0, `${label}: nada cobre o que tem foco`, `${hidden.length} de ${stops.length}: ${hidden.slice(0, 4).map((stop) => `${stop.name} (${stop.hidden})`).join("; ")}`);
      }
    }

    /* Um controle das barras já está à vista: alcançá-lo não rola a tela. */
    await page.open("/admin/contacts");
    await hydrated(page);
    await listed(page);
    const moved = await page.evaluate(`(async () => {
      const bars = [...document.querySelectorAll("header, aside, nav[aria-label=Atalhos]")].filter((bar) => !bar.closest("main"));
      const controls = bars.flatMap((bar) => [...bar.querySelectorAll("a[href], button")]).filter((el) => el.checkVisibility());
      const moved = [];
      for (const el of controls) {
        document.activeElement.blur();
        scrollTo(0, 300);
        el.focus();
        await new Promise((r) => requestAnimationFrame(r));
        if (scrollY !== 300) moved.push((el.getAttribute("aria-label") || el.textContent) + " " + scrollY);
      }
      return { controls: controls.length, moved };
    })()`);
    t.ok(moved.controls >= 9, `${w}×${h}: há controles nas barras`, `${moved.controls}`);
    t.equal(moved.moved, [], `${w}×${h}: alcançar um controle das barras não rola a tela`);
  }
}

async function menu(page, t, { width }) {
  await enter(page, "/admin/jobs");
  const visible = (selector) => page.evaluate(`Boolean(${shown(selector)})`);
  const named = () =>
    page.evaluate(`(() => { const el = ${$('aside a[href="/admin/contacts"] > span:not([aria-hidden])')}; return el.getBoundingClientRect().width > 20 })()`);

  if (width < PHONE) {
    t.ok(!(await visible("aside")), "no celular não há menu ao lado");
    t.equal(
      await page.evaluate(`[...document.querySelectorAll('nav[aria-label="Atalhos"] a, nav[aria-label="Atalhos"] button')].map((el) => el.textContent.trim())`),
      ["Visão geral", "Candidaturas", "Vagas", "Contatos", "Mais"],
      "a barra tem as telas principais e Mais",
    );
    const bar = await page.evaluate(`(() => { const r = ${$('nav[aria-label="Atalhos"]')}.getBoundingClientRect(); return { bottom: Math.round(r.bottom), top: Math.round(r.top) } })()`);
    t.equal(bar.bottom, await page.evaluate(`innerHeight`), "na base da tela");
    await page.click("[data-more]");
    await page.waitFor(`${$("dialog[open]")} !== null`, "Mais");
    t.equal(await page.evaluate(`${$("dialog[open]")}.querySelectorAll("a").length`), 10, "com todas as telas construídas");
    await page.evaluate(`${$('dialog[open] a[href="/admin/audit"]')}.scrollIntoView({ block: "center" })`);
    await page.click('dialog[open] a[href="/admin/audit"]');
    await page.waitFor(`location.pathname === "/admin/audit" && !${$("dialog[open]")}`, "ir à auditoria");

    await enter(page, "/admin/settings");
    await page.click("[data-more]");
    await page.waitFor(`${$("dialog[open]")} !== null`, "Mais");
    await sleep(300);
    t.ok(
      await page.evaluate(`(() => { const r = ${$("dialog[open] [aria-current]")}.getBoundingClientRect(); const hit = document.elementFromPoint(r.left + 30, r.top + r.height / 2); return hit !== null && ${$("dialog[open] [aria-current]")}.contains(hit) })()`),
      "a tela atual à vista ao abrir",
    );

    /* O fim da tela não fica atrás da barra. */
    await enter(page, "/admin/projects");
    await page.scroll({ to: "bottom" });
    const end = await page.evaluate(`Math.round([...document.querySelectorAll("main *")].reduce((max, el) => Math.max(max, el.getBoundingClientRect().bottom), 0))`);
    t.ok(end <= bar.top, "o fim da tela fica acima da barra", `${end} em ${bar.top}`);

    await page.call("Emulation.setTouchEmulationEnabled", { enabled: true });
    await page.density(1, { width, height: 844, mobile: true });
    await page.open("/admin/jobs");
    const small = await page.evaluate(`[...document.querySelectorAll('header a, header button, nav[aria-label="Atalhos"] a, nav[aria-label="Atalhos"] button')].filter((el) => el.checkVisibility()).flatMap((el) => {
      const r = el.getBoundingClientRect();
      const extra = getComputedStyle(el, "::before");
      const grow = extra.content !== "none" ? -2 * parseFloat(extra.top) : 0;
      return r.height + grow < 44 || r.width + grow < 44 ? [(el.getAttribute("aria-label") || el.textContent) + " " + r.width + "x" + r.height] : [];
    })`);
    t.equal(small, [], "todo alvo tem 44 px");
  } else if (width < NAMES) {
    t.ok(await visible("aside"), "o menu ao lado");
    t.ok(!(await named()), "só com ícones");
    t.ok(!(await visible("aside button[aria-controls]")), "sem o que recolher");
    const tip = `${$('[data-slot="tooltip-content"]')}?.firstChild.textContent ?? null`;
    await page.evaluate(`${$('aside a[href="/admin/contacts"]')}.focus()`);
    await page.waitFor(`${tip} === "Contatos"`, "a dica no foco", 3000);
    t.ok(true, "o nome aparece no foco");
    await page.evaluate(`document.activeElement.blur()`);
    await page.hover('aside a[href="/admin/audit"]');
    await page.waitFor(`${tip} === "Auditoria"`, "a dica no ponteiro", 3000);
    t.ok(true, "o nome aparece no ponteiro");
    for (const theme of THEMES) {
      await page.evaluate(`document.documentElement.setAttribute("data-site-theme", ${js(theme)})`);
      await sleep(200);
      await measureContrast(page, t, `${theme}, dica`, '[data-slot="tooltip-content"]', 1);
    }
  } else {
    t.ok(await named(), "o menu tem os nomes");
    await page.click("aside button[aria-controls]");
    t.ok(!(await named()), "recolhe");
    await page.open("/admin/contacts");
    const html = await page.evaluate(`document.documentElement.outerHTML.includes('data-menu="collapsed"')`);
    t.ok(html && !(await named()), "e continua recolhido na próxima tela");
    const sent = await page.evaluate(`fetch(location.href).then((r) => r.text())`);
    t.ok(sent.includes('data-menu="collapsed"'), "já recolhido no que o servidor manda");
    await hydrated(page);
    await page.hover('aside a[href="/admin/audit"]');
    await page.waitFor(`${$('[data-slot="tooltip-content"]')}?.firstChild.textContent === "Auditoria"`, "a dica", 3000);
    t.ok(true, "com o nome em dica");
    await page.click("aside button[aria-controls]");
    t.ok(await named(), "e volta a abrir");
  }

  /* Em breve, sem link nem foco, e a tela atual. */
  await enter(page, "/admin/applications/board");
  const scope = width < PHONE ? "dialog" : "aside";
  if (width < PHONE) {
    await page.click("[data-more]");
    await page.waitFor(`${$("dialog[open]")} !== null`, "Mais");
  }
  t.equal(
    await page.evaluate(`[...${$(scope)}.querySelectorAll("li > span")].map((el) => [el.textContent.trim().replace(/\\s+/g, " "), el.tabIndex, el.querySelector("a, button") === null])`),
    [["Agenda em breve", -1, true], ["Experiências em breve", -1, true], ["Notas em breve", -1, true]],
    "o que não existe aparece como em breve",
  );
  t.equal(
    await page.evaluate(`[...${$(scope)}.querySelectorAll("[aria-current]")].map((el) => el.textContent.trim())`),
    ["Candidaturas"],
    "a tela atual, uma só",
  );
  t.equal(page.errors, [], "nenhum erro no console");

  await signIn(page);
  for (const path of [...SCREENS, ...(await records(page))]) {
    await page.open(path);
    const doc = await page.evaluate(`document.documentElement.scrollWidth`);
    t.ok(doc <= width, `${path}: sem rolagem horizontal`, `${doc} em ${width}`);
  }
}

async function search(page, t) {
  await enter(page, "/admin/applications");
  const company = await page.evaluate(`${$("tbody .admin-row-link")}.textContent`);
  const all = await page.evaluate(`[...document.querySelectorAll("tbody .admin-row-link")].map((el) => el.textContent)`);

  await page.open("/admin/settings");
  const html = await page.evaluate(`fetch(location.href).then((r) => r.text())`);
  t.equal(all.filter((name) => name.length > 3 && html.includes(name)), [], "nenhuma candidatura no HTML inicial");
  await hydrated(page);
  await page.evaluate(`${$("input[name=currentPassword]")}.focus()`);
  await page.press("k", { meta: true });
  await page.waitFor(`document.activeElement.getAttribute("role") === "combobox"`, "a busca abrir", 5000);
  await page.waitFor(`${$("dialog [role=status]")}.textContent.match(/\\d+/)`, "a contagem");

  await page.type("zzzz nada disso");
  await page.waitFor(`/^Nada aqui/.test(${$("dialog [role=status]")}.textContent)`, "dizer que não achou");
  t.ok(true, "nada encontrado: diz isso");
  await page.press("Escape");
  await page.waitFor(`!${$("dialog[open]")}`, "fechar");
  t.equal(await page.evaluate(`document.activeElement.name`), "currentPassword", "Esc volta ao que estava");

  await page.press("k", { ctrl: true });
  await page.waitFor(`document.activeElement.getAttribute("role") === "combobox"`, "a busca de novo");
  await page.type(company.toUpperCase());
  await page.waitFor(`${$("[role=option][aria-selected=true]")}?.dataset.result.startsWith("application-")`, "achar a candidatura", 8000);
  await page.press("Enter");
  await page.waitFor(`/^\\/admin\\/applications\\/[^/]+$/.test(location.pathname) && ${$("main h1")}?.textContent === ${js(company)}`, "o dossiê abrir", 10000);
  t.ok(true, "a empresa e Enter abrem o dossiê");
  t.equal(
    await page.evaluate(`[...document.querySelectorAll("nav ol li")].map((li) => li.textContent.trim())`),
    ["Candidaturas", company],
    "com o caminho de volta",
  );

  await page.press("k", { meta: true });
  await page.waitFor(`document.activeElement.getAttribute("role") === "combobox"`, "a busca");
  await page.type("claro");
  await page.waitFor(`${$("[role=option][aria-selected=true]")}?.dataset.result === "theme-light"`, "a ação");
  await page.press("Enter");
  await page.waitFor(`document.documentElement.dataset.siteTheme === "light"`, "o tema");
  t.ok(true, "a ação roda");

  /* Com um diálogo da tela aberto, o atalho não abre a busca por cima. */
  await page.open("/admin/contacts");
  await hydrated(page);
  await page.click('main button[aria-haspopup="dialog"]');
  await page.waitFor(`${$('[data-slot="dialog-content"]')} !== null`, "o diálogo");
  await page.press("k", { meta: true });
  await sleep(400);
  t.ok(await page.evaluate(`!${$("dialog[open]")}`), "o atalho espera o diálogo fechar");
  t.equal(page.errors, [], "nenhum erro no console");

  /* Sem sessão, a ação não entrega nada. */
  await page.press("Escape");
  await page.call("Network.clearBrowserCookies");
  await page.press("k", { meta: true });
  await page.waitFor(`location.pathname === "/admin/login"`, "ir para o login", 8000);
  t.ok(true, "sem sessão, a busca vai para o login");
}

async function create(page, t) {
  await enter(page, "/admin/chat");
  const items = `[...document.querySelectorAll('[role="menuitem"]')].map((el) => el.textContent.trim().replace(/\\s+/g, " "))`;
  await page.evaluate(`${shown("[data-create]")}.focus()`);
  await page.press("Enter");
  await page.waitFor(`${overlay} !== null`, "criar");
  t.equal(await page.evaluate(items), ["Candidatura", "Compromisso em breve", "Projeto", "Currículo"], "o que se pode criar");
  await sleep(150);
  t.equal(await page.evaluate(focused), "Candidatura", "o foco no primeiro");
  await page.press("ArrowDown");
  await sleep(150);
  t.equal(await page.evaluate(focused), "Projeto", "a seta pula o que está em breve");
  await page.press("Escape");
  await page.waitFor(`${overlay} === null`, "fechar");
  t.equal(await page.evaluate(focused), "Criar", "Esc devolve o foco");

  for (const [steps, path] of [[0, "/admin/applications/new"], [1, "/admin/projects/new"], [2, "/admin/generator"]]) {
    await page.open("/admin/chat");
    await hydrated(page);
    await page.evaluate(`${shown("[data-create]")}.focus()`);
    await page.press("Enter");
    await page.waitFor(`${overlay} !== null`, "criar");
    await sleep(150);
    for (let i = 0; i < steps; i++) {
      await page.press("ArrowDown");
      await sleep(100);
    }
    await page.press("Enter");
    await page.waitFor(`location.pathname === ${js(path)}`, path, 8000);
    t.ok(true, `leva a ${path}`);
  }

  await page.open("/admin/chat");
  await hydrated(page);
  await page.evaluate(`${shown("[data-account]")}.focus()`);
  await page.press("Enter");
  await page.waitFor(`${overlay} !== null`, "a conta");
  t.equal(await page.evaluate(items), ["Configurações", "Ver o site", "Sair"], "a conta, além de tema e idioma");
  await sleep(150);
  await page.press("End");
  await sleep(150);
  t.equal(await page.evaluate(focused), "Sair", "End vai ao último");
  await page.press("Enter");
  await page.waitFor(`location.pathname === "/admin/login"`, "sair", 8000);
  cookies = null;
  t.ok(true, "sair leva ao login");
}

/** O papel do gerador: nada da estrutura sai na impressora. */
async function print(page, t) {
  await enter(page, "/admin");
  const path = (await records(page)).find((at) => at.startsWith("/admin/generator/"));
  await page.open(path);
  await page.call("Emulation.setEmulatedMedia", { media: "print" });
  t.equal(
    await page.evaluate(`["aside", "header", "nav"].filter((tag) => [...document.querySelectorAll(tag)].some((el) => el.checkVisibility()))`),
    [],
    "menu, topo e caminho não são impressos",
  );
  t.equal(await page.evaluate(`getComputedStyle(${$("article")}).backgroundColor`), "rgb(255, 255, 255)", "o papel é branco em qualquer tema");
}

/** Sem JavaScript: o menu leva às telas, dá para sair, e o que não responderia não aparece. */
async function noScript(page, t, { width }) {
  await signIn(page);
  await cookie(page, "admin-locale", "pt-BR");
  await page.call("Emulation.setScriptExecutionDisabled", { value: true });
  await page.open("/admin/contacts");
  const links = await page.evaluate(`[...document.querySelectorAll("aside nav a, nav[aria-label='Atalhos'] a")].filter((a) => a.checkVisibility()).map((a) => a.getAttribute("href"))`);
  t.equal(links.length, width >= PHONE ? 10 : 4, "os links do menu");
  t.equal(
    await page.evaluate(`["[data-search]", "[data-create]", "[data-account]", "aside button"].map((s) => [...document.querySelectorAll(s)].some((el) => el.checkVisibility()))`),
    [false, false, false, false],
    "o que não responderia não aparece",
  );
  t.ok(await page.evaluate(`${$("main table")} !== null`), "a tela está lá");
  t.ok((await page.evaluate(`document.documentElement.scrollWidth`)) <= width, "sem rolagem horizontal");

  t.equal(await page.evaluate(`${$("header form button")}.textContent`), "Sair", "dá para sair");
  await page.click("header form button");
  await page.waitFor(`location.pathname === "/admin/login"`, "sair", 8000);
  cookies = null;
  const { status } = await page.evaluate(`fetch("/admin/contacts", { redirect: "manual" }).then(({ type }) => ({ status: type }))`);
  t.equal(status, "opaqueredirect", "e a sessão acabou");
}

/**
 * A coluna de ações das chaves (rebrand-09, 4.3): todo botão inteiro dentro da
 * célula, à vista e alcançável no ponto do meio, na largura do comando.
 */
async function keyActions(page, t) {
  await enter(page, "/admin/api-keys");
  await listed(page);
  const cut = await page.evaluate(`(() => {
    const rows = [...document.querySelectorAll("tbody tr")].filter((tr) => tr.cells.length > 1);
    const out = [];
    for (const tr of rows) {
      const cell = tr.cells[tr.cells.length - 1];
      const box = cell.getBoundingClientRect();
      for (const el of cell.querySelectorAll("a, button")) {
        const r = el.getBoundingClientRect();
        el.scrollIntoView({ block: "center", inline: "center" });
        const s = el.getBoundingClientRect();
        const hit = document.elementFromPoint(s.x + s.width / 2, s.y + s.height / 2);
        const inside = r.left >= box.left - 0.5 && r.right <= box.right + 0.5 && r.top >= box.top - 0.5 && r.bottom <= box.bottom + 0.5;
        if (!el.checkVisibility() || !inside || !(hit && el.contains(hit)) || r.width < 24)
          out.push((el.getAttribute("aria-label") || el.textContent).trim() + " " + Math.round(r.left) + "-" + Math.round(r.right) + " em " + Math.round(box.left) + "-" + Math.round(box.right));
      }
    }
    return { rows: rows.length, out };
  })()`);
  t.ok(cut.rows > 0, "há uma chave na lista", cut.rows);
  t.equal(cut.out, [], "nenhum botão cortado ou coberto");
  t.ok((await page.evaluate(`document.documentElement.scrollWidth`)) <= (await page.evaluate(`innerWidth`)), "sem rolagem horizontal");
}

/**
 * O quadro (verificações 28 e 81): arrastar um cartão para outra coluna muda o
 * estágio e diz isso com "Desfazer", que o devolve; as setas fazem o mesmo, e o
 * foco vai junto e fica, uma vez só, mesmo com a seta logo depois de um
 * "Desfazer" que o servidor ainda não respondeu.
 *
 * O quadro chega numa fronteira de Suspense, hidratada depois do resto da
 * página: nada acontece nele antes de o React assumir o cartão.
 */
async function board(page, t) {
  await enter(page, "/admin/applications/board");
  const columns = `[...document.querySelectorAll("section[data-column]")]`;
  const ready = `(() => { const el = ${$("[data-card] [data-card-link]")}; return el && Object.keys(el).some((key) => key.startsWith("__reactProps")) })()`;
  await page.waitFor(`${columns}.length === 6 && ${ready}`, "o quadro hidratado", 15000);
  const first = await page.evaluate(`${columns}.findIndex((c) => c.querySelector("[data-card]"))`);
  t.ok(first >= 0 && first < 5, "há um cartão que pode ir para a coluna ao lado", first);
  const card = await page.evaluate(`${columns}[${first}].querySelector("[data-card]").dataset.card`);
  const [here, beside] = await page.evaluate(`[${columns}[${first}].dataset.column, ${columns}[${first + 1}].dataset.column]`);
  const where = `${columns}.findIndex((c) => c.querySelector('[data-card="${card}"]'))`;
  /** A notice, arrived after the arrows, that says the card went to `column`: the answer of the server. */
  const answered = (column) => `window.__said.some((text) => text.includes(${js(`foi para ${column}.`)}))`;

  /* Arrastar, pelos eventos do navegador. */
  /* A frame between the events, as a real drag has: the board learns what is
     dragged on `dragstart` and only then accepts it. */
  await page.evaluate(`(async () => {
    const frame = () => new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 30)));
    const from = document.querySelector('[data-card="${card}"]');
    const to = ${columns}[${first + 1}];
    const data = new DataTransfer();
    from.dispatchEvent(new DragEvent("dragstart", { bubbles: true, dataTransfer: data }));
    await frame();
    to.dispatchEvent(new DragEvent("dragover", { bubbles: true, cancelable: true, dataTransfer: data }));
    await frame();
    to.dispatchEvent(new DragEvent("drop", { bubbles: true, cancelable: true, dataTransfer: data }));
    from.dispatchEvent(new DragEvent("dragend", { bubbles: true, dataTransfer: data }));
  })()`);
  await page.waitFor(`${where} === ${first + 1}`, "o cartão na coluna ao lado", 8000);
  const undo = `[...document.querySelectorAll("section[aria-live] button")].find((b) => /^(Desfazer|Undo)$/.test(b.textContent.trim()))`;
  await page.waitFor(`Boolean(${undo})`, "o aviso com Desfazer", 10000);
  t.ok(true, "arrastar muda a coluna e oferece desfazer");
  await page.evaluate(`${undo}.click()`);
  await page.waitFor(`${where} === ${first}`, "o cartão de volta", 10000);
  t.ok(true, "desfazer devolve o cartão");

  /* As setas, com o cartão em foco, sem esperar a resposta do "Desfazer". Cada
     vez que o cartão recebe o foco, um leitor de tela o anuncia. */
  await page.evaluate(`(() => {
    window.__focusIn = 0;
    window.__said = [];
    new MutationObserver((records) => {
      for (const record of records) for (const node of record.addedNodes) window.__said.push(node.textContent);
    }).observe(document.querySelector("section[aria-live]"), { childList: true, subtree: true });
    document.addEventListener("focusin", (event) => {
      if (event.target.closest?.('[data-card="${card}"]')) window.__focusIn += 1;
    });
    document.querySelector('[data-card="${card}"] [data-card-link]').focus();
    window.__focusIn = 0;
  })()`);
  await page.press("ArrowRight");
  await page.waitFor(`${where} === ${first + 1}`, "a seta leva à coluna ao lado", 8000);
  await page.waitFor(`document.activeElement?.closest("[data-card]")?.dataset.card === ${js(card)}`, "o foco vai junto", 8000);
  await page.waitFor(answered(beside), "a resposta da seta", 10000);
  await sleep(300);
  t.equal(
    await page.evaluate(`[document.activeElement?.closest("[data-card]")?.dataset.card, window.__focusIn]`),
    [card, 1],
    "a seta move, o foco vai junto e fica, e o cartão o recebe uma vez",
  );
  await page.press("ArrowLeft");
  await page.waitFor(`${where} === ${first}`, "a seta de volta", 8000);
  await page.waitFor(answered(here), "a resposta da seta de volta", 10000);
  t.equal(await page.evaluate(`document.activeElement?.closest("[data-card]")?.dataset.card`), card, "o foco volta com ele");
  await page.open("/admin/applications/board");
  await page.waitFor(`${where} === ${first}`, "depois de recarregar, onde começou", 15000);
  t.ok(true, "o banco ficou como estava");
  t.equal(page.errors, [], "nenhum erro no console");
}

/** Os textos do backoffice não saem em página nenhuma do site. */
async function apart(page, t) {
  for (const path of ["/en", "/pt-BR", "/en/projects", "/pt-BR/career", "/pt-BR/terminal", "/en/blog"]) {
    const html = await (await fetch(`${BASE}${path}`)).text();
    t.ok(html.length > 5000, `${path} responde`);
    t.equal(
      ["Search the backoffice", "Buscar no backoffice", "Recolher o menu", "Collapse the menu"].filter((text) => html.includes(text)),
      [],
      `${path}: nada do backoffice`,
    );
  }
  await page.open("/en");
  t.ok(true, "o site abre");
}

export function adminCases({ width, height }) {
  const size = { width, height };
  return [
    ["admin:acesso", access],
    ["admin:login", login],
    ["admin:limite", throttle],
    ["admin:tema", themes],
    ["admin:troca", change],
    ["admin:idioma", languages],
    ["admin:hidratacao", hydration],
    ["admin:menu", menu],
    ["admin:teclado", keyboard],
    ["admin:foco", focus],
    ["admin:busca", search],
    ["admin:criar", create],
    ["admin:impressao", print],
    ["admin:sem-js", noScript],
    ["admin:aparencia", look],
    ["admin:acoes-chaves", keyActions],
    ["admin:quadro", board],
    ["admin:site", apart],
  ].map(([name, run]) => ({ name, run: (page, t) => run(page, t, size) }));
}
