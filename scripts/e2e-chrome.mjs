/**
 * Casos da estrutura do site em scripts/e2e-site.mjs: topo, menu da base,
 * busca, rodapé, idioma, a Versão CLI no endereço dela e a passagem de uma
 * página a outra. O que depende de largura usa a do comando (`--width 390`).
 */
import { readFileSync } from "node:fs";
import { axeSource, measureContrast } from "./e2e-holo.mjs";
import { save } from "./e2e-theme.mjs";

const THEMES = ["dusk", "light", "dracula"];
/** A partir daqui as páginas ficam no topo; abaixo, no menu da base. */
const PAGES_IN_TOP = 1180;
const NOTCH = 1280;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const $ = (selector) => `document.querySelector(${JSON.stringify(selector)})`;
const visible = (selector) =>
  `[...document.querySelectorAll(${JSON.stringify(selector)})].some((el) => el.checkVisibility() && el.getBoundingClientRect().width > 0)`;
const address = `location.pathname + location.search + location.hash`;
const focused = `(() => { const el = document.activeElement; return el.tagName + ": " + (el.getAttribute("aria-label") || el.textContent.trim()) })()`;

/** React assumiu a página, e os efeitos já rodaram. */
const HYDRATED = `(() => {
  const el = document.querySelector("button[aria-keyshortcuts]");
  return !!el && Object.keys(el).some((key) => key.startsWith("__reactProps"));
})()`;
const DRAWN = `[...document.querySelectorAll("header svg path[data-line], footer svg path[data-line]")].every((p) => !p.checkVisibility() || p.getAttribute("d"))`;

const BOOTED = save({}) + `try { sessionStorage.setItem("maarkn-booted", "1") } catch {}`;

async function site(page, path, { theme = "dusk", motion, before = "" } = {}) {
  await page.prefer({ scheme: "dark", motion });
  await page.beforeLoad(BOOTED + `if (!localStorage.getItem("maarkn-site-theme")) localStorage.setItem("maarkn-site-theme", ${JSON.stringify(theme)});` + before);
  await page.open(path);
  await ready(page);
}

async function ready(page) {
  await page.waitFor(HYDRATED, "a página responder");
  await page.waitFor(DRAWN, "as molduras desenhadas");
  await sleep(120);
}

/** Uma navegação sem recarregar: o endereço muda e a nova página responde. */
async function arrive(page, path, label = path) {
  await page.waitFor(`${address} === ${JSON.stringify(path)}`, `chegar a ${label}`, 8000);
  await sleep(250);
  /* Enquanto a transição dura, quem recebe o ponteiro é ela. */
  await page.waitFor(
    `document.getAnimations().every((a) => !a.effect?.pseudoElement?.startsWith("::view-transition"))`,
    "a transição terminar",
    5000,
  );
  await sleep(60);
}

async function openSearch(page, text) {
  await page.press("k", { ctrl: true });
  await page.waitFor(`!!${$("dialog[open] [role=option]")}`, "a busca", 8000);
  if (!text) return;
  await page.type(text);
  await page.waitFor(`${$("dialog[open] input")}.value === ${JSON.stringify(text)}`, "o texto digitado", 3000);
  await sleep(60);
}

const results = `[...document.querySelectorAll("dialog[open] [role=option]")].map((el) => el.dataset.result)`;

/** axe com todas as regras, alvo de toque incluído. */
async function axe(page, t, label, { atLeast = 10 } = {}) {
  await page.evaluate(`${axeSource()}; 0`);
  const found = await page.evaluate(`axe.run(document, { rules: { "target-size": { enabled: true } } }).then((r) => ({
    violations: r.violations.map((v) => v.id + ": " + v.nodes.map((n) => n.target.join(" ")).slice(0, 4).join(" | ")),
    contrast: (r.passes.find((p) => p.id === "color-contrast")?.nodes.length ?? 0)
      + (r.incomplete.find((p) => p.id === "color-contrast")?.nodes.length ?? 0),
  }))`);
  t.equal(found.violations, [], `axe, ${label}: nenhuma violação`);
  t.ok(found.contrast >= atLeast, `axe, ${label}: olhou o contraste`, `${found.contrast}`);
}

async function noOverflow(page, t, label) {
  const [content, box] = await page.evaluate(`[document.documentElement.scrollWidth, document.documentElement.clientWidth]`);
  t.ok(content <= box, `${label}: sem rolagem horizontal`, `${content}px em ${box}`);
}

/* ── Versão CLI ──────────────────────────────────────────────────────────── */

async function ownAddress(page, t) {
  for (const [locale, skip, back] of [
    ["en", "skip to command line", "back to the site"],
    ["pt-BR", "pular para a linha de comando", "voltar ao site"],
  ]) {
    await page.open(`/${locale}/terminal`);
    await page.waitFor(`!document.querySelector("[data-boot]")`, "o boot terminar");
    t.equal(await page.evaluate(`document.documentElement.lang`), locale, `${locale}: idioma do documento`);
    t.ok(await page.evaluate(visible("#cmd")), `${locale}: há um prompt`);
    t.equal(
      await page.evaluate(`[...document.querySelectorAll("a[href]")].slice(0, 2).map((a) => a.textContent.replace("←", "").trim().toLowerCase())`),
      [skip, back],
      `${locale}: primeiro o skip link, depois a volta ao site`,
    );
    const meta = await page.evaluate(`({
      canonical: new URL(${$("link[rel=canonical]")}.href).pathname,
      langs: [...document.querySelectorAll("link[rel=alternate][hreflang]")].map((l) => new URL(l.href).pathname).sort(),
      robots: ${$("meta[name=robots]")}?.content ?? "",
      h1: document.querySelectorAll("h1").length,
    })`);
    t.equal(meta.canonical, `/${locale}/terminal`, `${locale}: endereço canônico próprio`);
    t.equal([...new Set(meta.langs)], ["/en/terminal", "/pt-BR/terminal"], `${locale}: hreflang dos dois idiomas`);
    t.ok(!/noindex/.test(meta.robots), `${locale}: indexável`, meta.robots);
    t.equal(meta.h1, 1, `${locale}: um único h1`);
    t.ok(!(await page.evaluate(`fetch("/sitemap.xml").then((r) => r.text())`)).includes("terminal"), `${locale}: fora do sitemap`);
    await noOverflow(page, t, locale);
    t.equal(
      await page.evaluate(`[...document.querySelectorAll("header > *")].filter((el) => el.checkVisibility() && el.getBoundingClientRect().right > document.documentElement.clientWidth).map((el) => el.textContent)`),
      [],
      `${locale}: a barra cabe, com a volta e o relógio`,
    );

    await page.open(`/${locale}`);
    t.ok(!(await page.evaluate(`!!${$("#cmd")}`)), `${locale}: a home não exibe o terminal`);
    t.equal(await page.evaluate(`document.querySelectorAll("h1").length`), 1, `${locale}: a home tem um único h1`);
  }
  const unknown = await page.evaluate(`fetch("/fr/terminal").then((r) => r.status)`);
  t.equal(unknown, 404, "idioma desconhecido: 404");
  /* Só o 404 pedido acima. */
  t.equal(page.errors.filter((error) => !/404/.test(error)), [], "nenhum erro no console");
}

