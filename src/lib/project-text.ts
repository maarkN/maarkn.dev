import type { Locale } from "@/i18n/config";
import en from "@/dictionaries/en.json";
import ptBR from "@/dictionaries/pt-BR.json";
import { decodeStringList, encodeStringList } from "@/lib/json-list";
import { successCaseSlugs } from "@/lib/projects";

/**
 * Where a project's text comes from, and in which language it ends up.
 *
 * Pure on purpose (no Prisma, no `server-only`): the site reads through
 * `projects-repo`, the scripts that fill the database import it under `tsx`,
 * and both must agree on what the seed says.
 *
 * The order is the one of ADR 0003: the requested language in the database,
 * the other language in the database, then the seed in the repository. It is
 * resolved per field, so a project with half of its text translated never
 * shows an empty field.
 */

/** A value and the language it is written in, which may not be the page's. */
export type Localized<T> = { value: T; lang: Locale };

/** Text of one project in one language; `null`/`[]` is "not written". */
export type ProjectText = {
  tagline: string | null;
  description: string | null;
  role: string | null;
  features: string[];
};

/** Success case: what was wrong, what was done, what came out of it. */
export type CaseText = { problem: string | null; work: string | null; result: string | null };

export type ByLocale<T> = Record<Locale, T>;

/** How many success cases the home shows. The database enforces it too. */
export const MAX_SUCCESS_CASES = 3;

const OTHER: ByLocale<Locale> = { en: "pt-BR", "pt-BR": "en" };

/* ── the seed ──────────────────────────────────────────────────── */

const dictionaries: ByLocale<typeof en.projects> = { en: en.projects, "pt-BR": ptBR.projects };

const EMPTY_TEXT: ProjectText = { tagline: null, description: null, role: null, features: [] };
const EMPTY_CASE: CaseText = { problem: null, work: null, result: null };

type Detail = { description: string; role: string; features: string[] };
type Captions = Record<string, Record<string, string> | undefined>;

function perLocale<T>(read: (lang: Locale) => T): ByLocale<T> {
  return { en: read("en"), "pt-BR": read("pt-BR") };
}

/** The dictionaries' text for a slug, in both languages. */
export function seedText(slug: string): ByLocale<ProjectText> {
  return perLocale((lang) => {
    const { taglines, details } = dictionaries[lang];
    const tagline = (taglines as Record<string, string | undefined>)[slug];
    const detail = (details as Record<string, Detail | undefined>)[slug];
    return {
      tagline: tagline ?? EMPTY_TEXT.tagline,
      description: detail?.description ?? EMPTY_TEXT.description,
      role: detail?.role ?? EMPTY_TEXT.role,
      features: detail?.features ?? EMPTY_TEXT.features,
    };
  });
}

/** The dictionaries' success case for a slug, in both languages. */
export function seedCaseText(slug: string): ByLocale<CaseText> {
  return perLocale((lang) => {
    const cases = dictionaries[lang].cases as Record<string, CaseText | undefined>;
    return cases[slug] ?? EMPTY_CASE;
  });
}

/** Position among the seeded success cases, from 1; null when it is not one. */
export function seedCasePosition(slug: string): number | null {
  const index = successCaseSlugs.indexOf(slug);
  return index === -1 ? null : index + 1;
}

/** Captions of a seeded gallery image, looked up by its `captionKey`. */
export function seedCaption(slug: string, key: string | undefined): ByLocale<string | null> {
  return perLocale((lang) => {
    const captions = (dictionaries[lang].gallery as Captions)[slug];
    return (key ? captions?.[key] : undefined) ?? null;
  });
}

/* ── the columns ───────────────────────────────────────────────── */

/** The text columns of `Project`; the unsuffixed ones are the English text. */
export type TextColumns = {
  tagline: string | null;
  taglinePt: string | null;
  description: string | null;
  descriptionPt: string | null;
  role: string | null;
  rolePt: string | null;
  featuresJson: string;
  featuresPtJson: string;
};

export type CaseColumns = {
  caseProblemEn: string | null;
  caseProblemPt: string | null;
  caseWorkEn: string | null;
  caseWorkPt: string | null;
  caseResultEn: string | null;
  caseResultPt: string | null;
};

