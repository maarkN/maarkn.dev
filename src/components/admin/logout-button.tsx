"use client";

import { LogOut } from "lucide-react";
import { logoutAction } from "@/app/_actions/auth";
import { Button } from "@/components/ui/button";

/** Icon-only sign-out control living in the sidebar footer of `AdminShell`. */
export function LogoutButton() {
  return (
    <form action={logoutAction}>
      <Button
        type="submit"
        variant="ghost"
        size="icon-sm"
        title="Sair"
        aria-label="Sair"
      >
        <LogOut className="size-4" />
      </Button>
    </form>
  );
}