async function oldCommands(page, t) {
  await page.beforeLoad(BOOTED);
  const opens = async (path, expected) => {
    await page.open(path);
    await page.waitFor(`!document.querySelector("[data-boot]") && document.activeElement?.id === "cmd"`, "o terminal pronto");
    await sleep(400);
    t.equal(decodeURIComponent(await page.evaluate(address)), expected, `${path} leva a ${expected}`);
  };
  const printed = (name) => `[...document.querySelectorAll("main section")].some((el) => (el.getAttribute("aria-label") || "").endsWith(" ${name}"))`;

  await opens("/en?cmd=projects", "/en/terminal?cmd=projects");
  t.ok(await page.evaluate(printed("projects")), "com a listagem de projetos impressa");

  await page.evaluate(`sessionStorage.removeItem("maarkn-term")`);
  await opens("/pt-BR?cmd=skills;contact", "/pt-BR/terminal?cmd=skills;contact");
  t.ok((await page.evaluate(printed("skills"))) && (await page.evaluate(printed("contact"))), "os dois comandos impressos");

  await page.evaluate(`sessionStorage.removeItem("maarkn-term")`);
  await opens("/en?cmd=%3Cscript%3E", "/en/terminal?cmd=<script>");
  t.equal(await page.evaluate(`document.querySelectorAll("main section").length`), 1, "entrada inválida: nada é executado");

  await opens("/en/chat", "/en/terminal?cmd=ask");
  t.equal(await page.evaluate(`${$("#cmd")}.value`), "ask ", "o endereço antigo do chat ainda digita ask");
  t.equal(page.errors, [], "nenhum erro no console");
}

/** Executa, navega e volta: a tela reconstruída e o histórico, no endereço novo. */
async function rebuilt(page, t) {
  await page.beforeLoad(BOOTED);
  await page.open("/en/terminal");
  await page.waitFor(`document.activeElement?.id === "cmd"`, "o prompt com o foco");
  const run = async (text) => {
    await page.type(text);
    await page.press("Enter");
    await sleep(200);
  };
  await run("whoami");
  await run("projects");
  await run("open 1");
  await page.waitFor(`/^\\/en\\/projects\\/./.test(location.pathname)`, "o projeto", 8000);
  await page.waitFor(`document.activeElement?.tagName === "H1"`, "o foco no título do projeto", 5000);
  await page.evaluate(`history.back()`);
  await page.waitFor(`location.pathname === "/en/terminal" && document.activeElement?.id === "cmd"`, "voltar à Versão CLI", 8000);
  await sleep(500);
  const blocks = await page.evaluate(`[...document.querySelectorAll("main section")].map((el) => (el.getAttribute("aria-label") || "").split(" ").at(-1))`);
  t.equal(blocks.slice(-2), ["whoami", "projects"], "a tela mostra whoami e projects");
  await page.press("ArrowUp");
  t.equal(await page.evaluate(`${$("#cmd")}.value`), "open 1", "o histórico recupera open 1");
  await page.press("Escape");
  await run("cd ~");
  t.equal(await page.evaluate(address), "/en/terminal", "cd ~ fica no início da Versão CLI");
  await run("cd blog");
  await arrive(page, "/en/blog");
  await page.click("a[href='/en/terminal?cmd=writing']");
  await arrive(page, "/en/terminal?cmd=writing");
  t.ok(true, "cd .. da lista volta à Versão CLI com o comando dela");
  t.equal(page.errors, [], "nenhum erro no console");
}

async function cliWithoutScript(page, t) {
  await page.call("Emulation.setScriptExecutionDisabled", { value: true });
  await page.open("/en/terminal");
  const links = await page.evaluate(`[...document.querySelectorAll("a[href]")].filter((a) => a.checkVisibility()).map((a) => a.getAttribute("href"))`);
  for (const href of ["/en", "/en/projects", "/en/career", "/en/blog", "/en/links", "/cv/marco-filho.pdf"]) {
    t.ok(links.includes(href), `link para ${href}`, links.join(" "));
  }
  t.ok(links.some((href) => /linkedin/.test(href)) && links.some((href) => /github/.test(href)), "links para LinkedIn e GitHub");
  const covered = await page.evaluate(`(() => {
    const a = ${$('main a[href="/en/projects"]')}; a.scrollIntoView({ block: "center" });
    const r = a.getBoundingClientRect();
    return document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2) !== a;
  })()`);
  t.ok(!covered, "nada cobre os links");
  await page.click('main a[href="/en/projects"]');
  await page.waitFor(`location.pathname === "/en/projects"`, "navegar para projetos", 8000);
  t.ok((await page.evaluate(`document.body.innerText`)).includes("Remote Harness") || (await page.evaluate(`document.body.innerText`)).includes("remote-harness"), "e os projetos estão lá");
}

async function cliAxe(page, t) {
  await page.beforeLoad(BOOTED);
  for (const palette of ["soft", "classic"]) {
    await page.open("/en/terminal");
    await page.evaluate(`localStorage.setItem("maarkn-theme", "${palette}")`);
    await page.open("/en/terminal");
    await page.waitFor(`document.documentElement.dataset.theme === "${palette}" && document.activeElement?.id === "cmd"`, palette);
    await sleep(300);
    await axe(page, t, `Versão CLI em ${palette}`, { atLeast: 15 });
  }
}

