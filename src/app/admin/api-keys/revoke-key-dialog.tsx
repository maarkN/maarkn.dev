"use client";

/**
 * Revoking a key asks for its name, typed, like deleting (`ConfirmDelete`): it
 * cannot be undone. What was typed goes to the server, which checks it again
 * (`revokeApiKey`): the browser's check is only ergonomics.
 */

import { Ban } from "lucide-react";
import { revokeApiKey } from "@/app/_actions/api-keys";
import { ConfirmDelete } from "@/components/admin/confirm-delete";
import type { AdminDictionary } from "@/i18n/config";
import { fill } from "@/lib/admin/text";

export function RevokeKeyDialog({
  id,
  name,
  keyPrefix,
  words,
}: {
  id: string;
  /** What has to be typed. */
  name: string;
  /** The public prefix, to tell apart keys with similar names. */
  keyPrefix: string;
  words: AdminDictionary["apiKeys"]["revoke"];
}) {
  return (
    <ConfirmDelete
      id={id}
      name={name}
      icon={Ban}
      title={fill(words.title, { name })}
      lost={fill(words.lost, { prefix: keyPrefix })}
      confirmLabel={words.confirm}
      pendingLabel={words.pending}
      triggerLabel={fill(words.trigger, { name })}
      action={revokeApiKey}
    />
  );
}
