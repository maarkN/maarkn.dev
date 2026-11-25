import { describe, expect, it } from "vitest";
import { anchorCommand, anchorRedirect } from "./anchors";

describe("old anchors", () => {
  it("maps the three sections of the old home", () => {
    expect(anchorCommand("#contact")).toBe("contact");
    expect(anchorCommand("#projects")).toBe("projects");
    expect(anchorCommand("#about")).toBe("whoami");
    expect(anchorCommand("#About")).toBe("whoami");
    expect(anchorCommand("#nope")).toBeNull();
    expect(anchorCommand("")).toBeNull();
  });

  it("rewrites the URL to ?cmd= without the hash", () => {
    expect(anchorRedirect("https://maarkn.dev/en/terminal#contact")).toBe("/en/terminal?cmd=contact");
    expect(anchorRedirect("https://maarkn.dev/pt-BR/terminal#about")).toBe("/pt-BR/terminal?cmd=whoami");
    expect(anchorRedirect("https://maarkn.dev/en/terminal?cmd=skills#contact")).toBe("/en/terminal?cmd=skills");
    expect(anchorRedirect("https://maarkn.dev/en/terminal#other")).toBeNull();
    expect(anchorRedirect("https://maarkn.dev/en/terminal")).toBeNull();
  });
});
