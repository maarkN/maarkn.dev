import { describe, expect, it } from "vitest";
import {
  companySchema,
  contactSchema,
  contactSource,
  emailSchema,
  fieldError,
  messageSchema,
  nameSchema,
  typeSchema,
} from "./contact-schema";

describe("contact sub-schemas", () => {
  it("name: 2–80 characters after trimming", () => {
    expect(fieldError(nameSchema, " Jane Doe ")).toBeNull();
    expect(nameSchema.parse(" Jane ")).toBe("Jane");
    expect(fieldError(nameSchema, "J")).toBe("required");
    expect(fieldError(nameSchema, "   ")).toBe("required");
    expect(fieldError(nameSchema, "x".repeat(81))).toBe("required");
  });

  it("email: needs something@something.tld", () => {
    expect(fieldError(emailSchema, "jane@acme.com")).toBeNull();
    expect(fieldError(emailSchema, "  jane@acme.io ")).toBeNull();
    expect(fieldError(emailSchema, "jane@")).toBe("invalid");
    expect(fieldError(emailSchema, "jane@acme")).toBe("invalid");
    expect(fieldError(emailSchema, "jane doe@acme.com")).toBe("invalid");
    expect(fieldError(emailSchema, "")).toBe("invalid");
  });

  it("company: optional, at most 120 characters", () => {
    expect(fieldError(companySchema, "")).toBeNull();
    expect(fieldError(companySchema, "Acme")).toBeNull();
    expect(fieldError(companySchema, "x".repeat(121))).toBe("too_long");
  });

  it("message: 10–4000 characters", () => {
    expect(fieldError(messageSchema, "too short")).toBe("required");
    expect(fieldError(messageSchema, "long enough now")).toBeNull();
    expect(fieldError(messageSchema, "x".repeat(4001))).toBe("required");
  });

  it("type: empty or one of the known kinds", () => {
    expect(fieldError(typeSchema, "")).toBeNull();
    expect(fieldError(typeSchema, "freelance")).toBeNull();
    expect(fieldError(typeSchema, "spam")).toBe("invalid");
  });

  it("the full schema reports one code per failing field, like the form expects", () => {
    const result = contactSchema.safeParse({
      name: "J",
      email: "nope",
      company: "",
      type: "",
      message: "hi",
    });
    expect(result.success).toBe(false);
    const codes = Object.fromEntries(
      result.error!.issues.map((issue) => [issue.path[0], issue.message]),
    );
    expect(codes).toEqual({ name: "required", email: "invalid", message: "required" });
  });

  it("source is the terminal only when it says so", () => {
    expect(contactSource("terminal")).toBe("terminal");
    expect(contactSource("form")).toBe("form");
    expect(contactSource("")).toBe("form");
    expect(contactSource(undefined)).toBe("form");
  });
});
