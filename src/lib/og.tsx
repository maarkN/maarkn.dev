import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { Locale } from "@/i18n/config";
import { site } from "@/lib/site";

/*
 * Open Graph / Twitter card in the terminal's identity, shared by the home
 * and the inner pages: the tmux-style bar with `maarkn@dev`, an echoed
 * command (`whoami`, `cat projects/<slug>.md`…), the output lines and a
 * prompt with a block cursor. Colours are the `soft` palette from
 * globals.css; the face is a 30 KB subset of Cascadia Code (see
 * src/app/fonts/CascadiaCode-LICENSE.md) since Satori needs a .ttf.
 */

export const OG_SIZE = { width: 1200, height: 630 } as const;
export const OG_CONTENT_TYPE = "image/png";

const PALETTE = {
  bg: "#282A36",
  bgDim: "#21222C",
  line: "#363949",
  comment: "#8F93A0",
  fg: "#F6F6F4",
  cyan: "#97E1F1",
  green: "#62E884",
  purple: "#BF9EEE",
  yellow: "#E7EE98",
} as const;

const FONT = "Cascadia Code";
const FONT_DIR = join(process.cwd(), "src/app/fonts");

let fontsPromise: Promise<NonNullable<ConstructorParameters<typeof ImageResponse>[1]>["fonts"]> | null =
  null;

/** Regular + Bold, read once per server process. */
function loadFonts() {
  fontsPromise ??= Promise.all([
    readFile(join(FONT_DIR, "CascadiaCode-Regular.og.ttf")),
    readFile(join(FONT_DIR, "CascadiaCode-Bold.og.ttf")),
  ]).then(([regular, bold]) => [
    { name: FONT, data: regular, weight: 400 as const, style: "normal" as const },
    { name: FONT, data: bold, weight: 700 as const, style: "normal" as const },
  ]);
  return fontsPromise;
}

export type OgCard = {
  locale: Locale;
  /** Location shown in the bar, e.g. `~` or `~/projects/<slug>`. */
  path: string;
  /** Command echoed after the prompt, e.g. `whoami`. */
  command: string;
  /** First output line, bold and large. Long titles wrap onto two lines. */
  title: string;
  /** Second output line, in purple. */
  subtitle?: string;
  /** Up to three dim lines below the subtitle. */
  lines?: string[];
  /** Green `●` status line, e.g. availability. */
  status?: string;
};

const clamp = (text: string, max: number) =>
  text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;

function Ps1() {
  return (
    <span style={{ display: "flex" }}>
      <span style={{ color: PALETTE.green }}>{site.nick}@dev</span>
      <span style={{ color: PALETTE.fg }}>:</span>
      <span style={{ color: PALETTE.purple }}>~</span>
      <span style={{ color: PALETTE.fg }}>$&nbsp;</span>
    </span>
  );
}

/** Renders the card. Every route's `opengraph-image.tsx` calls this. */
export async function terminalOgImage(card: OgCard): Promise<ImageResponse> {
  const fonts = await loadFonts();
  const lang = card.locale === "pt-BR" ? "pt" : "en";
  const title = clamp(card.title, 96);
  const subtitle = card.subtitle ? clamp(card.subtitle, 110) : null;
  const lines = (card.lines ?? []).slice(0, 3).map((line) => clamp(line, 120));

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: PALETTE.bg,
          color: PALETTE.fg,
          fontFamily: FONT,
          fontSize: 28,
        }}
      >
        {/* status bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            height: 64,
            background: PALETTE.bgDim,
            borderBottom: `2px solid ${PALETTE.line}`,
            fontSize: 26,
            paddingRight: 32,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              height: "100%",
              padding: "0 28px",
              background: PALETTE.purple,
              color: PALETTE.bg,
              fontWeight: 700,
            }}
          >
            {site.nick}@dev
          </div>
          <div style={{ display: "flex", padding: "0 28px", color: PALETTE.comment, flex: 1 }}>
            {card.path}
          </div>
          <div style={{ display: "flex", color: PALETTE.comment }}>
            lang&nbsp;<span style={{ color: PALETTE.cyan }}>{lang}</span>
          </div>
          <div style={{ display: "flex", color: PALETTE.yellow, paddingLeft: 28 }}>--:--</div>
        </div>

        {/* screen */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            padding: "44px 64px 40px",
            lineHeight: 1.4,
          }}
        >
          <div style={{ display: "flex" }}>
            <Ps1 />
            <span>{card.command}</span>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              flex: 1,
              justifyContent: "center",
              paddingBottom: 12,
            }}
          >
            <div
              style={{
                display: "flex",
                fontSize: title.length > 48 ? 44 : 56,
                fontWeight: 700,
                lineHeight: 1.2,
                marginBottom: subtitle || lines.length ? 20 : 0,
              }}
            >
              {title}
            </div>
            {subtitle ? (
              <div style={{ display: "flex", color: PALETTE.purple, fontSize: 32, marginBottom: 14 }}>
                {subtitle}
              </div>
            ) : null}
            {lines.map((line, i) => (
              <div key={i} style={{ display: "flex", color: PALETTE.comment, fontSize: 27 }}>
                {line}
              </div>
            ))}
            {card.status ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  color: PALETTE.green,
                  fontSize: 27,
                  marginTop: 10,
                }}
              >
                <span
                  style={{
                    display: "flex",
                    width: 12,
                    height: 12,
                    borderRadius: 6,
                    background: PALETTE.green,
                    marginRight: 14,
                  }}
                />
                {card.status}
              </div>
            ) : null}
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center" }}>
              <Ps1 />
              <span
                style={{
                  display: "flex",
                  width: 16,
                  height: 32,
                  background: PALETTE.fg,
                }}
              />
            </div>
            <div style={{ display: "flex", color: PALETTE.comment, fontSize: 24 }}>{site.domain}</div>
          </div>
        </div>
      </div>
    ),
    { ...OG_SIZE, fonts },
  );
}