/* ── Versão CLI: ida e volta ─────────────────────────────────────────────── */

async function roundTrip(page, t, width) {
  const back = async (expected, label) => {
    await page.waitFor(`location.pathname === "/pt-BR/terminal" && document.activeElement?.id === "cmd"`, "a Versão CLI", 8000);
    await page.click("header a");
    await arrive(page, expected);
    t.equal(await page.evaluate(address), expected, label);
  };
  const from = "/pt-BR/projects?cat=ai";
  await site(page, from, { theme: "light" });
  t.ok(await page.evaluate(visible('header a[href="/pt-BR/terminal"]')), "botão da Versão CLI no topo");
  await page.click('header a[href="/pt-BR/terminal"]');
  await back(from, "pelo topo: volta à página em que estava, com o filtro");

  await openSearch(page, "versao cli");
  await page.press("Enter");
  await back(from, "pela busca: idem");

  await page.click('footer a[href="/pt-BR/terminal"]');
  await back(from, "pelo rodapé: idem");
  t.equal(await page.evaluate(`document.documentElement.dataset.siteTheme`), "light", "o site continua em claro suave");

  /* Troca de idioma na Versão CLI: a volta é à mesma página, no idioma novo. */
  await page.click('header a[href="/pt-BR/terminal"]');
  await page.waitFor(`document.activeElement?.id === "cmd"`, "o prompt", 8000);
  await page.type("lang en");
  await page.press("Enter");
  await page.waitFor(`location.pathname === "/en/terminal"`, "a Versão CLI em inglês", 8000);
  await sleep(400);
  t.equal(await page.evaluate(`${$("header a")}.getAttribute("href")`), "/en/projects?cat=ai", "a volta acompanha o idioma");

  await page.evaluate(`sessionStorage.clear()`);
  await page.evaluate(`sessionStorage.setItem("maarkn-booted", "1")`);
  await page.open("/pt-BR/terminal");
  await page.waitFor(`document.activeElement?.id === "cmd"`, "o prompt", 8000);
  await page.click("header a");
  await arrive(page, "/pt-BR");
  t.ok(true, "sem página anterior, volta à home");
  t.ok(await page.evaluate(visible(width < PAGES_IN_TOP ? "nav summary" : "header nav")), "com a estrutura do site");
  t.equal(page.errors, [], "nenhum erro no console");
}

/* ── topo, menu da base e rodapé ─────────────────────────────────────────── */

async function top(page, t, { theme, width, height }) {
  for (const path of ["/pt-BR", "/en/projects"]) {
    const label = `${theme}, ${path}`;
    await site(page, path, { theme });
    t.equal(await page.evaluate(`document.documentElement.dataset.siteTheme`), theme, `${label}: o tema`);
    for (const [what, selector] of [
      ["marca", `header a[href="/${path.split("/")[1]}"]`],
      ["busca", "header button[aria-keyshortcuts]"],
      ["idioma", "header a[hreflang]"],
      ["tema", "header [data-theme-option], header [data-theme-next]"],
      ["Versão CLI", 'header a[href$="/terminal"]'],
      ["contato", 'header a[href$="#contact"]'],
    ]) {
      t.ok(await page.evaluate(visible(selector)), `${label}: ${what} no topo`);
    }
    const wide = width >= PAGES_IN_TOP;
    t.equal(await page.evaluate(visible("header nav")), wide, `${label}: páginas ${wide ? "no topo" : "fora do topo"}`);
    t.equal(await page.evaluate(visible("nav summary")), !wide, `${label}: ${wide ? "sem" : "com"} menu da base`);
    t.equal(await page.evaluate(visible("header p")), width >= NOTCH, `${label}: entalhe ${width >= NOTCH ? "visível" : "oculto"}`);
    if (width >= NOTCH) {
      const text = await page.evaluate(`${$("header p")}.textContent`);
      t.ok(/(vagas sênior|senior roles) · Goiânia \d\d:\d\d UTC−3$/.test(text), `${label}: disponibilidade e hora de Goiânia`, text);
    }
    await noOverflow(page, t, label);

    /* O topo continua lá, e inteiro, depois de rolar. */
    await page.scroll({ to: "bottom" });
    const box = await page.evaluate(`(() => { const r = ${$("header")}.getBoundingClientRect(); return [r.top, r.right <= document.documentElement.clientWidth] })()`);
    t.equal(box, [0, true], `${label}: o topo acompanha a rolagem`);
    await axe(page, t, `${label}, no fim`);
    await measureContrast(page, t, `${label}, rodapé`, "footer.site-root", 8);
    await page.scroll({ to: "top" });
    await measureContrast(page, t, `${label}, topo`, "header", 3);
    if (path === "/pt-BR") {
      /* A captura é da página inteira, e o menu da base, que é fixo, sairia do lugar. */
      const base = (value) => page.evaluate(`${$("nav:has(> details)")}.style.visibility = "${value}"`);
      await base("hidden");
      await measureContrast(page, t, `${label}, abertura`, "main", 6, { full: true });
      await base("");
    }

    /* O selecionado é o preenchimento mais denso, com a luz em cima. */
    const current = wide ? 'header [aria-current="page"]' : "nav summary";
    await page.hover(current);
    await sleep(700);
    await measureContrast(page, t, `${label}, atual com a luz`, wide ? "header" : "nav summary", 1);
    await page.hover({ x: width / 2, y: height / 2 });
  }

  /* Trocas de tema em seguida, mais rápidas que a transição. */
  const swatch = width >= 980 ? "[data-theme-option=light]" : "[data-theme-next]";
  await page.evaluate(`for (let i = 0; i < 4; i++) ${$(swatch)}.click()`);
  await page.waitFor(
    `document.documentElement.dataset.siteTheme === ${JSON.stringify(width >= 980 ? "light" : THEMES[(THEMES.indexOf(theme) + 4) % 3])}`,
    `${theme}: o último tema escolhido`,
    5000,
  );
  await sleep(500);
  await page.evaluate(`localStorage.setItem("maarkn-site-theme", ${JSON.stringify(theme)})`);
  await page.open("/en/projects");
  await ready(page);

  if (width < PAGES_IN_TOP) {
    await page.click("nav summary");
    await page.waitFor(`${$("details")}.open`, "o menu da base", 3000);
    await sleep(150);
    t.equal(
      await page.evaluate(`[...document.querySelectorAll("details a")].map((a) => a.getAttribute("href"))`),
      ["/en", "/en/career", "/en/projects", "/en/blog", "/en/links", "/en#contact"],
      `${theme}: o menu lista páginas e seções`,
    );
    t.equal(await page.evaluate(`[...document.querySelectorAll("details a[aria-current]")].map((a) => a.textContent)`), ["Projects"], `${theme}: a página atual marcada`);
    await measureContrast(page, t, `${theme}, menu aberto`, "details", 7);
    await axe(page, t, `${theme}, menu aberto`);
    await page.click('details a[href="/en/projects"]');
    await arrive(page, "/en/projects");
    t.ok(!(await page.evaluate(`${$("details")}.open`)), `${theme}: escolher a página atual fecha o menu`);
    await page.click("nav summary");
    await page.waitFor(`${$("details")}.open`, "o menu da base", 3000);
    await page.click('details a[href="/en/career"]');
    await arrive(page, "/en/career");
    t.ok(!(await page.evaluate(`${$("details")}.open`)), `${theme}: escolher outra também`);
  }
  t.equal(page.errors, [], "nenhum erro no console");
}

