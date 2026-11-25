/**
 * Casos do backoffice em scripts/e2e-site.mjs (`--admin`): entrada, tema, idioma
 * e a estrutura em volta das telas. Precisa do Postgres com dados e de um
 * usuário; a conta de auditoria de scripts/a11y-fixtures.mjs serve:
 *
 *   ADMIN_EMAIL=… ADMIN_PASSWORD=… E2E_BASE=… node scripts/e2e-site.mjs --admin
 *   … --width 390 --height 844 | --width 1024 --height 768
 *
 * O que depende de largura usa a do comando: nomes no menu a partir de 1360 px,
 * ícones de 768 a 1359, barra na base abaixo disso.
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
  const company = await page.evaluate(`${$("tbody td:nth-child(2) span")}.textContent`);
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
  const title = `${$("aside nav a, nav[aria-label] a")}.textContent.trim()`;
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
  const before = await page.evaluate(`({ path: location.pathname, date: ${date}, name: ${$("tbody td:nth-child(2)")}.textContent })`);
  t.ok(/^[A-Z][a-z]{2} \d{1,2}, \d{4}, \d\d:\d\d$/.test(before.date), "datas em inglês, com o mês por nome", before.date);
  const pick = async (option) => {
    await page.evaluate(`${shown("[data-account]")}.focus()`);
    await page.press("Enter");
    await page.waitFor(`${overlay} !== null`, "o menu da conta");
    await sleep(250); // ele ainda está indo para o lugar
    await page.click(`[data-language-option=${js(option)}]`);
    await page.waitFor(`${lang} === ${js(option)}`, option);
    /* A lista chega depois da estrutura. */
    await sleep(800);
  };
  await pick("pt-BR");
  const after = await page.evaluate(`({ path: location.pathname, date: ${date}, name: ${$("tbody td:nth-child(2)")}.textContent })`);
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
  t.equal(await page.evaluate(`${$("main [lang]")}.lang`), "pt-BR", "a tela ainda não traduzida diz que está em português");
  t.equal(await page.evaluate(`${$("main [lang] [lang]")}.lang`), "en", "e a parte traduzida, que está em inglês");
  t.ok(await page.evaluate(`document.cookie.includes("admin-locale") === false`), "o cookie é só do servidor");
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

/** Tab por toda a tela: foco sempre visível, sem nada por cima, na ordem em que se vê. */
async function keyboard(page, t, { width, height }) {
  for (const theme of THEMES) {
    await enter(page, "/admin/projects", { theme });
    await page.evaluate(`document.activeElement.blur()`);
    const stops = [];
    for (let i = 0; i < 70; i++) {
      await page.press("Tab");
      await sleep(30);
      const stop = await page.evaluate(`(() => {
        const el = document.activeElement;
        if (el === document.body) return null;
        const r = el.getBoundingClientRect();
        /* Uma lista que rola é uma parada, e pode ser mais alta que a tela. */
        const tall = r.height > innerHeight;
        const [x, y] = [r.left + Math.min(r.width / 2, 60), tall ? Math.max(r.top + 4, 120) : r.top + r.height / 2];
        const hit = document.elementFromPoint(x, y);
        const s = getComputedStyle(el);
        const ring = [...el.querySelectorAll("svg path")].some((p) => { const c = getComputedStyle(p); return parseFloat(c.strokeWidth) >= 6 && parseFloat(c.opacity) > 0 });
        const outline = parseFloat(s.outlineWidth) > 0 && s.outlineStyle !== "none" && !/, 0\\)$/.test(s.outlineColor);
        return {
          name: (el.getAttribute("aria-label") || el.textContent).trim().replace(/\\s+/g, " ").slice(0, 40),
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
    t.ok(stops.length > 20, `${theme}: há o que percorrer`, `${stops.length}`);
    t.equal(stops.filter((s) => !s.seen).map((s) => s.name), [], `${theme}: todo foco é visível`);
    t.equal(stops.filter((s) => !s.inside || s.covered).map((s) => `${s.where}: ${s.name}`), [], `${theme}: nada cobre o que tem foco`);
    const places = stops.map((s) => s.where).filter((where, i, all) => where !== all[i - 1]);
    t.equal(places.slice(0, 4), width >= PHONE ? ["salto", "menu", "topo", "tela"] : ["salto", "topo", "tela", "barra"].slice(0, places.length), `${theme}: na ordem em que se vê`);
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
  const company = await page.evaluate(`${$("tbody td:nth-child(2) span")}.textContent`);
  const all = await page.evaluate(`[...document.querySelectorAll("tbody td:nth-child(2) span:first-child")].map((el) => el.textContent)`);

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
  const sent = [];
  page.on("Network.responseReceived", ({ response }) => sent.push(response));
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

/** Sem JavaScript: o menu leva às telas, e o que não responderia não aparece. */
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
    ["admin:busca", search],
    ["admin:criar", create],
    ["admin:impressao", print],
    ["admin:sem-js", noScript],
    ["admin:aparencia", look],
    ["admin:site", apart],
  ].map(([name, run]) => ({ name, run: (page, t) => run(page, t, size) }));
}
