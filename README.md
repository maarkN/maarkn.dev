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
- **Contact** — a `#contact` section on the home with a server-action-backed form (name, email, company, project type, message), inline validation, success state, honeypot anti-spam, live timezone display, and three alternate channels. Wires automatically to [Resend](https://resend.com) when `RESEND_API_KEY` is set; otherwise logs the payload server-side.
- **Links page** — a Linktree-style hub at `/links` with a custom layout: theme-aware portrait, availability badge, vertical button stack (LinkedIn, GitHub, Email, WhatsApp, CV), and an accent glow over the grid background.
- **AI assistant** — a floating chat launcher (visible site-wide) plus a dedicated `/chat` route, both backed by `/api/chat` streaming token-by-token through Server-Sent Events. Uses the OpenAI Chat Completions API (`gpt-4o-mini` by default), with a curated system prompt grounded in Marco's resume and projects, an in-memory per-IP rate limit (10 messages / hour), suggested prompts, stop / new-chat controls, and an offline preview mode that produces mock streamed answers when no API key is configured.

### On the roadmap

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

### Environment variables

| Variable | Purpose |
|---|---|
| `OPENAI_API_KEY` | Optional. When set, the AI assistant calls OpenAI's Chat Completions API. Without it, the chat endpoint streams a small set of canned answers so the UI still works in development and on previews. |
| `OPENAI_MODEL` | Optional. Model the assistant uses. Defaults to `gpt-4o-mini`. |
| `RESEND_API_KEY` | Optional. When set, the contact form sends real emails through the [Resend](https://resend.com) API. Without it, submissions are logged server-side and the success state is still shown — useful in development and previews. |

Copy `.env.example` to `.env.local` and fill in only the variables you need. `.env.local` is gitignored; `.env.example` is the source of truth for what the app reads at runtime.

---

## Project structure

```
src/
├── app/
│   ├── globals.css              # design tokens (Light/Dark/Dev) and base styles
│   ├── _actions/contact.ts      # server action for the contact form
│   ├── api/chat/route.ts        # streaming chat endpoint (OpenAI + mock fallback)
│   └── [lang]/
│       ├── layout.tsx           # html, fonts, ThemeProvider, ChatLauncher, metadata
│       ├── page.tsx             # composes the home sections
│       ├── chat/page.tsx        # full-width AI assistant page
│       ├── links/page.tsx       # Linktree-style hub
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
│   ├── contact.tsx
│   ├── links-hub.tsx
│   ├── chat/
│   │   ├── chat-launcher.tsx    # floating button + animated panel
│   │   ├── chat-panel.tsx       # message list, suggestions, composer
│   │   └── use-chat-stream.ts   # SSE consumer hook
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
│   ├── projects.ts              # project catalog (static, pre-CMS)
│   ├── chat-system-prompt.ts    # persona + context for the AI assistant
│   └── rate-limit.ts            # in-memory per-IP limiter
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
