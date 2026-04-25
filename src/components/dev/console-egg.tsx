"use client";

import { useEffect } from "react";

/**
 * Easter Egg #2 — anyone who opens the browser DevTools sees a friendly
 * banner with the four eggs, contacts and credits. Logs once per session.
 */
export function ConsoleEgg() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if ((window as { __maarknEggLogged?: boolean }).__maarknEggLogged) return;
    (window as { __maarknEggLogged?: boolean }).__maarknEggLogged = true;

    const css = (color: string) =>
      `color:${color};font-family:'JetBrains Mono',monospace;font-size:13px;line-height:1.6`;

    /* eslint-disable no-console */
    console.log(
      "%c maarkn@dev:~$ ",
      "background:#00ff41;color:#0a0a0a;font-weight:700;font-family:'JetBrains Mono',monospace;font-size:14px;padding:2px 8px"
    );
    console.log(
      "%c hi there 👋  you found the console egg.\n",
      css("#00ff41")
    );
    console.log("%c Eggs to find on this site:", css("rgba(0,255,65,0.85)"));
    console.log(
      "%c  1. Konami code on the keyboard (↑ ↑ ↓ ↓ ← → ← → B A)",
      css("rgba(0,255,65,0.7)")
    );
    console.log("%c  2. This console banner — already found.", css("rgba(0,255,65,0.7)"));
    console.log(
      "%c  3. Type /help in the AI chat to discover terminal commands.",
      css("rgba(0,255,65,0.7)")
    );
    console.log(
      "%c  4. Toggle the DEV theme in the header for a CLI-flavored skin.\n",
      css("rgba(0,255,65,0.7)")
    );
    console.log(
      "%c reach out · markimkr@gmail.com · linkedin.com/in/maarkn",
      css("#00ff41")
    );
    console.log(
      "%c built by Marco Filho · maarkn.dev — say hi!",
      css("rgba(0,255,65,0.5)")
    );
    /* eslint-enable no-console */
  }, []);

  return null;
}
