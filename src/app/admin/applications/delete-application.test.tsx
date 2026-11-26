// @vitest-environment jsdom
/**
 * Two applications at the same company (one per market) have the same name,
 * and the name is what is typed to delete one: the window says which of them
 * it is, in what it reads with it (its description), and deletes that one.
 */
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ActionResult } from "@/app/_actions/action-result";
import { ADMIN_WORDS, WithAdminWords } from "@/components/admin/test-labels";

vi.mock("sonner", () => ({ toast: { custom: vi.fn(), dismiss: vi.fn() } }));
const deleteApplication = vi.fn<(id: string, typed?: string) => Promise<ActionResult>>();
vi.mock("@/app/_actions/applications", () => ({
  deleteApplication: (id: string, typed?: string) => deleteApplication(id, typed),
}));

const { DeleteApplication } = await import("./delete-application");

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root;
let container: HTMLDivElement;

beforeEach(() => {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  deleteApplication.mockReset();
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

function open(locale: "pt-BR" | "en", place: string | null) {
  act(() =>
    root.render(
      <WithAdminWords locale={locale}>
        <DeleteApplication
          id="app-ca"
          company="Acme"
          folderName="acme--backend-engineer-ca"
          role="Backend Engineer"
          place={place}
          words={ADMIN_WORDS[locale].applications.delete}
        />
      </WithAdminWords>,
    ),
  );
  act(() => container.querySelector("button")!.click());
  const dialog = document.querySelector<HTMLElement>('[role="alertdialog"]')!;
  const description = document.getElementById(dialog.getAttribute("aria-describedby")!)!;
  return { dialog, description: description.textContent!.replace(/\s+/g, " ") };
}

describe("DeleteApplication", () => {
  it("says which application it is, with the job, the place and the folder", () => {
    const { dialog, description } = open("pt-BR", "Canadá · Toronto");
    expect(dialog.textContent).toContain("Excluir a candidatura Acme?");
    expect(description).toContain("Backend Engineer · Canadá · Toronto");
    expect(description).toContain("Pasta no vault: acme--backend-engineer-ca.");
  });

  it("in English, and without a place", () => {
    const { description } = open("en", null);
    expect(description).toContain("Backend Engineer");
    expect(description).not.toContain(" · ");
    expect(description).toContain("Vault folder: acme--backend-engineer-ca.");
  });

  it("deletes the application of the row, by its id", async () => {
    deleteApplication.mockResolvedValue({ ok: true, message: "ok" });
    const { dialog } = open("pt-BR", null);
    const field = dialog.querySelector<HTMLInputElement>("input")!;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
    act(() => {
      setter.call(field, "Acme");
      field.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await act(async () => document.querySelector<HTMLButtonElement>('[data-slot="alert-dialog-action"]')!.click());
    expect(deleteApplication).toHaveBeenCalledWith("app-ca", "Acme");
  });
});