async function currentPage(page, t, width) {
  const marked = `[...document.querySelectorAll("${width < PAGES_IN_TOP ? "details" : "header nav"} [aria-current]")].map((a) => a.textContent + ":" + a.getAttribute("aria-current"))`;
  for (const [path, expected] of [
    ["/pt-BR/projects", ["Projetos:page"]],
    ["/pt-BR/projects/remote-harness", ["Projetos:true"]],
    ["/pt-BR/career", ["Carreira:page"]],
    ["/pt-BR/blog", ["Notas:page"]],
  ]) {
    await site(page, path);
    t.equal(await page.evaluate(marked), expected, `${path}: o item atual`);
  }
  /* O que um leitor de tela recebe: o estado está na árvore de acessibilidade. */
  await site(page, "/pt-BR/projects");
  if (width < PAGES_IN_TOP) await page.click("nav summary");
  await sleep(150);
  const { nodes } = await page.call("Accessibility.getFullAXTree", {});
  const link = nodes.find((n) => n.role?.value === "link" && n.name?.value === "Projetos" && !n.ignored);
  t.ok(link, "o link está na árvore de acessibilidade");
  t.equal(
    await page.evaluate(`(() => { const el = ${$(width < PAGES_IN_TOP ? "details a[aria-current]" : "header nav a[aria-current]")}; return [el.ariaCurrent, el.textContent] })()`),
    ["page", "Projetos"],
    "com o estado de página atual",
  );
}

/** Tab pela página: skip link, topo na ordem em que se vê, foco sempre à vista. */
async function keyboard(page, t, width) {
  await site(page, "/en/projects");
  await page.press("Tab");
  t.equal(await page.evaluate(focused), "A: Skip to content", "o primeiro Tab é o skip link");
  t.ok(await page.evaluate(`${$("a[href='#content']")}.getBoundingClientRect().width > 80`), "e ele aparece");

  const stops = [];
  for (let i = 0; i < 14; i++) {
    await page.press("Tab");
    await sleep(90);
    const stop = await page.evaluate(`(() => {
      const el = document.activeElement;
      if (!el.closest("header.site-root")) return null;
      const r = el.getBoundingClientRect();
      const ring = el.querySelector('svg path[data-line="outline"]');
      return { name: el.getAttribute("aria-label") || el.textContent.trim(), x: r.left, ring: Number(getComputedStyle(ring).opacity) };
    })()`);
    if (!stop) break;
    stops.push(stop);
  }
  t.equal(
    stops.map(({ name }) => name),
    [
      "maarkn.dev, home",
      ...(width >= PAGES_IN_TOP ? ["Career", "Projects", "Notes"] : []),
      "Search",
      "PT: switch to Portuguese",
      ...(width >= 980 ? ["Soft dark", "Soft light", "Dracula"] : ["Theme: Soft dark. Switch to Soft light"]),
      "CLI version",
      "Talk to me",
    ],
    "todo controle do topo é alcançado",
  );
  t.ok(stops.every(({ x }, i) => i === 0 || x > stops[i - 1].x), "na ordem em que se vê");
  t.equal(stops.filter(({ ring }) => ring === 0).map(({ name }) => name), [], "com o foco visível");

  /* Chegar a um controle do topo não mexe na rolagem da página. */
  await page.scroll({ to: "bottom" });
  const { top: y } = await page.scrollState(null);
  t.ok(y > 0, "a página rola", `${y}px`);
  await page.evaluate(`${$("header.site-root a")}.focus()`);
  for (let i = 0; i < 4; i++) await page.press("Tab");
  await sleep(700);
  t.equal((await page.scrollState(null)).top, y, "o foco no topo não rola a página");

  /* O skip link leva ao conteúdo. */
  await page.evaluate(`document.activeElement.blur()`);
  await site(page, "/en/projects");
  await page.press("Tab");
  await page.press("Enter");
  await sleep(200);
  t.equal(await page.evaluate(`document.activeElement.id`), "content", "o skip link leva o foco ao conteúdo");
  t.ok(
    await page.evaluate(`(() => { const bar = [...document.querySelectorAll("header")].at(-1).getBoundingClientRect().bottom; return ${$("#content")}.getBoundingClientRect().top >= bar - 1 })()`),
    "e o conteúdo não fica atrás do topo nem da barra da página",
  );

  if (width < PAGES_IN_TOP) {
    await page.evaluate(`${$("nav summary")}.focus()`);
    await page.press("Enter");
    await page.waitFor(`${$("details")}.open`, "o menu abrir pelo teclado", 3000);
    await page.press("Tab");
    t.equal(await page.evaluate(`document.activeElement.textContent`), "Home", "Tab entra no menu");
    await page.press("Escape");
    t.equal(await page.evaluate(`[${$("details")}.open, document.activeElement.tagName]`), [false, "SUMMARY"], "Esc fecha e devolve o foco");
  }
  t.equal(page.errors, [], "nenhum erro no console");
}

