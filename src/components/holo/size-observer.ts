/**
 * One ResizeObserver for every frame on the page. Nothing runs at rest: the
 * observer only calls back when a size changes, and a change that rounds to the
 * same whole pixels draws nothing.
 *
 * Sizes are whole pixels on purpose: the frame's straight lines only land on
 * the pixel grid if the box they are measured from does.
 */

type Draw = (width: number, height: number) => void;

type Watched = { draw: Draw; width: number; height: number };

const watched = new Map<Element, Watched>();
let observer: ResizeObserver | null = null;

function onResize(entries: ResizeObserverEntry[]) {
  for (const entry of entries) {
    const piece = watched.get(entry.target);
    if (!piece) continue;
    const box = entry.borderBoxSize?.[0];
    const width = Math.round(box ? box.inlineSize : entry.contentRect.width);
    const height = Math.round(box ? box.blockSize : entry.contentRect.height);
    if (width === piece.width && height === piece.height) continue;
    piece.width = width;
    piece.height = height;
    piece.draw(width, height);
  }
}

/** Calls `draw` with the size of `element` now and at every change. Returns the undo. */
export function observeSize(element: Element, draw: Draw): () => void {
  if (typeof ResizeObserver === "undefined") return () => {};
  observer ??= new ResizeObserver(onResize);
  watched.set(element, { draw, width: -1, height: -1 });
  observer.observe(element, { box: "border-box" });
  return () => {
    watched.delete(element);
    observer?.unobserve(element);
    if (watched.size === 0) {
      observer?.disconnect();
      observer = null;
    }
  };
}
