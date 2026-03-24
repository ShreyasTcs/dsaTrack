/**
 * Seed Netlify Blobs from local JSON files.
 *
 * This runs as a Netlify build plugin (see netlify.toml).
 * It uploads all data/*.json files to the "dsa-data" blob store
 * so the app has its static data available on first deploy.
 *
 * Can also be run manually:
 *   NETLIFY=true NETLIFY_SITE_ID=xxx NETLIFY_TOKEN=xxx npx tsx scripts/seed-blobs.ts
 */

import { getStore } from "@netlify/blobs";
import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");

const FILES = [
  "problems.json",
  "progress.json",
  "sheets.json",
  "topics.json",
  "patterns.json",
  "streaks.json",
  "contests.json",
  "settings.json",
  "similar.json",
];

async function main() {
  const store = getStore("dsa-data");

  console.log("Seeding Netlify Blobs...");
  for (const file of FILES) {
    const filePath = path.join(DATA_DIR, file);
    try {
      const raw = fs.readFileSync(filePath, "utf-8");
      const data = JSON.parse(raw);
      await store.setJSON(file, data);
      console.log(`  + ${file}`);
    } catch (err) {
      console.log(`  - ${file} (${err instanceof Error ? err.message : "skip"})`);
    }
  }

  console.log("Done.");
}

main().catch(console.error);
