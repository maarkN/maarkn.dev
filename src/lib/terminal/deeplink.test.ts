import { describe, expect, it } from "vitest";
import { parseDeepLink } from "./deeplink";

const known = new Set(["whoami", "projects", "skills", "rm", "echo", "help", "?", "about", "cd"]);
const isKnown = (name: string) => known.has(name);

describe("parseDeepLink", () => {
  it("accepts a single registered command", () => {
    expect(parseDeepLink("projects", isKnown)).toEqual({ run: ["projects"] });
  });

  it("splits on ; and keeps the order", () => {
    expect(parseDeepLink("whoami;skills", isKnown)).toEqual({ run: ["whoami", "skills"] });
    expect(parseDeepLink(" whoami ; skills ;", isKnown)).toEqual({ run: ["whoami", "skills"] });
  });

  it("ignores markup and anything that is not a plain name", () => {
    expect(parseDeepLink("<script>", isKnown)).toEqual({ run: [] });
    expect(parseDeepLink("<script>alert(1)</script>", isKnown)).toEqual({ run: [] });
    expect(parseDeepLink("projects;<img src=x>", isKnown)).toEqual({ run: ["projects"] });
    expect(parseDeepLink("", isKnown)).toEqual({ run: [] });
    expect(parseDeepLink(null, isKnown)).toEqual({ run: [] });
  });

  it("drops names the registry does not know, aliases included", () => {
    expect(parseDeepLink("nope", isKnown)).toEqual({ run: [] });
    expect(parseDeepLink("about", isKnown)).toEqual({ run: ["about"] });
    expect(parseDeepLink("?", isKnown)).toEqual({ run: ["?"] });
    expect(parseDeepLink("1", isKnown)).toEqual({ run: [] });
  });

  it("keeps plain arguments and rejects the rest", () => {
    expect(parseDeepLink("rm -rf /", isKnown)).toEqual({ run: [] });
    expect(parseDeepLink("rm -rf", isKnown)).toEqual({ run: ["rm -rf"] });
    expect(parseDeepLink("echo hi there.", isKnown)).toEqual({ run: ["echo hi there."] });
    expect(parseDeepLink("echo <b>x</b>", isKnown)).toEqual({ run: [] });
    expect(parseDeepLink("echo a\nb", isKnown)).toEqual({ run: ["echo a b"] });
    expect(parseDeepLink("cd ~/projects", isKnown)).toEqual({ run: [] });
  });

  it("caps arguments at 80 characters", () => {
    const ok = `echo ${"a".repeat(80)}`;
    const long = `echo ${"a".repeat(81)}`;
    expect(parseDeepLink(ok, isKnown)).toEqual({ run: [ok] });
    expect(parseDeepLink(long, isKnown)).toEqual({ run: [] });
  });

  it("lowercases the name", () => {
    expect(parseDeepLink("PROJECTS", isKnown)).toEqual({ run: ["projects"] });
  });

  it("turns `ask` into a prefill and never runs it with a question", () => {
    expect(parseDeepLink("ask", isKnown)).toEqual({ run: [], prefill: "ask " });
    expect(parseDeepLink("ask what is this", isKnown)).toEqual({ run: [] });
    expect(parseDeepLink("projects;ask", isKnown)).toEqual({ run: ["projects"], prefill: "ask " });
  });
});
