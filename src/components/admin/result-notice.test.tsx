// @vitest-environment jsdom
/**
 * A result that arrived by a navigation (creating an application redirects to
 * the list with `?created=`): one notice, and the address cleaned, so that a
 * reload does not say it again.
 */
import { StrictMode, act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

const replace = vi.fn();
const custom = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }), usePathname: () => "/admin/applications" }));
vi.mock("sonner", () => ({ toast: { custom: (...a: unknown[]) => custom(...a), dismiss: vi.fn() } }));

const { ResultNotice } = await import("./result-notice");
const { WithAdminWords } = await import("./test-labels");

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root;
let container: HTMLDivElement;

beforeEach(() => {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  replace.mockReset();
  custom.mockReset();
  window.history.replaceState(null, "", "/admin/applications?created=Acme&stage=interview");
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

it("says it once, even when React runs the effect twice, and takes it out of the address", () => {
  act(() =>
    root.render(
      <StrictMode>
        <WithAdminWords>
          <ResultNotice message="Candidatura “Acme” criada." drop={["created", "saved"]} />
        </WithAdminWords>
      </StrictMode>,
    ),
  );
  expect(custom).toHaveBeenCalledTimes(1);
  const notice = custom.mock.calls[0][0]("id") as { props: { title: string; tone: string } };
  expect(notice.props).toMatchObject({ title: "Candidatura “Acme” criada.", tone: "ok" });
  expect(replace).toHaveBeenCalledWith("/admin/applications?stage=interview", { scroll: false });
});
