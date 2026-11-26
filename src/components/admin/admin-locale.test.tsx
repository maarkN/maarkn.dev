// @vitest-environment jsdom
import { act, type ReactNode } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { ADMIN_LOCALES, type AdminLocale } from "@/lib/admin/locale";
import { AdminLocaleProvider, Translated, Untranslated, useAdminFormat } from "./admin-locale";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

afterEach(() => {
  vi.restoreAllMocks();
  document.body.innerHTML = "";
});

function Row() {
  const { formatDate, formatDateTime, formatNumber } = useAdminFormat();
  return (
    <p>
      {formatDate(new Date("2026-08-04"))} | {formatDateTime("2026-08-04T01:30:00Z")} | {formatNumber(1062)}
    </p>
  );
}

const page = (locale: AdminLocale, timeZone: string, children: ReactNode = <Row />) => (
  <AdminLocaleProvider locale={locale} timeZone={timeZone}>
    {children}
  </AdminLocaleProvider>
);

describe("dates and numbers, on the server and in the browser", () => {
  it("are the same text: nothing to hydrate differently", async () => {
    const complaints = vi.spyOn(console, "error").mockImplementation(() => {});
    for (const locale of ADMIN_LOCALES) {
      for (const zone of ["America/Sao_Paulo", "Asia/Tokyo"]) {
        const html = renderToString(page(locale, zone));
        const container = document.createElement("div");
        container.innerHTML = html;
        const root = await act(async () => hydrateRoot(container, page(locale, zone)));
        expect(container.innerHTML, `${locale} ${zone}`).toBe(html);
        act(() => root.unmount());
      }
    }
    expect(complaints).not.toHaveBeenCalled();
  });

  it("follow the language and the zone that the server resolved", () => {
    const text = (locale: AdminLocale, zone: string) => renderToString(page(locale, zone)).replace(/<[^>]*>/g, "");
    expect(text("pt-BR", "America/Sao_Paulo")).toBe("04/08/2026 | 03/08/2026, 22:30 | 1.062");
    expect(text("en", "America/Sao_Paulo")).toBe("Aug 4, 2026 | Aug 3, 2026, 22:30 | 1,062");
    expect(text("en", "Asia/Tokyo")).toBe("Aug 4, 2026 | Aug 4, 2026, 10:30 | 1,062");
  });
});

describe("a screen that was not translated yet", () => {
  const window = (
    <Dialog open>
      <DialogContent>
        <DialogTitle>Excluir</DialogTitle>
        <DialogDescription>Irreversível.</DialogDescription>
      </DialogContent>
    </Dialog>
  );
  const mount = (children: ReactNode) => {
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    act(() => root.render(page("en", "UTC", children)));
    return () => act(() => root.unmount());
  };
  const dialog = () => document.querySelector('[data-slot="dialog-content"]')!;

  it("says it is in Portuguese, and so does what it opens over itself", () => {
    const unmount = mount(<Untranslated>{window}</Untranslated>);
    expect(document.querySelector("div > [lang]")?.getAttribute("lang")).toBe("pt-BR");
    // In a portal: outside of the element that has the language.
    expect(dialog().closest("[data-slot]")?.parentElement).toBe(document.body);
    expect(dialog().getAttribute("lang")).toBe("pt-BR");
    unmount();
  });

  it("has its translated parts in the language of the interface", () => {
    const unmount = mount(
      <Untranslated>
        <Translated>{window}</Translated>
      </Untranslated>,
    );
    expect(document.querySelector("[lang] > [lang]")?.getAttribute("lang")).toBe("en");
    expect(dialog().getAttribute("lang")).toBeNull();
    unmount();
  });

  it("is the only one that is marked: outside of it a window is in the document's language", () => {
    const unmount = mount(window);
    expect(dialog().getAttribute("lang")).toBeNull();
    unmount();
  });
});
