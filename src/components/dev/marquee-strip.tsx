/**
 * Always rendered, but CSS hides it unless [data-theme="dev"] is active.
 * Two copies of the message side-by-side so the marquee animation can
 * translateX(-50%) and seamlessly loop.
 */
export function DevMarqueeStrip() {
  const message =
    "maarkn@dev:~$ uptime 6y · 30+ projects shipped · stack: TS / NestJS / React / Flutter / AWS · status: OPEN_TO_WORK";
  return (
    <div className="dev-cli-strip" aria-hidden>
      <span>
        {message}
        {"     ·     "}
        {message}
        {"     ·     "}
      </span>
    </div>
  );
}
