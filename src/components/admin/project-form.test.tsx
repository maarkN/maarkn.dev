// @vitest-environment jsdom
/**
 * O formulário de projeto é o único do painel com um campo que monta o `Shell`
 * à mão: o upload de capa. Foi exatamente ali que a ajuda e o erro ficaram
 * órfãos — desenhados na tela, com `id`, e sem ninguém apontando para eles.
 *
 * Este arquivo é a rede embaixo da regra A9 (`um id que o campo referencia`)
 * no formulário inteiro, e não só no campo que já quebrou: qualquer `-help` ou
 * `-error` que apareça no DOM tem de estar dentro de algum `aria-describedby`.
 *
 * O teste irmão `application-form.test.tsx` faz o mesmo para o maior
 * formulário; a medição em navegador de verdade (borda vermelha, descrição
 * acessível sem `stderr:`) está registrada na tarefa 1.2 da change bko-04.
 */
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/app/_actions/admin-projects", () => ({
  saveProject: vi.fn(),
  deleteProject: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

/** O `Switch` do Radix mede o polegar; o jsdom não tem ResizeObserver. */
class NoopResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
(globalThis as { ResizeObserver?: unknown }).ResizeObserver ??= NoopResizeObserver;

const { ProjectForm } = await import("./project-form");

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root;
let container: HTMLDivElement;

beforeEach(() => {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  act(() => root.render(<ProjectForm />));
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

/** Todo id que algum `aria-describedby` do formulário cita. */
function describedIds(): Set<string> {
  const ids = new Set<string>();
  for (const el of container.querySelectorAll("[aria-describedby]")) {
    for (const id of (el.getAttribute("aria-describedby") ?? "").split(/\s+/)) {
      if (id) ids.add(id);
    }
  }
  return ids;
}

const file = () =>
  new File(["binário"], "capa.png", { type: "image/png" });

/** Escolhe um arquivo no campo de upload, com a resposta da API que se pedir. */
async function pick(respond: () => Promise<Response>) {
  vi.stubGlobal("fetch", vi.fn(respond));
  const input = container.querySelector<HTMLInputElement>("#coverImageFile")!;
  Object.defineProperty(input, "files", { value: [file()], configurable: true });
  await act(async () => {
    input.dispatchEvent(new Event("change", { bubbles: true }));
    await Promise.resolve();
  });
  return input;
}

describe("ProjectForm — nenhuma mensagem órfã", () => {
  it("toda ajuda desenhada está dentro de algum aria-describedby", () => {
    const helps = Array.from(container.querySelectorAll('[id$="-help"]'));
    expect(helps.length).toBeGreaterThan(3);
    const cited = describedIds();
    for (const help of helps) {
      expect(cited, `ajuda órfã: #${help.id}`).toContain(help.id);
    }
  });

  it("todo id citado por aria-describedby existe no DOM", () => {
    for (const id of describedIds()) {
      expect(
        container.querySelector(`#${CSS.escape(id)}`),
        `aria-describedby aponta para #${id}, que não existe`,
      ).not.toBeNull();
    }
  });
});

describe("ProjectForm — o upload de capa", () => {
  it("liga a ajuda ao campo antes de qualquer erro", () => {
    const input = container.querySelector<HTMLInputElement>("#coverImageFile")!;
    expect(input.getAttribute("aria-describedby")).toBe("coverImageFile-help");
    expect(input.getAttribute("aria-invalid")).toBe("false");
    expect(container.querySelector("#coverImageFile-help")?.textContent).toContain(
      "8 MB",
    );
  });

  it("anuncia o arquivo escolhido numa região viva que já existia", async () => {
    const live = container.querySelector('p[aria-live="polite"]')!;
    expect(live.textContent).toContain("(nenhum arquivo)");

    await pick(async () =>
      Response.json({ url: "/uploads/capa.png" }, { status: 200 }),
    );

    expect(live.textContent).toContain("capa.png");
    // O prefixo é sotaque, não informação: fica fora do que é anunciado.
    expect(live.querySelector('[aria-hidden="true"]')?.textContent).toBe("attach: ");
  });

  it("no erro, marca o campo e aponta o aria-describedby para a mensagem", async () => {
    const input = await pick(async () =>
      Response.json({ error: "file_too_large" }, { status: 400 }),
    );

    const error = container.querySelector("#coverImageFile-error");
    expect(error, "a linha de erro não foi desenhada").not.toBeNull();
    expect(error!.getAttribute("role")).toBe("alert");
    expect(error!.textContent).toContain("Arquivo maior que 8 MB.");

    // O que o blocker cobrava: a mensagem CONTINUA associada ao campo.
    expect(input.getAttribute("aria-describedby")).toBe(
      "coverImageFile-help coverImageFile-error",
    );
    expect(input.getAttribute("aria-invalid")).toBe("true");
  });
});
