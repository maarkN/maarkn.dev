// @vitest-environment jsdom
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let pathname = "/en";
let query = "";
vi.mock("next/navigation", () => ({
  usePathname: () => pathname,
  useSearchParams: () => new URLSearchParams(query),
}));

let root: Root;
let container: HTMLDivElement;
let site: {
  PagePassage: typeof import("./page-passage").PagePassage;
  HomeScroll: typeof import("./home-scroll").HomeScroll;
  BackToSite: typeof import("./back-to-site").BackToSite;
  placeToReturn: typeof import("@/lib/site/place").placeToReturn;
};

/** The pages, as the site renders them: the home with its scroll, the others without. */
function Pages() {
  return (
    <>
      <main id="content" key={pathname}>
        {/^\/[^/]+$/.test(pathname) && <site.HomeScroll />}
        <h1 tabIndex={-1}>{pathname}</h1>
      </main>
      <section id="contact" tabIndex={-1} />
      <site.PagePassage />
    </>
  );
}

const render = (node: ReactNode) => act(() => root.render(node));
function go(to: string) {
  const url = new URL(to, window.location.origin);
  window.history.pushState(null, "", to);
  pathname = url.pathname;
  query = url.search.slice(1);
  render(<Pages />);
}
const focused = () => document.activeElement?.textContent || document.activeElement?.id;
function scrollTo(y: number) {
  window.scrollY = y;
  window.dispatchEvent(new Event("scroll"));
}

beforeEach(async () => {
  vi.resetModules(); // the last route, and the positions, live in modules
  sessionStorage.clear();
  site = {
    ...(await import("./page-passage")),
    ...(await import("./home-scroll")),
    ...(await import("./back-to-site")),
    ...(await import("@/lib/site/place")),
  };
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
  window.scrollY = 0;
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  window.history.replaceState(null, "", "/");
  vi.restoreAllMocks();
});

describe("focus", () => {
  it("goes to the title of the new page, and stays where it is on a fresh load", () => {
    go("/en");
    expect(document.activeElement).toBe(document.body);
    go("/en/projects");
    expect(focused()).toBe("/en/projects");
    go("/en");
    expect(focused()).toBe("/en");
  });

  it("does not move when only the filter changes", () => {
    go("/en");
    go("/en/projects");
    (document.activeElement as HTMLElement).blur();
    go("/en/projects?cat=ai");
    expect(document.activeElement).toBe(document.body);
  });

  it("goes to the section the link asked for", () => {
    go("/en/projects");
    go("/en#contact");
    expect(focused()).toBe("contact");
    go("/en/projects");
    go("/en#nowhere");
    expect(focused()).toBe("/en");
    go("/en/projects");
    go("/en#%");
    expect(focused()).toBe("/en");
  });

  it("does not scroll: the home puts itself back", () => {
    const focus = vi.spyOn(HTMLElement.prototype, "focus");
    go("/en/projects");
    go("/en");
    expect(focus).toHaveBeenLastCalledWith({ preventScroll: true });
  });
});

describe("scroll of the home", () => {
  it("comes back to where it was left", () => {
    go("/en");
    scrollTo(640);
    go("/en/projects");
    scrollTo(90);
    go("/en");
    expect(window.scrollTo).toHaveBeenLastCalledWith({ top: 640, behavior: "instant" });
  });

  it("starts at the top when the visitor was never there, and is the browser's on a load", () => {
    go("/en");
    expect(window.scrollTo).not.toHaveBeenCalled();
    act(() => root.unmount());
    root = createRoot(container);
    go("/pt-BR");
    expect(window.scrollTo).toHaveBeenLastCalledWith({ top: 0, behavior: "instant" });
  });

  it("does not learn from a scroll made for the next page", () => {
    go("/en");
    scrollTo(640);
    // The address changes before the home is gone.
    window.history.pushState(null, "", "/en/projects");
    scrollTo(0);
    go("/en/projects");
    go("/en");
    expect(window.scrollTo).toHaveBeenLastCalledWith({ top: 640, behavior: "instant" });
  });

  it("gives way to an anchor", () => {
    go("/en");
    scrollTo(640);
    go("/en/projects");
    go("/en#contact");
    expect(window.scrollTo).not.toHaveBeenCalled();
  });

  it("is remembered across documents of the tab", async () => {
    go("/en");
    scrollTo(512);
    window.dispatchEvent(new Event("pagehide"));
    act(() => root.unmount());

    vi.resetModules();
    site = { ...site, ...(await import("./page-passage")), ...(await import("./home-scroll")) };
    root = createRoot(container);
    go("/en/projects");
    go("/en");
    expect(window.scrollTo).toHaveBeenLastCalledWith({ top: 512, behavior: "instant" });
  });

  it("works with the storage blocked", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("denied", "SecurityError");
    });
    go("/en");
    scrollTo(300);
    go("/en/projects");
    go("/en");
    expect(window.scrollTo).toHaveBeenLastCalledWith({ top: 300, behavior: "instant" });
  });
});

describe("the way back from the CLI version", () => {
  const link = (locale = "en") => <site.BackToSite locale={locale}>back to the site</site.BackToSite>;
  const href = () => container.querySelector("a")!.getAttribute("href");

  it("is the last page of the site, filters included", () => {
    go("/en/projects");
    go("/en/projects?cat=ai");
    render(link());
    expect(href()).toBe("/en/projects?cat=ai");
  });

  it("is in the language being read", () => {
    go("/pt-BR/career/acme");
    render(link("en"));
    expect(href()).toBe("/en/career/acme");
  });

  it("is the home when the visit started there, and without JavaScript", () => {
    render(link("pt-BR"));
    expect(href()).toBe("/pt-BR");
    go("/en/projects");
    expect(renderToString(link())).toContain('href="/en"');
  });
});
