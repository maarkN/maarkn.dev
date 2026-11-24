import { encodeStringList } from "@/lib/json-list";
import {
  caseColumns,
  seedCasePosition,
  seedCaseText,
  seedText,
  textColumns,
  type CaseColumns,
  type TextColumns,
} from "@/lib/project-text";
import type { Project } from "@/lib/projects";

/**
 * What the seed may write in the `Project` table. Pure: the scripts that own
 * the connection (`prisma/seed.ts`, `scripts/sync-projects.ts`,
 * `project-fill.ts`) apply these, and the rule they share is the
 * one of ADR 0003: the seed creates and fills in what is missing, and never
 * changes text that is already there.
 */

/**
 * The columns that still follow `lib/projects.ts` after the row exists. `name`
 * is not among them: it is text, and somebody may have edited it.
 */
export function metadataColumns(p: Project) {
  return {
    year: p.year,
    category: p.category,
    status: p.status,
    featured: p.featured,
    monogram: p.monogram,
    accentFrom: p.accent.from,
    accentTo: p.accent.to,
    stackJson: encodeStringList(p.stack),
    sourceVisibility: p.sourceVisibility ?? "public",
    repoUrl: p.sourceVisibility === "private" ? null : (p.links?.repo ?? null),
    demoUrl: p.links?.demo ?? null,
    caseUrl: p.links?.case ?? null,
  };
}

/**
 * A whole new row, with the text of both languages. `withCase` gives the
 * seeded success cases their position, which only makes sense while nobody
 * has chosen any.
 */
export function newRow(p: Project, { withCase }: { withCase: boolean }) {
  return {
    slug: p.slug,
    name: p.name,
    ...metadataColumns(p),
    ...textColumns(seedText(p.slug)),
    ...caseColumns(seedCaseText(p.slug)),
    casePosition: withCase ? seedCasePosition(p.slug) : null,
  };
}

type StoredColumns = TextColumns & CaseColumns & { casePosition: number | null };

const EMPTY_LIST = encodeStringList([]);

/** A column that holds no text: null, blanks only, or an empty JSON list. */
function isEmpty(value: string | null): boolean {
  return value === null || value.trim() === "" || value.trim() === EMPTY_LIST;
}

function emptyColumns<T extends Record<string, string | null>>(row: T, seed: T): Partial<T> {
  const entries = Object.entries(seed).filter(
    ([column, value]) => isEmpty(row[column] ?? null) && !isEmpty(value),
  );
  return Object.fromEntries(entries) as Partial<T>;
}

/**
 * The seed text a row lacks, column by column; `{}` when there is nothing to
 * write. The success case goes in whole or not at all: a row with any case text
 * was written by hand. Its position goes with it, and only while nobody chose any.
 *
 * It cannot tell a field nobody wrote from one somebody cleared: only
 * `fillProjectText` may call it, and that runs once per database.
 */
export function missingText(
  slug: string,
  row: StoredColumns,
  { withCase }: { withCase: boolean },
): Partial<StoredColumns> {
  const text = emptyColumns<TextColumns>(pickText(row), textColumns(seedText(slug)));

  const storedCase = pickCase(row);
  const seedCase = caseColumns(seedCaseText(slug));
  const writesCase =
    Object.values(storedCase).every(isEmpty) && !Object.values(seedCase).every(isEmpty);
  if (!writesCase) return text;

  return {
    ...text,
    ...seedCase,
    ...(withCase && row.casePosition === null ? { casePosition: seedCasePosition(slug) } : {}),
  };
}

/**
 * Columns whose text is not the seed's. They are left alone; the list is what a
 * person reads after the migration to find copy that was in the database but
 * had never been on the site.
 */
export function divergentText(slug: string, row: TextColumns): string[] {
  const stored = pickText(row);
  return Object.entries(textColumns(seedText(slug)))
    .filter(([column, value]) => {
      const current = stored[column as keyof TextColumns];
      return !isEmpty(current) && !isEmpty(value) && current !== value;
    })
    .map(([column]) => column);
}

function pickText(row: TextColumns): TextColumns {
  return {
    tagline: row.tagline,
    taglinePt: row.taglinePt,
    description: row.description,
    descriptionPt: row.descriptionPt,
    role: row.role,
    rolePt: row.rolePt,
    featuresJson: row.featuresJson,
    featuresPtJson: row.featuresPtJson,
  };
}

function pickCase(row: CaseColumns): CaseColumns {
  return {
    caseProblemEn: row.caseProblemEn,
    caseProblemPt: row.caseProblemPt,
    caseWorkEn: row.caseWorkEn,
    caseWorkPt: row.caseWorkPt,
    caseResultEn: row.caseResultEn,
    caseResultPt: row.caseResultPt,
  };
}
