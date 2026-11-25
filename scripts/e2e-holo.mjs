/**
 * Casos da referência do holograma (`/[lang]/holo`) em scripts/e2e-site.mjs:
 * o que só um navegador de verdade responde sobre a moldura, os estados, os
 * temas e as fontes.
 *
 *   HOLO_REFERENCE=1 pnpm build && pnpm start
 *   node scripts/e2e-site.mjs --holo [--shots <pasta>]
 *
 * A página não existe em produção (`pageExtensions` em next.config.ts).
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { save, themeAtFirstPaint, WATCH_FIRST_PAINT } from "./e2e-theme.mjs";

const PAGE = "/pt-BR/holo";
const THEMES = ["dusk", "light", "dracula"];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const $ = (selector) => `document.querySelector(${JSON.stringify(selector)})`;
const DRAWN = `document.querySelectorAll("svg path[data-line]").length > 0 &&
  [...document.querySelectorAll("svg path[data-line]")].every((p) => p.closest("dialog:not([open])") || p.getAttribute("d"))`;

/**
 * Pré-carrega as fontes a partir da segunda carga, como o Next faz numa página
 * de produção. Na de referência ele não faz: procura pelo nome do arquivo, e
 * `page.dev` não é o que registrou.
 */
const PRELOAD_FACES = `
  addEventListener("load", () => {
    const faces = performance.getEntriesByType("resource").map((e) => e.name).filter((name) => /\\.woff2$/.test(name));
    try { sessionStorage.setItem("__faces", JSON.stringify(faces)) } catch {}
  });
  new MutationObserver((_, observer) => {
    if (!document.head) return;
    observer.disconnect();
    let faces = [];
    try { faces = JSON.parse(sessionStorage.getItem("__faces") || "[]") } catch {}
    for (const href of faces) {
      document.head.append(Object.assign(document.createElement("link"), { rel: "preload", as: "font", type: "font/woff2", crossOrigin: "", href }));
    }
  }).observe(document, { childList: true, subtree: true });
`;

async function openPage(page, { theme = "dusk", motion, path = PAGE, extra = {} } = {}) {
  await page.prefer({ scheme: "dark", motion });
  await page.beforeLoad(save({ "maarkn-site-theme": theme, ...extra }) + WATCH_FIRST_PAINT + PRELOAD_FACES);
  await page.open(path);
  await page.waitFor(DRAWN, "as molduras desenhadas");
  await settleFaces(page, path);
}

/** As fontes do site estão em uso? A que não chegou a tempo não vale nem para texto novo. */
const FACES_IN_USE = `(() => {
  const root = document.querySelector(".site-root");
  const width = (family) => {
    const span = Object.assign(document.createElement("span"), { textContent: "ação, coração, avó" });
    span.style.cssText = "position:absolute;visibility:hidden;white-space:pre;font:560 100px " + family;
    root.append(span);
    const { width } = span.getBoundingClientRect();
    span.remove();
    return width;
  };
  return ["--font-hubot", "--font-mona"].every(
    (name) => width(getComputedStyle(root).getPropertyValue(name) + ", monospace") !== width("monospace"),
  );
})()`;

/** A fonte que não chega antes da primeira pintura espera a carga seguinte. */
async function settleFaces(page, path) {
  for (let i = 0; i < 6; i++) {
    await page.waitFor(`document.fonts.status === "loaded"`, "as fontes");
    await sleep(150);
    if (await page.evaluate(FACES_IN_USE)) return true;
    await page.open(path);
    await page.waitFor(DRAWN, "as molduras desenhadas");
  }
  return false;
}

/** O que se vê de um controle: pontes, traço, halo, recuo, preenchimento, texto. */
const look = (selector) => `(() => {
  const el = ${$(selector)};
  const css = (node, name) => node ? getComputedStyle(node)[name] : null;
  const line = (kind) => [...el.querySelectorAll("svg path")].filter((p) => p.dataset.line === kind);
  return {
    bridges: Number(css(line("bridges").at(-1), "opacity")),
    outer: Number(css(line("outer").at(-1), "opacity")),
    stroke: css(line("outer").at(-1), "stroke"),
    halo: css(line("outer inner")[0], "strokeWidth"),
    ring: Number(css(el.querySelector('svg path[data-line="outline"]'), "opacity")),
    transform: css(el, "transform"),
    fill: css(el.querySelector("svg").parentElement.firstElementChild, "backgroundColor"),
    shadow: css(el, "textShadow"),
    opacity: css(el, "opacity"),
  };
})()`;

const different = (a, b) => JSON.stringify(a) !== JSON.stringify(b);
/** Diferente sem contar cor: o que muda é forma, espessura, recuo ou densidade. */
const shape = ({ bridges, outer, ring, transform, shadow }) => ({
  bridges,
  outer,
  ring,
  transform,
  split: shadow.match(/-?[\d.]+px/g)?.join() ?? "",
});

const tint = (look) => ({ ...shape(look), fill: look.fill });

/**
 * A resposta a um evento, lida no próprio evento: as transições que ele
 * dispara e quanto falta para a última terminar. Não depende de quantos
 * quadros a máquina consegue desenhar enquanto o teste roda.
 */
const answerTo = (selector, event) => `
  window.__answer = new Promise((done) => {
    const el = ${$(selector)};
    el.addEventListener(${JSON.stringify(event)}, () => {
      getComputedStyle(el).opacity;
      const running = el.getAnimations({ subtree: true }).filter((a) => a instanceof CSSTransition);
      done(running.map((a) => a.effect.getComputedTiming().endTime));
    }, { once: true });
  }); 0`;
const answer = (page) => page.evaluate(`window.__answer`);

