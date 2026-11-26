"use client";

import { useCommonLabels } from "./admin-locale";

/** `(obrigatório)`, inside the `<Label>`, in the language of the screen. Never a lone `*`. */
export function RequiredHint() {
  const { required } = useCommonLabels();
  return <span className="font-normal text-muted-foreground">({required})</span>;
}
