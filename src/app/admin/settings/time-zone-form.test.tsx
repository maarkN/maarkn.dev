// @vitest-environment jsdom
/**
 * The time zone of the backoffice (spec admin-forms, "Erro que orienta"): a
 * zone the server does not know is the field's error, with the focus on it; a
 * failure of the server is not the field's, and its notice offers to try again.
 */
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ActionResult } from "@/app/_actions/action-result";
import { ADMIN_WORDS, WithAdminWords } from "@/components/admin/test-labels";

const custom = vi.fn();
vi.mock("sonner", () => ({ toast: { custom: (...args: unknown[]) => custom(...args), dismiss: vi.fn() } }));
const setAdminTimeZone = vi.fn<(data: FormData) => Promise<ActionResult>>();
vi.mock("@/app/_actions/preferences", () => ({ setAdminTimeZone: (data: FormData) => setAdminTimeZone(data) }));

const { TimeZoneForm } = await import("./time-zone-form");

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const words = ADMIN_WORDS["pt-BR"];
let root: Root;
let container: HTMLDivElement;

beforeEach(() => {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  custom.mockReset();
  setAdminTimeZone.mockReset();
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

function render() {
  act(() =>
    root.render(
      <WithAdminWords>
        <TimeZoneForm current="America/Sao_Paulo" zones={["America/Sao_Paulo", "UTC"]} labels={words.timeZone} />
      </WithAdminWords>,
    ),
  );
}

const field = () => container.querySelector<HTMLInputElement>("#timeZone")!;
const error = () => container.querySelector("#timeZone-error")?.textContent ?? "";
const notice = (n = 0) =>
  custom.mock.calls[n][0]("id") as { props: { title: string; tone: string; action?: { label: string; onClick: () => void } } };

async function submit() {
  await act(async () => container.querySelector("form")!.requestSubmit());
}

describe("TimeZoneForm", () => {
  it("puts a zone the server does not know at the field, with the focus, and no retry", async () => {
    setAdminTimeZone.mockResolvedValue({
      ok: false,
      message: words.timeZone.unknown,
      fieldErrors: { timeZone: words.timeZone.unknown },
    });
    render();
    await submit();
    expect(error()).toBe(words.timeZone.unknown);
    expect(field().getAttribute("aria-invalid")).toBe("true");
    expect(document.activeElement).toBe(field());
    expect(notice().props.action).toBeUndefined();
  });

  it("does not blame the field for a failure of the server, and offers to try again", async () => {
    setAdminTimeZone.mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce({ ok: true, message: words.timeZone.saved });
    render();
    await submit();
    expect(error()).toBe("");
    expect(field().getAttribute("aria-invalid")).toBe("false");
    expect(notice().props.tone).toBe("bad");
    expect(notice().props.title).toBe(words.timeZone.failed);
    expect(notice().props.action?.label).toBe(words.common.retry);

    await act(async () => notice().props.action!.onClick());
    expect(setAdminTimeZone).toHaveBeenCalledTimes(2);
    expect(setAdminTimeZone.mock.calls[1][0].get("timeZone")).toBe("America/Sao_Paulo");
    expect(notice(1).props.title).toBe(words.timeZone.saved);
  });
});
