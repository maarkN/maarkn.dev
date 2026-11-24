import { describe, expect, it } from "vitest";
import { buildFrame, insetPolygon, toPath, type Frame, type FrameInput, type Point } from "./frame";

const SIZES: FrameInput[] = [
  // Buttons, links, tags: the three heights, narrow and wide, plus a section tag.
  { width: 96, height: 34, seed: "EN" },
  { width: 183, height: 44, seed: "Falar comigo" },
  { width: 242, height: 50, seed: "Resumo em 1 minuto" },
  { width: 302, height: 88, seed: "Casos de sucesso" },
  { width: 44, height: 44, seed: "x" },
  // Cards, windows, screens.
  { width: 358, height: 220, seed: "Dermagenix", kind: "panel" },
  { width: 900, height: 755, seed: "Nectar CRM", kind: "panel" },
  { width: 579, height: 324, seed: "SenseVox", kind: "panel" },
];

const SEEDS = ["", "a", "Falar comigo", "Contact me", "Página não encontrada", "0", "🙂"];
const CASES = SIZES.flatMap((size) => [size, ...SEEDS.map((seed) => ({ ...size, seed }))]);

const build = (input: FrameInput): Frame => {
  const frame = buildFrame(input);
  if (!frame) throw new Error("no frame");
  return frame;
};

