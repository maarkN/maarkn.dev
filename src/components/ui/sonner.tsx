"use client"

import { Toaster as Sonner, type ToasterProps } from "sonner"

import { useSiteTheme } from "@/components/site-theme"

/**
 * Where the notices of the backoffice land: one live region, polite, that
 * exists before any notice does, so each one is read once as it arrives.
 *
 * What lands here is a `HoloNotice` (`useNotify`, `@/components/admin/notify`):
 * solid, with its own surface, tone and buttons. Sonner only stacks it, times
 * it out and pauses while it is pointed at, so its own card is switched off
 * (`unstyled`) and gives the notice the whole width.
 */
const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme={useSiteTheme() === "light" ? "light" : "dark"}
      position="bottom-right"
      // Above the bar at the foot of a phone.
      offset={{ bottom: "calc(var(--site-base) + 24px)" }}
      mobileOffset={{ bottom: "calc(var(--site-base) + 16px)" }}
      className="toaster group"
      toastOptions={{ unstyled: true, classNames: { toast: "admin-notice" } }}
      {...props}
    />
  )
}

export { Toaster }
