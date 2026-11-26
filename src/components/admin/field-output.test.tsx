// @vitest-environment jsdom
/**
 * What surrounds a field (spec admin-forms, "Campos claros" and "Erro que
 * orienta"): the error is an alert tied to its field and read without its
 * icon; the help is plain text; "required" is written in words, in the
 * language of the screen, and is part of the field's name.
 */
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { FieldError, FieldHelp, RequiredHint, describedBy } from "./field-output";
import { Untranslated } from "./admin-locale";
import { WithAdminWords } from "./test-labels";

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
  it("shows the sentence alone, with no terminal prefix, and reads it", () => {
    act(() =>
      root.render(<FieldError id="email-error">Escreva um e-mail completo.</FieldError>),
    );
    const alert = container.querySelector("#email-error")!;

    expect(alert.textContent).toBe("Escreva um e-mail completo.");
    expect(announcedText(alert)).toBe("Escreva um e-mail completo.");
  });

  it("é um alerta e fica endereçável por aria-describedby", () => {
    act(() =>
      root.render(<FieldError id="email-error">E-mail inválido.</FieldError>),
    );
    const alert = container.querySelector("#email-error")!;

    expect(alert.getAttribute("role")).toBe("alert");
    expect(alert.id).toBe("email-error");
  });

  it("hides only its icon, which carries the colour of an error", () => {
    act(() => root.render(<FieldError>Valor inválido.</FieldError>));
    const hidden = container.querySelectorAll('[aria-hidden="true"]');

    expect(hidden).toHaveLength(1);
    expect(hidden[0].tagName.toLowerCase()).toBe("svg");
    expect(hidden[0].getAttribute("class")).toContain("text-destructive");
  });

  it("não renderiza nada sem mensagem", () => {
    act(() => root.render(<FieldError id="x">{undefined}</FieldError>));
    expect(container.querySelector("#x")).toBeNull();
    expect(container.textContent).toBe("");
  });
});

describe("FieldHelp", () => {
  it("is plain text, read as it is written", () => {
    act(() =>
      root.render(<FieldHelp id="slug-help">Minúsculas e hifens.</FieldHelp>),
    );
    const help = container.querySelector("#slug-help")!;

    expect(help.textContent).toBe("Minúsculas e hifens.");
    expect(announcedText(help)).toBe("Minúsculas e hifens.");
    expect(help.getAttribute("role")).toBeNull();
  });
});

describe("RequiredHint", () => {
  it("writes it in words, without a lone asterisk, in the language of the screen", () => {
    act(() =>
      root.render(
        <WithAdminWords locale="en">
          <RequiredHint />
        </WithAdminWords>,
      ),
    );
    expect(container.textContent).toBe("(required)");
    expect(container.textContent).not.toContain("*");
    // Read with the label: the field's name stays what is seen.
    expect(container.querySelector('[aria-hidden="true"]')).toBeNull();
  });

  it("says it in Portuguese on a screen that was not translated yet", () => {
    act(() =>
      root.render(
        <WithAdminWords locale="en">
          <Untranslated>
            <RequiredHint />
          </Untranslated>
        </WithAdminWords>,
      ),
    );
    expect(container.textContent).toBe("(obrigatório)");
  });
});

describe("describedBy", () => {
  it("junta os ids presentes e omite o atributo quando não há nenhum", () => {
    expect(describedBy("a-help", "a-error")).toBe("a-help a-error");
    expect(describedBy("a-help", false)).toBe("a-help");
    expect(describedBy(undefined, false, null)).toBeUndefined();
  });
});
