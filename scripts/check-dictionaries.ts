/**
 * Dictionary parity check — every locale file under src/dictionaries must
 * expose exactly the same key tree as en.json (the reference), with the same
 * value kinds (string / array / object) at every leaf.
 *
 *   pnpm exec tsx scripts/check-dictionaries.ts   (also runs as part of `pnpm lint`)
 *
 * Exits 1 and lists every divergence, so a key added to one language and
 * forgotten in the other fails CI instead of rendering `undefined`.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const DIR = join(process.cwd(), "src", "dictionaries");
const REFERENCE = "en.json";

type Json = string | number | boolean | null | Json[] | { [key: string]: Json };

function load(file: string): Json {
  return JSON.parse(readFileSync(join(DIR, file), "utf8")) as Json;
}

function kind(value: Json): string {
  if (Array.isArray(value)) return "array";
  if (value !== null && typeof value === "object") return "object";
  return typeof value;
}

/** Flattens an object into `{ "a.b.c": kind }`; arrays are leaves. */
function flatten(value: Json, prefix = "", out: Map<string, string> = new Map()): Map<string, string> {
  if (kind(value) === "object") {
    for (const [key, child] of Object.entries(value as { [key: string]: Json })) {
      flatten(child, prefix ? `${prefix}.${key}` : key, out);
    }
  } else {
    out.set(prefix, kind(value));
  }
  return out;
}

function compare(reference: Map<string, string>, other: Map<string, string>, file: string): string[] {
  const problems: string[] = [];
  for (const [path, type] of reference) {
    const otherType = other.get(path);
    if (otherType === undefined) problems.push(`${file}: missing "${path}"`);
    else if (otherType !== type) problems.push(`${file}: "${path}" is ${otherType}, expected ${type}`);
  }
  for (const path of other.keys()) {
    if (!reference.has(path)) problems.push(`${file}: extra "${path}" (not in ${REFERENCE})`);
  }
  return problems;
}

const files = readdirSync(DIR).filter((f) => f.endsWith(".json"));
if (!files.includes(REFERENCE)) {
  console.error(`check-dictionaries: ${REFERENCE} not found in ${DIR}`);
  process.exit(1);
}

const reference = flatten(load(REFERENCE));
const problems = files
  .filter((f) => f !== REFERENCE)
  .flatMap((f) => compare(reference, flatten(load(f)), f));

if (problems.length > 0) {
  console.error(`check-dictionaries: ${problems.length} problem(s)\n` + problems.map((p) => `  - ${p}`).join("\n"));
  process.exit(1);
}

console.log(`check-dictionaries: ${files.length} files, ${reference.size} keys, in sync`);
