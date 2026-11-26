/**
 * Every value the translated screens show has its word in both dictionaries
 * (task 4.2 of rebrand-09): the stage, the visa, the statuses, the reasons. A
 * value added to an enum without its words fails here, instead of showing its
 * raw key on screen.
 */
import { describe, expect, it } from "vitest";
import en from "@/dictionaries/en.json";
import ptBR from "@/dictionaries/pt-BR.json";
import { AUDIT_STATUSES } from "@/app/admin/audit/audit-status";
import { CHAT_STATUSES } from "@/app/admin/chat/chat-status";
import { KEY_STATUSES } from "@/app/admin/api-keys/key-status";
import { CONTACT_CHANNELS, REFERENCE_LANGUAGES } from "@/app/admin/contacts/vocabulary";
import { GENERATOR_LANGUAGES } from "@/app/admin/generator/languages";
import { EMPLOYMENT_TYPES, JOB_LINK_KEYS, RADAR_NO_VERDICT, RADAR_VERDICTS, VERIFICATION_VERDICTS, WORK_MODES } from "@/app/admin/jobs/radar";
import { AUDIT_REASONS } from "@/app/admin/audit/audit-status";
import {
  APPLICATION_SOURCES,
  FUNNEL_STAGES,
  FUNNEL_STAGE_PHASES,
  SPONSORSHIP_ROUTE_KEYS,
  SPONSORSHIP_SIGNALS,
} from "@/lib/applications";
import { BOARD_COLUMNS } from "@/lib/admin/funnel";
import { MCP_SCOPES } from "@/lib/mcp/scopes";
import { projectCategories } from "@/lib/projects";

const SETS: [keyof typeof en.admin.vocab, readonly string[]][] = [
  ["stage", FUNNEL_STAGES],
  ["phase", FUNNEL_STAGE_PHASES.map((phase) => phase.key)],
  ["column", BOARD_COLUMNS.map((column) => column.key)],
  ["visa", SPONSORSHIP_SIGNALS],
  ["visaHint", SPONSORSHIP_SIGNALS],
  ["route", SPONSORSHIP_ROUTE_KEYS],
  ["routeHint", SPONSORSHIP_ROUTE_KEYS],
  ["source", APPLICATION_SOURCES],
  ["link", JOB_LINK_KEYS],
  ["verdict", [...RADAR_VERDICTS, RADAR_NO_VERDICT]],
  ["verification", VERIFICATION_VERDICTS],
  ["workMode", WORK_MODES],
  ["employmentType", EMPLOYMENT_TYPES],
  ["auditReason", AUDIT_REASONS],
  ["expiry", ["7", "30", "90", "180", "365", "never"]],
  ["channel", CONTACT_CHANNELS],
  ["referenceLanguage", REFERENCE_LANGUAGES],
  ["projectCategory", projectCategories],
  ["projectStatus", ["live", "internal", "nda", "archived"]],
  ["visibility", ["public", "private"]],
  ["generatorLanguage", GENERATOR_LANGUAGES],
  ["chatStatus", CHAT_STATUSES],
  ["auditStatus", AUDIT_STATUSES],
  ["keyStatus", KEY_STATUSES],
  ["scope", MCP_SCOPES],
];

describe.each([
  ["pt-BR", ptBR.admin.vocab],
  ["en", en.admin.vocab],
] as const)("the words of %s", (_locale, vocab) => {
  it.each(SETS)("cover every %s", (name, values) => {
    const words = vocab[name] as Record<string, string>;
    for (const value of values) {
      expect(words[value], `${name}.${value}`).toEqual(expect.stringMatching(/\S/));
    }
    // And nothing the code no longer has.
    expect(Object.keys(words).sort()).toEqual([...values].sort());
  });
});

describe("the stages", () => {
  it("have a name of their own in each language, apart from the ones that are the same word", () => {
    const same = new Set(["radar"]);
    for (const stage of FUNNEL_STAGES) {
      if (same.has(stage)) continue;
      expect(en.admin.vocab.stage[stage], stage).not.toBe(ptBR.admin.vocab.stage[stage]);
    }
  });
});
