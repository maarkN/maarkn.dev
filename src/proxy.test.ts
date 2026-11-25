import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { proxy } from "./proxy";

const BASE = "https://maarkn.dev";

function visit(path: string, { cookie, accept }: { cookie?: string; accept?: string } = {}) {
  const headers = new Headers();
  if (cookie) headers.set("cookie", `locale=${cookie}`);
  if (accept) headers.set("accept-language", accept);
  const response = proxy(new NextRequest(new URL(path, BASE), { headers }));
  const location = response?.headers.get("location") ?? null;
  return { status: response?.status ?? null, to: location && location.slice(BASE.length) };
}

describe("a path without a locale", () => {
  it("gets the language of the cookie, of the browser, or English", () => {
    expect(visit("/", { cookie: "pt-BR", accept: "en" }).to).toBe("/pt-BR");
    expect(visit("/", { cookie: "fr", accept: "pt-PT,pt;q=0.9" }).to).toBe("/pt-BR");
    expect(visit("/", { accept: "de" }).to).toBe("/en");
    expect(visit("/").to).toBe("/en");
  });

  it("keeps the rest of the address", () => {
    expect(visit("/projects?cat=ai").to).toBe("/en/projects?cat=ai");
    expect(visit("/terminal?cmd=projects").to).toBe("/en/terminal?cmd=projects");
    // An unknown language is not a language: there is no page under /en/fr.
    expect(visit("/fr/terminal").to).toBe("/en/fr/terminal");
  });

  it("is left alone when it has one", () => {
    expect(visit("/en").status).toBeNull();
    expect(visit("/pt-BR/projects?cat=ai").status).toBeNull();
    expect(visit("/en/terminal?cmd=projects").status).toBeNull();
  });
});

describe("?cmd= on the home, where the CLI version used to be", () => {
  it("goes to the CLI version with the same command, temporarily", () => {
    expect(visit("/en?cmd=projects")).toEqual({ status: 307, to: "/en/terminal?cmd=projects" });
    expect(visit("/pt-BR?cmd=open%201").to).toBe("/pt-BR/terminal?cmd=open%201");
  });

  it("keeps several commands, and whatever else came along, as they were written", () => {
    expect(visit("/en?cmd=whoami;skills;open+1&utm_source=x").to).toBe(
      "/en/terminal?cmd=whoami;skills;open+1&utm_source=x",
    );
  });

  it("does not judge the value: an invalid one is the terminal's to ignore", () => {
    expect(visit("/en?cmd=%3Cscript%3E").to).toBe("/en/terminal?cmd=%3Cscript%3E");
    expect(visit("/en?cmd=").to).toBe("/en/terminal?cmd=");
  });

  it("is a single redirect from the root, in the visitor's language", () => {
    expect(visit("/?cmd=projects", { cookie: "pt-BR" }).to).toBe("/pt-BR/terminal?cmd=projects");
  });

  it("only applies to the home", () => {
    expect(visit("/en/projects?cmd=projects").status).toBeNull();
    expect(visit("/en?ref=cmd").status).toBeNull();
  });
});
