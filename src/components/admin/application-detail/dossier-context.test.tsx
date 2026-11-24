// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DossierContext, type DossierContextProps } from "./dossier-context";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root;
let container: HTMLDivElement;

beforeEach(() => {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

/** Section title -> what it shows. */
function render(props: DossierContextProps): Record<string, string> {
  act(() => root.render(<DossierContext {...props} />));
  return Object.fromEntries(
    [...container.querySelectorAll("section")].map((section) => [
      section.querySelector("h2")?.textContent,
      section.querySelector("p")?.textContent,
    ]),
  );
}

describe("contexto do dossiê", () => {
  it("mostra os três textos, cada um na sua seção", () => {
    expect(
      render({
        company: { name: "Acme", aboutMd: "Faz foguetes." },
        projectInfoMd: "Time de propulsão.",
        job: { descriptionMd: "Procuramos alguém." },
      }),
    ).toEqual({
      "Sobre a empresa": "Faz foguetes.",
      "Contexto do projeto": "Time de propulsão.",
      "Descrição da vaga": "Procuramos alguém.",
    });
  });

  it.each([null, "", "  \n "])("sem texto (%j), a seção fica e diz que não há", (empty) => {
    expect(
      render({
        company: { name: "Acme", aboutMd: empty },
        projectInfoMd: empty,
        job: { descriptionMd: empty },
      }),
    ).toEqual({
      "Sobre a empresa": "Ainda não há informação sobre a empresa.",
      "Contexto do projeto": "Ainda não há informação sobre o projeto.",
      "Descrição da vaga": "A vaga ligada não tem descrição.",
    });
  });

  it("sem empresa e sem vaga, diz que não há ligação, sem erro", () => {
    expect(render({ company: null, projectInfoMd: null, job: null })).toEqual({
      "Sobre a empresa": "Não há empresa ligada a esta candidatura.",
      "Contexto do projeto": "Ainda não há informação sobre o projeto.",
      "Descrição da vaga": "Não há vaga ligada a esta candidatura.",
    });
  });

  it("o texto é texto: marcação não vira HTML", () => {
    render({
      company: { name: "Acme", aboutMd: "<img src=x onerror=alert(1)>" },
      projectInfoMd: null,
      job: null,
    });
    expect(container.querySelector("img")).toBeNull();
  });
});
