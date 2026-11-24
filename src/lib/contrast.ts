/**
 * Colour measurements for the site's tokens. Pure; hexes in, numbers out.
 * Text uses WCAG 2.1 contrast. Chart series also need to stay apart for someone
 * who does not see every hue: distance in OKLab (×100) under the Machado,
 * Oliveira & Fernandes (2009) simulation at full severity.
 */

type RGB = [r: number, g: number, b: number];

const channels = (hex: string): RGB => {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) throw new Error(`not a #rrggbb colour: ${hex}`);
  return [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16) / 255) as RGB;
};

const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const linear = (hex: string) => channels(hex).map(toLinear) as RGB;

function luminance(hex: string): number {
  const [r, g, b] = linear(hex);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio, 1 to 21. */
export function contrast(a: string, b: string): number {
  const [x, y] = [luminance(a), luminance(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

/** `alpha` of `over` painted on `under`, in sRGB as the browser composites it. */
export function blend(over: string, under: string, alpha: number): string {
  const [a, b] = [channels(over), channels(under)];
  const mixed = a.map((c, i) => Math.round((c * alpha + b[i] * (1 - alpha)) * 255));
  return `#${mixed.map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

function oklab([r, g, b]: RGB): RGB {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

const VISION = {
  normal: [[1, 0, 0], [0, 1, 0], [0, 0, 1]],
  protan: [[0.152286, 1.052583, -0.204868], [0.114503, 0.786281, 0.099216], [-0.003882, -0.048116, 1.051998]],
  deutan: [[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.01182, 0.04294, 0.968881]],
  tritan: [[1.255528, -0.076749, -0.178779], [-0.078411, 0.930809, 0.147602], [0.004733, 0.691367, 0.3039]],
} as const;

export type Vision = keyof typeof VISION;

/** Distance between two colours as someone with that vision sees them. */
export function distance(a: string, b: string, vision: Vision): number {
  const see = (hex: string) => {
    const [r, g, b] = linear(hex);
    return oklab(
      VISION[vision].map((row) =>
        Math.min(1, Math.max(0, row[0] * r + row[1] * g + row[2] * b)),
      ) as RGB,
    );
  };
  const [x, y] = [see(a), see(b)];
  return 100 * Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]);
}

/** OKLCH lightness (0–1) and chroma. */
export function lightnessAndChroma(hex: string): { lightness: number; chroma: number } {
  const [lightness, a, b] = oklab(linear(hex));
  return { lightness, chroma: Math.hypot(a, b) };
}
