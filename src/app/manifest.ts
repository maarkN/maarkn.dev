import type { MetadataRoute } from "next";
import { SITE_NAME } from "@/lib/seo";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Marco Filho — maarkn.dev",
    short_name: SITE_NAME,
    description:
      "Senior AI/LLM & Backend Engineer — portfolio of Marco Filho (maarkn).",
    start_url: "/en",
    display: "standalone",
    background_color: "#0b0b10",
    theme_color: "#0b0b10",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
  };
}