const angle = ([a, b]: readonly [Point, Point]) =>
  (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI;
/** Smallest difference between two headings, so 359.9° and 0.1° are 0.2° apart. */
const turn = (a: number, b: number) => Math.abs(((a - b + 540) % 360) - 180);
const segments = (line: readonly Point[]) =>
  line.slice(1).map((b, i) => [line[i], b] as [Point, Point]);
const length = ([a, b]: readonly [Point, Point]) => Math.hypot(b[0] - a[0], b[1] - a[1]);
const total = (lines: readonly (readonly Point[])[]) =>
  lines.flatMap(segments).reduce((sum, s) => sum + length(s), 0);

/** What the browser draws: the lines as they come back out of the `d` attribute. */
const drawn = (lines: readonly (readonly Point[])[]): Point[][] =>
  toPath(lines)
    .split("M")
    .slice(1)
    .map((sub) => sub.split("L").map((p) => p.split(" ").map(Number) as unknown as Point));

/** Cut sizes read back from the outline, in px. */
function cuts({ outline: [tl, tr, r1, r2, br, bl, l], outline }: Frame) {
  const xs = outline.map((p) => p[0]);
  const ys = outline.map((p) => p[1]);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  return {
    topLeft: [tl[0] - x0, l[1] - y0],
    topRight: [x1 - tr[0], r1[1] - y0],
    bottomRight: [x1 - br[0], y1 - r2[1]],
    bottomLeft: [bl[0] - x0, y1 - bl[1]],
  };
}

describe("buildFrame", () => {
  it("keeps every inner line parallel to its outer line, as drawn", () => {
    let worst = 0;
    for (const input of CASES) {
      const frame = build(input);
      const outer = drawn(frame.outer);
      const inner = drawn(frame.inner);
      expect(inner.length).toBe(outer.length);
      outer.forEach((line, i) => {
        const [a, b] = [segments(line), segments(inner[i])];
        expect(b.length).toBe(a.length);
        a.forEach((segment, j) => {
          worst = Math.max(worst, turn(angle(segment), angle(b[j])));
        });
      });
    }
    expect(worst).toBeLessThanOrEqual(0.2);
  });

  it("insets the inner lines by the documented distance", () => {
    const inset = (input: FrameInput) => {
      const { outer, inner } = build(input);
      return inner[0][0][1] - outer[0][0][1];
    };
    expect(inset({ width: 200, height: 34, seed: "a" })).toBe(3.5);
    expect(inset({ width: 200, height: 44, seed: "a" })).toBe(4);
    expect(inset({ width: 200, height: 50, seed: "a" })).toBe(4.5);
    expect(inset({ width: 300, height: 88, seed: "a" })).toBe(7);
    expect(inset({ width: 360, height: 220, seed: "a", kind: "panel" })).toBe(6);
  });

  it("leaves the bottom-left corner whole", () => {
    for (const input of CASES) {
      const frame = build(input);
      expect(cuts(frame).bottomLeft).toEqual([0, 0]);
      // …and drawn: one outer line turns exactly 90° there.
      const corner = [0.75, input.height - 0.75];
      expect(frame.outer[1]).toContainEqual(corner);
    }
  });

  it("cuts the other three corners differently, and never mirrors the right side", () => {
    for (const input of CASES) {
      const { topLeft, topRight, bottomRight } = cuts(build(input));
      const pairs = [
        [topLeft, topRight],
        [topLeft, bottomRight],
        [topRight, bottomRight],
      ];
      for (const [a, b] of pairs) {
        expect(Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]))).toBeGreaterThan(0.2);
      }
      expect(topRight[0]).toBeGreaterThan(bottomRight[0]);
    }
  });

  it("sizes the cuts from the table, within the variation of the kind", () => {
    const TABLE = { topLeft: [1, 1.28], topRight: [1.42, 0.86], bottomRight: [0.7, 1.08] } as const;
    const check = (input: FrameInput, c: number, spread: number) => {
      const found = cuts(build(input));
      for (const corner of ["topLeft", "topRight", "bottomRight"] as const) {
        found[corner].forEach((size, axis) => {
          const ratio = size / (TABLE[corner][axis] * c);
          expect(ratio).toBeGreaterThanOrEqual(1 - spread - 1e-9);
          expect(ratio).toBeLessThanOrEqual(1 + spread + 1e-9);
        });
      }
    };
    for (const seed of SEEDS) {
      check({ width: 200, height: 20, seed }, 6, 0.16); // floor of `c`
      check({ width: 200, height: 44, seed }, 8.36, 0.16);
      check({ width: 400, height: 120, seed }, 15, 0.16); // ceiling of `c`
      check({ width: 400, height: 300, seed, kind: "panel" }, 20, 0.1);
    }
  });

  it("is the same frame for the same seed and another one for another seed", () => {
    const input: FrameInput = { width: 183, height: 44, seed: "Falar comigo" };
    expect(build({ ...input })).toEqual(build({ ...input }));
    const outlines = SEEDS.map((seed) => JSON.stringify(build({ ...input, seed }).outline));
    expect(new Set(outlines).size).toBe(SEEDS.length);
  });

  it("keeps the frame of a given text stable between releases", () => {
    // Changing the hash or the order of the cuts would redraw every button.
    expect(toPath([build({ width: 183, height: 44, seed: "Falar comigo" }).outline])).toMatchInlineSnapshot(`"M10.337 0.75L171.608 0.75L182.25 7.056L182.25 32.937L176.51 43.25L0.75 43.25L0.75 10.318"`);
  });

  it("closes the outline with the bridges, without overlapping the lines", () => {
    for (const input of CASES) {
      const { outline, outer, bridges } = build(input);
      const perimeter = total([[...outline, outline[0]]]);
      expect(total(outer) + total(bridges)).toBeCloseTo(perimeter, 6);
      expect(total(bridges)).toBeGreaterThan(0);

      // Head to tail: each bridge starts where a line ends and ends where the next starts.
      const at = (p: Point) => p.map((n) => n.toFixed(6)).join();
      const ends = [...outer, ...bridges].flatMap((l) => [at(l[0]), at(l[l.length - 1])]);
      const count = new Map<string, number>();
      for (const end of ends) count.set(end, (count.get(end) ?? 0) + 1);
      expect([...count.values()].every((n) => n === 2)).toBe(true);
    }
  });

  it("keeps the straight lines on the same sub-pixel at both densities", () => {
    // Centre at n + 0.75 from an edge: 1.5px of ink starting on a (half) pixel.
    for (const input of CASES) {
      const { outer, inner } = build(input);
      const straight = [...outer, ...inner].flatMap(segments).filter(([a, b]) => {
        return Math.abs(a[0] - b[0]) < 1e-9 || Math.abs(a[1] - b[1]) < 1e-9;
      });
      expect(straight.length).toBeGreaterThanOrEqual(8);
      for (const [a, b] of straight) {
        const centre = Math.abs(a[0] - b[0]) < 1e-9 ? a[0] : a[1];
        const edge = (centre - 0.75) * 2;
        expect(Math.abs(edge - Math.round(edge))).toBeLessThan(1e-6);
      }
    }
  });

  it("shrinks the cuts of a piece too small for them", () => {
    for (const [width, height] of [[16, 16], [20, 12], [12, 60], [8, 8]]) {
      const { outline, inner } = build({ width, height, seed: "x", kind: "panel" });
      for (const [x, y] of [...outline, ...inner.flat()]) {
        expect(x).toBeGreaterThanOrEqual(0);
        expect(y).toBeGreaterThanOrEqual(0);
        expect(x).toBeLessThanOrEqual(width);
        expect(y).toBeLessThanOrEqual(height);
      }
    }
  });

  it("has nothing to draw without an area", () => {
    for (const [width, height] of [[0, 0], [0, 40], [40, 0], [4, 40], [NaN, 40]]) {
      expect(buildFrame({ width, height, seed: "x" })).toBeNull();
    }
  });
});

describe("insetPolygon", () => {
  it("moves every edge by exactly the distance", () => {
    const square: Point[] = [[0, 0], [10, 0], [10, 10], [0, 10]];
    expect(insetPolygon(square, 2)).toEqual([[2, 2], [8, 2], [8, 8], [2, 8]]);
  });
});
