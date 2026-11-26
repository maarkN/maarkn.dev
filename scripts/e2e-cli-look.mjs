/**
 * Casos de scripts/e2e-site.mjs: a paleta e a fonte da Versão CLI na troca de
 * idioma. O idioma é parâmetro do layout raiz: trocar recria o <html> com
 * `soft` e `caskaydia` sem recarregar o documento, e o script de
 * inicialização não roda de novo. A escolha do visitante tem de continuar na
 * tela e no armazenamento, nos dois sentidos, pelo comando `lang`, pela barra
 * de uma página interna (com o mouse e com o teclado) e pelo botão voltar.
 *
 * Cada caso roda com e sem movimento reduzido; a largura é a do script
 * (`--width 390 --height 844` para a estreita).
 */

const SHORT = { en: "en", "pt-BR": "pt" };
const other = (locale) => (locale === "en" ? "pt-BR" : "en");
const KEYS = { theme: "maarkn-theme", font: "maarkn-font" };
const CHOSEN = { theme: "classic", font: "daddytime" };

/** Antes de qualquer script da página: anota cada gravação da paleta e da fonte. */
const WATCH_WRITES = `
  window.__writes = [];
  const setItem = Storage.prototype.setItem;
  Storage.prototype.setItem = function (key, value) {
    if (key === ${JSON.stringify(KEYS.theme)} || key === ${JSON.stringify(KEYS.font)}) {
      window.__writes.push([key, String(value)]);
    }
    return setItem.call(this, key, value);
  };
`;

/** O navegador recusa o `localStorage`, como no modo privado mais estrito. */
const BLOCK_STORAGE = `
  Object.defineProperty(window, "localStorage", {
    get() { throw new DOMException("denied", "SecurityError"); },
  });
`;

const BUTTONS = `[...document.querySelectorAll("header:has(button) button")]`;

/** A paleta e a fonte como a tela as mostra: o <html> e os dois botões da barra. */
const LOOK = `(() => {
  const d = document.documentElement;
  const bar = ${BUTTONS}.slice(0, 2).map((b) => b.querySelector("b")?.textContent ?? "");
  return { theme: d.getAttribute("data-theme"), font: d.getAttribute("data-font"), bar: bar.join("/") };
})()`;

const STORED = `({ theme: localStorage.getItem(${JSON.stringify(KEYS.theme)}), font: localStorage.getItem(${JSON.stringify(KEYS.font)}) })`;

/**
 * A cada quadro, o que a tela está para pintar (o rAF roda antes da pintura):
 * guarda os valores distintos do <html> e da barra, enquanto ela existir.
 */
const WATCH_FRAMES = `(() => {
  window.__frames = { html: [], bar: [] };
  const add = (list, value) => { if (value && !list.includes(value)) list.push(value); };
  const tick = () => {
    const look = ${LOOK};
    add(window.__frames.html, look.theme + "/" + look.font);
    if (look.bar !== "/") add(window.__frames.bar, look.bar);
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
})()`;

const EXPECTED = { ...CHOSEN, bar: `${CHOSEN.theme}/${CHOSEN.font}` };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * A barra já responde: o React marca cada nó que hidratou. Um clique antes
 * disso cai num botão ainda sem efeito e o caso mediria a pressa do script.
 */
const hydrated = (page) =>
  page.waitFor(
    `${BUTTONS}.length === 3 && ${BUTTONS}.every((b) => Object.keys(b).some((k) => k.startsWith("__reactProps")))`,
    "a barra hidratar",
  );

/** Na Versão CLI, como quem usa: digitando o comando. */
async function command(page, text) {
  await page.waitFor(`!document.querySelector("[data-boot]")`, "o boot terminar");
  await page.evaluate(`document.querySelector("#cmd").focus()`);
  await page.type(text);
  await page.press("Enter");
}

/** Tab até o botão `index` da barra (0 paleta, 1 fonte, 2 idioma). */
async function tabTo(page, index) {
  for (let i = 0; i < 40; i++) {
    if (await page.evaluate(`document.activeElement === ${BUTTONS}[${index}]`)) return;
    await page.press("Tab");
  }
  throw new Error(`o Tab não chegou ao botão ${index} da barra`);
}

/** A rota terminou de trocar e o que remonta teve tempo de agir. */
async function arrived(page, locale, path) {
  await page.waitFor(
    `document.documentElement.lang === ${JSON.stringify(locale)}
      && location.pathname === ${JSON.stringify(path)}
      && ${BUTTONS}[2]?.querySelector("b")?.textContent === ${JSON.stringify(SHORT[locale])}`,
    `${path} em ${locale}`,
  );
  /* A Versão CLI reconstrói a tela depois de montar: é aí que um `theme`
     reexecutado trocaria a paleta de volta. */
  await page.waitFor(`!document.querySelector("[data-boot]")`, "o boot terminar");
  await sleep(800);
}

