// src/scripts/seed.ts
// Seeds the initial three projects into the Prisma database.
// Run: npx tsx src/scripts/seed.ts

import { ensureProjectsExist } from "../lib/persistence";

async function main() {
  console.log("Seeding projects…");
  await ensureProjectsExist();
  console.log("Done — 3 projects seeded.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
