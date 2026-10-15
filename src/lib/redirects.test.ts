import { describe, it, expect } from "vitest";
import nextConfig, { shortLinks } from "../../next.config";

/** Guards the Claude Remote short links (`curl … | bash` depends on the first one). */
describe("Claude Remote short links", () => {
  it("are the redirects of the app", async () => {
    expect(await nextConfig.redirects!()).toBe(shortLinks);
  });

  it("point the installer at the raw script on main, temporarily", () => {
    const installer = shortLinks.find((r) => r.source === "/claude-remote/install.sh");
    expect(installer).toEqual({
      source: "/claude-remote/install.sh",
      destination: "https://raw.githubusercontent.com/maarkN/claude-remote/main/install.sh",
      permanent: false,
    });
  });

  it("point the Windows installer at the raw script on main, temporarily", () => {
    const installer = shortLinks.find((r) => r.source === "/claude-remote/install.ps1");
    expect(installer).toEqual({
      source: "/claude-remote/install.ps1",
      destination: "https://raw.githubusercontent.com/maarkN/claude-remote/main/install.ps1",
      permanent: false,
    });
  });

  it("only send to https destinations", () => {
    for (const link of shortLinks) expect(link.destination).toMatch(/^https:\/\//);
  });
});
