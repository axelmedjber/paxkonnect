// Fails (exit 1) when any locale file is missing keys or has extra keys
// compared to the reference locale (fr.json). Run with: npm run check:i18n
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const MESSAGES_DIR = fileURLToPath(new URL("../messages", import.meta.url));
const REFERENCE = "fr.json";

function flattenKeys(value, prefix = "") {
  if (typeof value !== "object" || value === null) {
    return [prefix];
  }

  return Object.entries(value).flatMap(([key, child]) =>
    flattenKeys(child, prefix ? `${prefix}.${key}` : key),
  );
}

const files = readdirSync(MESSAGES_DIR).filter((file) => file.endsWith(".json"));

if (!files.includes(REFERENCE)) {
  console.error(`Reference locale file ${REFERENCE} not found in ${MESSAGES_DIR}`);
  process.exit(1);
}

const keySets = new Map(
  files.map((file) => [
    file,
    new Set(flattenKeys(JSON.parse(readFileSync(join(MESSAGES_DIR, file), "utf8")))),
  ]),
);
const referenceKeys = keySets.get(REFERENCE);
let failed = false;

for (const [file, keys] of keySets) {
  const missing = [...referenceKeys].filter((key) => !keys.has(key));
  const extra = [...keys].filter((key) => !referenceKeys.has(key));

  if (missing.length > 0 || extra.length > 0) {
    failed = true;
    console.error(`${file}: ${missing.length} missing, ${extra.length} extra (vs ${REFERENCE})`);
    for (const key of missing) console.error(`  missing: ${key}`);
    for (const key of extra) console.error(`  extra:   ${key}`);
  } else {
    console.log(`${file}: OK (${keys.size} keys)`);
  }
}

process.exit(failed ? 1 : 0);