async function states(page, t) {
  await openPage(page);
  const target = '[data-shot="ghost"]';
  const within = (times, label) =>
    t.ok(times.length > 0 && Math.max(...times) <= 100, `${label} em até 100 ms`, `transições de ${times.join(", ")} ms`);
  await page.hover({ x: 2, y: 2 });
  await page.center(target);
  await sleep(150);
  const rest = await page.evaluate(look(target));
  t.ok(rest.bridges === 0, "em repouso as pontes estão abertas");
  t.equal(rest.halo, "3.6px", "o halo de repouso");

  await page.evaluate(answerTo(target, "pointerover"));
  const at = await page.hover(target);
  within(await answer(page), "ponteiro: responde");
  await page.waitFor(`${look(target)}.bridges === 1`, "as pontes fecharem", 2000);
  const hover = await page.evaluate(look(target));
  t.equal(
    await page.evaluate(
      `${$(target)}.getAnimations({ subtree: true }).filter((a) => a instanceof CSSAnimation).map((a) => a.effect.getTiming().iterations)`,
    ),
    [1],
    "ponteiro: o feixe desce uma vez",
  );

  await page.evaluate(
    `window.__pulse = 0; const animate = Element.prototype.animate;
     Element.prototype.animate = function (...a) { if (this.matches("[data-holo-pulse]")) window.__pulse++; return animate.apply(this, a) }; 0`,
  );
  await page.evaluate(answerTo(target, "pointerdown"));
  await page.mouse("mousePressed", at);
  within(await answer(page), "pressionado: responde");
  await page.waitFor(`${look(target)}.transform.startsWith("matrix(0.975,")`, "o recuo de 2,5%", 2000);
  const pressed = await page.evaluate(look(target));
  t.ok(pressed.stroke !== rest.stroke, "pressionado: o traço muda de cor");
  t.equal(await page.evaluate(`window.__pulse`), 1, "pressionado: pulsa a partir do ponto");
  await page.mouse("mouseReleased", at);

  await page.hover({ x: 2, y: 2 });
  await page.evaluate(`document.activeElement.blur(); ${$('[data-shot="primary"]')}.focus()`);
  await page.waitFor(`${look(target)}.bridges === 0`, "o repouso", 2000);
  await page.evaluate(answerTo(target, "focus"));
  await page.press("Tab");
  t.equal(await page.evaluate(`document.activeElement === ${$(target)}`), true, "Tab chega ao botão");
  within(await answer(page), "foco: responde");
  await page.waitFor(`${look(target)}.bridges === 1`, "o contorno se fechar", 2000);
  const focus = await page.evaluate(look(target));
  t.ok(focus.stroke !== rest.stroke, "foco: o contorno muda de cor");
  t.ok(rest.ring === 0 && focus.ring > 0.4, "foco: e ganha um anel");

  const selected = await page.evaluate(look('[data-shot="selected"]'));
  t.ok(selected.bridges === 1, "selecionado: pontes fechadas");
  t.ok(selected.fill !== rest.fill, "selecionado: preenchimento mais denso");
  await page.click('[data-shot="selected"]');
  await page.hover({ x: 2, y: 2 });
  await page.waitFor(`${look('[data-shot="selected"]')}.fill !== ${JSON.stringify(selected.fill)}`, "o preenchimento mudar", 2000);
  t.equal((await page.evaluate(look('[data-shot="disabled"]'))).opacity, "0.45", "desligado: 45%");
  await primarySelected(page, t);
  await page.hover('[data-shot="disabled"]');
  await sleep(120);
  t.equal((await page.evaluate(look('[data-shot="disabled"]'))).bridges, 0, "desligado: não responde ao ponteiro");

  const all = { rest, hover, pressed, focus, selected };
  const names = Object.keys(all);
  for (let i = 0; i < names.length; i++) {
    for (let j = i + 1; j < names.length; j++) {
      const [a, b] = [names[i], names[j]];
      const measure = [a, b].includes("selected") ? tint : shape;
      t.ok(different(measure(all[a]), measure(all[b])), `${a} e ${b} se distinguem sem a cor do traço`);
    }
  }
  t.equal(page.errors, [], "nenhum erro no console");
}

/** Fração dos pixels de um elemento que muda entre duas capturas, por mais de 8 níveis. */
async function changed(page, before, after) {
  return page.evaluate(`(async () => {
    const pixels = async (data) => {
      const img = await createImageBitmap(await (await fetch("data:image/png;base64," + data)).blob());
      const g = new OffscreenCanvas(img.width, img.height).getContext("2d");
      g.drawImage(img, 0, 0);
      return g.getImageData(0, 0, img.width, img.height).data;
    };
    const [a, b] = [await pixels("${before.toString("base64")}"), await pixels("${after.toString("base64")}")];
    let count = 0;
    for (let i = 0; i < a.length; i += 4) {
      if (Math.max(...[0, 1, 2].map((c) => Math.abs(a[i + c] - b[i + c]))) > 8) count++;
    }
    return count / (a.length / 4);
  })()`);
}

/** O primário é cheio: selecionado, o contorno inteiro aparece fechado e o preenchimento adensa. */
async function primarySelected(page, t) {
  const target = '[data-shot="selected-primary"]';
  const shoot = async () => {
    const { x, y, width, height } = await page.evaluate(`(() => {
      const r = ${$(target)}.getBoundingClientRect();
      return { x: r.left + scrollX, y: r.top + scrollY, width: r.width, height: r.height };
    })()`);
    return page.screenshot({ clip: { x, y, width, height } });
  };
  const toggle = async (on) => {
    await page.click(target);
    await page.hover({ x: 2, y: 2 });
    await page.evaluate(`document.activeElement.blur()`);
    await page.waitFor(`${$(target)}.getAttribute("aria-pressed") === "${on}"`, "o botão alternar", 2000);
    await sleep(700);
  };
  for (const theme of THEMES) {
    await openPage(page, { theme });
    await page.hover({ x: 2, y: 2 });
    await page.center(target);
    await sleep(150);
    const selected = await page.evaluate(look(target));
    const on = await shoot();
    t.ok(selected.bridges === 1 && selected.outer === 1, `${theme}, primário selecionado: o contorno inteiro, fechado`);
    const current = await page.evaluate(look('[data-shot="current-primary"]'));
    t.ok(current.bridges === 1 && current.outer === 1, `${theme}, link primário atual: o mesmo`);
    await toggle(false);
    const rest = await page.evaluate(look(target));
    const off = await shoot();
    t.ok(different(shape(rest), shape(selected)), `${theme}, primário: selecionado se distingue do repouso sem a cor`);
    const share = await changed(page, on, off);
    t.ok(share > 0.4, `${theme}, primário selecionado: o preenchimento adensa`, `${(share * 100).toFixed(0)}% dos pixels mudam`);
    await page.hover(target);
    await sleep(150);
    const hover = await page.evaluate(look(target));
    t.ok(different(shape(hover), shape(selected)), `${theme}, primário: selecionado se distingue do ponteiro sem a cor`);
  }
}

/** Todo holograma que não está desligado responde ao ponteiro, e não só com cor. */
async function pointer(page, t) {
  await openPage(page);
  const names = await page.evaluate(`[...document.querySelectorAll("main [data-holo]")]
    .filter((el) => !el.closest('dialog, :disabled, [aria-disabled="true"], [data-disabled]'))
    .map((el, i) => {
      el.dataset.probe = i;
      const field = el.querySelector("input, textarea");
      return field ? field.name : (el.getAttribute("aria-label") || el.textContent || el.parentElement.textContent).trim().slice(0, 32);
    })`);
  const read = (i) =>
    page.evaluate(`(() => {
      const el = ${$(`[data-probe="${i}"]`)};
      const lengths = (value) => value.match(/-?[\\d.]+px/g)?.join() ?? "";
      return JSON.stringify([el, ...el.querySelectorAll("*")].map((node) => {
        const s = getComputedStyle(node);
        return [s.opacity, s.transform, lengths(s.textShadow), lengths(s.boxShadow), s.strokeDasharray, s.display];
      }));
    })()`);
  const settled = async (i) => {
    for (let last = await read(i); ; ) {
      await sleep(120);
      const now = await read(i);
      if (now === last) return now;
      last = now;
    }
  };
  const silent = [];
  for (const [i, name] of names.entries()) {
    await page.hover({ x: 2, y: 2 });
    await page.center(`[data-probe="${i}"]`);
    const rest = await settled(i);
    await page.hover(`[data-probe="${i}"]`);
    let answered = false;
    for (let wait = 0; wait < 10 && !answered; wait++) {
      await sleep(50);
      answered = (await read(i)) !== rest;
    }
    if (!answered) silent.push(name);
  }
  t.equal(silent, [], "todo holograma responde ao ponteiro");
  t.ok(names.length > 30 && names.includes("email"), "o campo com erro entre eles", `${names.length} hologramas`);
}

