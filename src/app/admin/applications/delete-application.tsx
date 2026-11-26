import { deleteApplication } from "@/app/_actions/applications";
import { ConfirmDelete } from "@/components/admin/confirm-delete";
import type { AdminDictionary } from "@/i18n/config";
import { fill } from "@/lib/admin/text";

/**
 * Deleting one application of the list (A11). What is typed is the company,
 * as the row shows it; and two applications at the same company (one per
 * market) have the same name, so the window says which one it is: the job, the
 * place and the folder in the vault, which is the application's own key.
 */
export function DeleteApplication({
  id,
  company,
  folderName,
  role,
  place,
  words,
}: {
  id: string;
  company: string;
  folderName: string;
  role: string | null;
  place: string | null;
  words: AdminDictionary["applications"]["delete"];
}) {
  const which = [role, place].filter(Boolean).join(" · ");
  return (
    <ConfirmDelete
      id={id}
      name={company}
      title={fill(words.title, { name: company })}
      subject={
        <>
          {which && <span className="block font-semibold">{which}</span>}
          <span className="block break-all">{fill(words.folder, { key: folderName })}</span>
        </>
      }
      lost={words.lost}
      confirmLabel={words.confirm}
      triggerLabel={fill(words.trigger, { name: company })}
      action={deleteApplication}
    />
  );
}
