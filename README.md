# maarkn.dev

> Personal portfolio of **Marco Filho** — senior fullstack engineer working remotely from Brazil.

`maarkn.dev` is the digital business card of [@maarkn](https://github.com/maarkn): a place where recruiters, hiring managers and potential clients can quickly understand who I am, what I've built, and how to reach me. The site is also a small playground where I try ideas — animated transitions, theming, AI-powered chat, design tokens — instead of just reading about them.

[Read this in Portuguese · Leia em português →](./README.pt-BR.md)

---

## What's inside

The project is a [Next.js 16](https://nextjs.org) application written in TypeScript, styled with [Tailwind CSS v4](https://tailwindcss.com) and animated with [Framer Motion](https://www.framer.com/motion/). It ships as a fully static, internationalized site with three themes (Light, Dark and a neon Dev mode) and is designed to grow into a small CMS over time.

### Currently shipped

- **Internationalization** — English (default) and Brazilian Portuguese, served from `[lang]` segment routes with locale detection by `Accept-Language`.
- **Three-theme design system** — Light, Dark and Dev (neon green with subtle scanlines), persisted in `localStorage` with a pre-hydration boot script that avoids the dark-to-light flash.
- **Hero** — availability badge, three-line headline in plain language, primary and secondary CTAs, and a side identity card that crossfades between three portraits depending on the active theme.
- **Big Numbers** — four counters that animate the first time the section enters the viewport.
- **About** — bio in non-technical language, four working values and an animated vertical career timeline.
- **Toolkit** — six grouped cards covering Frontend, Backend, Mobile, Data, Infra and Practices, with a years-of-experience badge per tag.
- **Footer + socials** — LinkedIn, GitHub, email and WhatsApp, with inline brand SVGs for the icons that lucide v1 dropped.
- **Selected work** — eight curated projects with stylized CSS-only covers on the home, plus a dedicated `/projects` route with category filtering and per-project detail pages at `/projects/[slug]` (description, role, key features, stack and links).

### On the roadmap

- **Contact** — a typed form backed by [Resend](https://resend.com) with availability status.
- **Links page** — a Linktree-style hub for quick reference.
- **AI Chat** — a floating widget powered by the [Claude API](https://www.anthropic.com/api) with streaming responses and per-IP rate limiting.
- **Blog** — headless integration with [Ghost CMS](https://ghost.org).
- **Admin CMS** — NextAuth + Prisma + Postgres for project and content management.
- **SEO + Analytics** — dynamic OpenGraph, sitemap, JSON-LD schema, and Vercel Analytics.

This README will be updated as each item ships.

---

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) on React 19 |
| Language | TypeScript 5 |
| Styling | Tailwind CSS v4 + custom CSS tokens |
| Animation | Framer Motion |
| Icons | lucide-react v1 + inline SVG for brand icons |
| Fonts | Inter, Space Grotesk, JetBrains Mono via `next/font` |
| i18n | Next.js native dictionary pattern (`getDictionary`) |

The full implementation status (including the rest of the planned stack: PostgreSQL, Prisma, Ghost CMS, NextAuth, S3, Traefik, EC2) lives in the project's PRD outside this repository.

---

## Running locally

```bash
# install dependencies
npm install

# start the dev server (http://localhost:5050)
npm run dev

# production build
npm run build

# serve the production build
npm start
```

> Port `5050` is used because port `5000` is occupied by the macOS AirPlay Receiver and `3000` was unstable in the author's local environment. Override with `next dev -p <port>` if needed.

---

## Project structure

```
src/
├── app/
│   ├── globals.css              # design tokens (Light/Dark/Dev) and base styles
│   └── [lang]/
│       ├── layout.tsx           # html, fonts, ThemeProvider, metadata
│       ├── page.tsx             # composes the home sections
│       └── projects/
│           ├── page.tsx         # full listing with category filter
│           └── [slug]/page.tsx  # per-project detail page
├── components/
│   ├── nav.tsx
│   ├── theme-{provider,switcher,photo}.tsx
│   ├── lang-switcher.tsx
│   ├── hero.tsx
│   ├── identity-card.tsx
│   ├── big-numbers.tsx
│   ├── about.tsx
│   ├── toolkit.tsx
│   ├── projects.tsx
│   ├── project-card.tsx
│   ├── projects-filter.tsx
│   ├── project-detail.tsx
│   ├── socials.tsx
│   └── footer.tsx
├── dictionaries/
│   ├── en.json
│   └── pt-BR.json
├── i18n/
│   └── config.ts                # getDictionary + hasLocale helpers
├── lib/
│   ├── utils.ts                 # cn() helper
│   ├── site.ts                  # site-wide constants
│   ├── timeline.ts              # career timeline data
│   ├── toolkit.ts               # grouped tech stack
│   └── projects.ts              # project catalog (static, pre-CMS)
└── proxy.ts                     # locale routing (renamed from middleware in Next 16)
```

---

## Conventions

- Commits follow the [Conventional Commits](https://www.conventionalcommits.org) spec, validated by commitlint.
- Copy aimed at recruiters and clients is written in plain language; developer jargon stays in code, tags and section titles.
- Animations respect `prefers-reduced-motion`.

---

## License

Source code is released under the [MIT License](./LICENSE). The portrait photographs and the personal copy are © Marco Filho — please do not reuse them without permission.

---

Built with care by [Marco Filho · @maarkn](https://linkedin.com/in/maarkn).