async function reducedMotion(page, t) {
  await openPage(page, { motion: "reduce" });
  const target = '[data-shot="ghost"]';
  await page.hover({ x: 2, y: 2 });
  await page.center(target);
  const rest = await page.evaluate(look(target));
  await page.hover(target);
  await page.waitFor(`${look(target)}.bridges === 1`, "as pontes fecharem", 1000);
  const hover = await page.evaluate(look(target));
  t.ok(different(shape(rest), shape(hover)), "ponteiro ainda se distingue do repouso");
  t.equal(
    await page.evaluate(`${$(target)}.style.getPropertyValue("--holo-x")`),
    "",
    "a luz não segue o ponteiro",
  );
  await page.click(target);
  await sleep(60);
  t.equal(
    await page.evaluate(`document.getAnimations().filter((a) => a.playState === "running").length`),
    0,
    "clicar não anima nada",
  );
  await page.hover("#cards article");
  await sleep(120);
  t.equal(
    await page.evaluate(`getComputedStyle(${$("#cards article > div")}).transform`),
    "none",
    "o card não inclina",
  );
  t.equal(
    await page.evaluate(
      `(() => {
        const card = ${$("#cards article")};
        const fill = card.querySelector("svg").parentElement.firstElementChild;
        return [...fill.children, card.querySelector(":scope > span"), card.querySelector("svg")].map((el) => getComputedStyle(el).display);
      })()`,
    ),
    ["none", "none", "none", "none"],
    "sem luz, pulso, cone nem camada de trás",
  );
  await page.hover("#telas article");
  await sleep(120);
  t.equal(
    await page.evaluate(`document.getAnimations().filter((a) => a.playState === "running").length`),
    0,
    "a tela projetada não anima",
  );
  await page.evaluate(`window.__vt = 0; const s = document.startViewTransition;
    document.startViewTransition = function (...a) { window.__vt++; return s.apply(this, a) }; 0`);
  await page.click('[data-theme-choice="dracula"]');
  t.equal(await page.evaluate(`[window.__vt, document.documentElement.dataset.siteTheme]`), [0, "dracula"], "o tema troca sem transição");
  t.equal(page.errors, [], "nenhum erro no console");
}

async function cards(page, t) {
  await openPage(page);
  const tilt = `getComputedStyle(${$("#cards article > div")}).transform`;
  await page.hover({ x: 2, y: 2 });
  await sleep(150);
  t.equal(await page.evaluate(tilt), "none", "card parado não tem transform");
  const { x, y } = await page.center("#cards article");
  await page.hover({ x: x + 80, y: y - 40 });
  await sleep(150);
  t.ok((await page.evaluate(tilt)).startsWith("matrix3d"), "com o ponteiro, inclina");
  const lean = await page.evaluate(
    `["--holo-rx", "--holo-ry"].map((p) => parseFloat(${$("#cards article")}.style.getPropertyValue(p)))`,
  );
  t.ok(lean.every((deg) => Math.abs(deg) <= 5 && deg !== 0), "até 5 graus", JSON.stringify(lean));
  t.equal(
    await page.evaluate(
      `[".cone", ".echo"].map((name) => getComputedStyle(${$("#cards article")}.querySelector(name === ".cone" ? ":scope > span" : "svg")).opacity)`,
    ),
    ["1", "1"],
    "cone de luz embaixo e camada de trás separada",
  );
  t.ok(
    (await page.evaluate(`getComputedStyle(${$("#cards article h3")}.parentElement).transform`)).startsWith("matrix3d"),
    "e o conteúdo sai do plano da moldura",
  );
  await page.mouse("mousePressed", { x: x + 80, y: y - 40 });
  await page.waitFor(`${tilt} === "matrix(0.99, 0, 0, 0.99, 0, 0)"`, "o card recuar 1%", 2000);
  await page.hover({ x: 2, y: 2 });
  await page.mouse("mouseReleased", { x: 2, y: 2 });
  await page.hover({ x: 2, y: 2 });
  await sleep(250);
  t.equal(await page.evaluate(tilt), "none", "o ponteiro sai e o transform some");
  t.equal(
    await page.evaluate(`${$("#cards article")}.style.getPropertyValue("--holo-rx")`),
    "",
    "e nada fica escrito no card",
  );

  const image = `(() => { const r = ${$("#telas article svg[role=img]")}.getBoundingClientRect(); return [r.width, r.height] })()`;
  const moving = `${$("#telas article")}.getAnimations({ subtree: true }).filter((a) => a.playState === "running" && a.effect.getTiming().iterations === Infinity).length`;
  t.equal(await page.evaluate(moving), 0, "tela projetada em repouso: nada se move");
  const before = await page.evaluate(
    `(() => { const s = getComputedStyle(${$("#telas article svg[role=img]")}); return [s.transform, s.width, s.height, s.scale] })()`,
  );
  await page.hover("#telas article");
  await sleep(1200);
  t.equal(await page.evaluate(moving), 2, "com o ponteiro: a luz e a borda interna, sem parar");
  t.equal(
    await page.evaluate(
      `(() => { const s = getComputedStyle(${$("#telas article svg[role=img]")}); return [s.transform, s.width, s.height, s.scale] })()`,
    ),
    before,
    "a imagem mantém o tamanho",
  );
  await page.hover({ x: 2, y: 2 });
  await sleep(200);
  t.equal(await page.evaluate(moving), 0, "o ponteiro sai: a luz some e a borda para");
  t.ok((await page.evaluate(image))[0] > 100, "há imagem");

  await page.evaluate(`${$("#telas article a")}.focus({ focusVisible: true })`);
  await sleep(60);
  t.equal(await page.evaluate(moving), 2, "com o foco também");

  await page.hover({ x: 2, y: 2 });
  await page.click("#cards article:nth-of-type(2)");
  await page.waitFor(`${$("dialog")}.open`, "o card abrir a janela", 3000);
  await page.press("Escape");
  await page.waitFor(`!${$("dialog")}.open`, "a janela fechar", 3000);
  t.equal(page.errors, [], "nenhum erro no console");
}