async function reducedMotion(page, t, width) {
  await site(page, "/en", {
    motion: "reduce",
    before: `window.__moved = [];
      setInterval(() => {
        for (const a of document.getAnimations()) {
          const { duration } = a.effect.getComputedTiming();
          if (a.playState === "running" && duration > 1) window.__moved.push((a.animationName || a.transitionProperty) + " " + (a.effect.pseudoElement || a.effect.target?.className));
        }
      }, 10);`,
  });
  await page.hover("header a[hreflang]");
  await sleep(300);
  await page.click(width >= 980 ? "[data-theme-option=dracula]" : "[data-theme-next]");
  await sleep(300);
  t.ok((await page.evaluate(`document.documentElement.dataset.siteTheme`)) !== "dusk", "o tema troca");
  await openSearch(page, "career");
  await page.press("Enter");
  await arrive(page, "/en/career");
  t.equal(await page.evaluate(focused), "H1: Career", "a página troca, e o foco vai ao título");
  await page.evaluate(`history.back()`);
  await arrive(page, "/en");
  t.equal([...new Set(await page.evaluate(`window.__moved`))], [], "nada anima");
  t.equal(page.errors, [], "nenhum erro no console");
}

async function withoutScript(page, t, width) {
  await page.call("Emulation.setScriptExecutionDisabled", { value: true });
  await page.prefer({ scheme: "light" });
  await page.open("/pt-BR");
  t.equal(await page.evaluate(`getComputedStyle(${$("header")}).backgroundColor`), "rgb(223, 228, 238)", "o tema segue o sistema");
  t.ok(await page.evaluate(visible("h1")), "a abertura está visível");
  t.ok(!(await page.evaluate(visible("header button"))), "nada que não responda: busca e tema não aparecem");
  t.ok(await page.evaluate(visible('header a[href="/pt-BR/terminal"]')), "a Versão CLI, sim");
  t.equal(await page.evaluate(`${$("header a[hreflang]")}.getAttribute("href")`), "/en", "e o idioma");
  if (width < PAGES_IN_TOP) {
    await page.click("nav summary");
    await page.waitFor(`${$("details")}.open`, "o menu da base abrir", 3000);
    await page.click('details a[href="/pt-BR/projects"]');
  } else {
    await page.click('header a[href="/pt-BR/projects"]');
  }
  await page.waitFor(`location.pathname === "/pt-BR/projects"`, "as páginas", 8000);
  t.ok(true, "as páginas são links que funcionam");
}

/** Alvo de toque: 44 px, e um não invade o outro. */
async function touch(page, t, width) {
  await page.call("Emulation.setTouchEmulationEnabled", { enabled: true });
  await page.call("Emulation.setEmitTouchEventsForMouse", { enabled: false });
  await page.density(1, { mobile: true });
  await site(page, "/pt-BR");
  if (width < PAGES_IN_TOP) await page.click("nav summary");
  await sleep(150);
  const { coarse, small, meeting } = await page.evaluate(`(() => {
    const boxes = [];
    for (const el of document.querySelectorAll("header.site-root :is(a, button), details :is(a, summary), footer.site-root a")) {
      if (!el.checkVisibility() || !el.getBoundingClientRect().width) continue;
      const r = el.getBoundingClientRect();
      const before = getComputedStyle(el, "::before");
      const grown = before.content !== "none" && before.position === "absolute";
      const up = grown ? -parseFloat(before.top) : 0, side = grown ? -parseFloat(before.left) : 0;
      const width = Math.max(r.width + 2 * side, grown ? parseFloat(before.width) : 0);
      boxes.push({ name: el.getAttribute("aria-label") || el.textContent.trim(), x: r.left - side, y: r.top - up, w: width, h: r.height + 2 * up });
    }
    const meeting = [];
    boxes.forEach((a, i) => boxes.slice(i + 1).forEach((b) => {
      const dx = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x), dy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
      if (dx > 1 && dy > 1) meeting.push(a.name + " / " + b.name);
    }));
    return {
      coarse: matchMedia("(pointer: coarse)").matches,
      small: boxes.filter((b) => b.w < 43.5 || b.h < 43.5).map((b) => b.name + " " + Math.round(b.w) + "x" + Math.round(b.h)),
      meeting,
    };
  })()`);
  t.ok(coarse, "a emulação é de toque");
  t.equal(small, [], "todo alvo tem 44 px");
  t.equal(meeting, [], "nenhum alvo invade outro");
}

/* ── busca ───────────────────────────────────────────────────────────────── */

async function searchOpens(page, t) {
  const asked = [];
  const off = page.on("Network.requestWillBeSent", ({ request }) => asked.push(new URL(request.url).pathname));
  await site(page, "/pt-BR");
  await page.waitFor(`document.readyState === "complete"`, "a carga");
  await sleep(1500);
  t.ok(!asked.some((path) => path.endsWith("search.json")), "o índice não é baixado antes de abrir");
  const before = asked.length;
  await openSearch(page);
  const chunks = asked.slice(before);
  t.ok(chunks.includes("/pt-BR/search.json"), "abrir baixa o índice", chunks.join(" "));
  t.ok(chunks.some((path) => path.endsWith(".js")), "e a janela", chunks.join(" "));
  t.equal(await page.evaluate(`document.activeElement.getAttribute("role")`), "combobox", "Ctrl+K abre a busca, no campo");
  await page.press("Escape");
  await page.waitFor(`!${$("dialog[open]")}`, "Esc fechar", 3000);
  await page.press("k", { meta: true });
  await page.waitFor(`!!${$("dialog[open] [role=option]")}`, "⌘K abrir", 3000);
  await page.press("k", { meta: true });
  await page.waitFor(`!${$("dialog[open]")}`, "⌘K fechar", 3000);
  await page.click("header button[aria-keyshortcuts]");
  await page.waitFor(`!!${$("dialog[open] [role=option]")}`, "o botão abrir", 3000);
  await page.press("Escape");
  await page.waitFor(`!${$("dialog[open]")}`, "Esc fechar de novo", 3000);
  t.equal(await page.evaluate(focused), "BUTTON: Buscar", "o foco volta ao botão");
  t.equal(asked.filter((path) => path.endsWith("search.json")).length, 1, "o índice é baixado uma vez");
  off();
  t.equal(page.errors, [], "nenhum erro no console");
}

