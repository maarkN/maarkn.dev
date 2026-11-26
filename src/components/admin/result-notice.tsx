"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useNotify } from "./notify";

/**
 * The result of an action that ended in a navigation (creating an application
 * redirects to the list): the page that receives it shows it as a notice, once,
 * and takes it out of the address, so that reloading does not say it again.
 *
 * @param drop the parameters of the address that carried the result.
 */
export function ResultNotice({ message, drop }: { message: string; drop: string[] }) {
  const notify = useNotify();
  const router = useRouter();
  const pathname = usePathname();
  const shown = useRef(false);

  useEffect(() => {
    if (shown.current) return;
    shown.current = true;
    notify.success(message);
    const params = new URLSearchParams(window.location.search);
    for (const name of drop) params.delete(name);
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [message, drop, notify, router, pathname]);

  return null;
}