async function keyboard(page, t) {
  await openPage(page);
  const active = (selector) => page.evaluate(`document.activeElement === ${$(selector)}`);
  const inside = () => page.evaluate(`${$("dialog")}.contains(document.activeElement)`);
  const opener = "[data-open-window]";

  const openWith = async (key) => {
    await page.evaluate(`${$(opener)}.focus()`);
    await page.press(key);
    await page.waitFor(`${$("dialog")}.open`, "a janela abrir", 3000);
  };

  await openWith("Enter");
  t.ok(await inside(), "ao abrir, o foco entra na janela");
  t.equal(
    await page.evaluate(`(() => { const d = ${$("dialog")}; return document.getElementById(d.getAttribute("aria-labelledby"))?.textContent })()`),
    "Nectar CRM",
    "a janela tem nome",
  );
  let leaks = 0;
  const seen = new Set();
  for (let i = 0; i < 9; i++) {
    await page.press("Tab", { shift: i > 5 });
    if (!(await inside())) leaks++;
    seen.add(await page.evaluate(`document.activeElement.textContent || document.activeElement.getAttribute("aria-label")`));
  }
  t.equal(leaks, 0, "Tab não sai da janela, em nenhum sentido");
  t.ok(seen.size >= 3, "e percorre todos os controles", [...seen].join(", "));
  await page.press("Escape");
  await page.waitFor(`!${$("dialog")}.open`, "Esc fechar", 3000);
  t.ok(await active(opener), "Esc devolve o foco a quem abriu");

  await openWith(" ");
  await page.evaluate(`${$("dialog button[aria-label]")}.focus()`);
  await page.press("Enter");
  await page.waitFor(`!${$("dialog")}.open`, "o botão fechar", 3000);
  t.ok(await active(opener), "o botão fecha e devolve o foco");

  await openWith("Enter");
  const box = await page.evaluate(`(() => { const r = ${$("dialog")}.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height } })()`);
  /* Um arrasto que começa dentro e termina fora não é um clique fora. */
  await page.mouse("mousePressed", { x: box.x + 60, y: box.y + box.h - 24 });
  await page.hover({ x: 6, y: 6 });
  await page.mouse("mouseReleased", { x: 6, y: 6 });
  t.ok(await page.evaluate(`${$("dialog")}.open`), "soltar fora uma seleção não fecha");
  await page.mouse("mousePressed", { x: 6, y: 6 });
  await page.mouse("mouseReleased", { x: 6, y: 6 });
  await page.waitFor(`!${$("dialog")}.open`, "o clique fora fechar", 3000);
  t.ok(await active(opener), "o clique fora devolve o foco");

  t.equal(await page.evaluate(`document.querySelectorAll('[role="region"]').length`), 0, "a janela que cabe na tela não ganha parada de Tab");

  /* Só texto, mais alta que a tela: quem rola recebe o foco, e o laço passa por ele. */
  await page.evaluate(`${$("[data-open-long]")}.focus()`);
  await page.press("Enter");
  await page.waitFor(`${$('dialog[open] [role="region"]')} !== null`, "a janela longa abrir", 3000);
  const region = 'dialog[open] [role="region"]';
  const scrolled = `${$(region)}.scrollTop`;
  const onClose = `document.activeElement === ${$("dialog[open] button[aria-label]")}`;
  t.ok(await page.evaluate(onClose), "janela longa: o foco entra no botão");
  await page.press("Tab");
  t.ok(await active(region), "janela longa: Tab chega ao texto");
  t.ok(
    await page.evaluate(`(() => { const s = getComputedStyle(${$(region)}); return s.outlineStyle === "solid" && s.outlineWidth === "2px" })()`),
    "janela longa: com o foco à vista",
  );
  await page.press("PageDown");
  await page.waitFor(`${scrolled} > 200`, "PageDown rolar", 3000).then(
    () => t.ok(true, "janela longa: PageDown rola"),
    () => t.ok(false, "janela longa: PageDown rola"),
  );
  await page.press("End");
  const atEnd = `Math.abs(${$(region)}.scrollHeight - ${$(region)}.clientHeight - ${scrolled}) <= 1`;
  await page.waitFor(atEnd, "End chegar ao fim", 3000).then(
    () => t.ok(true, "janela longa: End chega ao fim"),
    () => t.ok(false, "janela longa: End chega ao fim"),
  );
  await page.press("Tab");
  t.ok(await page.evaluate(onClose), "janela longa: do texto, Tab volta ao botão");
  await page.press("Tab", { shift: true });
  t.ok(await active(region), "janela longa: e Shift+Tab vai ao texto");
  await page.press("Escape");
  await page.waitFor(`!${$("dialog[open]")}`, "Esc fechar a janela longa", 3000);
  t.ok(await active("[data-open-long]"), "janela longa: Esc devolve o foco");

  await page.evaluate(`${$('[role="tab"][aria-selected="true"]')}.focus()`);
  const tab = () => page.evaluate(`[document.activeElement.textContent, ${$('[role="tabpanel"]')}.textContent]`);
  await page.press("ArrowRight");
  t.equal(await tab(), ["Cobrar", "Duas respostas em atraso."], "seta leva à aba seguinte");
  await page.press("End");
  t.equal(await tab(), ["Aconteceu", "Uma vaga promovida."], "End leva à última");
  await page.press("ArrowRight");
  t.equal(await tab(), ["Agenda", "Três compromissos nesta semana."], "e depois dela vem a primeira");
  await page.press("Tab");
  t.ok(await active('[role="tabpanel"]'), "Tab sai da lista para o painel");

  await page.evaluate(`${$('[data-shot="switch"]')}.focus()`);
  await page.press(" ");
  t.equal(await page.evaluate(`${$('[data-shot="switch"]')}.getAttribute("aria-checked")`), "false", "espaço desliga a chave");

  /* Percurso inteiro: todo foco é visível e a ordem é a da tela. */
  await page.evaluate(`document.querySelector("main a[href]").focus()`);
  const invisible = [];
  const order = [];
  for (let i = 0; i < 80; i++) {
    await page.press("Tab");
    const step = await page.evaluate(`(() => {
      const el = document.activeElement;
      if (!el || el === document.body) return null;
      const s = getComputedStyle(el);
      const ring = s.outlineStyle !== "none" && s.outlineColor !== "rgba(0, 0, 0, 0)" && s.outlineWidth !== "0px";
      const host = el.closest("[data-holo]") ?? el.querySelector("[data-holo]");
      const around = host && host.querySelector('svg:last-of-type path[data-line="outline"]');
      const wide = around && Number(getComputedStyle(around).opacity) > 0.3;
      return { name: (el.getAttribute("aria-label") || el.textContent || el.name || el.tagName).trim().slice(0, 40), visible: Boolean(ring || wide), top: el.getBoundingClientRect().top + scrollY };
    })()`);
    if (!step) break;
    if (!step.visible) invisible.push(step.name);
    order.push(step.name);
  }
  t.equal(invisible, [], "todo elemento focado mostra o foco");
  t.ok(order.length > 30, "o percurso passa pelos primitivos", `${order.length} paradas`);
  t.equal(order.filter((name) => name === "Desligado" || name === "Em breve"), [], "o desligado não recebe foco");
  t.equal(page.errors, [], "nenhum erro no console");
}