async function searchFinds(page, t) {
  await site(page, "/pt-BR");
  const index = await page.evaluate(`fetch("/pt-BR/search.json").then((r) => r.json())`);
  const withFlutter = index.filter((item) => item.terms.includes("Flutter")).map((item) => item.id);
  t.ok(
    withFlutter.some((id) => id.startsWith("project-")) && withFlutter.some((id) => id.startsWith("experience-")),
    "há projetos e experiências com Flutter",
  );
  await openSearch(page, "flutter");
  const found = await page.evaluate(results);
  t.equal(withFlutter.filter((id) => !found.includes(id)), [], "a busca acha todos");
  t.equal(await page.evaluate(`${$("dialog[open] [role=status]")}.textContent`), `${found.length} resultados`, "e anuncia quantos");

  const look = async (text, expected, label) => {
    await page.press("Escape");
    await page.waitFor(`!${$("dialog[open]")}`, "fechar", 3000);
    await openSearch(page, text);
    t.equal((await page.evaluate(results))[0], expected, label);
  };
  await look("EXPERIENCIA", "page-career", "sem acento e em maiúsculas");
  await look("currículo", "cv", "o CV");
  await look("contato", "section-contact", "uma seção");
  await look("remote harness", "project-remote-harness", "um projeto");
  await look("nectar", "experience-nectar-crm", "uma experiência");
  await look("ingles", "language", "o idioma");
  await look("dracula", "theme-dracula", "um tema");
  await look("xyzzy", "ask", "nada: oferece a assistente");
  t.equal(await page.evaluate(`${$("dialog[open] [role=status]")}.textContent`), "Nada aqui corresponde a “xyzzy”.", "e diz que não achou");
  t.equal(page.errors, [], "nenhum erro no console");
}

async function searchKeyboard(page, t) {
  await site(page, "/en");
  await openSearch(page, "flutter");
  const found = await page.evaluate(results);
  await page.press("ArrowDown");
  await page.press("ArrowDown");
  await page.press("ArrowUp");
  const active = `document.getElementById(document.activeElement.getAttribute("aria-activedescendant"))?.dataset.result`;
  t.equal(await page.evaluate(active), found[1], "as setas andam na lista");
  t.equal(await page.evaluate(`[...document.querySelectorAll("dialog[open] [aria-selected=true]")].map((el) => el.dataset.result)`), [found[1]], "e marcam um só");
  await page.press("ArrowUp");
  await page.press("ArrowUp");
  t.equal(await page.evaluate(active), found.at(-1), "e dão a volta");
  t.ok(
    await page.evaluate(`(() => {
      const list = ${$("dialog[open] [role=listbox]")}.getBoundingClientRect();
      const el = ${$("dialog[open] [aria-selected=true]")}.getBoundingClientRect();
      return el.top >= list.top - 1 && el.bottom <= list.bottom + 1;
    })()`),
    "o escolhido fica à vista",
  );
  await page.press("ArrowDown");
  await page.press("Enter");
  const href = `/en/projects/${found[0].replace("project-", "")}`;
  await arrive(page, href);
  t.ok(!(await page.evaluate(`!!${$("dialog[open]")}`)), "Enter vai, e a janela fecha");
  t.equal(await page.evaluate(`document.activeElement.tagName`), "H1", "com o foco no título da página");
  t.equal(page.errors, [], "nenhum erro no console");
}

async function searchActs(page, t) {
  await site(page, "/en/projects?cat=ai");
  await openSearch(page, "dracula");
  await page.press("Enter");
  await page.waitFor(`document.documentElement.dataset.siteTheme === "dracula"`, "o tema trocar", 5000);
  t.equal(await page.evaluate(address), "/en/projects?cat=ai", "o tema troca pela busca, sem sair da página");
  t.equal(await page.evaluate(`localStorage.getItem("maarkn-site-theme")`), "dracula", "e a escolha fica");
  await sleep(300);

  await openSearch(page, "portugues");
  await page.press("Enter");
  await arrive(page, "/pt-BR/projects?cat=ai");
  await ready(page);
  t.equal(await page.evaluate(`document.documentElement.lang`), "pt-BR", "o idioma troca pela busca, com o filtro");
  t.equal(await page.evaluate(`document.documentElement.dataset.siteTheme`), "dracula", "e o tema continua");

  await openSearch(page, "contato");
  await page.press("Enter");
  await arrive(page, "/pt-BR#contact");
  t.equal(await page.evaluate(`document.activeElement.id`), "contact", "uma seção: o foco vai a ela");
  t.ok(await page.inView("#contact", null), "e ela está à vista");

  /* A assistente responde na Versão CLI; aqui, sem chave, só se confere a pergunta. */
  await page.call("Fetch.enable", { patterns: [{ urlPattern: "*/api/chat*" }] });
  const asked = [];
  const off = page.on("Fetch.requestPaused", ({ requestId, request }) => {
    asked.push(request.postData ?? "");
    void page.call("Fetch.fulfillRequest", { requestId, responseCode: 503, body: "" });
  });
  await openSearch(page, "quanto custa um app? (urgente)");
  await page.press("Enter");
  await page.waitFor(`location.pathname === "/pt-BR/terminal"`, "a assistente", 8000);
  await page.waitFor(`document.querySelector("main")?.textContent.includes("ask quanto custa um app? (urgente)")`, "a pergunta na tela", 8000);
  await sleep(300);
  t.ok(
    asked.some((body) => body.includes("quanto custa um app? (urgente)")),
    "a pergunta chega à assistente como foi escrita",
    asked.join(" ").slice(0, 200),
  );
  t.ok(!(await page.evaluate(address)).includes("quanto"), "e não pelo endereço");
  off();
}

