import { describe, expect, it } from "vitest";
import { describeRoute } from "./route-chrome";

describe("cd ..", () => {
  it("goes from a listing to the CLI version, with the command that prints it", () => {
    expect(describeRoute("/en/projects").back).toBe("/en/terminal?cmd=projects");
    expect(describeRoute("/pt-BR/career").back).toBe("/pt-BR/terminal?cmd=experience");
    expect(describeRoute("/en/blog").back).toBe("/en/terminal?cmd=writing");
    expect(describeRoute("/en/links").back).toBe("/en/terminal?cmd=contact");
  });

  it("goes from a page to its listing", () => {
    expect(describeRoute("/en/projects/x")).toEqual({
      path: "~/projects/x",
      command: "cat projects/x.md",
      back: "/en/projects",
    });
  });
});
