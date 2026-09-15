import { describe, expect, it } from "vitest";
import { createRegistry, TERMINAL_ALIASES } from "./registry";
import type { Command } from "./types";

const cmd = (name: string, extra: Partial<Command> = {}): Command => ({
  name,
  describe: name,
  run: () => [name],
  ...extra,
});

describe("registry", () => {
  it("resolves registered commands case-insensitively", () => {
    const registry = createRegistry([cmd("help"), cmd("whoami")]);
    expect(registry.resolve("help")?.name).toBe("help");
    expect(registry.resolve("HELP")?.name).toBe("help");
    expect(registry.resolve("WhoAmI")?.name).toBe("whoami");
    expect(registry.resolve("nope")).toBeUndefined();
  });

  it("resolves aliases before names, case-insensitively", () => {
    const registry = createRegistry([cmd("help"), cmd("whoami"), cmd("projects")], {
      "?": "help",
      about: "whoami",
      "4": "projects",
    });
    expect(registry.resolve("?")?.name).toBe("help");
    expect(registry.resolve("ABOUT")?.name).toBe("whoami");
    expect(registry.resolve("4")?.name).toBe("projects");
  });

  it("accepts aliases registered before their target and dangling aliases", () => {
    const registry = createRegistry([], { resume: "cv" });
    expect(registry.resolve("resume")).toBeUndefined();
    registry.register(cmd("cv"));
    expect(registry.resolve("resume")?.name).toBe("cv");
  });

  it("lists commands and names in registration order, without aliases", () => {
    const registry = createRegistry([cmd("whoami"), cmd("writing"), cmd("whereami")], {
      work: "projects",
    });
    expect(registry.names()).toEqual(["whoami", "writing", "whereami"]);
    expect(registry.list().map((c) => c.name)).toEqual(["whoami", "writing", "whereami"]);
  });

  it("re-registering a name replaces the command in place", () => {
    const registry = createRegistry([cmd("a"), cmd("b")]);
    registry.register(cmd("a", { describe: "again" }));
    expect(registry.names()).toEqual(["a", "b"]);
    expect(registry.resolve("a")?.describe).toBe("again");
  });

  it("ships the mockup alias table", () => {
    expect(TERMINAL_ALIASES).toMatchObject({
      "1": "whoami",
      "2": "experience",
      "3": "skills",
      "4": "projects",
      "5": "writing",
      "6": "contact",
      "?": "help",
      h: "help",
      about: "whoami",
      work: "projects",
      blog: "writing",
      posts: "writing",
      stack: "skills",
      career: "experience",
      resume: "cv",
    });
  });
});
