import Link from "next/link";
import { controlClass } from "@/components/holo/button";
import { HoloFrame } from "@/components/holo/frame";
import { trail, type Step } from "@/lib/admin/nav";
import type { ShellLabels } from "./labels";
import styles from "./shell.module.css";

/** The way back from a screen inside another: the entry of the menu, the record, the screen. */
export function Trail({ pathname, name, labels }: { pathname: string; name?: string | null; labels: ShellLabels }) {
  const steps = trail(pathname, name);
  if (steps.length === 0) return null;
  const nameOf = (step: Step) =>
    "nav" in step ? labels.nav.items[step.nav] : "screen" in step ? labels.nav.screens[step.screen] : step.text;

  return (
    <nav className={styles.trail} aria-label={labels.shell.trail}>
      <ol>
        {steps.map((step, index) => {
          const text = nameOf(step);
          return (
            <li key={index}>
              {step.href ? (
                <Link href={step.href} data-holo="" className={controlClass({ size: "sm", className: styles.step })}>
                  <HoloFrame seed={text} />
                  <span className={styles.stepName}>{text}</span>
                </Link>
              ) : (
                <span aria-current={index === steps.length - 1 ? "page" : undefined}>{text}</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
