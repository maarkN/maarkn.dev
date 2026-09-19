import { describe, expect, it } from "vitest";
import { describeAdminRoute } from "./admin-route-chrome";

describe("describeAdminRoute", () => {
  it("dresses the dashboard as the admin home", () => {
    expect(describeAdminRoute("/admin")).toEqual({
      path: "~/admin",
      command: "ls",
      back: "/",
    });
  });

  it("dresses a listing as `ls <dir>/`, going back to ~/admin", () => {
    expect(describeAdminRoute("/admin/applications")).toEqual({
      path: "~/admin/applications",
      command: "ls applications/",
      back: "/admin",
    });
  });

  it("keeps the board in the applications directory", () => {
    expect(describeAdminRoute("/admin/applications/board")).toEqual({
      path: "~/admin/applications",
      command: "ls applications/ --group-by=stage",
      back: "/admin",
    });
  });

  it("dresses the creation screen as `touch`", () => {
    expect(describeAdminRoute("/admin/applications/new")).toEqual({
      path: "~/admin/applications/new",
      command: "touch applications/new.md",
      back: "/admin/applications",
    });
  });

  it("uses the folderName on the detail screen", () => {
    expect(
      describeAdminRoute("/admin/applications/clx123", "shopify-senior-backend-ca"),
    ).toEqual({
      path: "~/admin/applications/shopify-senior-backend-ca",
      command: "cat applications/shopify-senior-backend-ca.md",
      back: "/admin/applications",
    });
  });

  it("falls back to the id when the folderName never arrived", () => {
    expect(describeAdminRoute("/admin/applications/clx123")).toEqual({
      path: "~/admin/applications/clx123",
      command: "cat applications/clx123.md",
      back: "/admin/applications",
    });
    expect(describeAdminRoute("/admin/applications/clx123", "  ")).toEqual({
      path: "~/admin/applications/clx123",
      command: "cat applications/clx123.md",
      back: "/admin/applications",
    });
  });

  it("sends `cd ..` from the edit form to the detail screen", () => {
    expect(
      describeAdminRoute("/admin/applications/clx123/edit", "shopify-senior-backend-ca"),
    ).toEqual({
      path: "~/admin/applications/shopify-senior-backend-ca",
      command: "vim applications/shopify-senior-backend-ca.md",
      back: "/admin/applications/clx123",
    });
  });

  it("sends `cd ..` to the listing when the section has no detail screen", () => {
    expect(describeAdminRoute("/admin/projects/p1/edit")).toEqual({
      path: "~/admin/projects/p1",
      command: "vim projects/p1.md",
      back: "/admin/projects",
    });
  });

  it("dresses the generation as `less`, by id", () => {
    expect(describeAdminRoute("/admin/generator/g1")).toEqual({
      path: "~/admin/generator/g1",
      command: "less generations/g1.md",
      back: "/admin/generator",
    });
  });

  it("covers the remaining listings of the table", () => {
    const table: Record<string, [string, string]> = {
      "/admin/jobs": ["~/admin/jobs", "ls jobs/"],
      "/admin/contacts": ["~/admin/contacts", "ls contacts/"],
      "/admin/projects": ["~/admin/projects", "ls projects/"],
      "/admin/generator": ["~/admin/generator", "ls generations/"],
      "/admin/api-keys": ["~/admin/api-keys", "cat authorized_keys"],
      "/admin/audit": ["~/admin/audit", "tail -f audit.log"],
      "/admin/chat": ["~/admin/chat", "tail chat.log"],
      "/admin/settings": ["~/admin/settings", "vim ~/.config/admin.conf"],
    };
    for (const [pathname, [path, command]] of Object.entries(table)) {
      expect(describeAdminRoute(pathname)).toEqual({ path, command, back: "/admin" });
    }
  });

  it("falls back to `ls` on an unknown route", () => {
    expect(describeAdminRoute("/admin/replies")).toEqual({
      path: "~/admin/replies",
      command: "ls",
      back: "/admin",
    });
    expect(describeAdminRoute("/admin/jobs/j1/extra")).toEqual({
      path: "~/admin/jobs/j1/extra",
      command: "ls",
      back: "/admin",
    });
  });
});
