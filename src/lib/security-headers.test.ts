import { describe, it, expect, afterEach, vi } from "vitest";
import nextConfig, { securityHeaders } from "../../next.config";

/**
 * Guards the security headers emitted by next.config.ts. Without them the app
 * shipped bare responses (no CSP, no frame protection, no HSTS) and advertised
 * `X-Powered-By: Next.js` with the exact version from a public package.json.
 */

const value = (key: string, list = securityHeaders) =>
  list.find((h) => h.key.toLowerCase() === key.toLowerCase())?.value;

async function headersFor(nodeEnv: string) {
  vi.stubEnv("NODE_ENV", nodeEnv);
  vi.resetModules();
  const mod = await import("../../next.config");
  return mod.securityHeaders;
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("security headers", () => {
  it("are applied to every route", async () => {
    const rules = await nextConfig.headers!();
    expect(rules).toHaveLength(1);
    expect(rules[0].source).toBe("/:path*");
    expect(rules[0].headers).toBe(securityHeaders);
  });

  it("does not advertise the framework", () => {
    expect(nextConfig.poweredByHeader).toBe(false);
  });

  it("sets the no-risk baseline", () => {
    expect(value("X-Content-Type-Options")).toBe("nosniff");
    expect(value("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
    expect(value("X-Frame-Options")).toBe("DENY");
    expect(value("Permissions-Policy")).toContain("camera=()");
    expect(value("Permissions-Policy")).toContain("microphone=()");
    expect(value("Permissions-Policy")).toContain("geolocation=()");
  });

  it("enforces only the directives that cannot break the page", () => {
    const csp = value("Content-Security-Policy");
    expect(csp).toBeDefined();
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("base-uri 'self'");
    expect(csp).toContain("form-action 'self'");
    // An enforcing default-src/script-src would need nonces first.
    expect(csp).not.toContain("default-src");
    expect(csp).not.toContain("script-src");
    // Never trade real protection for a policy that only looks strict.
    expect(csp).not.toContain("unsafe-inline");
    expect(csp).not.toContain("unsafe-eval");
  });

  it("ships the intended strict policy in report-only mode", () => {
    const csp = value("Content-Security-Policy-Report-Only");
    expect(csp).toBeDefined();
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("script-src 'self'");
    expect(csp).toContain("connect-src 'self'");
    expect(csp).not.toContain("unsafe-inline");
    expect(csp).not.toContain("unsafe-eval");
  });

  it("sends HSTS in production only, without includeSubDomains or preload", async () => {
    const prod = value("Strict-Transport-Security", await headersFor("production"));
    expect(prod).toBe("max-age=31536000");

    const dev = value("Strict-Transport-Security", await headersFor("development"));
    expect(dev).toBeUndefined();
  });
});
