// Shared constants for the admin job-application tracker (no server-only marker
// so client components can import the labels too).

export const APPLICATION_STATUSES = [
  "not_applied",
  "applied",
  "replied",
  "interview",
  "offer",
  "rejected",
] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export const STATUS_LABELS: Record<ApplicationStatus, string> = {
  not_applied: "Não aplicado",
  applied: "Aplicado",
  replied: "Resposta",
  interview: "Entrevista",
  offer: "Oferta",
  rejected: "Recusado",
};

export const APPLICATION_SOURCES = [
  "vanhack",
  "linkedin",
  "company_site",
  "indeed",
  "glassdoor",
  "recruiter",
  "referral",
  "other",
] as const;
export type ApplicationSource = (typeof APPLICATION_SOURCES)[number];

export const SOURCE_LABELS: Record<ApplicationSource, string> = {
  vanhack: "VanHack",
  linkedin: "LinkedIn",
  company_site: "Company Site",
  indeed: "Indeed",
  glassdoor: "Glassdoor",
  recruiter: "Recruiter",
  referral: "Referral",
  other: "Other",
};

export function statusLabel(s: string): string {
  return (STATUS_LABELS as Record<string, string>)[s] ?? s;
}
export function sourceLabel(s: string): string {
  return (SOURCE_LABELS as Record<string, string>)[s] ?? s;
}
