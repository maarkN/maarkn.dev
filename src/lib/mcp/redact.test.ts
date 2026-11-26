import { describe, expect, it } from "vitest";

import { isOwnEmail, isOwnPhone, maskContactPii } from "@/lib/mcp/redact";

/**
 * `maskContactPii` runs over third-party text on every READ (the company's
 * text, an interview's notes, the body of an event), so it cannot be a DoS: who
 * writes the text is exactly who should not be able to spend the server's CPU.
 */

/** The regexes the scanner replaced. Fine on short texts, quadratic on long ones. */
const LEGACY_EMAIL = () => /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const LEGACY_PHONE = () => /\+\d[\d\s().-]{6,}\d/g;

function legacyMask(text: string): string {
  return text
    .replace(LEGACY_EMAIL(), (m) => (isOwnEmail(m) ? m : "[e-mail omitido]"))
    .replace(LEGACY_PHONE(), (m) => (isOwnPhone(m) ? m : "[telefone omitido]"));
}

function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x1_0000_0000;
  };
}

describe("maskContactPii — same matches as the regex it replaced", () => {
  const ALPHABET = [..."ab.Z9-_%+@ ,(é\n"];

  it("on 5000 random texts", () => {
    const rand = seeded(20261126);
    for (let n = 0; n < 5000; n += 1) {
      const len = Math.floor(rand() * 40);
      let input = "";
      for (let i = 0; i < len; i += 1) input += ALPHABET[Math.floor(rand() * ALPHABET.length)];
      expect(maskContactPii(input), `input: ${JSON.stringify(input)}`).toBe(legacyMask(input));
    }
  });

  it("on the known cases", () => {
    const cases = [
      "Write to jane@acme.example.",
      "jane@acme.example,joe@acme.example",
      "a@b.cc-d@e.com",
      "x@y and @acme.com and a@b.c and a@.co and a@b..cc",
      "user.name+tag@sub.domain.co.uk)",
      "contact@maarkn.dev stays, jane@acme.example goes",
      "a@b@c.com",
      "Call +1 (555) 010-0199 or +55 62 98173 6748.",
      "e-mail é jane@acme.example",
      "",
      "@",
    ];
    for (const text of cases) {
      expect(maskContactPii(text), `case: ${JSON.stringify(text)}`).toBe(legacyMask(text));
    }
    expect(maskContactPii("Write to jane@acme.example.")).toBe("Write to [e-mail omitido].");
  });
});

/**
 * The old email regex, measured on this machine: ~630 ms for 20 000 characters
 * of "a." and ~16 s for 100 000, with the event loop stuck. The budget below is
 * far above what a linear scan spends (~1 ms) and far below the old cost, so it
 * breaks as soon as the backtracking comes back, whatever the speed of CI.
 */
describe("maskContactPii — cost", () => {
  const LONG = 60_000;
  const BUDGET_MS = 250;

  function timeMs(text: string): number {
    const started = performance.now();
    const out = maskContactPii(text);
    const elapsed = performance.now() - started;
    expect(typeof out).toBe("string");
    return elapsed;
  }

  const PATHOLOGICAL: Record<string, string> = {
    "'a.' up to 60k, no @": "a.".repeat(LONG / 2),
    "'a' x 60k, then an @ with no domain": `${"a".repeat(LONG)}@${"b".repeat(50)}`,
    "'a@' up to 60k": "a@".repeat(LONG / 2),
    "'a@b.' up to 60k": "a@b.".repeat(LONG / 4),
    "'-' x 60k": "-".repeat(LONG),
    "'+1 ' up to 60k": "+1 ".repeat(LONG / 3),
  };

  it.each(Object.entries(PATHOLOGICAL))("finishes quickly on %s", (_name, text) => {
    expect(timeMs(text)).toBeLessThan(BUDGET_MS);
  });
});

