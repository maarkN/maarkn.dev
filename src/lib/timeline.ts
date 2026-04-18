export type TimelineKey =
  | "freelance"
  | "nectar"
  | "sevencred"
  | "ecto"
  | "vendorhub"
  | "ecto1"
  | "collectgram1"
  | "collectgram0";

export type TimelineEntry = {
  key: TimelineKey;
  company: string;
  period: string;
  current?: boolean;
};

export const timeline: TimelineEntry[] = [
  { key: "freelance", company: "Self-Employed · Freelance", period: "Dec 2024 — Now", current: true },
  { key: "nectar", company: "Nectar CRM", period: "Jan 2024 — Nov 2024" },
  { key: "sevencred", company: "Sevencred", period: "Aug 2022 — Jan 2024" },
  { key: "ecto", company: "Ecto Digital", period: "Oct 2021 — Aug 2022" },
  { key: "vendorhub", company: "VendorHub", period: "Jun 2021 — Oct 2021" },
  { key: "ecto1", company: "Ecto Digital", period: "Feb 2021 — Jun 2021" },
  { key: "collectgram1", company: "Collectgram", period: "Feb 2020 — Jan 2021" },
  { key: "collectgram0", company: "Collectgram", period: "Jul 2019 — Jan 2020" },
];
