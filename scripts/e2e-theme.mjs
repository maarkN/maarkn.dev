/**
 * Casos do tema do site em scripts/e2e-site.mjs: o script de tema roda antes
 * da primeira pintura e não conversa com a paleta da Versão CLI. Medidos na
 * home, que hoje é a Versão CLI: o atributo do site é escrito em toda rota.
 */

/**
 * Anota quando o tema entrou no <html> e quando a página pintou. `observe` de
 * `paint` chega depois; a comparação é entre os dois instantes, não entre a
 * ordem dos avisos.
 */
export const WATCH_FIRST_PAINT = `
  window.__theme = null;
  new MutationObserver(() => {
    const value = document.documentElement && document.documentElement.getAttribute("data-site-theme");
    if (value && !window.__theme) window.__theme = { value, at: performance.now() };
  }).observe(document, { attributes: true, childList: true, subtree: true });
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.name === "first-paint") window.__paint = entry.startTime;
    }
  }).observe({ type: "paint", buffered: true });
`;

export const save = (entries) =>
  `for (const [k, v] of ${JSON.stringify(Object.entries(entries))}) { try { localStorage.setItem(k, v) } catch {} }`;

/** O tema já estava lá quando a página pintou pela primeira vez? */
export async function themeAtFirstPaint(page, t, expected) {
  await page.waitFor(`window.__paint !== undefined`, "a primeira pintura", 5000);
  const { theme, paint } = await page.evaluate(`({ theme: window.__theme, paint: window.__paint })`);
  t.equal(theme?.value, expected, "o tema aplicado");
  t.ok(
    theme && theme.at <= paint,
    "o tema entrou antes da primeira pintura",
    `tema em ${theme?.at?.toFixed(1)} ms, pintura em ${paint.toFixed(1)} ms`,
  );
}

const attr = (name) => `document.documentElement.getAttribute(${JSON.stringify(name)})`;

async function visit(page, t, { scheme, before = "", expected }) {
  await page.prefer({ scheme });
  await page.beforeLoad(before + WATCH_FIRST_PAINT);
  await page.open("/en");
  await themeAtFirstPaint(page, t, expected);
  t.equal(page.errors, [], "nenhum erro no console");
}

const BLOCK_STORAGE = `
  Object.defineProperty(window, "localStorage", {
    get() { throw new DOMException("denied", "SecurityError"); },
  });
`;

/** Na Versão CLI, escolhe a paleta como quem usa: digitando o comando. */
async function command(page, text) {
  await page.waitFor(`!document.querySelector("[data-boot]")`, "o boot terminar");
  await page.evaluate(`document.querySelector("#cmd").focus()`);
  await page.type(text);
  await page.press("Enter");
}

export const themeCases = [
  {
    name: "theme:primeira visita, sistema claro",
    run: (page, t) => visit(page, t, { scheme: "light", expected: "light" }),
  },
  {
    name: "theme:primeira visita, sistema escuro",
    run: (page, t) => visit(page, t, { scheme: "dark", expected: "dusk" }),
  },
  {
    name: "theme:preferência salva",
    run: (page, t) =>
      visit(page, t, {
        scheme: "light",
        before: save({ "maarkn-site-theme": "dracula" }),
        expected: "dracula",
      }),
  },
  {
    name: "theme:valor inválido",
    run: async (page, t) => {
      await visit(page, t, {
        scheme: "light",
        before: save({ "maarkn-site-theme": "classic" }),
        expected: "light",
      });
      t.equal(
        await page.evaluate(`localStorage.getItem("maarkn-site-theme")`),
        "classic",
        "o valor desconhecido não é reescrito",
      );
    },
  },
  {
    name: "theme:armazenamento bloqueado",
    run: async (page, t) => {
      await visit(page, t, { scheme: "light", before: BLOCK_STORAGE, expected: "light" });
      t.equal(await page.evaluate(attr("data-theme")), "soft", "a Versão CLI fica na paleta padrão");
    },
  },
  {
    name: "theme:a paleta da Versão CLI no primeiro quadro",
    run: async (page, t) => {
      await page.beforeLoad(
        save({ "maarkn-theme": "classic" }) +
          WATCH_FIRST_PAINT.replaceAll("data-site-theme", "data-theme").replace(
            "if (value &&",
            'if (value === "classic" &&',
          ),
      );
      await page.open("/en");
      await themeAtFirstPaint(page, t, "classic");
    },
  },
  {
    name: "theme:trocar na Versão CLI não altera o site",
    run: async (page, t) => {
      await page.prefer({ scheme: "dark" });
      await page.open("/en");
      await page.evaluate(`localStorage.setItem("maarkn-site-theme", "light")`);
      await page.open("/en");
      t.equal(await page.evaluate(attr("data-site-theme")), "light", "o site em claro suave");

      await command(page, "theme classic");
      await page.waitFor(`${attr("data-theme")} === "classic"`, "a paleta trocar", 5000);
      t.equal(await page.evaluate(attr("data-site-theme")), "light", "o site continua em claro suave");

      await page.open("/en");
      t.equal(await page.evaluate(attr("data-theme")), "classic", "a Versão CLI volta em classic");
      t.equal(await page.evaluate(attr("data-site-theme")), "light", "e o site em claro suave");

      await command(page, "font daddytime");
      await page.waitFor(`${attr("data-font")} === "daddytime"`, "a fonte trocar", 5000);
      t.equal(await page.evaluate(attr("data-site-theme")), "light", "a fonte também não mexe no site");
    },
  },
  {
    name: "theme:a Versão CLI não baixa as fontes do site",
    run: async (page, t) => {
      const fonts = [];
      const off = page.on("Network.requestWillBeSent", ({ request }) => {
        if (/\.(woff2?|otf|ttf)(\?|$)/.test(request.url)) fonts.push(request.url.split("/").pop());
      });
      await page.open("/en");
      await page.waitFor(`document.fonts.status === "loaded"`, "as fontes", 5000);
      off();
      t.ok(fonts.length > 0, "há fonte baixada");
      t.equal(
        fonts.filter((name) => /hubot|mona|daddy/i.test(name)),
        [],
        "só a fonte padrão da Versão CLI",
      );
    },
  },
];
