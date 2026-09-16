"use client";

import { useEffect } from "react";

/**
 * Console easter egg — anyone who opens the browser DevTools sees a short
 * banner pointing at the terminal's hidden commands, plus contact and
 * credits. Logs once per page load.
 */
export function ConsoleEgg() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if ((window as { __maarknEggLogged?: boolean }).__maarknEggLogged) return;
    (window as { __maarknEggLogged?: boolean }).__maarknEggLogged = true;

    const css = (color: string) =>
      `color:${color};font-family:ui-monospace,Menlo,Consolas,monospace;font-size:13px;line-height:1.6`;
    const purple = "#BF9EEE";
    const comment = "#8F93A0";

    console.log(
      "%c maarkn@dev:~$ ",
      `background:${purple};color:#282A36;font-weight:700;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:14px;padding:2px 8px`
    );
    console.log("%c hi there — you found the console egg.\n", css(purple));
    console.log("%c A few things `help` does not list:", css(comment));
    console.log("%c  sudo · rm -rf / · hack · ping · git · neofetch", css(comment));
    console.log("%c  ask <anything> talks to the AI; mail writes to me.\n", css(comment));
    console.log("%c reach out · markimkr@gmail.com · linkedin.com/in/maarkn", css(purple));
    console.log("%c built by Marco Filho · maarkn.dev — say hi!", css(comment));
  }, []);

  return null;
}
