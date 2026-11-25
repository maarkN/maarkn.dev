# CLI version (terminal)

- It lives at `/[lang]/terminal` (`src/app/[lang]/(terminal)/terminal`), indexable and out of the sitemap; `terminalHref` (`address.ts`) is the only place that knows the address. A home that carries `?cmd=` is redirected here by `src/proxy.ts`, value untouched. It keeps its own palettes (`soft`, `classic`) and fonts, independent of the site themes.
- The way back to the site is in the status bar (`components/site/back-to-site.tsx`): the last page of the site, in the language being read. Links from here to the site are not prefetched, or its fonts would be downloaded.
- A link never runs `ask` (`deeplink.ts`). The question sent from the site's search comes in the tab's storage (`handoff.ts`).
- Commands live in `src/lib/terminal/` (`content-commands.tsx`, `system-commands.tsx`, `nav-commands.tsx`, `ask-command.tsx`, `mail-command.tsx`); the engine is `registry.ts` + `parse.ts` + `run.ts` + `complete.ts` + `history.ts`, and `src/components/terminal/` only renders (shell, prompt, output, boot). `terminal-app.tsx` is where commands are registered, in `help` order.
- No `innerHTML` / `dangerouslySetInnerHTML` in the terminal: every output line is a `ReactNode`, and anything the visitor typed is displayed literally.
- Content is never hardcoded in `lib/terminal`: it comes from `lib/` (`projects-repo`, `timeline`, `toolkit`, `site`, `ghost`) through `lib/terminal/data.ts`, and every visible string comes from `src/dictionaries/*.json` under the `terminal` key. Command, alias and file names stay in English in both locales.
- Adding a command: register it, add `help.describe.<name>` to both dictionaries (`pnpm lint` checks parity), document it in `docs/design/commands.md` and run `pnpm docs:commands`.
