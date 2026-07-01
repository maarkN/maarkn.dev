import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Marco Filho — maarkn.dev",
    short_name: "maarkn",
    description:
      "Senior AI/LLM & Backend Engineer — portfolio of Marco Filho (maarkn).",
    lang: "en",
    start_url: "/en",
    display: "standalone",
    background_color: "#0a0a0b",
    theme_color: "#4f6ef7",
    icons: [
      { src: "/favicon/favicon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/favicon/android-chrome-192x192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/favicon/android-chrome-512x512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}
