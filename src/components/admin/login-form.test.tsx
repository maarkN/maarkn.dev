// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { LoginState } from "@/app/_actions/auth";
import en from "@/dictionaries/en.json";
import ptBR from "@/dictionaries/pt-BR.json";

const loginAction = vi.fn<(prev: LoginState, data: FormData) => Promise<LoginState>>();
vi.mock("@/app/_actions/auth", () => ({ loginAction: (p: LoginState, d: FormData) => loginAction(p, d) }));

const { LoginForm } = await import("./login-form");

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root;
let container: HTMLDivElement;

beforeEach(() => {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  loginAction.mockReset();
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

const field = (id: string) => container.querySelector<HTMLInputElement>(`#${id}`)!;
const labelOf = (id: string) =>
  container.querySelector<HTMLLabelElement>(`label[for="${id}"]`)?.textContent;
const LABELS = { en: en.admin.login, "pt-BR": ptBR.admin.login };
const render = (locale: keyof typeof LABELS = "pt-BR") =>
  act(() => root.render(<LoginForm labels={LABELS[locale]} />));

describe("LoginForm", () => {
  it("asks for the address and the password, in the language of the backoffice", () => {
    render();
    expect(labelOf("email")).toBe("E-mail");
    expect(labelOf("password")).toBe("Senha");
    expect(field("email").type).toBe("email");
    expect(field("password").type).toBe("password");
    // A password manager and a one-tap sign in need these.
    expect([field("email").autocomplete, field("password").autocomplete]).toEqual(["email", "current-password"]);
    expect(container.querySelector("button")!.textContent).toBe("Entrar");

    render("en");
    expect(labelOf("email")).toBe("Email");
    expect(labelOf("password")).toBe("Password");
    expect(container.querySelector("button")!.textContent).toBe("Sign in");
  });

  it("has no navigation", () => {
    render();
    expect(container.querySelector("a, nav")).toBeNull();
  });

  it("answers a wrong credential with one generic message", async () => {
    loginAction.mockResolvedValue({ status: "error", message: "invalid_credentials" });
    render();

    const submit = () => {
      field("email").value = "quem-nao-existe@exemplo.com";
      field("password").value = "errada";
      return act(async () => {
        container.querySelector("form")!.requestSubmit();
      });
    };
    await submit();

    const alerts = () =>
      [...container.querySelectorAll("[role='alert']")].map((node) => node.textContent).filter(Boolean);
    expect(alerts()).toEqual(["E-mail ou senha incorretos."]);
    expect(container.textContent).not.toMatch(/não existe|não encontrado|desconhecid/i);
    // The form's error, not a field's: marking one alone would tell which is wrong.
    expect(field("email").getAttribute("aria-invalid")).toBe("true");
    expect(field("password").getAttribute("aria-invalid")).toBe("true");
    for (const id of ["email", "password"]) expect(field(id).getAttribute("aria-describedby")).toBeNull();

    // Any other failure says no more than that it failed.
    loginAction.mockResolvedValue({ status: "error", message: "auth_error" });
    await submit();
    expect(alerts()).toEqual(["Não foi possível entrar. Tente de novo."]);
  });
});
