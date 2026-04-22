import Image from "next/image";
import type { Post } from "@/lib/ghost";

export function PostCover({
  post,
  aspect = "16/9",
  overlayLabel,
}: {
  post: Post;
  aspect?: "16/9" | "21/9" | "1/1";
  overlayLabel?: string;
}) {
  if (post.featureImage) {
    return (
      <div
        className="relative w-full overflow-hidden border-b border-[var(--border)]"
        style={{ aspectRatio: aspect }}
      >
        <Image
          src={post.featureImage}
          alt={post.title}
          fill
          sizes="(min-width: 1024px) 860px, 100vw"
          className="object-cover"
        />
        {overlayLabel ? (
          <span className="absolute left-5 top-5 inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-white/85">
            <span className="h-1.5 w-1.5 rounded-full bg-white/85" />
            {overlayLabel}
          </span>
        ) : null}
      </div>
    );
  }

  const { from, to, monogram } = post.cover;
  return (
    <div
      className="relative w-full overflow-hidden border-b border-[var(--border)]"
      style={{ aspectRatio: aspect, backgroundColor: from }}
    >
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `radial-gradient(120% 80% at 0% 0%, ${from} 0%, transparent 60%), radial-gradient(120% 80% at 100% 100%, ${to} 0%, transparent 60%), linear-gradient(135deg, ${from} 0%, ${to} 100%)`,
        }}
      />
      <div
        className="absolute inset-0 mix-blend-overlay opacity-50"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.18) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.18) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />
      {overlayLabel ? (
        <span className="absolute left-5 top-5 inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-white/85">
          <span className="h-1.5 w-1.5 rounded-full bg-white/85" />
          {overlayLabel}
        </span>
      ) : null}
      <span
        aria-hidden
        className="absolute bottom-4 left-5 font-display text-[clamp(2.6rem,5vw,4rem)] font-bold leading-none tracking-[-0.05em] text-white drop-shadow-[0_4px_24px_rgba(0,0,0,0.35)]"
      >
        {monogram}
      </span>
    </div>
  );
}