async function searchLook(page, t, { theme }) {
  await site(page, "/pt-BR", { theme });
  await openSearch(page, "flutter");
  await sleep(250);
  await axe(page, t, `${theme}, busca`);
  await measureContrast(page, t, `${theme}, busca`, "dialog[open]", 8);
  await page.hover("dialog[open] [role=option]");
  await sleep(700);
  await measureContrast(page, t, `${theme}, busca com a luz no escolhido`, "dialog[open]", 8);
  await noOverflow(page, t, `${theme}, busca`);
  const box = await page.evaluate(`(() => { const r = ${$("dialog[open]")}.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight })()`);
  t.ok(box, `${theme}: a janela cabe na tela`);
  t.equal(page.errors, [], "nenhum erro no console");
}

/* ── idioma ──────────────────────────────────────────────────────────────── */

async function language(page, t) {
  const other = "header a[hreflang]";
  await site(page, "/pt-BR/projects/remote-harness", {
    before: save({ "maarkn-theme": "classic", "maarkn-font": "daddytime" }),
    theme: "light",
  });
  await page.click(other);
  await page.waitFor(`location.pathname === "/en/projects/remote-harness"`, "o detalhe em inglês", 8000);
  await ready(page);
  t.equal(await page.evaluate(`document.documentElement.lang`), "en", "o documento em inglês");
  t.equal(
    await page.evaluate(`[document.documentElement.dataset.theme, document.documentElement.dataset.font, localStorage.getItem("maarkn-theme"), localStorage.getItem("maarkn-font")]`),
    ["classic", "daddytime", "classic", "daddytime"],
    "a paleta e a fonte da Versão CLI continuam, no documento e no armazenamento",
  );
  t.equal(await page.evaluate(`document.documentElement.dataset.siteTheme`), "light", "o tema do site também");
  await page.open("/");
  t.equal(await page.evaluate(address), "/en", "a próxima visita sem idioma cai no escolhido");

  await page.open("/en/projects?cat=ai");
  await ready(page);
  await page.click(other);
  await page.waitFor(`${address} === "/pt-BR/projects?cat=ai"`, "a lista filtrada em português", 8000);
  await ready(page);
  t.ok(true, "o filtro é mantido");
  await page.open("/");
  t.equal(await page.evaluate(address), "/pt-BR", "e a preferência acompanha");
  t.equal(page.errors, [], "nenhum erro no console");
}

/** Nada do dicionário português na home em inglês. */
async function onlyEnglish(page, t) {
  const read = (locale) => JSON.parse(readFileSync(new URL(`../src/dictionaries/${locale}.json`, import.meta.url), "utf8"));
  const leaves = (value) => (typeof value === "string" ? [value] : Object.values(value).flatMap(leaves));
  const english = new Set(leaves(read("en")));
  const portuguese = leaves(read("pt-BR")).filter((text) => text.length > 3 && !english.has(text));
  await site(page, "/en");
  const text = await page.evaluate(`[document.body.innerText, ...[...document.querySelectorAll("[aria-label]")].map((el) => el.ariaLabel)].join("\\n")`);
  t.ok(text.length > 300, "há texto");
  const lines = new Set(text.split("\n").map((line) => line.trim()));
  t.equal(portuguese.filter((sentence) => lines.has(sentence)), [], "nenhuma frase em português");
  t.ok((await page.evaluate(`document.documentElement.lang`)) === "en", "e o documento se diz em inglês");
}

/* ── passagem entre páginas ──────────────────────────────────────────────── */

async function focusTitle(page, t, width) {
  await site(page, "/en", {
    before: `window.__transitions = 0;
      const start = Document.prototype.startViewTransition;
      if (start) Document.prototype.startViewTransition = function (...args) { window.__transitions++; return start.apply(this, args) };`,
  });
  t.equal(await page.evaluate(`document.activeElement.tagName`), "BODY", "numa carga, o foco fica no começo do documento");
  const pages = [["/en/career", "Career"], ["/en/projects", null], ["/en/blog", null], ["/en", "From a rough brief to a live product."]];
  for (const [path, title] of pages) {
    if (width < PAGES_IN_TOP) {
      await page.click("nav summary");
      await page.waitFor(`${$("details")}.open`, "o menu", 3000);
      await page.click(`details a[href="${path}"]`);
    } else {
      await page.click(`header a[href="${path}"]`);
    }
    await arrive(page, path);
    await page.waitFor(`document.activeElement.tagName === "H1"`, `o foco no título de ${path}`, 5000);
    const [text, only] = await page.evaluate(`[document.activeElement.textContent, document.querySelectorAll("h1").length]`);
    t.ok(title === null ? text.length > 0 : text === title, `${path}: o foco está no título`, text);
    t.equal(only, 1, `${path}: um único h1`);
    t.equal(await page.evaluate(`scrollY`), 0, `${path}: no topo da página`);
    /* O que um leitor de tela lê: o nó com foco, o papel e o nome. */
    const { nodes } = await page.call("Accessibility.getFullAXTree", {});
    const node = nodes.find((n) => n.properties?.some((p) => p.name === "focused" && p.value.value === true && n.role?.value !== "RootWebArea"));
    t.equal([node?.role?.value, node?.name?.value?.trim()], ["heading", text.trim()], `${path}: na árvore de acessibilidade, o título com foco`);
  }
  t.ok((await page.evaluate(`window.__transitions`)) >= pages.length, "com uma transição por página", `${await page.evaluate(`window.__transitions`)}`);
  t.equal(page.errors, [], "nenhum erro no console");
}

/** "Falar comigo": a âncora, na própria home e a partir de outra página. */
async function anchor(page, t) {
  const talk = 'header a[href="/en#contact"]';
  const lands = async (label) => {
    t.equal(await page.evaluate(`document.activeElement.id`), "contact", `${label}: o foco vai ao contato`);
    t.ok(await page.inView("#contact h2", null), `${label}: que está à vista`);
  };
  for (const [from, label] of [["/en", "na home"], ["/en/career", "de outra página"]]) {
    await site(page, from);
    await page.click(talk);
    await arrive(page, "/en#contact");
    await sleep(200);
    await lands(label);
  }
  await page.press("Tab");
  t.equal(await page.evaluate(`document.activeElement.getAttribute("href")`), "mailto:contact@maarkn.dev", "e dali o Tab segue para os canais");
  t.equal(page.errors, [], "nenhum erro no console");
}