async function themes(page, t) {
  await openPage(page, { theme: "dracula", extra: { "maarkn-theme": "classic", "maarkn-font": "daddytime" } });
  await themeAtFirstPaint(page, t, "dracula");
  const colors = `[document.documentElement, document.body, ${$(".site-root")}].map((el) => getComputedStyle(el).backgroundColor)`;
  const dracula = await page.evaluate(colors);
  t.equal(new Set(dracula).size, 1, "a tela inteira, incluindo o fundo do documento");
  await page.evaluate(`window.__same = true; const start = document.startViewTransition;
    document.startViewTransition = function (...a) { const vt = start.apply(this, a); window.__vt = vt.finished; return vt }; 0`);
  await page.click('[data-theme-choice="light"]');
  await page.waitFor(`document.documentElement.dataset.siteTheme === "light"`, "o tema trocar", 3000);
  t.ok(await page.evaluate(`window.__vt !== undefined`), "a troca usa uma transição");
  /* Enquanto o instantâneo está na tela, o navegador entrega os cliques ao <html>. */
  await page.evaluate(`window.__vt`);
  t.equal(await page.evaluate(colors), Array(3).fill("rgb(223, 228, 238)"), "toda a interface muda");
  t.ok(await page.evaluate(`window.__same`), "sem recarregar");
  t.equal(
    await page.evaluate(`[...document.querySelectorAll("[data-theme-choice]")].map((b) => b.getAttribute("aria-pressed"))`),
    ["false", "true", "false"],
    "o botão do tema escolhido fica selecionado",
  );
  t.equal(
    await page.evaluate(`[document.documentElement.dataset.theme, document.documentElement.dataset.font, localStorage["maarkn-theme"], localStorage["maarkn-site-theme"]]`),
    ["classic", "daddytime", "classic", "light"],
    "a Versão CLI não muda",
  );

  /* Duas trocas seguidas: a segunda interrompe a transição da primeira. */
  await page.evaluate(`(() => {
    const [dusk, , dracula] = document.querySelectorAll("[data-theme-choice]");
    dusk.click();
    dracula.click();
  })()`);
  await page.evaluate(`window.__vt`);
  t.equal(await page.evaluate(`document.documentElement.dataset.siteTheme`), "dracula", "duas trocas seguidas: vale a última");
  await page.click('[data-theme-choice="light"]');
  await sleep(40);
  await page.evaluate(`${$('[data-theme-choice="dracula"]')}.click()`);
  await sleep(40);
  await page.evaluate(`${$('[data-theme-choice="light"]')}.click()`);
  await page.waitFor(`document.documentElement.dataset.siteTheme === "light"`, "o tema voltar", 3000);
  await page.evaluate(`window.__vt`);
  t.equal(page.errors, [], "duas trocas seguidas: nenhum erro no console");

  /* Trocar de idioma recria o <html> sem recarregar: o tema continua. */
  await page.click("[data-other-locale]");
  await page.waitFor(`location.pathname === "/en/holo"`, "a navegação", 10000);
  t.ok(await page.evaluate(`window.__same`), "a navegação não recarregou");
  t.equal(await page.evaluate(`document.documentElement.dataset.siteTheme`), "light", "o tema do site continua");
  t.equal(await page.evaluate(`getComputedStyle(${$(".site-root")}).backgroundColor`), "rgb(223, 228, 238)", "e pintado");
  t.equal(page.errors, [], "nenhum erro no console");
}

async function noScript(page, t) {
  for (const [scheme, background] of [["light", "rgb(223, 228, 238)"], ["dark", "rgb(39, 48, 59)"]]) {
    await page.prefer({ scheme });
    await page.call("Emulation.setScriptExecutionDisabled", { value: true });
    await page.open(PAGE);
    const { root } = await page.call("DOM.getDocument", {});
    const read = async (selector, name) => {
      const { nodeId } = await page.call("DOM.querySelector", { nodeId: root.nodeId, selector });
      const { computedStyle } = await page.call("CSS.getComputedStyleForNode", { nodeId });
      return computedStyle.find((p) => p.name === name)?.value;
    };
    await page.call("DOM.enable");
    await page.call("CSS.enable");
    t.equal(await read(".site-root", "background-color"), background, `sem JavaScript, sistema ${scheme}`);
    t.ok(
      (await read('[data-shot="ghost"] span span', "box-shadow")) !== "none",
      "sem JavaScript, o botão ainda tem contorno",
    );
  }
}

/**
 * Fontes seguradas na rede: o texto já está lá, com a substituta, e nada se
 * move quando elas chegam. Na carga seguinte elas valem desde o início.
 */
async function fonts(page, t) {
  await page.prefer({ scheme: "dark" });
  const held = [];
  const requested = [];
  let release = false;
  await page.call("Fetch.enable", { patterns: [{ urlPattern: "*.woff2" }, { urlPattern: "*.otf" }] });
  const off = page.on("Fetch.requestPaused", ({ requestId, request }) => {
    requested.push(request.url.split("/").pop());
    if (release) page.call("Fetch.continueRequest", { requestId });
    else held.push(requestId);
  });
  await page.beforeLoad(
    save({ "maarkn-font": "daddytime" }) +
      PRELOAD_FACES +
      `window.__shifts = [];
       new PerformanceObserver((list) => {
         for (const e of list.getEntries()) window.__shifts.push({ value: e.value, nodes: e.sources.map((s) => s.node && (s.node.className || s.node.nodeName) + ":" + (s.node.textContent || "").slice(0, 24)) });
       }).observe({ type: "layout-shift", buffered: true });`,
  );
  await page.open(PAGE, { until: "dom" });
  await page.waitFor(DRAWN, "as molduras");
  await sleep(800);
  t.ok(held.length >= 3, "as três fontes foram pedidas e seguradas", requested.join(", "));
  t.equal(requested.filter((f) => /daddy/i.test(f)), [], "a fonte da Versão CLI não é pedida no site");
  t.ok(
    !/daddy/i.test(await page.evaluate(`getComputedStyle(${$(".site-root")}).getPropertyValue("--font")`)),
    "nem está ao alcance de um elemento do site",
  );
  /* Largura da primeira linha de um título e de um texto: muda com a fonte. */
  const words = `["h1", "#tipografia p:nth-of-type(2)"].map((selector) => {
    const range = document.createRange();
    range.selectNodeContents(document.querySelector(selector));
    return Math.round(range.getClientRects()[0].width * 10) / 10;
  })`;
  /* O mesmo texto numa linha só, no papel de título e no de texto. */
  const widths = `[["--type-title", "112%", 560], ["--type-text", "100%", 400]].map(([role, stretch, weight]) => {
    const root = document.querySelector(".site-root");
    const span = Object.assign(document.createElement("span"), { textContent: "Entendo o problema, desenho a solução e construo backend, web, mobile e IA" });
    span.style.cssText = "position:absolute;visibility:hidden;white-space:pre;font-size:40px;font-weight:" + weight + ";font-stretch:" + stretch + ";font-family:" + getComputedStyle(root).getPropertyValue(role);
    root.append(span);
    const { width } = span.getBoundingClientRect();
    span.remove();
    return width;
  })`;
  const substitute = await page.evaluate(widths);
  const fallback = await page.evaluate(words);
  t.ok(
    await page.evaluate(`document.fonts.status === "loading" && ${$("h1")}.getBoundingClientRect().width > 0`),
    "o texto está legível com a substituta enquanto as fontes não chegam",
  );
  /* O que cerca a troca: posição de tudo o que tem texto. */
  const places = `[...document.querySelectorAll("main *")].filter((el) => !el.closest("svg")).map((el) => { const r = el.getBoundingClientRect(); return Math.round(r.top) + ":" + Math.round(r.height) }).join()`;
  const before = await page.evaluate(places);
  release = true;
  for (const requestId of held) await page.call("Fetch.continueRequest", { requestId });
  await page.waitFor(`document.fonts.status === "loaded"`, "as fontes chegarem");
  await sleep(600);
  t.ok((await page.evaluate(places)) === before, "quando elas chegam, nada muda de lugar");
  t.equal(await page.evaluate(words), fallback, "a fonte que chegou tarde não troca a que está na tela");
  const cls = `Number(window.__shifts.reduce((sum, s) => sum + s.value, 0).toFixed(4))`;
  t.ok((await page.evaluate(cls)) === 0, "CLS 0", JSON.stringify(await page.evaluate(`window.__shifts`)));

  /* Interceptar atrasa o pedido, e o prazo da fonte é o da primeira pintura. */
  off();
  await page.call("Fetch.disable");
  await page.open(PAGE);
  await page.waitFor(DRAWN, "as molduras");
  t.ok(await settleFaces(page, PAGE), "nas cargas seguintes, as fontes do site");
  const real = await page.evaluate(words);
  t.ok(real.every((width, i) => width !== fallback[i]), "e o texto é desenhado com elas", `${fallback} e ${real}`);
  const ratios = (await page.evaluate(widths)).map((width, i) => substitute[i] / width);
  t.ok(ratios.every((ratio) => Math.abs(ratio - 1) < 0.02), "a substituta tem quase a mesma largura", ratios.map((r) => r.toFixed(3)).join(" e "));
  t.ok((await page.evaluate(cls)) === 0, "com CLS 0 também", JSON.stringify(await page.evaluate(`window.__shifts`)));
}

