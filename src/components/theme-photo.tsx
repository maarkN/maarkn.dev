"use client";

import Image from "next/image";
import { useTheme } from "./theme-provider";
import { cn } from "@/lib/utils";

const SRC = {
  soft: "/photos/marco-dark.png",
  classic: "/photos/marco-light.png",
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
      {(["soft", "classic"] as const).map((t) => (
        <Image
          key={t}
          src={SRC[t]}
          alt={alt}
          fill
          priority={priority && t === "soft"}
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