/**
 * O visitante escolhe `classic` e `daddytime` (`by` diz como), troca de idioma
 * pelo mesmo caminho, volta pelo navegador e recarrega.
 *   comando  — `theme classic`, `font daddytime`, `lang <outro>` na home
 *   alternar — `theme`, `font` sem argumento, `lang <outro>` na home
 *   barra    — os três botões da barra de /links, com o mouse
 *   teclado  — os mesmos botões, com Tab e Enter
 */
async function keepsLook(page, t, { from, by, motion, blocked = false }) {
  const to = other(from);
  const onHome = by === "comando" || by === "alternar";
  const start = onHome ? `/${from}` : `/${from}/links`;
  const target = onHome ? `/${to}` : `/${to}/links`;

  await page.prefer({ motion });
  await page.beforeLoad(blocked ? BLOCK_STORAGE : WATCH_WRITES);
  await page.open(start);
  await hydrated(page);

  if (by === "comando") {
    await command(page, `theme ${CHOSEN.theme}`);
    await command(page, `font ${CHOSEN.font}`);
  } else if (by === "alternar") {
    await command(page, "theme");
    await command(page, "font");
  } else if (by === "teclado") {
    await tabTo(page, 0);
    await page.press("Enter");
    await tabTo(page, 1);
    await page.press("Enter");
  } else {
    await page.click(`header:has(button) button:nth-of-type(1)`);
    await page.click(`header:has(button) button:nth-of-type(2)`);
  }
  await page.waitFor(`JSON.stringify(${LOOK}) === ${JSON.stringify(JSON.stringify(EXPECTED))}`, "a escolha entrar", 5000);
  const mark = blocked ? 0 : await page.evaluate(`window.__writes.length`);
  await page.evaluate(WATCH_FRAMES);

  if (onHome) {
    await command(page, `lang ${SHORT[to]}`);
  } else if (by === "teclado") {
    await tabTo(page, 2);
    await page.press("Enter");
  } else {
    await page.click(`header:has(button) button:nth-of-type(3)`);
  }
  await arrived(page, to, target);
  t.equal(await page.evaluate(LOOK), EXPECTED, `em ${to}, a tela continua em classic e daddytime`);
  if (!blocked) t.equal(await page.evaluate(STORED), CHOSEN, `em ${to}, o armazenamento também`);

  await page.back();
  await arrived(page, from, start);
  t.equal(await page.evaluate(LOOK), EXPECTED, `voltando a ${from}, a tela continua em classic e daddytime`);
  if (!blocked) t.equal(await page.evaluate(STORED), CHOSEN, `voltando a ${from}, o armazenamento também`);

  const frames = await page.evaluate(`window.__frames`);
  t.equal(frames.html, [`${CHOSEN.theme}/${CHOSEN.font}`], "nenhum quadro pintou outra paleta ou fonte");
  t.equal(frames.bar, [EXPECTED.bar], "nem a barra mostrou outra");
  if (!blocked) {
    const writes = await page.evaluate(`window.__writes.slice(${mark})`);
    t.equal(
      writes.filter(([key, value]) => value !== (key === KEYS.theme ? CHOSEN.theme : CHOSEN.font)),
      [],
      "trocar de idioma e voltar não gravou outro valor",
    );
  }
  t.equal(page.errors, [], "nenhum erro no console");

  await page.reload();
  if (onHome) await page.waitFor(`!document.querySelector("[data-boot]")`, "o boot terminar");
  await sleep(300);
  if (blocked) {
    /* Sem armazenamento a escolha vive só na memória do documento. */
    t.equal(await page.evaluate(LOOK), { theme: "soft", font: "caskaydia", bar: "soft/caskaydia" }, "recarregar volta ao padrão");
  } else {
    t.equal(await page.evaluate(LOOK), EXPECTED, "recarregar mantém classic e daddytime");
  }
  t.equal(page.errors, [], "nenhum erro no console depois de recarregar");
}

const MOTIONS = [
  { motion: "no-preference", label: "" },
  { motion: "reduce", label: " · movimento reduzido" },
];

export const cliLookCases = ["en", "pt-BR"].flatMap((from) => [
  ...["comando", "alternar", "barra", "teclado"].flatMap((by) =>
    MOTIONS.map(({ motion, label }) => ({
      name: `cli-lang:${by} ${from}→${other(from)}${label}`,
      run: (page, t) => keepsLook(page, t, { from, by, motion }),
    })),
  ),
  {
    name: `cli-lang:armazenamento bloqueado ${from}→${other(from)}`,
    run: (page, t) => keepsLook(page, t, { from, by: "barra", motion: "no-preference", blocked: true }),
  },
]);
