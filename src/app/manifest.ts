import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Marco Filho — maarkn@dev",
    short_name: "maarkn",
    description:
      "Marco Filho — Senior AI/LLM & Backend Engineer. 6+ years, 20+ products shipped end-to-end.",
    lang: "en",
    start_url: "/en",
    display: "standalone",
    // Dracula-soft background: matches `viewport.themeColor` and the favicon.
    background_color: "#282A36",
    theme_color: "#282A36",
    icons: [
      { src: "/favicon/favicon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/favicon/android-chrome-192x192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/favicon/android-chrome-512x512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}
