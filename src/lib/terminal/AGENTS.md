# CLI version (terminal)

- Today this is the home page; `rebrand-02-site-chrome` moves it to `/[lang]/terminal`. It keeps its own palettes (`soft`, `classic`) and fonts, independent of the site themes.
- Commands live in `src/lib/terminal/` (`content-commands.tsx`, `system-commands.tsx`, `nav-commands.tsx`, `ask-command.tsx`, `mail-command.tsx`); the engine is `registry.ts` + `parse.ts` + `run.ts` + `complete.ts` + `history.ts`, and `src/components/terminal/` only renders (shell, prompt, output, boot). `terminal-app.tsx` is where commands are registered, in `help` order.
- No `innerHTML` / `dangerouslySetInnerHTML` in the terminal: every output line is a `ReactNode`, and anything the visitor typed is displayed literally.
- Content is never hardcoded in `lib/terminal`: it comes from `lib/` (`projects-repo`, `timeline`, `toolkit`, `site`, `ghost`) through `lib/terminal/data.ts`, and every visible string comes from `src/dictionaries/*.json` under the `terminal` key. Command, alias and file names stay in English in both locales.
- Adding a command: register it, add `help.describe.<name>` to both dictionaries (`pnpm lint` checks parity), document it in `docs/design/commands.md` and run `pnpm docs:commands`.
