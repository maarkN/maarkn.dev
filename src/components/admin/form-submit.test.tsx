// @vitest-environment jsdom
/**
 * A rede embaixo de `form-submit.ts`.
 *
 * O defeito que estes testes travam foi encontrado por
 * `scripts/smoke-admin-write.mjs` dirigindo o admin de verdade: ao errar o
 * e-mail de um contato, a tela mostrava `stderr: E-mail inválido.` **e
 * apagava todos os campos** — porque o React 19 reseta o formulário quando a
 * função passada ao `action=` termina. Com o campo obrigatório zerado, o
 * segundo `[ salvar ]` nem submetia: a validação nativa barrava, sem toast e
 * sem explicação.
 *
 * Três camadas:
 *   1. o CONTROLE NEGATIVO — um `<form action={fn}>` cru, para provar aqui
 *      dentro que o reset é do React e não invenção do relatório. Se um dia o
 *      React parar de resetar, este teste cai e diz que o helper virou
 *      supérfluo;
 *   2. o helper entrega o mesmo `FormData` e NÃO reseta;
 *   3. o diálogo de contato de verdade: erro do servidor mantém o que foi
 *      digitado.
 */
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ActionResult } from "@/app/_actions/action-result";

const saveContact =
  vi.fn<(id: string | null, data: FormData) => Promise<ActionResult<{ id: string }>>>();
vi.mock("@/app/_actions/contacts", () => ({
  saveContact: (id: string | null, data: FormData) => saveContact(id, data),
}));
vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const { submitKeepingValues } = await import("./form-submit");
const { ContactDialog } = await import("@/app/admin/contacts/contact-dialog");

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root;
let container: HTMLDivElement;

beforeEach(() => {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  saveContact.mockReset();
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

/** Escreve como o usuário escreve: valor + evento que o React escuta. */
function type(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    "value",
  )!.set!;
  act(() => {
    setter.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

async function submit(form: HTMLFormElement) {
  await act(async () => {
    form.requestSubmit();
    await Promise.resolve();
  });
}

describe("o reset automático do React 19", () => {
  it("CONTROLE NEGATIVO: `action={fn}` esvazia o formulário depois da ação", async () => {
    const seen: string[] = [];
    function Cru() {
      return (
        <form action={(data: FormData) => void seen.push(String(data.get("nome")))}>
          <input name="nome" defaultValue="" />
        </form>
      );
    }
    act(() => root.render(<Cru />));
    const input = container.querySelector("input")!;
    type(input, "Maria");
    await submit(container.querySelector("form")!);

    expect(seen).toEqual(["Maria"]); // a ação recebeu o valor…
    expect(input.value).toBe(""); // …e o React limpou o campo em seguida
  });

  it("`submitKeepingValues` entrega o mesmo FormData e NÃO esvazia", async () => {
    const seen: string[] = [];
    function Preservado() {
      return (
        <form
          onSubmit={(event) =>
            submitKeepingValues(event, (data) => void seen.push(String(data.get("nome"))))
          }
        >
          <input name="nome" defaultValue="" />
        </form>
      );
    }
    act(() => root.render(<Preservado />));
    const input = container.querySelector("input")!;
    type(input, "Maria");
    await submit(container.querySelector("form")!);

    expect(seen).toEqual(["Maria"]);
    expect(input.value).toBe("Maria");
  });
});

describe("ContactDialog — o erro do servidor não apaga o que foi digitado", () => {
  it("mantém nome e e-mail depois de um `ok: false`", async () => {
    saveContact.mockResolvedValue({
      ok: false,
      message: "Confira os campos destacados.",
      fieldErrors: { email: "E-mail inválido." },
    });

    act(() => root.render(<ContactDialog />));
    act(() => {
      container.querySelector<HTMLButtonElement>('[data-slot="dialog-trigger"]')!.click();
    });

    const name = document.querySelector<HTMLInputElement>("#contact-name")!;
    const email = document.querySelector<HTMLInputElement>("#contact-email")!;
    type(name, "Joana Recrutadora");
    type(email, "isto-nao-e-email");
    await submit(name.form!);

    expect(saveContact).toHaveBeenCalledTimes(1);
    const sent = saveContact.mock.calls[0][1];
    expect(sent.get("name")).toBe("Joana Recrutadora");

    // O que o smoke pegou: sem a correção, os dois voltavam vazios — e o
    // `required` do nome zerado impedia até de tentar de novo.
    expect(name.value).toBe("Joana Recrutadora");
    expect(email.value).toBe("isto-nao-e-email");
    expect(document.querySelector("#contact-email-error")?.textContent).toContain(
      "E-mail inválido.",
    );
    expect(document.querySelector('[data-slot="dialog-content"]')).not.toBeNull();
  });
});
