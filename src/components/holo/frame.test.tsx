// @vitest-environment jsdom
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HoloButton } from "./button";
import { HoloFrame } from "./frame";
import { MAX_TILT } from "./pointer";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/* jsdom has neither layout nor ResizeObserver: the test is the one who resizes. */
class FakeObserver {
  static all: FakeObserver[] = [];
  targets = new Set<Element>();
  constructor(public callback: ResizeObserverCallback) {
    FakeObserver.all.push(this);
  }
  observe(el: Element) {
    this.targets.add(el);
  }
  unobserve(el: Element) {
    this.targets.delete(el);
  }
  disconnect() {
    this.targets.clear();
  }
}

const resize = (el: Element, width: number, height: number) =>
  FakeObserver.all.at(-1)!.callback(
    [{ target: el, borderBoxSize: [{ inlineSize: width, blockSize: height }] } as unknown as ResizeObserverEntry],
    FakeObserver.all.at(-1) as unknown as ResizeObserver,
  );

let root: Root;
let container: HTMLDivElement;
let reduce = false;

function render(node: ReactNode) {
  act(() => root.render(node));
}

const lines = (el: Element) =>
  [...el.querySelectorAll<SVGPathElement>("path[data-line]")].map((p) => p.getAttribute("d"));
const buttons = () => [...container.querySelectorAll("button")];