/**
 * A tarefa mais longa da thread principal durante `action`, em ms de CPU. O
 * relógio de parede conta também o que a máquina fez por fora; o de CPU, não.
 */
async function longestTask(page, action) {
  const events = [];
  const offData = page.on("Tracing.dataCollected", ({ value }) => events.push(...value));
  await page.call("Tracing.start", {
    transferMode: "ReportEvents",
    traceConfig: { includedCategories: ["toplevel", "devtools.timeline"], recordMode: "recordAsMuchAsPossible" },
  });
  await action();
  await sleep(500);
  const complete = new Promise((resolve) => {
    const off = page.on("Tracing.tracingComplete", () => {
      off();
      resolve();
    });
  });
  await page.call("Tracing.end");
  await complete;
  offData();
  const thread = (e) => `${e.pid}:${e.tid}`;
  const main = new Set(
    events.filter((e) => e.name === "thread_name" && e.args.name === "CrRendererMain").map(thread),
  );
  const tasks = events.filter((e) => e.name.endsWith("RunTask") && main.has(thread(e)) && e.tdur !== undefined);
  return { count: tasks.length, ms: Math.max(0, ...tasks.map((e) => e.tdur / 1000)) };
}

/** Cem molduras: montar e redesenhar sem tarefa longa (50 ms), e nada em repouso. */
async function hundred(page, t) {
  await page.beforeLoad(`
    window.__draws = 0;
    const set = Element.prototype.setAttribute;
    Element.prototype.setAttribute = function (name, value) { if (name === "d") window.__draws++; return set.call(this, name, value) };
  `);
  await openPage(page);
  await sleep(500);
  const draws = () => page.evaluate(`window.__draws`);

  const mount = await longestTask(page, async () => {
    await page.click("[data-stress]");
    await page.waitFor(`document.querySelectorAll("#cem [data-drawn]").length >= 102`, "as cem molduras");
  });
  const brief = ({ count, ms }, label) => t.ok(count > 10 && ms < 50, `${label} sem tarefa longa (${ms.toFixed(1)} ms)`);
  brief(mount, "montar cem molduras");

  const before = await draws();
  const redraw = await longestTask(page, async () => {
    for (let i = 0; i < 6; i++) {
      await page.click("[data-stress-resize]");
      await sleep(150);
    }
  });
  const drawn = (await draws()) - before;
  t.ok(drawn >= 6 * 100 * 6, "mudar a largura redesenha as cem", `${drawn} traçados`);
  brief(redraw, "redesenhar cem molduras");

  await page.hover({ x: 2, y: 2 });
  await sleep(300);
  const still = await draws();
  await sleep(2000);
  t.equal(await draws(), still, "em repouso, nada é recalculado");
  await page.hover("#cem [data-drawn]");
  await sleep(300);
  t.equal(await draws(), still, "nem com o ponteiro passando");
}

/** As retas em 1x e 2x: um traço só, com a borda dentro do pixel. */
async function sharp(page, t) {
  for (const dpr of [1, 2]) {
    await page.density(dpr);
    await openPage(page, { theme: "light" });
    await page.hover({ x: 2, y: 2 });
    const { x, y, w, h } = await page.evaluate(`(() => {
      const el = ${$("#cards article")}; el.scrollIntoView({ block: "center", behavior: "instant" });
      const r = el.getBoundingClientRect(); return { x: r.left + scrollX, y: r.top + scrollY, w: r.width, h: r.height };
    })()`);
    await sleep(250);
    const png = await page.screenshot({ clip: { x: x - 4, y: y - 4, width: w + 8, height: h + 8 } });
    /* O navegador decodifica o PNG; a coluna do meio e a linha do meio cortam
       as quatro retas. */
    const profile = await page.evaluate(`(async () => {
      const img = await createImageBitmap(await (await fetch("data:image/png;base64,${png.toString("base64")}")).blob());
      const c = new OffscreenCanvas(img.width, img.height); const g = c.getContext("2d"); g.drawImage(img, 0, 0);
      const px = (x, y) => { const [r, gr, b] = g.getImageData(x, y, 1, 1).data; return (r + gr + b) / 3 };
      const n = 16 * ${dpr};
      const mx = Math.round(img.width * 0.5), my = Math.round(img.height * 0.5);
      return {
        topo: Array.from({ length: n }, (_, i) => px(mx, i)),
        esquerda: Array.from({ length: n }, (_, i) => px(i, my)),
        base: Array.from({ length: n }, (_, i) => px(mx, img.height - 1 - i)),
        direita: Array.from({ length: n }, (_, i) => px(img.width - 1 - i, my)),
      };
    })()`);
    for (const [side, values] of Object.entries(profile)) {
      const paper = Math.max(...values);
      const ink = Math.min(...values);
      const strong = values.map((v) => (paper - v) / (paper - ink));
      /* 1,5 px de traço: em 1x, um pixel cheio e o vizinho de dentro pela
         metade; em 2x, três pixels cheios. Fora disso, só o halo. Vale para a
         linha externa e para a interna, que é mais clara. */
      const expected = dpr === 1 ? [1, 0.58] : [1, 1, 1];
      const first = strong.findIndex((s) => s > 0.3);
      const second = strong.findIndex((s, i) => i > first + expected.length && s > 0.3);
      const crisp = (at, ink) =>
        at > 0 &&
        expected.every((share, i) => Math.abs(strong[at + i] - share * ink) < 0.08) &&
        strong[at - 1] < 0.25 &&
        strong[at + expected.length] < 0.25;
      t.ok(
        crisp(first, 1) && crisp(second, 0.69),
        `${dpr}x, ${side}: duas retas, nítidas`,
        strong.map((s) => s.toFixed(2)).join(" "),
      );
    }
  }
  await page.density(1);
}

async function reflow(page, t) {
  for (const theme of THEMES) {
    for (const width of [390, 1440]) {
      await page.density(1, { width, height: 844 });
      await openPage(page, { theme });
      const doc = await page.evaluate(`document.documentElement.scrollWidth`);
      t.ok(doc <= width, `${theme} em ${width} px: sem rolagem horizontal`, `${doc}px`);
    }
  }
  t.equal(page.errors, [], "nenhum erro no console");
}

export function axeSource() {
  const store = new URL("../node_modules/.pnpm/", import.meta.url);
  const dir = existsSync(store) && readdirSync(store).find((d) => d.startsWith("axe-core@"));
  if (!dir) throw new Error("axe-core não encontrado em node_modules/.pnpm");
  return readFileSync(join(store.pathname, dir, "node_modules/axe-core/axe.min.js"), "utf8");
}

