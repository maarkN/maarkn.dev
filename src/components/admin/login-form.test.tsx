// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { LoginState } from "@/app/_actions/auth";

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

describe("LoginForm", () => {
  it("prompts for `login:` and `password:`", () => {
    act(() => root.render(<LoginForm />));
    expect(labelOf("email")).toBe("login:");
    expect(labelOf("password")).toBe("password:");
    expect(field("email").type).toBe("email");
    expect(field("password").type).toBe("password");
  });

  it("prints a wrong credential as one generic output line", async () => {
    loginAction.mockResolvedValue({ status: "error", message: "invalid_credentials" });
    act(() => root.render(<LoginForm />));

    field("email").value = "quem-nao-existe@exemplo.com";
    field("password").value = "errada";
    await act(async () => {
      container.querySelector("form")!.requestSubmit();
    });

    const out = container.querySelector("[role='alert']")!;
    expect(out.textContent).toBe("E-mail ou senha incorretos.");
    // Same line whether or not the address exists: the screen never says.
    loginAction.mockResolvedValue({ status: "error", message: "auth_error" });
    expect(container.textContent).not.toMatch(/não existe|não encontrado|desconhecid/i);
    expect(field("email").getAttribute("aria-invalid")).toBe("true");
  });
});
