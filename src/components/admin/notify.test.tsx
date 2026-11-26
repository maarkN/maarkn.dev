// @vitest-environment jsdom
/**
 * The result of an action is a notice (spec admin-forms, "Avisos"): it lands in
 * the one live region of the backoffice and is read once; it is solid, with its
 * button to dismiss it; it leaves on its own; and it says the language of its
 * words, which is the screen's.
 */
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { toast } from "sonner";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Toaster } from "@/components/ui/sonner";
import { Untranslated } from "./admin-locale";
import { useNotify, type Notify } from "./notify";
import { WithAdminWords } from "./test-labels";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root;
let container: HTMLDivElement;

beforeEach(() => {
  window.matchMedia = vi.fn(() => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} })) as never;
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(async () => {
  // Sonner keeps its notices in a module: one test's must not reach the next.
  await act(async () => {
    toast.dismiss();
    await new Promise((resolve) => setTimeout(resolve, 300));
  });
  act(() => root.unmount());
  container.remove();
  vi.restoreAllMocks();
});

let notify: Notify;
function Caller() {
  notify = useNotify();
  return null;
}

async function mount(untranslated = false) {
  await act(async () =>
    root.render(
      <WithAdminWords locale="en">
        <Toaster containerAriaLabel="Notices" />
        {untranslated ? (
          <Untranslated>
            <Caller />
          </Untranslated>
        ) : (
          <Caller />
        )}
      </WithAdminWords>,
    ),
  );
}

const settle = () => act(async () => new Promise((resolve) => setTimeout(resolve, 30)));
const region = () => document.querySelector<HTMLElement>("section[aria-live]")!;

describe("a notice", () => {
  it("lands in the one live region, and nothing inside it is a second one", async () => {
    await mount();
    act(() => notify.success("Project saved."));
    await settle();
    expect(document.querySelectorAll("section[aria-live]")).toHaveLength(1);
    expect(region().getAttribute("aria-live")).toBe("polite");
    expect(region().textContent).toContain("Project saved.");
    // A role inside the region would have it read twice.
    expect(region().querySelector("[role=status], [role=alert], [aria-live]")).toBeNull();
  });

  it("can be dismissed by its button, named in the language of the screen", async () => {
    await mount();
    act(() => notify.error("The project could not be saved."));
    await settle();
    const dismiss = region().querySelector<HTMLButtonElement>('button[aria-label="Dismiss the notice"]')!;
    expect(dismiss).not.toBeNull();
    await act(async () => dismiss.click());
    await act(async () => new Promise((resolve) => setTimeout(resolve, 500)));
    const left = [...region().querySelectorAll("[data-sonner-toast]")].filter(
      (li) => li.textContent?.includes("The project could not be saved.") && li.getAttribute("data-removed") !== "true",
    );
    expect(left).toHaveLength(0);
  });

  it("leaves on its own", async () => {
    const custom = vi.spyOn(toast, "custom");
    await mount();
    act(() => notify.success("Saved."));
    const duration = (custom.mock.calls[0][1] as { duration: number }).duration;
    expect(duration).toBeGreaterThan(3000);
    expect(Number.isFinite(duration)).toBe(true);
  });

  it("offers the next step, and takes it once", async () => {
    const retry = vi.fn();
    await mount();
    act(() => notify.error("It failed.", { action: { label: "Try again", onClick: retry } }));
    await settle();
    const button = [...region().querySelectorAll("button")].find((b) => b.textContent === "Try again")!;
    await act(async () => button.click());
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it("says the language of the screen that called it", async () => {
    await mount(true);
    act(() => notify.success("Projeto salvo."));
    await settle();
    const notice = [...region().querySelectorAll("[lang]")].find((el) => el.textContent?.includes("Projeto salvo."));
    expect(notice?.getAttribute("lang")).toBe("pt-BR");
    expect(notice?.querySelector('button[aria-label="Dispensar o aviso"]')).not.toBeNull();
  });
});
