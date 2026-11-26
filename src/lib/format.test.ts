import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { ADMIN_LOCALES } from "./admin/locale";
import { DEFAULT_TIME_ZONE, knownTimeZone, resolveTimeZone, timeZones } from "./admin/time-zone";
import { createFormat, EMPTY, toDateInputValue } from "./format";

const pt = createFormat({ locale: "pt-BR", timeZone: DEFAULT_TIME_ZONE });
const en = createFormat({ locale: "en", timeZone: DEFAULT_TIME_ZONE });
const at = (timeZone: string) => createFormat({ locale: "pt-BR", timeZone });

/** Written by the day the form sent: midnight, UTC. */
const SENT = new Date("2026-08-04");
/** 4 August, 01:30 in UTC: still 3 August in São Paulo. */
const LOGGED = new Date("2026-08-04T01:30:00Z");

describe("dates, in the two languages", () => {
  it("say the same day, each its own way", () => {
    expect(pt.formatDate(SENT)).toBe("04/08/2026");
    // By name: 8/4 would be read as 8 April by whoever reads Portuguese too.
    expect(en.formatDate(SENT)).toBe("Aug 4, 2026");
    expect(pt.formatDateTime(LOGGED)).toBe("03/08/2026, 22:30");
    expect(en.formatDateTime(LOGGED)).toBe("Aug 3, 2026, 22:30");
  });

  it("say midnight as 00, and not as 24", () => {
    expect(pt.formatDateTime("2026-08-04T03:00:00Z")).toBe("04/08/2026, 00:00");
    expect(en.formatDateTime("2026-08-04T03:00:00Z")).toBe("Aug 4, 2026, 00:00");
  });
});

describe("a calendar date and an instant", () => {
  it("the date does not move with the zone; the instant does", () => {
    for (const zone of ["America/Sao_Paulo", "Pacific/Kiritimati", "Pacific/Pago_Pago", "Asia/Tokyo", "UTC"]) {
      expect(at(zone).formatDate(SENT), zone).toBe("04/08/2026");
    }
    expect(at("UTC").formatDateTime(LOGGED)).toBe("04/08/2026, 01:30");
    expect(at("Asia/Tokyo").formatDateTime(LOGGED)).toBe("04/08/2026, 10:30");
    expect(at("America/Toronto").formatDateTime(LOGGED)).toBe("03/08/2026, 21:30");
  });

  it("the date goes back into its field as it came out", () => {
    expect(toDateInputValue(new Date("2026-08-04"))).toBe("2026-08-04");
    expect(toDateInputValue(new Date("2026-01-01"))).toBe("2026-01-01");
  });

  it("does not depend on where the code runs", () => {
    const script = `
      const loaded = await import("./src/lib/format.ts");
      // Node 22 sees the module as CommonJS, with everything under \`default\`.
      const f = (loaded.createFormat ?? loaded.default.createFormat)({ locale: "en", timeZone: "America/Sao_Paulo" });
      console.log(f.formatDate(new Date("2026-08-04")), f.formatDateTime("2026-08-04T01:30:00Z"));`;
    const seen = ["Pacific/Auckland", "America/Los_Angeles"].map((TZ) =>
      execFileSync("node_modules/.bin/tsx", ["--input-type=module", "-e", script], {
        env: { ...process.env, TZ, LANG: "de_DE.UTF-8", LC_ALL: "de_DE.UTF-8" },
        encoding: "utf8",
      }).trim(),
    );
    expect(seen).toEqual(["Aug 4, 2026 Aug 3, 2026, 22:30", "Aug 4, 2026 Aug 3, 2026, 22:30"]);
  }, 30_000);
});

describe("numbers", () => {
  it("follow the language", () => {
    expect(pt.formatNumber(1062.5)).toBe("1.062,5");
    expect(en.formatNumber(1062.5)).toBe("1,062.5");
    expect(pt.formatPercent(0.0525, 1)).toBe("5,3%");
    expect(en.formatPercent(0.0525, 1)).toBe("5.3%");
    expect(en.formatPercent(52, 0, { alreadyScaled: true })).toBe("52%");
    expect(pt.formatMoney("1500")).toMatch(/^R\$\s1\.500,00$/);
    expect(en.formatMoney("1500", "cad")).toMatch(/^CA\$1,500\.00$/);
  });
});

describe("nothing to say", () => {
  it("is a dash, and an empty field", () => {
    for (const format of [pt, en]) {
      for (const nothing of [null, undefined, ""]) {
        expect(format.formatDate(nothing)).toBe(EMPTY);
        expect(format.formatDateTime(nothing)).toBe(EMPTY);
        expect(format.formatNumber(nothing)).toBe(EMPTY);
        expect(format.formatPercent(nothing)).toBe(EMPTY);
        expect(format.formatMoney(nothing)).toBe(EMPTY);
      }
      expect(format.formatDate("not a date")).toBe(EMPTY);
      expect(format.formatNumber("not a number")).toBe(EMPTY);
      // Zero is something.
      expect(format.formatNumber(0)).toBe("0");
      expect(format.formatPercent(0)).toBe("0%");
    }
    expect(toDateInputValue(null)).toBe("");
  });
});

describe("the same settings", () => {
  it("give the same formatters, so that a render of a hundred rows builds one", () => {
    for (const locale of ADMIN_LOCALES) {
      const settings = { locale, timeZone: "UTC" };
      expect(createFormat(settings)).toBe(createFormat({ ...settings }));
    }
    expect(pt).not.toBe(en);
  });
});

describe("the time zone", () => {
  it("is São Paulo until another one is chosen, and when the choice is not one", () => {
    for (const saved of [undefined, null, "", "Mars/Olympus", "+03:00", "America/Sao_Paulo; path=/", "a".repeat(90), 3]) {
      expect(resolveTimeZone(saved)).toBe("America/Sao_Paulo");
    }
    expect(resolveTimeZone("Europe/Dublin")).toBe("Europe/Dublin");
  });

  it("is written as the runtime writes it", () => {
    expect(knownTimeZone("europe/dublin")).toBe("Europe/Dublin");
    expect(knownTimeZone("Europe/Nowhere")).toBeNull();
    expect(timeZones()).toContain("America/Sao_Paulo");
  });

  it("that this runtime does not know does not take the screen down", () => {
    expect(createFormat({ locale: "en", timeZone: "Mars/Olympus" }).formatDateTime(LOGGED)).toBe("Aug 3, 2026, 22:30");
  });
});
