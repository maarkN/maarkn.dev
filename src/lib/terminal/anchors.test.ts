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
    expect(anchorRedirect("https://maarkn.dev/en#contact")).toBe("/en?cmd=contact");
    expect(anchorRedirect("https://maarkn.dev/pt-BR#about")).toBe("/pt-BR?cmd=whoami");
    expect(anchorRedirect("https://maarkn.dev/en?cmd=skills#contact")).toBe("/en?cmd=skills");
    expect(anchorRedirect("https://maarkn.dev/en#other")).toBeNull();
    expect(anchorRedirect("https://maarkn.dev/en")).toBeNull();
  });
});
