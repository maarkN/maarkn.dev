import "server-only";

const dictionaries = {
  en: () => import("@/dictionaries/en.json").then((m) => m.default),
  "pt-BR": () => import("@/dictionaries/pt-BR.json").then((m) => m.default),
};

export type Locale = keyof typeof dictionaries;
export const locales = Object.keys(dictionaries) as Locale[];
export const defaultLocale: Locale = "en";

export const hasLocale = (l: string): l is Locale => l in dictionaries;

/** The texts of the site. The backoffice's are apart, so that no public page can send them. */
export const getDictionary = async (locale: Locale) => {
  const { admin, ...site } = await dictionaries[locale]();
  void admin;
  return site;
};

/** The texts of the backoffice, for `/admin` alone. */
export const getAdminDictionary = async (locale: Locale) => (await dictionaries[locale]()).admin;

export type Dictionary = Awaited<ReturnType<typeof getDictionary>>;
export type AdminDictionary = Awaited<ReturnType<typeof getAdminDictionary>>;
