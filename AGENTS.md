<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Terminal (the home page)

- The home is an interactive terminal. Commands live in `src/lib/terminal/` (`content-commands.tsx`, `system-commands.tsx`, `nav-commands.tsx`, `ask-command.tsx`, `mail-command.tsx`); the engine is `registry.ts` + `parse.ts` + `run.ts` + `complete.ts` + `history.ts`, and `src/components/terminal/` only renders (shell, prompt, output, boot). `terminal-app.tsx` is where commands are registered, in `help` order.
- No `innerHTML` / `dangerouslySetInnerHTML` in the terminal: every output line is a `ReactNode`, and anything the visitor typed is displayed literally.
- Content is never hardcoded in `lib/terminal`: it comes from `lib/` (`projects-repo`, `timeline`, `toolkit`, `site`, `ghost`) through `lib/terminal/data.ts`, and every visible string comes from `src/dictionaries/*.json` under the `terminal` key. Command, alias and file names stay in English in both locales.
- Adding a command: register it, add `help.describe.<name>` to both dictionaries (`pnpm lint` checks parity), document it in `.docs/design/commands.md` and run `pnpm docs:commands`.