beforeEach(() => {
  FakeObserver.all = [];
  reduce = false;
  vi.stubGlobal("ResizeObserver", FakeObserver);
  vi.stubGlobal("requestAnimationFrame", (run: FrameRequestCallback) => {
    run(0);
    return 0;
  });
  window.matchMedia = vi.fn((query: string) => ({
    matches: query.includes("reduced-motion") && reduce,
  })) as unknown as typeof window.matchMedia;
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("drawing", () => {
  it("draws on the first size and again only when the size changes", () => {
    render(<HoloButton>Falar comigo</HoloButton>);
    const [button] = buttons();
    expect(lines(button).every((d) => d === null)).toBe(true);

    resize(button, 183, 44);
    const first = lines(button);
    expect(first.every((d) => d && d.startsWith("M"))).toBe(true);
    expect(button.querySelector("[data-drawn]")).not.toBeNull();
    // A control's clip stays on its fill: on the button it would restyle everything inside.
    expect(button.getAttribute("style")).toBeNull();

    const set = vi.spyOn(SVGElement.prototype, "setAttribute");
    resize(button, 183, 44);
    resize(button, 183.4, 43.7); // the same whole pixels
    expect(set).not.toHaveBeenCalled();

    resize(button, 240, 44);
    expect(set).toHaveBeenCalled();
    expect(lines(button)).not.toEqual(first);
  });

  it("shares one observer between every frame, and lets go of it with the last", () => {
    const pieces = (length: number) =>
      render(Array.from({ length }, (_, i) => <HoloButton key={i}>{`Peça ${i}`}</HoloButton>));
    pieces(100);
    expect(FakeObserver.all.length).toBe(1);
    const [observer] = FakeObserver.all;
    expect(observer.targets.size).toBe(100);
    pieces(1);
    expect(observer.targets.size).toBe(1);
    pieces(0);
    expect(observer.targets.size).toBe(0);
  });

  it("gives the same text the same cut on every visit, and another text another one", () => {
    const draw = (text: ReactNode) => {
      render(<HoloButton key={String(Math.random())}>{text}</HoloButton>);
      const [button] = buttons();
      resize(button, 183, 44);
      return lines(button).join();
    };
    const once = draw("Falar comigo");
    expect(draw("Contact me")).not.toBe(once);
    expect(draw("Falar comigo")).toBe(once);
    // The text decides, not the markup around it.
    expect(draw(<><b>Falar</b> comigo</>)).toBe(once);
  });

  it("cleans up what it wrote on the framed element", () => {
    render(
      <div id="host">
        <HoloFrame seed="x" kind="panel" />
      </div>,
    );
    const host = container.querySelector<HTMLElement>("#host")!;
    resize(host, 300, 200);
    for (const property of ["--holo-clip", "--holo-clip-image"]) {
      expect(host.style.getPropertyValue(property)).toMatch(/^polygon\(/);
    }
    render(<div id="host" />);
    expect(host.style.length).toBe(0);
  });

  it("is invisible to assistive technology", () => {
    render(<HoloButton>Salvar</HoloButton>);
    expect(container.querySelector("button > span")?.getAttribute("aria-hidden")).toBe("true");
    expect(container.querySelector("button svg")?.getAttribute("focusable")).toBe("false");
  });
});

describe("pointer light, tilt and pulse", () => {
  const pointer = (el: Element, type: string, x: number, y: number, relatedTarget: Element | null = null) =>
    act(() => {
      el.dispatchEvent(
        new PointerEvent(type, { bubbles: true, clientX: x, clientY: y, relatedTarget }),
      );
    });
  const box = (el: Element, left: number, top: number, width: number, height: number) =>
    vi.spyOn(el, "getBoundingClientRect").mockReturnValue({ left, top, width, height } as DOMRect);
  const read = (el: HTMLElement) =>
    ["--holo-x", "--holo-y", "--holo-rx", "--holo-ry"].map((p) => el.style.getPropertyValue(p));

  it("listens once for the whole page, however many holograms there are", () => {
    const add = vi.spyOn(document, "addEventListener");
    const remove = vi.spyOn(document, "removeEventListener");
    const pointerCalls = (spy: typeof add | typeof remove) =>
      spy.mock.calls.filter(([type]) => String(type).startsWith("pointer"));

    render(Array.from({ length: 100 }, (_, i) => <HoloButton key={i}>{`Peça ${i}`}</HoloButton>));
    const added = pointerCalls(add);
    expect(new Set(added.map(([, listener]) => listener)).size).toBe(1);
    expect(added.map(([type]) => type).sort()).toEqual(["pointerdown", "pointermove", "pointerout"]);
    expect(added.every(([, , options]) => (options as AddEventListenerOptions).passive)).toBe(true);

    render(null);
    expect(pointerCalls(remove).map(([type]) => type).sort()).toEqual(["pointerdown", "pointermove", "pointerout"]);
  });

  it("follows the pointer and leaves nothing behind", () => {
    render(
      <>
        <HoloButton>Um</HoloButton>
        <HoloButton>Dois</HoloButton>
      </>,
    );
    const [one, two] = buttons();
    box(one, 100, 50, 200, 44);
    box(two, 400, 50, 200, 44);

    pointer(one, "pointermove", 150, 60);
    expect(read(one)).toEqual(["50.0px", "10.0px", "", ""]);
    pointer(two.querySelector("span")!, "pointermove", 410, 72);
    expect(read(one)).toEqual(["", "", "", ""]);
    expect(read(two)).toEqual(["10.0px", "22.0px", "", ""]);
    // Out of the page: no more moves come, only this.
    pointer(two, "pointerout", 410, 0);
    expect(read(two)).toEqual(["", "", "", ""]);
  });

  it(`leans a card, up to ${MAX_TILT} degrees`, () => {
    render(
      <article data-holo="card">
        <HoloFrame seed="x" kind="panel" />
      </article>,
    );
    const card = container.querySelector("article")!;
    box(card, 0, 0, 400, 200);
    pointer(card, "pointermove", 400, 0);
    expect(read(card).slice(2)).toEqual(["5.00deg", "5.00deg"]);
    pointer(card, "pointermove", 200, 100);
    expect(read(card).slice(2).map(Number.parseFloat)).toEqual([0, 0]);
    pointer(card, "pointermove", 9000, 9000);
    expect(read(card).slice(2)).toEqual(["-5.00deg", "5.00deg"]);
  });

  it("pulses from the point that was pressed", () => {
    const animate = vi.fn();
    Object.assign(Element.prototype, { animate });
    render(<HoloButton>Falar comigo</HoloButton>);
    const [button] = buttons();
    box(button, 100, 50, 200, 44);
    pointer(button, "pointerdown", 130, 60);
    const spot = button.querySelector<HTMLElement>("[data-holo-pulse]")!;
    expect(animate).toHaveBeenCalledTimes(1);
    expect(animate.mock.contexts[0]).toBe(spot);
    expect([spot.style.left, spot.style.top]).toEqual(["30px", "10px"]);
  });

  it("does nothing under reduced motion", () => {
    reduce = true;
    const animate = vi.fn();
    Object.assign(Element.prototype, { animate });
    render(
      <article data-holo="card">
        <HoloFrame seed="x" kind="panel" />
      </article>,
    );
    const card = container.querySelector("article")!;
    box(card, 0, 0, 400, 200);
    pointer(card, "pointermove", 300, 30);
    pointer(card, "pointerdown", 300, 30);
    expect(read(card)).toEqual(["", "", "", ""]);
    expect(animate).not.toHaveBeenCalled();

    // …including for whoever turns it on with the pointer already there.
    reduce = false;
    pointer(card, "pointermove", 300, 30);
    expect(read(card)[0]).toBe("300.0px");
    reduce = true;
    pointer(card, "pointermove", 310, 30);
    expect(read(card)).toEqual(["", "", "", ""]);
  });

  it("a disabled hologram does not answer", () => {
    const animate = vi.fn();
    Object.assign(Element.prototype, { animate });
    render(
      <>
        <HoloButton disabled>Desligado</HoloButton>
        <a data-holo="" aria-disabled="true">
          <HoloFrame seed="x" />
        </a>
      </>,
    );
    for (const el of container.querySelectorAll<HTMLElement>("[data-holo]")) {
      box(el, 0, 0, 100, 44);
      pointer(el, "pointermove", 10, 10);
      pointer(el, "pointerdown", 10, 10);
      expect(read(el)).toEqual(["", "", "", ""]);
    }
    expect(animate).not.toHaveBeenCalled();
  });
});