/** axe nos três temas, com a página em repouso e com a janela aberta. */
async function axe(page, t) {
  const source = axeSource();
  for (const theme of THEMES) {
    await openPage(page, { theme });
    for (const surface of ["página", "janela", "janela longa"]) {
      if (surface !== "página") {
        await page.press("Escape");
        await page.waitFor(`!${$("dialog[open]")}`, "a anterior fechar", 3000);
        await page.click(surface === "janela" ? "[data-open-window]" : "[data-open-long]");
        await page.waitFor(`${$("dialog[open]")} !== null`, "a janela", 3000);
        await sleep(300);
      }
      await page.evaluate(`${source}; 0`);
      const found = await page.evaluate(`axe.run(document, { rules: { "target-size": { enabled: true } } }).then((r) => ({
        violations: r.violations.map((v) => v.id + ": " + v.nodes.map((n) => n.target.join(" ")).slice(0, 4).join(" | ")),
        contrast: r.passes.find((p) => p.id === "color-contrast")?.nodes.length ?? 0,
        unsure: r.incomplete.find((p) => p.id === "color-contrast")?.nodes.length ?? 0,
      }))`);
      t.equal(found.violations, [], `axe, ${theme}, ${surface}: nenhuma violação`);
      /* Sobre as linhas de varredura o axe se declara incapaz (é um gradiente):
         esses pares são os de scripts/check-contrast.ts. */
      t.ok(found.contrast + found.unsure > 0, `axe, ${theme}, ${surface}: olhou o contraste`);
      if (surface === "página") t.ok(found.contrast > 30, `axe, ${theme}: mediu o texto fora das molduras`, `${found.contrast}`);
    }
  }
}

/** Os textos e ícones à vista em `scope`: a cor, o mínimo e onde estão, na página. */
const readInks = (scope) => `(() => {
  const root = ${$(scope)};
  const found = [];
  /* O que uma lista que rola não está mostrando não está à vista. */
  const clipped = (el, r) => {
    let { left, top, right, bottom } = r;
    for (let box = el.parentElement; box && box !== document.body; box = box.parentElement) {
      if (getComputedStyle(box).overflowY === "visible") continue;
      const b = box.getBoundingClientRect();
      [left, top, right, bottom] = [Math.max(left, b.left), Math.max(top, b.top), Math.min(right, b.right), Math.min(bottom, b.bottom)];
    }
    return { left, top, width: right - left, height: bottom - top };
  };
  const add = (el, label, color, rects, min) => {
    if (el.closest(':disabled, [aria-disabled="true"], [data-disabled], dialog:not([open])')) return;
    for (const rect of rects) {
      const r = clipped(el, rect);
      if (r.width < 2 || r.height < 2) continue;
      found.push({ label: label.trim().slice(0, 40), color, min, x: r.left + scrollX, y: r.top + scrollY, w: r.width, h: r.height });
    }
  };
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const el = node.parentElement;
    if (!node.data.trim() || el.closest("svg")) continue;
    const range = document.createRange();
    range.selectNodeContents(node);
    add(el, node.data, getComputedStyle(el).color, range.getClientRects(), 4.5);
  }
  for (const el of root.querySelectorAll("input, textarea")) {
    /* Onde se escreve, sem a entrelinha: no canto dela passa a diagonal da moldura. */
    const r = el.getBoundingClientRect(), s = getComputedStyle(el);
    const [side, top] = [parseFloat(s.paddingLeft) + 2, parseFloat(s.paddingTop) + 2];
    const box = new DOMRect(r.left + side, r.top + top, r.width - 2 * side, r.height - 2 * top);
    add(el, el.name, s.color, [box], 4.5);
    if (el.placeholder) add(el, el.placeholder, getComputedStyle(el, "::placeholder").color, [box], 4.5);
  }
  for (const el of root.querySelectorAll("svg.lucide")) {
    add(el, "ícone em " + (el.parentElement.textContent || el.parentElement.parentElement.getAttribute("aria-label")), getComputedStyle(el).color, [el.getBoundingClientRect()], 3);
  }
  for (const el of root.querySelectorAll('[role="switch"] [data-holo] > span:last-child')) {
    add(el, "chave " + el.closest("button").textContent, getComputedStyle(el).borderTopColor, [el.getBoundingClientRect()], 3);
  }
  return found;
})()`;

/* Também o que cerca um texto sem ficar atrás dele: sublinhado, anel e alça. */
const HIDE = `
  * { -webkit-text-fill-color: transparent !important; text-shadow: none !important; caret-color: transparent !important }
  a:not([data-holo]) { background-image: none !important; outline-color: transparent !important }
  textarea { resize: none !important }
  svg.lucide, [role="switch"] [data-holo] > span:last-child { visibility: hidden !important }
`;

/**
 * Cada texto contra os pixels que estão atrás dele, um a um: a linha de
 * varredura e a luz do ponteiro entram na conta, o que o axe não faz. Os textos
 * são lidos, escondidos, e o que sobra na captura é o fundo. `full` captura a
 * página inteira; o que é fixo na tela só se mede sem ele, ou sairia do lugar.
 */
export async function measureContrast(page, t, label, scope, atLeast, { full = false } = {}) {
  const inks = await page.evaluate(readInks(scope));
  await page.evaluate(`document.head.append(Object.assign(document.createElement("style"), { id: "hide", textContent: ${JSON.stringify(HIDE)} }))`);
  const { width, height } = await page.evaluate(`({ width: document.documentElement.clientWidth, height: document.documentElement.scrollHeight })`);
  const view = await page.evaluate(`({ x: scrollX, y: scrollY, width: innerWidth, height: innerHeight })`);
  const clip = full ? { x: 0, y: 0, width, height } : view;
  const png = await page.screenshot({ full, clip });
  await page.evaluate(`document.getElementById("hide").remove()`);
  const low = await page.evaluate(`(async () => {
    const img = await createImageBitmap(await (await fetch("data:image/png;base64,${png.toString("base64")}")).blob());
    const g = new OffscreenCanvas(img.width, img.height).getContext("2d", { willReadFrequently: true });
    g.drawImage(img, 0, 0);
    const linear = (c) => ((c /= 255) <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
    const light = ([r, g, b]) => 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
    const measured = [];
    for (const ink of ${JSON.stringify(inks)}) {
      const x0 = Math.max(0, Math.ceil(ink.x - ${clip.x})), y0 = Math.max(0, Math.ceil(ink.y - ${clip.y}));
      const x1 = Math.min(img.width, Math.floor(ink.x - ${clip.x} + ink.w)), y1 = Math.min(img.height, Math.floor(ink.y - ${clip.y} + ink.h));
      if (x1 <= x0 || y1 <= y0) continue;
      const { data } = g.getImageData(x0, y0, x1 - x0, y1 - y0);
      const text = light(ink.color.match(/[\\d.]+/g).map(Number));
      let worst = 21;
      const seen = new Set();
      for (let i = 0; i < data.length; i += 4) {
        const key = (data[i] << 16) | (data[i + 1] << 8) | data[i + 2];
        if (seen.has(key)) continue;
        seen.add(key);
        const under = light([data[i], data[i + 1], data[i + 2]]);
        worst = Math.min(worst, (Math.max(text, under) + 0.05) / (Math.min(text, under) + 0.05));
      }
      measured.push({ ...ink, worst });
    }
    return measured.map(({ label, color, worst, min }) => ({ label, color, worst, min }));
  })()`);
  t.ok(low.length >= atLeast, `${label}: há o que medir`, `${low.length}`);
  t.equal(
    low.filter(({ worst, min }) => worst < min).map(({ label, color, worst }) => `${label} (${color}) ${worst.toFixed(2)}`),
    [],
    `${label}: todo texto atinge 4.5:1, e todo ícone 3:1`,
  );
}

