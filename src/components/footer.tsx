import { Socials } from "./socials";
import { site } from "@/lib/site";

type Labels = {
  available: string;
  location: string;
  rights: string;
};
type SocialLabels = React.ComponentProps<typeof Socials>["labels"];

export function Footer({
  labels,
  socials,
}: {
  labels: Labels;
  socials: SocialLabels;
}) {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-[var(--border)]">
      <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-8 px-6 py-12 md:flex-row md:items-center md:justify-between md:px-12">
        <div>
          <p className="font-display text-sm font-semibold tracking-tight text-[var(--text)]">
            maarkn<span className="text-[var(--accent)]">.dev</span>
          </p>
          <p className="mt-1 text-xs text-[var(--muted)]">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--green)] align-middle mr-2" />
            {labels.available} · {labels.location}
          </p>
        </div>
        <Socials labels={socials} />
        <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--muted)]">
          © {year} {site.name}. {labels.rights}
        </p>
      </div>
    </footer>
  );
}
