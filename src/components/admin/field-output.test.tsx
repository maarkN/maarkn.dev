// @vitest-environment jsdom
/**
 * O que estes testes travam é a promessa do design.md da bko-04: o sotaque de
 * terminal é DECORATIVO. Se alguém tirar o `aria-hidden` do `stderr:` — ou o
 * `role="alert"` do container — o leitor de tela passa a anunciar
 * "stderr dois pontos e-mail inválido", e é isso que aqui quebra.
 */
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { FieldError, FieldHelp, RequiredHint, describedBy } from "./field-output";

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

/**
 * Aproximação do texto que uma tecnologia assistiva computa: o conteúdo
 * textual menos tudo que está marcado como `aria-hidden`.
 */
function announcedText(el: Element): string {
  let out = "";
  for (const node of Array.from(el.childNodes)) {
    if (node.nodeType === Node.TEXT_NODE) {
      out += node.textContent ?? "";
      continue;
    }
    if (node instanceof Element) {
      if (node.getAttribute("aria-hidden") === "true") continue;
      out += announcedText(node);
    }
  }
  return out.replace(/\s+/g, " ").trim();
}

describe("FieldError", () => {
  it("mostra `stderr:` na tela e anuncia só a mensagem", () => {
    act(() =>
      root.render(<FieldError id="email-error">E-mail inválido.</FieldError>),
    );
    const alert = container.querySelector("#email-error")!;

    expect(alert.textContent).toBe("stderr: E-mail inválido.");
    expect(announcedText(alert)).toBe("E-mail inválido.");
  });

  it("é um alerta e fica endereçável por aria-describedby", () => {
    act(() =>
      root.render(<FieldError id="email-error">E-mail inválido.</FieldError>),
    );
    const alert = container.querySelector("#email-error")!;

    expect(alert.getAttribute("role")).toBe("alert");
    expect(alert.id).toBe("email-error");
  });

  it("o prefixo é aria-hidden, não o texto", () => {
    act(() => root.render(<FieldError>Valor inválido.</FieldError>));
    const hidden = container.querySelectorAll('[aria-hidden="true"]');

    expect(hidden).toHaveLength(1);
    expect(hidden[0].textContent).toBe("stderr: ");
  });

  it("não renderiza nada sem mensagem", () => {
    act(() => root.render(<FieldError id="x">{undefined}</FieldError>));
    expect(container.querySelector("#x")).toBeNull();
    expect(container.textContent).toBe("");
  });
});

describe("FieldHelp", () => {
  it("escreve a ajuda como comentário e esconde o `#` do leitor", () => {
    act(() =>
      root.render(<FieldHelp id="slug-help">Minúsculas e hifens.</FieldHelp>),
    );
    const help = container.querySelector("#slug-help")!;

    expect(help.textContent).toBe("# Minúsculas e hifens.");
    expect(announcedText(help)).toBe("Minúsculas e hifens.");
    expect(help.getAttribute("role")).toBeNull();
  });
});

describe("RequiredHint", () => {
  it("escreve a obrigatoriedade por extenso, sem asterisco solto", () => {
    act(() => root.render(<RequiredHint />));
    expect(container.textContent).toBe("(obrigatório)");
    expect(container.textContent).not.toContain("*");
    // Visível ao leitor: o texto entra no nome acessível do campo junto com
    // o rótulo, então o nome acessível continua igual ao rótulo visível.
    expect(container.querySelector('[aria-hidden="true"]')).toBeNull();
  });
});

describe("describedBy", () => {
  it("junta os ids presentes e omite o atributo quando não há nenhum", () => {
    expect(describedBy("a-help", "a-error")).toBe("a-help a-error");
    expect(describedBy("a-help", false)).toBe("a-help");
    expect(describedBy(undefined, false, null)).toBeUndefined();
  });
});
