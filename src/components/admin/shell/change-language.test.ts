import { afterEach, expect, it, vi } from "vitest";
import { changeLanguage } from "./change-language";

afterEach(() => vi.unstubAllGlobals());

it("keeps the choice for the next visits, and only then loads the document again", () => {
  const jar = { cookie: "" };
  const sent: string[] = [];
  vi.stubGlobal("document", jar);
  vi.stubGlobal("window", { location: { reload: () => sent.push(jar.cookie) } });
  changeLanguage("en");
  expect(sent).toHaveLength(1);
  expect(sent[0]).toMatch(/^admin-locale=en; path=\/admin; max-age=\d{7,};/);
});