export function storedText(row: TextColumns): ByLocale<ProjectText> {
  return {
    en: {
      tagline: row.tagline,
      description: row.description,
      role: row.role,
      features: decodeStringList(row.featuresJson),
    },
    "pt-BR": {
      tagline: row.taglinePt,
      description: row.descriptionPt,
      role: row.rolePt,
      features: decodeStringList(row.featuresPtJson),
    },
  };
}

export function textColumns(text: ByLocale<ProjectText>): TextColumns {
  return {
    tagline: text.en.tagline,
    taglinePt: text["pt-BR"].tagline,
    description: text.en.description,
    descriptionPt: text["pt-BR"].description,
    role: text.en.role,
    rolePt: text["pt-BR"].role,
    featuresJson: encodeStringList(text.en.features),
    featuresPtJson: encodeStringList(text["pt-BR"].features),
  };
}

export function storedCaseText(row: CaseColumns): ByLocale<CaseText> {
  return {
    en: { problem: row.caseProblemEn, work: row.caseWorkEn, result: row.caseResultEn },
    "pt-BR": { problem: row.caseProblemPt, work: row.caseWorkPt, result: row.caseResultPt },
  };
}

export function caseColumns(text: ByLocale<CaseText>): CaseColumns {
  return {
    caseProblemEn: text.en.problem,
    caseProblemPt: text["pt-BR"].problem,
    caseWorkEn: text.en.work,
    caseWorkPt: text["pt-BR"].work,
    caseResultEn: text.en.result,
    caseResultPt: text["pt-BR"].result,
  };
}

/* ── the fallback ──────────────────────────────────────────────── */

const written = (value: string | null | undefined): string | null => {
  const text = value?.trim();
  return text ? text : null;
};

const listed = (items: string[]): string[] | null => {
  const kept = items.filter((item) => item.trim() !== "");
  return kept.length > 0 ? kept : null;
};

/** First source that has something to say: requested language, then the other. */
function pick<S, T>(
  lang: Locale,
  sources: ByLocale<S>[],
  read: (source: S) => T | null,
): Localized<T> | null {
  for (const source of sources) {
    for (const candidate of [lang, OTHER[lang]]) {
      const value = read(source[candidate]);
      if (value !== null) return { value, lang: candidate };
    }
  }
  return null;
}

export type ResolvedText = {
  tagline: Localized<string> | null;
  description: Localized<string> | null;
  role: Localized<string> | null;
  features: Localized<string[]> | null;
};

export function resolveText(
  lang: Locale,
  slug: string,
  stored: ByLocale<ProjectText> | null,
): ResolvedText {
  const sources = stored ? [stored, seedText(slug)] : [seedText(slug)];
  return {
    tagline: pick(lang, sources, (text) => written(text.tagline)),
    description: pick(lang, sources, (text) => written(text.description)),
    role: pick(lang, sources, (text) => written(text.role)),
    features: pick(lang, sources, (text) => listed(text.features)),
  };
}

export type ResolvedCase = {
  position: number;
  problem: Localized<string> | null;
  work: Localized<string> | null;
  result: Localized<string> | null;
};

export function resolveCase(
  lang: Locale,
  slug: string,
  position: number | null,
  stored: ByLocale<CaseText> | null,
): ResolvedCase | null {
  if (position === null) return null;
  const sources = stored ? [stored, seedCaseText(slug)] : [seedCaseText(slug)];
  return {
    position,
    problem: pick(lang, sources, (text) => written(text.problem)),
    work: pick(lang, sources, (text) => written(text.work)),
    result: pick(lang, sources, (text) => written(text.result)),
  };
}

export function resolveCaption(
  lang: Locale,
  captions: ByLocale<string | null>,
): Localized<string> | null {
  return pick(lang, [captions], written);
}

/**
 * `lang` attribute for a piece of text: only when it is not written in the
 * language of the page, so a screen reader switches voice and nothing else
 * changes in the markup.
 */
export function langAttr(text: Localized<unknown> | null, page: string): Locale | undefined {
  return text && text.lang !== page ? text.lang : undefined;
}
