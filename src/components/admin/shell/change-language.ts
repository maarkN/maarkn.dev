import { rememberAdminLocale, type AdminLocale } from "@/lib/admin/locale";

/**
 * Changes the language of the backoffice. A document load on purpose, as on the
 * site: `<html lang>`, every text and every date change. A refresh of the router
 * would keep the screen, but on one whose list is streamed it may wait for ever
 * for a part that already arrived (Next 16.2.4), and stay in the other language.
 */
export function changeLanguage(next: AdminLocale) {
  rememberAdminLocale(next);
  window.location.reload();
}
