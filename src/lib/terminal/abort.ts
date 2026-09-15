/** The error `ctx.ask` rejects with when the visitor cancels (`Esc`/`Ctrl+C`). */
export function abortError(message = "cancelled"): Error {
  return typeof DOMException === "undefined"
    ? Object.assign(new Error(message), { name: "AbortError" })
    : new DOMException(message, "AbortError");
}

export function isAbortError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    (error as { name?: unknown }).name === "AbortError"
  );
}
