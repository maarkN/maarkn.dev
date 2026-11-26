// @vitest-environment jsdom
import { act, useLayoutEffect } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ThemeApi } from "./theme-provider";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/*
 * Trocar de idioma recria o <html> do layout raiz com os atributos padrão e
 * remonta o provedor, sem recarregar o documento: o script de inicialização
 * não roda de novo. Estes testes simulam exatamente isso — desmontar,
 * `freshHtml()`, montar — e cada um começa com o módulo recém-carregado, que
 * é o que uma carga de documento faz com a memória do provedor.
 */

type Provider = typeof import("./theme-provider");
let mod: Provider;
let api: ThemeApi;
let root: Root | null = null;
let container: HTMLDivElement;
/** O que estava no <html> quando a fase de layout terminou, a cada commit. */
let beforePaint: string[] = [];

const html = document.documentElement;
const look = () => `${html.getAttribute("data-theme")}/${html.getAttribute("data-font")}`;

/** O <html> que o layout raiz entrega: sempre `soft` e `caskaydia`. */
function freshHtml() {
  html.setAttribute("data-theme", "soft");
  html.setAttribute("data-font", "caskaydia");
}

function Grab() {
  api = mod.useTheme();
  return null;
}

/**
 * Irmão depois do provedor: o efeito de layout dele roda depois do efeito de
 * layout do provedor e antes da pintura. O que ele vê é o que a tela pinta.
 */
function Probe() {
  useLayoutEffect(() => {
    beforePaint.push(look());
  });
  return null;
}

function mount() {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root!.render(
      <>
        <mod.ThemeProvider>
          <Grab />
        </mod.ThemeProvider>
        <Probe />
      </>,
    );
  });
}

function unmount() {
  act(() => root?.unmount());
  root = null;
  container.remove();
}

/** A troca de idioma: o <html> volta ao padrão e o provedor remonta. */
function switchLanguage() {
  unmount();
  freshHtml();
  beforePaint = [];
  mount();
}

const BLOCKED: PropertyDescriptor = {
  configurable: true,
  get() {
    throw new DOMException("denied", "SecurityError");
  },
};
const ownStorage = Object.getOwnPropertyDescriptor(window, "localStorage");

function blockStorage() {
  Object.defineProperty(window, "localStorage", BLOCKED);
}

function restoreStorage() {
  if (ownStorage) Object.defineProperty(window, "localStorage", ownStorage);
  else delete (window as { localStorage?: Storage }).localStorage;
}

beforeEach(async () => {
  vi.resetModules();
  mod = await import("./theme-provider");
  localStorage.clear();
  freshHtml();
  beforePaint = [];
});

afterEach(() => {
  if (root) unmount();
  restoreStorage();
  vi.restoreAllMocks();
});

describe("ThemeProvider: a escolha sobrevive à remontagem", () => {
  it("a escolha em memória volta antes da pintura e vence o armazenamento", () => {
    mount();
    act(() => api.setTheme("classic"));
    act(() => api.setFont("daddytime"));
    // Outra aba gravou o padrão; quem manda neste documento é a escolha feita nele.
    localStorage.setItem("maarkn-theme", "soft");
    localStorage.setItem("maarkn-font", "caskaydia");

    switchLanguage();

    expect(beforePaint[0]).toBe("classic/daddytime");
    expect(beforePaint).not.toContain("soft/caskaydia");
    expect(api.theme).toBe("classic");
    expect(api.font).toBe("daddytime");
  });

  it("sem escolha em memória, o armazenamento volta antes da pintura", () => {
    localStorage.setItem("maarkn-theme", "classic");
    localStorage.setItem("maarkn-font", "daddytime");

    mount();

    expect(beforePaint[0]).toBe("classic/daddytime");
    expect([api.theme, api.font]).toEqual(["classic", "daddytime"]);
    expect(localStorage.getItem("maarkn-theme")).toBe("classic");
    expect(localStorage.getItem("maarkn-font")).toBe("daddytime");
  });

  it("valor inválido no armazenamento cai no atributo e não é reescrito", () => {
    localStorage.setItem("maarkn-theme", "neon");
    localStorage.setItem("maarkn-font", "comic");
    html.setAttribute("data-theme", "classic");
    html.setAttribute("data-font", "daddytime");

    mount();

    expect(beforePaint[0]).toBe("classic/daddytime");
    expect([api.theme, api.font]).toEqual(["classic", "daddytime"]);
    expect(localStorage.getItem("maarkn-theme")).toBe("neon");
    expect(localStorage.getItem("maarkn-font")).toBe("comic");
  });

  it("valor inválido no armazenamento e no atributo dá o padrão", () => {
    localStorage.setItem("maarkn-theme", "neon");
    html.setAttribute("data-theme", "neon");
    html.setAttribute("data-font", "comic");

    mount();

    expect(beforePaint[0]).toBe("soft/caskaydia");
    expect([api.theme, api.font]).toEqual(["soft", "caskaydia"]);
  });

  it("com o armazenamento bloqueado, a memória segura a escolha sem erro", () => {
    const errors = vi.spyOn(console, "error");
    blockStorage();
    mount();
    expect([api.theme, api.font]).toEqual(["soft", "caskaydia"]);

    act(() => api.toggleTheme());
    act(() => api.toggleFont());
    expect(look()).toBe("classic/daddytime");

    switchLanguage();

    expect(beforePaint[0]).toBe("classic/daddytime");
    expect([api.theme, api.font]).toEqual(["classic", "daddytime"]);
    expect(errors).not.toHaveBeenCalled();
  });
});

describe("ThemeProvider: só a troca do visitante grava", () => {
  it("montar e remontar não escrevem no armazenamento", () => {
    const writes = vi.spyOn(Storage.prototype, "setItem");

    mount();
    switchLanguage();
    localStorage.setItem("maarkn-theme", "classic");
    writes.mockClear();
    switchLanguage();

    expect(writes).not.toHaveBeenCalled();
    expect(api.theme).toBe("classic");
  });

  it("a troca do visitante grava só a preferência trocada", () => {
    mount();
    const writes = vi.spyOn(Storage.prototype, "setItem");

    act(() => api.toggleTheme());
    expect(writes.mock.calls).toEqual([["maarkn-theme", "classic"]]);

    act(() => api.setFont("daddytime"));
    expect(writes.mock.calls).toEqual([
      ["maarkn-theme", "classic"],
      ["maarkn-font", "daddytime"],
    ]);

    writes.mockClear();
    switchLanguage();
    expect(writes).not.toHaveBeenCalled();
    expect(localStorage.getItem("maarkn-theme")).toBe("classic");
    expect(localStorage.getItem("maarkn-font")).toBe("daddytime");
  });
});
