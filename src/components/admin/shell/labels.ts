import type { AdminDictionary } from "@/i18n/config";

/** The part of the `admin` dictionary the shell shows. */
export type ShellLabels = Pick<AdminDictionary, "shell" | "nav" | "create" | "account" | "search">;

export const shellLabels = ({ shell, nav, create, account, search }: AdminDictionary): ShellLabels => ({
  shell,
  nav,
  create,
  account,
  search,
});
