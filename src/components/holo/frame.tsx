"use client";

import { useEffect, useRef } from "react";
import { buildFrame, insetPolygon, toClipPath, toPath, type FrameKind } from "@/lib/frame/frame";
import { attachPointerLight } from "./pointer";
import { observeSize } from "./size-observer";
import styles from "./holo.module.css";

/** How far inside the outline a projected image is cut. */
const IMAGE_INSET = 11;

/**
 * The frame of a hologram: fill, pointer light, pulse and lines, all decorative.
 * Rendered first inside the element it frames, which is positioned and carries
 * `styles.holo`. A panel also gets `--holo-clip` and `--holo-clip-image`, for
 * the surfaces inside it that follow the same cut.
 *
 * Drawn straight into the DOM, not through state: a page has dozens of these
 * and a resize must not become dozens of React renders. Until the first draw
 * (and without JavaScript) the fill shows a plain border instead.
 */
export function HoloFrame({
  seed,
  kind = "control",
  echo = false,
}: {
  /** The piece's own text: the same text always gets the same cut. */
  seed: string;
  kind?: FrameKind;
  /** A second outline behind the piece, for what tilts under the pointer. */
  echo?: boolean;
}) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => attachPointerLight(), []);

  useEffect(() => {
    const layer = ref.current;
    const host = layer?.parentElement;
    if (!layer || !host) return;
    const fill = layer.firstElementChild as HTMLElement;
    const paths = [...layer.querySelectorAll<SVGPathElement>("path[data-line]")].map((path) => ({
      path,
      lines: path.dataset.line!.split(" ") as ("outer" | "inner" | "bridges" | "outline")[],
    }));

    const stop = observeSize(host, (width, height) => {
      const frame = buildFrame({ width, height, seed, kind });
      layer.toggleAttribute("data-drawn", frame !== null);
      const drawn = {
        outer: frame ? toPath(frame.outer) : "",
        inner: frame ? toPath(frame.inner) : "",
        bridges: frame ? toPath(frame.bridges) : "",
        outline: frame ? `${toPath([frame.outline])}Z` : "",
      };
      for (const { path, lines } of paths) path.setAttribute("d", lines.map((line) => drawn[line]).join(""));
      if (!frame) return;
      const clip = toClipPath(frame.outline);
      fill.style.setProperty("clip-path", clip);
      // On the host only where something else needs it: a custom property there
      // restyles everything inside.
      if (kind !== "panel") return;
      const inset = Math.min(IMAGE_INSET, width / 8, height / 8);
      host.style.setProperty("--holo-clip", clip);
      host.style.setProperty("--holo-clip-image", toClipPath(insetPolygon(frame.outline, inset)));
    });
    return () => {
      stop();
      host.style.removeProperty("--holo-clip");
      host.style.removeProperty("--holo-clip-image");
    };
  }, [seed, kind]);

  return (
    <span ref={ref} className={styles.frame} aria-hidden="true">
      <span className={styles.fill}>
        <span className={styles.light} />
        <span className={styles.pulse} data-holo-pulse="" />
      </span>
      {echo && (
        <svg className={styles.echo} focusable="false">
          <path data-line="outline" />
        </svg>
      )}
      <svg className={styles.lines} focusable="false">
        <path className={styles.ring} data-line="outline" />
        <path className={styles.halo} data-line="outer inner" />
        <path className={styles.haloBridge} data-line="bridges" />
        <path className={styles.outer} data-line="outer" />
        <path className={styles.inner} data-line="inner" />
        <path className={styles.bridge} data-line="bridges" />
      </svg>
    </span>
  );
}
