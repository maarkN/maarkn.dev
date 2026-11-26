import { describe, expect, it } from "vitest";

import { isOwnEmail, isOwnPhone, maskContactPii, maskContactPiiHead } from "@/lib/mcp/redact";

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

/**
 * A list shows the beginning of each long text. Only the beginning goes through
 * the mask, and what comes out is the beginning of the whole text masked.
 */
describe("maskContactPiiHead", () => {
  const whole = (text: string, max: number) => {
    const masked = maskContactPii(text);
    return { head: masked.slice(0, max), truncated: masked.length > max };
  };

  const TOKENS = [
    "word ",
    "prose, ",
    "\n",
    "jane@acme.example ",
    "jane@acme.example",
    "+1 (555) 010-0199 ",
    "+1 (555) 010-0199",
    "   ",
    `${"x".repeat(200)}@acme.example `,
    "a.".repeat(150),
    "é",
    "x@y.zz",
  ];

  it("equals the beginning of the whole text masked, on 3000 random texts", () => {
    const rand = seeded(20261127);
    for (let n = 0; n < 3000; n += 1) {
      const max = [1, 40, 500][n % 3];
      const target = Math.floor(rand() * (max + 1200));
      let input = "";
      while (input.length < target) input += TOKENS[Math.floor(rand() * TOKENS.length)];
      expect(maskContactPiiHead(input, max), `max ${max}, input: ${JSON.stringify(input)}`).toEqual(
        whole(input, max),
      );
    }
  });

  it("a contact across the cut is masked whole", () => {
    for (let pad = 400; pad <= 800; pad += 1) {
      const input = `${"w ".repeat(pad / 2)}jane@acme.example +1 (555) 010-0199 ${"tail ".repeat(200)}`;
      const { head } = maskContactPiiHead(input, 500);
      expect(head).not.toMatch(/jane|acme|555|0199/);
      expect(maskContactPiiHead(input, 500)).toEqual(whole(input, 500));
    }
  });

  it("long contacts that shrink the beginning do not let a piece of the next one out", () => {
    const longEmail = `${"x".repeat(240)}@acme.example`;
    const input = `${`${longEmail} `.repeat(4)}${"y".repeat(300)}@acme.example ${"tail ".repeat(400)}`;
    const { head } = maskContactPiiHead(input, 500);
    expect(head).not.toContain("x");
    expect(head).not.toContain("y");
    expect(maskContactPiiHead(input, 500)).toEqual(whole(input, 500));
  });
});
