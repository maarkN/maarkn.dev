// @vitest-environment jsdom
/**
 * The largest form of the backoffice is where "clear fields" (spec admin-forms)
 * has to hold, in both languages:
 *
 * - every field has a visible label, which is its accessible name: an `id`,
 *   exactly one `<label for>`, and no `aria-label` competing with it;
 * - "required" is written in words, inside the label, never a lone `*`;
 * - help and error are tied to the field by `aria-describedby`;
 * - a refusal keeps what was typed, puts the focus on the first field with a
 *   problem, and its error says how to fix it.
 */
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AppActionState } from "@/app/_actions/applications";
import { ADMIN_WORDS, WithAdminWords } from "./test-labels";

const createApplication = vi.fn<(prev: AppActionState, data: FormData) => Promise<AppActionState>>();
vi.mock("@/app/_actions/applications", () => ({
  createApplication: (prev: AppActionState, data: FormData) => createApplication(prev, data),
  updateApplication: vi.fn(),
}));
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode } & Record<string, unknown>) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

const { ApplicationForm } = await import("./application-form");

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root;
let container: HTMLDivElement;

beforeEach(() => {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  createApplication.mockReset();
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

function render(locale: "pt-BR" | "en" = "pt-BR") {
  const words = ADMIN_WORDS[locale];
  act(() =>
    root.render(
      <WithAdminWords locale={locale}>
        <ApplicationForm words={{ form: words.applicationForm, vocab: words.vocab }} />
      </WithAdminWords>,
    ),
  );
}

/** Every control of the form: inputs, textareas and the Radix triggers. */
const controls = () =>
  [...container.querySelectorAll<HTMLElement>('input:not([type="hidden"]), textarea, [data-slot="select-trigger"]')].filter(
    (el) => !el.closest("[aria-hidden='true']"),
  );
const text = (el: Element | null) => (el?.textContent ?? "").replace(/\s+/g, " ").trim();
const field = (name: string) => container.querySelector<HTMLInputElement>(`[name="${name}"]`)!;

function type(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
  act(() => {
    setter.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

describe.each(["pt-BR", "en"] as const)("ApplicationForm in %s: the name of each field", (locale) => {
  const words = ADMIN_WORDS[locale].applicationForm;

  it("is its one visible label", () => {
    render(locale);
    const found = controls();
    expect(found.length).toBeGreaterThan(10);
    for (const el of found) {
      expect(el.id, el.outerHTML.slice(0, 80)).toBeTruthy();
      expect(container.querySelectorAll(`label[for="${el.id}"]`), `#${el.id}`).toHaveLength(1);
      expect(el.getAttribute("aria-label"), `#${el.id}`).toBeNull();
      expect(el.getAttribute("aria-labelledby"), `#${el.id}`).toBeNull();
    }
    expect(text(container.querySelector('label[for="company"]'))).toContain(words.fields.company);
  });

  it("says in words that it is required, inside the label", () => {
    render(locale);
    const required = controls().filter((el) => el.hasAttribute("required"));
    expect(required.length).toBeGreaterThan(0);
    for (const el of required) {
      expect(text(container.querySelector(`label[for="${el.id}"]`))).toContain(`(${ADMIN_WORDS[locale].common.required})`);
    }
    for (const label of container.querySelectorAll("label")) expect(text(label)).not.toContain("*");
  });

  it("is described by its help", () => {
    render(locale);
    const helps = [...container.querySelectorAll<HTMLElement>("p[id$='-help']")];
    expect(helps.length).toBeGreaterThan(3);
    for (const help of helps) {
      expect(container.querySelector(`[aria-describedby~="${help.id}"]`), `#${help.id}`).not.toBeNull();
    }
  });

  it("names its buttons by what they do", () => {
    render(locale);
    const buttons = [...container.querySelectorAll('[data-slot="button"]')].map(text);
    expect(buttons).toContain(words.create);
    expect(buttons).toContain(words.cancel);
  });
});

describe("ApplicationForm, refused", () => {
  it("keeps what was typed, ties each error to its field and focuses the first one", async () => {
    createApplication.mockResolvedValue({
      status: "error",
      errors: { company: "too long", priority: "too big" },
    });
    render();
    type(field("company"), "Acme Corporation");
    type(field("roleTitle"), "Staff Engineer");
    type(field("priority"), "999");
    type(field("followUp"), "cobrar na sexta");

    await act(async () => {
      container.querySelector("form")!.requestSubmit();
    });

    const errors = ADMIN_WORDS["pt-BR"].applicationForm.errors;
    // What was typed is still there.
    expect(field("company").value).toBe("Acme Corporation");
    expect(field("roleTitle").value).toBe("Staff Engineer");
    expect(field("priority").value).toBe("999");
    expect(field("followUp").value).toBe("cobrar na sexta");
    // Each error is next to its field, says how to fix it and is announced.
    for (const [name, sentence] of [
      ["company", errors.company],
      ["priority", errors.priority],
    ] as const) {
      const error = document.getElementById(`${name}-error`)!;
      expect(error.textContent).toBe(sentence);
      expect(error.getAttribute("role")).toBe("alert");
      expect(field(name).getAttribute("aria-invalid")).toBe("true");
      expect(field(name).getAttribute("aria-describedby")).toContain(`${name}-error`);
    }
    // The focus is on the first field with a problem, in the order of the screen.
    expect(document.activeElement).toBe(field("company"));
  });

  it("says a failure of the server without its details, and offers to try again", async () => {
    createApplication.mockResolvedValue({ status: "error", errors: {}, message: "unexpected" });
    render();
    type(field("company"), "Acme");
    await act(async () => {
      container.querySelector("form")!.requestSubmit();
    });
    const words = ADMIN_WORDS["pt-BR"];
    expect(container.textContent).toContain(words.applicationForm.failed);
    expect(container.textContent).not.toContain("unexpected");
    const retry = [...container.querySelectorAll("button")].find((b) => text(b) === words.common.retry);
    expect(retry?.getAttribute("type")).toBe("submit");
    expect(field("company").value).toBe("Acme");
  });
});
