// @vitest-environment jsdom
/**
 * `[esc]` só pode ser escrito na tela enquanto for verdade. Estes testes
 * amarram o rótulo ao comportamento: a tecla fecha, o botão fecha, e nos dois
 * caminhos o foco volta ao gatilho.
 *
 * A régua do título é pseudo-elemento em CSS — o jsdom não computa `content`
 * de `::before`/`::after`, então o que dá para travar aqui é que a regra
 * existe, cobre os três primitives e declara alt-text vazio. A medição do
 * nome acessível como o navegador o calcula está em
 * `scripts/a11y-dialog-accname.mjs` (Chrome headless por CDP).
 */
import { readFileSync } from "node:fs";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "./sheet";

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

/** O `FocusScope` do Radix devolve o foco num `setTimeout(…, 0)`. */
async function flushFocusRestore() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

const escButton = () =>
  Array.from(document.querySelectorAll<HTMLButtonElement>("button")).find(
    (b) => b.textContent === "[esc]",
  );

function openFrom(triggerSelector: string) {
  const trigger = container.querySelector<HTMLButtonElement>(triggerSelector)!;
  act(() => {
    trigger.focus();
    trigger.click();
  });
  return trigger;
}

function pressEscape() {
  act(() => {
    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
    );
  });
}

const DialogCase = (
  <Dialog>
    <DialogTrigger>abrir</DialogTrigger>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>editar candidatura</DialogTitle>
        <DialogDescription>corpo</DialogDescription>
      </DialogHeader>
    </DialogContent>
  </Dialog>
);

const SheetCase = (
  <Sheet>
    <SheetTrigger>abrir</SheetTrigger>
    <SheetContent>
      <SheetHeader>
        <SheetTitle>acme</SheetTitle>
        <SheetDescription>corpo</SheetDescription>
      </SheetHeader>
    </SheetContent>
  </Sheet>
);

describe.each([
  ["Dialog", DialogCase, '[data-slot="dialog-trigger"]', '[data-slot="dialog-content"]'],
  ["Sheet", SheetCase, '[data-slot="sheet-trigger"]', '[data-slot="sheet-content"]'],
])("%s", (_name, element, triggerSelector, contentSelector) => {
  const content = () => document.querySelector(contentSelector);

  it("fecha com Esc e devolve o foco ao gatilho", async () => {
    act(() => root.render(element));
    const trigger = openFrom(triggerSelector);
    expect(content()).not.toBeNull();

    pressEscape();

    expect(content()).toBeNull();
    await flushFocusRestore();
    expect(document.activeElement).toBe(trigger);
  });

  it("o botão de fechar é `[esc]`, e fecha de verdade", async () => {
    act(() => root.render(element));
    const trigger = openFrom(triggerSelector);

    const esc = escButton();
    expect(esc).toBeDefined();
    expect(esc!.getAttribute("aria-label")).toBe("fechar [esc]");

    act(() => esc!.click());

    expect(content()).toBeNull();
    await flushFocusRestore();
    expect(document.activeElement).toBe(trigger);
  });
});

describe("régua do título", () => {
  const css = readFileSync("src/app/admin/admin.css", "utf8");

  it.each([
    "dialog-title",
    "alert-dialog-title",
    "sheet-title",
  ])("cobre %s", (slot) => {
    expect(css).toContain(`[data-slot="${slot}"]`);
  });

  it("desenha a régua com U+2500 em ::before e ::after", () => {
    expect(css).toContain('content: "──"');
    expect(css).toMatch(/content: "─{16,}"/);
    expect(css).toContain("::before");
    expect(css).toContain("::after");
  });

  /**
   * O título do diálogo É o nome acessível dele (o Radix aponta o
   * `aria-labelledby` do conteúdo para cá). Conteúdo gerado entra nesse nome —
   * então toda régua PRECISA declarar alt-text vazio, `content: "…" / ""`, ou
   * o nome do diálogo vira `── excluir candidatura ──────…`.
   *
   * Isto é uma checagem de fonte: o jsdom não computa `content`. A prova em
   * navegador está em `scripts/a11y-dialog-accname.mjs`.
   */
  it("nenhuma régua vaza para o nome acessível: todo content tem alt-text vazio", () => {
    const declarations = css.match(/content:[^;]+;/g) ?? [];
    expect(declarations.length).toBeGreaterThan(0);
    for (const declaration of declarations) {
      expect(declaration, `content sem alt-text: ${declaration}`).toMatch(
        /\/\s*""\s*;$/,
      );
    }
  });
});
