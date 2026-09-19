// @vitest-environment jsdom
/**
 * O maior formulário do painel é onde a decisão "rótulo é TEXTO SIMPLES" tem
 * de valer. Este teste é a rede embaixo dela: se alguém transformar um campo
 * em flag (`--company-name`) com o nome de verdade escondido num `aria-label`,
 * ou puser de volta o `*` de obrigatório, ou escrever uma ajuda sem o `#`,
 * aqui quebra.
 *
 * O que se verifica é a regra do spec — **o nome acessível de cada campo é
 * igual ao seu rótulo visível** — no lugar onde ela é decidida: cada controle
 * tem `id`, exatamente um `<label for>`, e nenhum `aria-label`/
 * `aria-labelledby` competindo com ele.
 */
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/app/_actions/applications", () => ({
  createApplication: vi.fn(),
  updateApplication: vi.fn(),
}));

const { ApplicationForm } = await import("./application-form");

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root;
let container: HTMLDivElement;

beforeEach(() => {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  act(() => root.render(<ApplicationForm />));
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

/** Todo controle do formulário: inputs, textareas e os gatilhos do Radix. */
function controls(): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'input:not([type="hidden"]), textarea, [data-slot="select-trigger"]',
    ),
  );
}

const text = (el: Element | null) =>
  (el?.textContent ?? "").replace(/\s+/g, " ").trim();

describe("ApplicationForm — nome acessível", () => {
  it("todo controle visível tem id e um único <label for>", () => {
    const found = controls();
    expect(found.length).toBeGreaterThan(10);

    for (const el of found) {
      expect(el.id, `controle sem id: ${el.outerHTML.slice(0, 80)}`).toBeTruthy();
      const labels = container.querySelectorAll(`label[for="${el.id}"]`);
      expect(labels, `rótulo ausente ou duplicado para #${el.id}`).toHaveLength(1);
    }
  });

  it("nenhum controle esconde o nome num aria-label", () => {
    for (const el of controls()) {
      expect(el.getAttribute("aria-label"), `#${el.id}`).toBeNull();
      expect(el.getAttribute("aria-labelledby"), `#${el.id}`).toBeNull();
    }
  });

  it("o rótulo é texto simples, não uma flag de linha de comando", () => {
    const labels = Array.from(container.querySelectorAll("label"));
    expect(labels.length).toBeGreaterThan(10);
    for (const label of labels) {
      expect(text(label).startsWith("--")).toBe(false);
    }
  });
});

describe("ApplicationForm — obrigatoriedade e ajuda", () => {
  it("obrigatoriedade é escrita por extenso, nunca um asterisco", () => {
    const required = controls().filter((el) => el.hasAttribute("required"));
    expect(required.length).toBeGreaterThan(0);

    for (const el of required) {
      const label = container.querySelector(`label[for="${el.id}"]`)!;
      expect(text(label), `#${el.id}`).toContain("(obrigatório)");
    }
    // Nenhum rótulo do formulário carrega o asterisco solto de antes.
    for (const label of Array.from(container.querySelectorAll("label"))) {
      expect(text(label)).not.toContain("*");
    }
  });

  it("cada ajuda é um comentário, com o `#` escondido do leitor", () => {
    const helps = Array.from(container.querySelectorAll("p")).filter((p) =>
      p.textContent?.startsWith("# "),
    );
    expect(helps.length).toBeGreaterThan(3);

    for (const help of helps) {
      const hash = help.querySelector('[aria-hidden="true"]');
      expect(hash?.textContent).toBe("# ");
      expect(help.id, "ajuda sem id não pode ser referenciada").toBeTruthy();
    }
  });

  it("a ajuda de um campo está ligada a ele por aria-describedby", () => {
    const helps = Array.from(container.querySelectorAll("p")).filter(
      (p) => p.textContent?.startsWith("# ") && p.id,
    );
    for (const help of helps) {
      const owner = container.querySelector(
        `[aria-describedby~="${help.id}"]`,
      );
      expect(owner, `ajuda órfã: #${help.id}`).not.toBeNull();
    }
  });
});

describe("ApplicationForm — rodapé", () => {
  it("as duas ações têm o rótulo entre colchetes", () => {
    const labels = Array.from(
      container.querySelectorAll('[data-slot="button"]'),
    ).map(text);
    expect(labels).toContain("[ cancelar ]");
    expect(labels).toContain("[ criar candidatura ]");
  });
});
