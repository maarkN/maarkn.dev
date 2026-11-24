/**
 * The hologram frame (docs/design/moldura.md): a rectangle with three corners
 * cut differently and the bottom-left one whole.
 *
 * There is ONE polygon. The outer strokes are stretches of it; the inner ones
 * are the same stretches of the polygon inset by a constant distance, so they
 * are parallel by construction. Never draw an inner line on its own.
 *
 * Pure: same width, height, seed and kind, same frame.
 */

export type Point = readonly [x: number, y: number];

/** `control`: buttons, links, tags, fields. `panel`: cards, windows, screens. */
export type FrameKind = "control" | "panel";

export type FrameInput = { width: number; height: number; seed: string; kind?: FrameKind };

export type Frame = {
  /** The closed polygon, clockwise from the top-left cut. */
  outline: Point[];
  /** Three broken lines: top, left with the base, right. */
  outer: Point[][];
  /** The same three, on the inset polygon. */
  inner: Point[][];
  /** What closes the outline between one outer line and the next. */
  bridges: Point[][];
};

export const STROKE = 1.5;

/** Cut sizes per corner, in units of `c`. The bottom-left corner has none. */
const CUTS = {
  topLeft: [1.0, 1.28],
  topRight: [1.42, 0.86],
  bottomRight: [0.7, 1.08],
} as const;

const SPREAD: Record<FrameKind, number> = { control: 0.16, panel: 0.1 };

/** Where each stretch starts and ends. `c` units, except `CUT_REACH` (0–1). */
const TOP_GAP = 0.8;
const RIGHT_GAP = 0.7;
const BASE_GAP = 1.75;
/** How far up the top-left cut the left line climbs. */
const CUT_REACH = 0.62;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
/** Half-pixel steps: a 1.5px line centred at n + 0.75 lands whole on 2x screens and
    covers exactly one full pixel plus a half on 1x ones. */
const toHalfPixel = (value: number) => Math.round(value * 2) / 2;

