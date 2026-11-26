// @vitest-environment jsdom
/**
 * A window of the backoffice (hologram-ui, "Janela"): `Esc` and the close
 * button both close it and give the focus back to whoever opened it; the close
 * button is named in the language of the screen; the title is the window's
 * name, with nothing drawn into it.
 */
import { act, type ReactElement } from "react";
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
import { Untranslated } from "@/components/admin/admin-locale";
import { WithAdminWords } from "@/components/admin/test-labels";
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

const closeButton = (name: string) =>
  Array.from(document.querySelectorAll<HTMLButtonElement>("button")).find(
    (b) => b.getAttribute("aria-label") === name,
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

const inEnglish = (element: ReactElement) => <WithAdminWords locale="en">{element}</WithAdminWords>;

describe.each([
  ["Dialog", inEnglish(DialogCase), '[data-slot="dialog-trigger"]', '[data-slot="dialog-content"]'],
  ["Sheet", inEnglish(SheetCase), '[data-slot="sheet-trigger"]', '[data-slot="sheet-content"]'],
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

  it("has a close button named in the language of the screen, which closes", async () => {
    act(() => root.render(element));
    const trigger = openFrom(triggerSelector);

    const close = closeButton("Close");
    expect(close).toBeDefined();
    // An icon, and its name: nothing written in brackets.
    expect(close!.textContent).toBe("");

    act(() => close!.click());

    expect(content()).toBeNull();
    await flushFocusRestore();
    expect(document.activeElement).toBe(trigger);
  });

  it("names it in Portuguese on a screen not translated yet", () => {
    act(() =>
      root.render(
        <WithAdminWords locale="en">
          <Untranslated>{DialogCase}</Untranslated>
        </WithAdminWords>,
      ),
    );
    openFrom('[data-slot="dialog-trigger"]');
    expect(closeButton("Fechar")).toBeDefined();
  });

  it("takes its name from the title alone", () => {
    act(() => root.render(element));
    openFrom(triggerSelector);
    const labelledBy = content()!.getAttribute("aria-labelledby")!;
    const title = document.getElementById(labelledBy)!;
    expect(title.textContent).toBe(_name === "Dialog" ? "editar candidatura" : "acme");
  });
});
