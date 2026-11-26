// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { toast } from "sonner";
import { expect, it, vi } from "vitest";
import { setSiteTheme } from "@/components/site-theme";
import { Toaster } from "./sonner";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

it("has the theme of the site, and changes with it", async () => {
  window.matchMedia = vi.fn(() => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} })) as never;
  document.documentElement.setAttribute("data-site-theme", "light");
  const root = createRoot(document.body.appendChild(document.createElement("div")));
  await act(async () => root.render(<Toaster />));
  await act(async () => {
    toast("Salvo");
    await new Promise((resolve) => setTimeout(resolve, 20));
  });
  const theme = () => document.querySelector("[data-sonner-toaster]")?.getAttribute("data-sonner-theme");
  expect(theme()).toBe("light");
  for (const [site, expected] of [["dracula", "dark"], ["light", "light"], ["dusk", "dark"]] as const) {
    await act(async () => setSiteTheme(site));
    expect(theme(), site).toBe(expected);
  }
  act(() => root.unmount());
});
