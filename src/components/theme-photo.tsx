"use client";

import Image from "next/image";
import { useTheme } from "./theme-provider";
import { cn } from "@/lib/utils";

const SRC = {
  light: "/photos/marco-light.png",
  dark: "/photos/marco-dark.png",
  dev: "/photos/marco-dev.png",
} as const;

export function ThemePhoto({
  className,
  priority = false,
  alt = "Marco Filho",
  sizes = "(min-width: 768px) 380px, 100vw",
}: {
  className?: string;
  priority?: boolean;
  alt?: string;
  sizes?: string;
}) {
  const { theme } = useTheme();

  return (
    <div className={cn("relative overflow-hidden", className)}>
      {(["light", "dark", "dev"] as const).map((t) => (
        <Image
          key={t}
          src={SRC[t]}
          alt={alt}
          fill
          priority={priority && t === "dark"}
          sizes={sizes}
          className={cn(
            "object-cover object-top transition-opacity duration-500",
            theme === t ? "opacity-100" : "opacity-0"
          )}
        />
      ))}
    </div>
  );
}
