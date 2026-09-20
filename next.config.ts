import type { NextConfig } from "next";
import path from "node:path";

/** `YYYY.MM` of this build, shown by the terminal's `neofetch` as the "os" version. */
const buildDate = new Date().toISOString().slice(0, 7).replace("-", ".");

/**
 * The part of the CSP we can enforce today without risking a blank page: it
 * only locks down vectors the app never uses (no plugins, no `<base>` rewrite,
 * no cross-origin form posts) plus `frame-ancestors`, which is the modern
 * replacement for `X-Frame-Options` and is honoured by every browser we target
 * (see `browserslist` in package.json).
 *
 * Deliberately has NO `default-src`: an enforcing `default-src` would need the
 * script/style allowances discussed below, and half a policy that blocks the
 * site is worse than none.
 */
const CSP_ENFORCED = [
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
].join("; ");

/**
 * The policy we *want*, shipped as `Content-Security-Policy-Report-Only` so the
 * browser reports violations instead of breaking the page.
 *
 * Why it is not enforcing yet — two known blockers, both of which will show up
 * in the violation reports until they are fixed:
 *
 *  1. `script-src 'self'` — `src/app/[lang]/layout.tsx` renders the theme
 *     bootstrap (`themeBootScript`) as an inline `<Script strategy="before
 *     Interactive">` to avoid a flash of the wrong theme. Enforcing this needs
 *     a per-request nonce, which in Next means adding a `middleware.ts` that
 *     generates the nonce and rewrites the CSP header on every request. This
 *     repo has no middleware today, so that is a change of its own — not a
 *     drive-by in a headers pass. (The `application/ld+json` block in the same
 *     file is *not* a blocker: CSP does not apply to non-executable script
 *     types.) The alternative, `'unsafe-inline'`, would make `script-src`
 *     decorative, so it is not used here.
 *  2. `style-src 'self'` — Radix UI (admin) and Sonner (toasts) set inline
 *     `style` attributes and inject `<style>` elements at runtime. Those need
 *     the same nonce plumbing, or `'unsafe-inline'` scoped to styles.
 *
 * `img-src` keeps a broad `https:` on purpose: blog posts are raw Ghost HTML
 * (`src/app/[lang]/(pages)/blog/[slug]/page.tsx`) and the Ghost host comes from
 * the runtime `GHOST_URL` env var, while `headers()` is baked into the build
 * manifest at build time — the host simply is not known here.
 *
 * There is no `report-to`/`report-uri` endpoint, so violations land in the
 * browser console only. That is enough to drive the nonce work; wire a
 * collector before relying on it in production.
 */
const CSP_REPORT_ONLY = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' data: blob: https:",
  "font-src 'self'",
  // The OpenAI call lives in the route handler (src/app/api/chat/route.ts), so
  // the browser only ever talks to this origin.
  "connect-src 'self'",
  "media-src 'self'",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "frame-src 'none'",
].join("; ");

/**
 * HSTS lives here rather than in Traefik: Traefik terminates TLS, but the
 * header has to reach the browser either way and the app is the only thing
 * served on the domain. Keeping it in code means it is version-controlled and
 * unit-tested instead of hiding in a container label.
 *
 * No `includeSubDomains` and no `preload` on purpose: both are effectively
 * irreversible for the whole apex domain, and any subdomain that is ever served
 * without valid TLS (a staging box, the optional Traefik dashboard) would become
 * unreachable. Add them only after every subdomain is known-good on HTTPS.
 *
 * Only emitted for production builds so `next dev` over http://localhost never
 * pins the loopback origin.
 */
const HSTS = "max-age=31536000";

/**
 * Sent on every response. Exported for `src/lib/security-headers.test.ts`.
 */
export const securityHeaders: { key: string; value: string }[] = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Redundant with `frame-ancestors 'none'` above, kept for old crawlers/proxies.
  { key: "X-Frame-Options", value: "DENY" },
  // Lean allow-list: the site asks for none of these APIs.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  },
  { key: "Content-Security-Policy", value: CSP_ENFORCED },
  { key: "Content-Security-Policy-Report-Only", value: CSP_REPORT_ONLY },
  ...(process.env.NODE_ENV === "production"
    ? [{ key: "Strict-Transport-Security", value: HSTS }]
    : []),
];

const nextConfig: NextConfig = {
  // Self-host build: emit a standalone server bundle for the Docker image.
  output: "standalone",
  // Don't advertise the framework (and, via package.json, its exact version).
  poweredByHeader: false,
  env: {
    NEXT_PUBLIC_BUILD_DATE: buildDate,
  },
  outputFileTracingRoot: path.resolve(import.meta.dirname),
  turbopack: {
    root: path.resolve(import.meta.dirname),
  },
  images: {
    remotePatterns: [],
  },
  experimental: {
    // Tree-shake barrel imports from these heavy packages (smaller client JS).
    optimizePackageImports: ["lucide-react"],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
