/**
 * A refusal of the server says what happened and nothing of how (spec
 * admin-forms, "Falha do servidor"): the sentence is the dictionary's, in the
 * language of the screen, and neither it nor the log carries the data of the
 * call, which here is someone else's personal data.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import en from "@/dictionaries/en.json";
import ptBR from "@/dictionaries/pt-BR.json";

let jar: Record<string, string> = {};
const remove = vi.fn();
const update = vi.fn();
vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: (name: string) => (name in jar ? { name, value: jar[name] } : undefined) }),
  headers: async () => new Headers(),
}));
vi.mock("@/lib/auth", () => ({ auth: async () => ({ user: { email: "owner@example.com" } }) }));
vi.mock("@/lib/db", () => ({
  dbConfigured: true,
  db: { contact: { delete: (...a: unknown[]) => remove(...a), update: (...a: unknown[]) => update(...a) }, company: {} },
}));

const { deleteContact, saveContact } = await import("./contacts");

/** What Prisma does: the data of the call inside the message. */
const leaky = Object.assign(new Error('Invalid `db.contact.update()`: { email: "jane@acme.example", phone: "+1 416 555 0100" }'), {
  code: "P2000",
});

beforeEach(() => {
  jar = {};
  remove.mockReset();
  update.mockReset();
});

function form(fields: Record<string, string>) {
  const data = new FormData();
  for (const [name, value] of Object.entries(fields)) data.set(name, value);
  return data;
}

describe("a failure of the server", () => {
  it("is a sentence of the dictionary, in the language of the screen, without the data", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    update.mockRejectedValue(leaky);
    for (const [locale, words] of [["pt-BR", ptBR], ["en", en]] as const) {
      jar = { "admin-locale": locale };
      const result = await saveContact("c1", form({ name: "Jane Doe", email: "jane@acme.example" }));
      expect(result).toEqual({ ok: false, message: words.admin.contacts.contact.failed });
    }
    const logged = log.mock.calls.map((call) => call.map(String).join(" ")).join("\n");
    expect(logged).not.toContain("jane@acme.example");
    expect(logged).not.toContain("555");
    log.mockRestore();
  });

  it("on deleting, says the record is still there", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    remove.mockRejectedValue(leaky);
    const result = await deleteContact("c1");
    expect(result).toEqual({ ok: false, message: en.admin.contacts.contact.delete.failed });
    log.mockRestore();
  });
});

describe("a refusal of a field", () => {
  it("names the field and says how to fix it, in the language of the screen", async () => {
    jar = { "admin-locale": "pt-BR" };
    const result = await saveContact(null, form({ name: "", email: "not-an-email" }));
    expect(result.ok).toBe(false);
    expect(!result.ok && result.message).toBe(ptBR.admin.common.checkFields);
    expect(!result.ok && result.fieldErrors).toEqual({
      name: ptBR.admin.contacts.contact.errors.name,
      email: ptBR.admin.contacts.contact.errors.email,
    });
  });
});

describe("a success", () => {
  it("uses the verb of its button", async () => {
    update.mockResolvedValue({ id: "c1" });
    jar = { "admin-locale": "en" };
    const result = await saveContact("c1", form({ name: "Jane Doe" }));
    expect(result).toEqual({ ok: true, data: { id: "c1" }, message: "Contact saved." });
    expect(en.admin.contacts.contact.save).toBe("Save contact");
  });
});