/** FNV-1a over the text, expanded by mulberry32: six stable numbers in [0, 1). */
function sequence(seed: string): () => number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    hash = Math.imul(hash ^ seed.charCodeAt(i), 0x01000193);
  }
  return () => {
    hash = (hash + 0x6d2b79f5) | 0;
    let t = Math.imul(hash ^ (hash >>> 15), 1 | hash);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function measures(width: number, height: number, kind: FrameKind) {
  const wanted =
    kind === "panel"
      ? { c: 20, inset: 6 }
      : { c: clamp(height * 0.19, 6, 15), inset: clamp(height * 0.09, 3.5, 7) };
  // A piece too small for its cuts gets smaller cuts, never a crossed outline.
  const c = Math.min(wanted.c, height / 3, width / 4);
  return { c, inset: toHalfPixel(Math.min(wanted.inset, c * 0.6)) };
}

/** Moves every edge inwards by `distance`; each stays parallel to itself. */
export function insetPolygon(polygon: readonly Point[], distance: number): Point[] {
  const edges = polygon.map((a, i) => {
    const b = polygon[(i + 1) % polygon.length];
    const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const dx = (b[0] - a[0]) / length;
    const dy = (b[1] - a[1]) / length;
    // Clockwise in screen coordinates: inwards is the direction turned right.
    return { x: a[0] - dy * distance, y: a[1] + dx * distance, dx, dy };
  });
  return edges.map((edge, i) => {
    const previous = edges[(i + edges.length - 1) % edges.length];
    const cross = previous.dx * edge.dy - previous.dy * edge.dx;
    const t = ((edge.x - previous.x) * edge.dy - (edge.y - previous.y) * edge.dx) / cross;
    return [previous.x + previous.dx * t, previous.y + previous.dy * t];
  });
}

/** A place on the polygon: an edge and how far along it (0–1). */
type Place = readonly [edge: number, at: number];

function pointAt(polygon: readonly Point[], [edge, at]: Place): Point {
  const a = polygon[edge];
  const b = polygon[(edge + 1) % polygon.length];
  return [a[0] + (b[0] - a[0]) * at, a[1] + (b[1] - a[1]) * at];
}

/** The polygon walked clockwise from one place to another, corners included. */
function stretch(polygon: readonly Point[], from: Place, to: Place): Point[] {
  const points = [pointAt(polygon, from)];
  const corners = (to[0] - from[0] + polygon.length) % polygon.length;
  for (let i = 1; i <= corners; i++) points.push(polygon[(from[0] + i) % polygon.length]);
  if (to[1] > 0) points.push(pointAt(polygon, to));
  return points;
}

export function buildFrame({ width, height, seed, kind = "control" }: FrameInput): Frame | null {
  if (!(width > STROKE * 4) || !(height > STROKE * 4)) return null;

  const { c, inset } = measures(width, height, kind);
  const next = sequence(seed);
  const cut = ([w, h]: readonly [number, number]) => {
    const vary = () => 1 + (next() * 2 - 1) * SPREAD[kind];
    return { w: w * c * vary(), h: h * c * vary() };
  };
  const topLeft = cut(CUTS.topLeft);
  const topRight = cut(CUTS.topRight);
  const bottomRight = cut(CUTS.bottomRight);

  // Half a stroke in, so the line falls inside the pixel.
  const left = STROKE / 2;
  const top = STROKE / 2;
  const right = width - STROKE / 2;
  const bottom = height - STROKE / 2;

  const outline: Point[] = [
    [left + topLeft.w, top],
    [right - topRight.w, top],
    [right, top + topRight.h],
    [right, bottom - bottomRight.h],
    [right - bottomRight.w, bottom],
    [left, bottom],
    [left, top + topLeft.h],
  ];
  const [TOP, TOP_RIGHT, RIGHT, BOTTOM_RIGHT, BASE, , TOP_LEFT] = outline.keys();

  // A gap in `c` units as a share of its edge, never more than a third of it.
  const share = (edge: number, gap: number) => {
    const [a, b] = [outline[edge], outline[(edge + 1) % outline.length]];
    return Math.min((gap * c) / Math.hypot(b[0] - a[0], b[1] - a[1]), 1 / 3);
  };
  const topStart: Place = [TOP, share(TOP, TOP_GAP)];
  const topEnd: Place = [TOP_RIGHT, 1];
  const rightStart: Place = [RIGHT, share(RIGHT, RIGHT_GAP)];
  const rightEnd: Place = [BOTTOM_RIGHT, 1];
  const baseStart: Place = [BASE, share(BASE, BASE_GAP)];
  const leftEnd: Place = [TOP_LEFT, CUT_REACH];

  const lines = (polygon: readonly Point[]) => [
    stretch(polygon, topStart, topEnd),
    stretch(polygon, baseStart, leftEnd),
    stretch(polygon, rightStart, rightEnd),
  ];

  return {
    outline,
    outer: lines(outline),
    inner: lines(insetPolygon(outline, inset)),
    bridges: [
      stretch(outline, leftEnd, topStart),
      stretch(outline, [RIGHT, 0], rightStart),
      stretch(outline, [BASE, 0], baseStart),
    ],
  };
}

/** Three decimals: on the shortest edge that is under 0.02° of rounding. */
const round = (value: number) => Math.round(value * 1000) / 1000;

/** `d` of a <path> with one subpath per line. */
export function toPath(lines: readonly (readonly Point[])[]): string {
  return lines
    .map((line) => line.map(([x, y], i) => `${i ? "L" : "M"}${round(x)} ${round(y)}`).join(""))
    .join("");
}

/** `clip-path` value of a polygon. */
export function toClipPath(polygon: readonly Point[]): string {
  return `polygon(${polygon.map(([x, y]) => `${round(x)}px ${round(y)}px`).join(",")})`;
}
