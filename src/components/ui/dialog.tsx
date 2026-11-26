"use client"

import * as React from "react"
import { Dialog as DialogPrimitive } from "radix-ui"

import { X } from "lucide-react"

import { useCommonLabels, useScreenLanguage } from "@/components/admin/admin-locale"
import { HoloFrame } from "@/components/holo/frame"
import styles from "@/components/holo/holo.module.css"
import { textOf } from "@/components/holo/text"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

/**
 * A window of the backoffice is the hologram's (docs/design/moldura.md): the
 * frame of a panel, solid behind, the title in the face of titles and a close
 * button in the corner. Radix keeps what a window owes the keyboard: the focus
 * stays inside, `Esc` closes, and the focus goes back to whoever opened it.
 *
 * What scrolls is the body, inside the frame: the lines stay where they are.
 */
function Dialog({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />
}

function DialogTrigger({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
}

function DialogPortal({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
}

function DialogClose({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

function DialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cn(
        "fixed inset-0 isolate z-50 bg-plate/70 duration-100 supports-backdrop-filter:backdrop-blur-xs data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0",
        className
      )}
      {...props}
    />
  )
}

function DialogContent({
  className,
  children,
  showCloseButton = true,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  showCloseButton?: boolean
}) {
  const { close } = useCommonLabels()
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        lang={useScreenLanguage()}
        className={cn(
          "fixed top-1/2 left-1/2 z-50 flex max-h-[calc(100dvh-2rem)] w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 outline-none sm:max-w-lg",
          className
        )}
        {...props}
      >
        <AdminWindow seed={textOf(children)} close={showCloseButton && (
          <DialogPrimitive.Close data-slot="dialog-close" asChild>
            <Button variant="ghost" size="icon-sm" aria-label={close}>
              <X aria-hidden="true" />
            </Button>
          </DialogPrimitive.Close>
        )}>
          {children}
        </AdminWindow>
      </DialogPrimitive.Content>
    </DialogPortal>
  )
}

/**
 * The frame, the plate behind it and the body that scrolls; shared by the
 * dialog and the alert dialog. `close` sits in the corner, over the body.
 */
function AdminWindow({
  seed,
  close,
  children,
}: {
  seed: string
  close?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className={cn(styles.holo, styles.panel, "admin-window")}>
      <span className={styles.windowPlate} aria-hidden="true" />
      <HoloFrame kind="panel" seed={seed || "window"} />
      <div className="admin-window-body">{children}</div>
      {close && <div className="admin-window-close">{close}</div>}
    </div>
  )
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("flex flex-col gap-1.5 pr-12 text-left", className)}
      {...props}
    />
  )
}

function DialogFooter({
  className,
  showCloseButton = false,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  showCloseButton?: boolean
}) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
        className
      )}
      {...props}
    >
      {children}
      {showCloseButton && <FooterClose />}
    </div>
  )
}

function FooterClose() {
  const { close } = useCommonLabels()
  return (
    <DialogPrimitive.Close asChild>
      <Button variant="outline">{close}</Button>
    </DialogPrimitive.Close>
  )
}

function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn("font-title text-2xl leading-tight font-[560] text-foreground [font-stretch:108%]", className)}
      {...props}
    />
  )
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn(
        "font-text text-sm/relaxed text-muted-foreground *:[a]:text-foreground *:[a]:underline *:[a]:decoration-brand *:[a]:underline-offset-3",
        className
      )}
      {...props}
    />
  )
}

export {
  AdminWindow,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
}