/** Uma carga não é uma passagem: nada esmaece, e tudo responde desde o começo. */
async function plainLoad(page, t) {
  await page.beforeLoad(`window.__transitions = 0;
    const start = Document.prototype.startViewTransition;
    if (start) Document.prototype.startViewTransition = function (...args) { window.__transitions++; return start.apply(this, args) };`);
  for (const path of ["/en", "/en/projects", "/en/projects/remote-harness", "/en/blog"]) {
    await page.open(path);
    await ready(page);
    await sleep(400);
    t.equal(await page.evaluate(`window.__transitions`), 0, `${path}: nenhuma transição na carga`);
  }
}

async function withoutTransitions(page, t, width) {
  await site(page, "/pt-BR", { before: `delete Document.prototype.startViewTransition;` });
  t.equal(await page.evaluate(`typeof document.startViewTransition`), "undefined", "um navegador sem transições");
  const link = async (path) => {
    if (width < PAGES_IN_TOP) {
      await page.click("nav summary");
      await page.waitFor(`${$("details")}.open`, "o menu", 3000);
      await page.click(`details a[href="${path}"]`);
    } else {
      await page.click(`header a[href="${path}"]`);
    }
    await arrive(page, path);
  };
  await link("/pt-BR/career");
  t.equal(await page.evaluate(focused), "H1: Carreira", "a troca acontece, com o foco no título");
  await link("/pt-BR");
  t.equal(await page.evaluate(`document.activeElement.tagName`), "H1", "e a volta também");
  await page.click(width >= 980 ? "[data-theme-option=light]" : "[data-theme-next]");
  t.equal(await page.evaluate(`document.documentElement.dataset.siteTheme`), "light", "o tema troca na hora");
  await openSearch(page, "flutter");
  t.ok((await page.evaluate(results)).length > 1, "e a busca funciona");
  t.equal(page.errors, [], "nenhum erro no console");
}

/** Do meio da home a um projeto, e de volta por cada caminho. */
async function homeScroll(page, t, width) {
  await site(page, "/en");
  const { max } = await page.scroll({ to: "top" });
  t.ok(max > 60, "a home rola", `${max}px`);
  const middle = Math.round(max / 2);
  const toProject = async () => {
    await openSearch(page, "remote harness");
    await page.press("Enter");
    await arrive(page, "/en/projects/remote-harness");
  };
  const at = async (expected, label) => {
    await sleep(250);
    const { top: y } = await page.scrollState(null);
    t.ok(Math.abs(y - expected) <= 1, label, `esperado ${expected}, veio ${y}`);
  };

  await page.scroll({ to: middle });
  const left = (await page.scrollState(null)).top;
  await toProject();
  t.equal((await page.scrollState(null)).top, 0, "o projeto abre no topo");
  await page.scroll({ to: "bottom" });
  await page.evaluate(`history.back()`);
  await arrive(page, "/en");
  await at(left, "pelo voltar do navegador: na mesma posição");

  await toProject();
  await page.click('header a[href="/en"]');
  await arrive(page, "/en");
  await at(left, "pela marca: na mesma posição");
  await page.click('header a[href="/en"]');
  await sleep(900);
  await at(0, "na home, a marca leva ao topo");

  await page.scroll({ to: left });
  await page.evaluate(`document.activeElement.blur()`);
  await page.click('header a[href="/en/terminal"]');
  await page.waitFor(`location.pathname === "/en/terminal" && document.activeElement?.id === "cmd"`, "a Versão CLI", 8000);
  await page.click("header a");
  await arrive(page, "/en");
  await at(left, "pela Versão CLI: na mesma posição");

  if (width < PAGES_IN_TOP) {
    await toProject();
    await page.click("nav summary");
    await page.waitFor(`${$("details")}.open`, "o menu", 3000);
    await page.click('details a[href="/en"]');
    await arrive(page, "/en");
    await at(left, "pelo menu da base: na mesma posição");
  }

  /* Para a frente e para trás pelo histórico. */
  await toProject();
  await page.evaluate(`history.back()`);
  await arrive(page, "/en");
  await page.evaluate(`history.forward()`);
  await arrive(page, "/en/projects/remote-harness");
  await page.evaluate(`history.back()`);
  await arrive(page, "/en");
  await at(left, "depois de ir e vir pelo histórico: na mesma posição");
  t.equal(page.errors, [], "nenhum erro no console");
}

export function chromeCases({ width, height }) {
  return [
    { name: "cli:endereço", run: ownAddress },
    { name: "cli:comando no endereço antigo", run: oldCommands },
    { name: "cli:tela reconstruída", run: rebuilt },
    { name: "cli:sem JavaScript", run: cliWithoutScript },
    { name: "cli:axe", run: cliAxe },
    { name: "cli:ida e volta", run: (page, t) => roundTrip(page, t, width) },
    ...THEMES.map((theme) => ({ name: `topo:${theme}`, run: (page, t) => top(page, t, { theme, width, height }) })),
    { name: "topo:página atual", run: (page, t) => currentPage(page, t, width) },
    { name: "topo:teclado", run: (page, t) => keyboard(page, t, width) },
    { name: "topo:movimento reduzido", run: (page, t) => reducedMotion(page, t, width) },
    { name: "topo:sem JavaScript", run: (page, t) => withoutScript(page, t, width) },
    { name: "topo:toque", run: (page, t) => touch(page, t, width) },
    { name: "busca:abrir e fechar", run: searchOpens },
    { name: "busca:encontrar", run: searchFinds },
    { name: "busca:só teclado", run: searchKeyboard },
    { name: "busca:tema, idioma, seção e assistente", run: searchActs },
    ...THEMES.map((theme) => ({ name: `busca:${theme}`, run: (page, t) => searchLook(page, t, { theme }) })),
    { name: "idioma:página equivalente", run: language },
    { name: "idioma:home em inglês", run: onlyEnglish },
    { name: "passagem:foco no título", run: (page, t) => focusTitle(page, t, width) },
    { name: "passagem:âncora", run: anchor },
    { name: "passagem:carga", run: plainLoad },
    { name: "passagem:sem transições", run: (page, t) => withoutTransitions(page, t, width) },
    { name: "passagem:rolagem da home", run: (page, t) => homeScroll(page, t, width) },
  ];
}
