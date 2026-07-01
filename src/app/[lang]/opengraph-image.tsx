import { ImageResponse } from "next/og";
import { hasLocale, defaultLocale, type Locale } from "@/i18n/config";

// Dynamic Open Graph / social card (LinkedIn, X, Slack previews) per locale.
export const alt = "Marco Filho — Senior AI/LLM & Backend Engineer";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const l: Locale = hasLocale(lang) ? lang : defaultLocale;

  const role =
    l === "pt-BR"
      ? "Engenheiro Sênior de IA/LLM & Backend"
      : "Senior AI/LLM & Backend Engineer";
  const tagline =
    l === "pt-BR"
      ? "6+ anos · 20+ produtos entregues · Go · TypeScript · IA/LLM"
      : "6+ yrs · 20+ products shipped · Go · TypeScript · AI/LLM";

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#0b0b10",
          padding: 80,
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            color: "#7b93ff",
            fontSize: 30,
            letterSpacing: 2,
          }}
        >
          maarkn.dev
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              fontSize: 92,
              fontWeight: 700,
              color: "#f5f6fa",
              lineHeight: 1.05,
            }}
          >
            Marco Filho
          </div>
          <div
            style={{
              fontSize: 42,
              color: "#4f6ef7",
              fontWeight: 600,
              marginTop: 20,
            }}
          >
            {role}
          </div>
        </div>
        <div style={{ display: "flex", fontSize: 30, color: "#9aa0ad" }}>
          {tagline}
        </div>
      </div>
    ),
    { ...size },
  );
}