/** Os textos da página, do card com a luz e da janela, nos três temas. */
async function contrast(page, t) {
  const measure = (label, scope, atLeast) =>
    measureContrast(page, t, label, scope, atLeast, { full: scope === "main" });

  for (const theme of THEMES) {
    await openPage(page, { theme });
    await page.hover({ x: 2, y: 2 });
    await sleep(200);
    await measure(`${theme}, página`, "main", 90);

    const card = "#cards article:nth-of-type(3)";
    const link = `${card} p a`;
    const button = `${card} button`;
    await page.evaluate(`${$(card)}.scrollIntoView({ block: "center", behavior: "instant" })`);
    await page.hover(link);
    await sleep(900);
    t.ok((await page.evaluate(`Number(getComputedStyle(${$(card)}.querySelector("[data-holo-pulse]").previousElementSibling).opacity)`)) === 1, `${theme}, card: a luz está acesa`);
    await measure(`${theme}, card com a luz no link`, card, 4);
    await page.evaluate(`${$(link)}.focus({ focusVisible: true })`);
    await sleep(120);
    await measure(`${theme}, card com o link em foco`, card, 4);
    await page.evaluate(`${$(button)}.setAttribute("aria-pressed", "true")`);
    await page.hover(button);
    await sleep(900);
    await measure(`${theme}, card com um botão selecionado`, card, 4);
    t.equal(
      await page.evaluate(`["--light", "--scan"].map((name) => getComputedStyle(${$(button)}).getPropertyValue(name))`),
      await page.evaluate(`["--panel-light", "--panel-scan"].map((name) => getComputedStyle(${$(".site-root")}).getPropertyValue(name))`),
      `${theme}, card: o botão de dentro tem a luz do painel`,
    );

    await page.hover({ x: 2, y: 2 });
    await page.click("[data-open-window]");
    await page.waitFor(`${$("dialog[open]")} !== null`, "a janela", 3000);
    await page.hover({ x: 2, y: 2 });
    await sleep(300);
    await measure(`${theme}, janela`, "dialog[open]", 9);
    await page.evaluate(`${$("dialog[open] p a")}.focus({ focusVisible: true })`);
    await sleep(120);
    await measure(`${theme}, janela com o link em foco`, "dialog[open]", 9);
  }
}

/** Alvo de toque: o botão de 34 px responde numa área de 44. */
async function touch(page, t) {
  await page.call("Emulation.setTouchEmulationEnabled", { enabled: true });
  await page.call("Emulation.setEmitTouchEventsForMouse", { enabled: false });
  await page.density(1, { width: 390, height: 844, mobile: true });
  await openPage(page);
  const small = await page.evaluate(`(() => {
    const coarse = matchMedia("(pointer: coarse)").matches;
    const problems = [];
    for (const el of document.querySelectorAll("main button, main a[href], main input, main textarea")) {
      if (el.closest("dialog, p, article") || el.disabled || el.hasAttribute("data-other-locale")) continue;
      const r = el.getBoundingClientRect();
      const after = getComputedStyle(el, "::before");
      const extra = after.content !== "none" ? -2 * parseFloat(after.top) : 0;
      const side = after.content !== "none" ? -2 * parseFloat(after.left) : 0;
      if (r.height + extra < 44 || r.width + side < 44) problems.push((el.getAttribute("aria-label") || el.textContent) + " " + (r.width + side) + "x" + (r.height + extra));
    }
    return { coarse, problems };
  })()`);
  t.ok(small.coarse, "a emulação é de toque");
  t.equal(small.problems, [], "todo alvo tem 44 px");
}

async function shots(page, t, folder, width) {
  mkdirSync(folder, { recursive: true });
  const write = (name, data) => writeFileSync(join(folder, name), data);
  for (const theme of THEMES) {
    for (const dpr of [1, 2]) {
      await page.density(dpr, { width, height: 1000 });
      await openPage(page, { theme });
      await page.hover({ x: 2, y: 2 });
      await sleep(300);
      const height = await page.evaluate(`document.documentElement.scrollHeight`);
      write(
        `${theme}-${dpr}x.webp`,
        await page.screenshot({
          format: "webp",
          quality: dpr === 1 ? 88 : 72,
          full: true,
          clip: { x: 0, y: 0, width, height },
        }),
      );
    }
    /* Os estados que só existem com alguém ali, um por elemento. */
    await page.density(2, { width, height: 1000 });
    await openPage(page, { theme });
    await page.call("DOM.enable");
    await page.call("CSS.enable");
    const { root } = await page.call("DOM.getDocument", {});
    const force = async (selector, ...states) => {
      const { nodeId } = await page.call("DOM.querySelector", { nodeId: root.nodeId, selector });
      await page.call("CSS.forcePseudoState", { nodeId, forcedPseudoClasses: states });
    };
    await force('[data-shot="primary"]', "hover");
    await force('[data-shot="ghost"]', "hover");
    await force("#botoes button:nth-of-type(3)", "focus", "focus-visible");
    await force("#botoes button:nth-of-type(4)", "focus", "focus-visible");
    await force("#botoes button:nth-of-type(6)", "active");
    await force('[data-shot="link"]', "hover");
    await force('[data-shot="beam"]', "hover");
    await force('[data-shot="tag"]', "hover");
    await force("#tags a:nth-of-type(2)", "focus", "focus-visible");
    await force("#cards article:nth-of-type(1)", "hover");
    await force("#cards article:nth-of-type(2) button", "focus", "focus-visible");
    await force("#telas article:nth-of-type(1)", "hover");
    await page.evaluate(`(() => { const c = ${$("#cards article")}; c.style.setProperty("--holo-rx", "3.5deg"); c.style.setProperty("--holo-ry", "-4deg") })()`);
    await sleep(700);
    const box = await page.evaluate(`(() => {
      const top = ${$("#botoes")}.getBoundingClientRect().top + scrollY - 30;
      const bottom = ${$("#telas")}.getBoundingClientRect().bottom + scrollY + 30;
      return { y: top, height: bottom - top };
    })()`);
    write(
      `${theme}-states-2x.webp`,
      await page.screenshot({ format: "webp", quality: 72, full: true, clip: { x: 0, width, ...box } }),
    );
    t.ok(true, `capturas em ${theme}`);
  }
}

export function holoCases({ shots: folder, width }) {
  return [
    { name: "holo:estados", run: states },
    { name: "holo:ponteiro", run: pointer },
    { name: "holo:movimento reduzido", run: reducedMotion },
    { name: "holo:cards e telas", run: cards },
    { name: "holo:teclado", run: keyboard },
    { name: "holo:temas", run: themes },
    { name: "holo:sem JavaScript", run: noScript },
    { name: "holo:fontes", run: fonts },
    { name: "holo:cem molduras", run: hundred },
    { name: "holo:nitidez", run: sharp },
    { name: "holo:reflow", run: reflow },
    { name: "holo:toque", run: touch },
    { name: "holo:axe", run: axe },
    { name: "holo:contraste", run: contrast },
    ...(folder ? [{ name: "holo:capturas", run: (page, t) => shots(page, t, folder, Math.min(width, 1200)) }] : []),
  ];
}
