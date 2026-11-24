/**
 * The pointer light, the card tilt and the press pulse of every hologram, from
 * a single listener on the document (docs/design/moldura.md).
 *
 * A hologram opts in with `data-holo`; `data-holo="card"` also tilts. The
 * listener only writes custom properties on it, at most once per frame:
 *
 *   --holo-x, --holo-y    where the pointer is, in px from the top-left corner
 *   --holo-rx, --holo-ry  tilt of a card, up to 5deg
 *
 * Everything visible is CSS under `:hover`, so a hologram at rest has no
 * transform. Under reduced motion nothing is written and nothing pulses.
 */

export const MAX_TILT = 5;

const REDUCED = "(prefers-reduced-motion: reduce)";
const TYPES = ["pointermove", "pointerdown", "pointerout"] as const;
const PROPERTIES = ["--holo-x", "--holo-y", "--holo-rx", "--holo-ry"] as const;

type Pending = { element: HTMLElement; x: number; y: number };

let users = 0;
let active: HTMLElement | null = null;
let pending: Pending | null = null;
let frame = 0;

const reduced = () => window.matchMedia?.(REDUCED).matches ?? false;

/** The hologram under `target`. A disabled one does not answer. */
function hologramAt(target: EventTarget | null): HTMLElement | null {
  const element = target instanceof Element ? target.closest<HTMLElement>("[data-holo]") : null;
  return element?.matches(':disabled, [aria-disabled="true"]') ? null : element;
}

function clear(element: HTMLElement | null) {
  for (const property of PROPERTIES) element?.style.removeProperty(property);
}

function write() {
  frame = 0;
  if (!pending) return;
  const { element, x, y } = pending;
  pending = null;
  // The element itself is never transformed (a card tilts an inner layer), so
  // this box does not move under the pointer.
  const box = element.getBoundingClientRect();
  if (!box.width || !box.height) return;
  const dx = x - box.left;
  const dy = y - box.top;
  element.style.setProperty("--holo-x", `${dx.toFixed(1)}px`);
  element.style.setProperty("--holo-y", `${dy.toFixed(1)}px`);
  if (element.dataset.holo !== "card") return;
  const lean = (offset: number, size: number) =>
    Math.max(-1, Math.min(1, (offset / size) * 2 - 1)) * MAX_TILT;
  element.style.setProperty("--holo-rx", `${(-lean(dy, box.height)).toFixed(2)}deg`);
  element.style.setProperty("--holo-ry", `${lean(dx, box.width).toFixed(2)}deg`);
}

function pulse(element: HTMLElement, x: number, y: number) {
  const spot = element.querySelector<HTMLElement>("[data-holo-pulse]");
  if (!spot?.animate) return;
  const box = element.getBoundingClientRect();
  const size = Math.ceil(Math.hypot(box.width, box.height)) * 2;
  spot.style.left = `${x - box.left}px`;
  spot.style.top = `${y - box.top}px`;
  spot.style.width = spot.style.height = `${size}px`;
  spot.animate(
    [
      { opacity: 0.55, transform: "translate(-50%, -50%) scale(0.02)" },
      { opacity: 0, transform: "translate(-50%, -50%) scale(1)" },
    ],
    { duration: 420, easing: "cubic-bezier(.2,.8,.2,1)" },
  );
}

const listener = {
  handleEvent(event: PointerEvent) {
    const element = hologramAt(event.type === "pointerout" ? event.relatedTarget : event.target);
    if (element !== active) {
      clear(active);
      active = element;
    }
    if (!element || reduced()) {
      clear(element);
      pending = null;
      return;
    }
    if (event.type === "pointerdown") pulse(element, event.clientX, event.clientY);
    if (event.type === "pointerout") return;
    pending = { element, x: event.clientX, y: event.clientY };
    frame ||= requestAnimationFrame(write);
  },
};

/** Installs the listener for the first hologram and removes it with the last one. */
export function attachPointerLight(): () => void {
  if (users++ === 0) {
    for (const type of TYPES) {
      document.addEventListener(type, listener as EventListenerObject, { passive: true });
    }
  }
  return () => {
    if (--users > 0) return;
    for (const type of TYPES) document.removeEventListener(type, listener as EventListenerObject);
    cancelAnimationFrame(frame);
    clear(active);
    frame = 0;
    active = null;
    pending = null;
  };
}
