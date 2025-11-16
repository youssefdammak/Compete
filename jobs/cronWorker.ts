// jobs/cronWorker.ts
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" }); // <-- Add this line at the very top

import { updateCompetitor } from "./updateCompetitors";

const competitorsToTrack = [
  "https://www.ebay.ca/str/surplusbydesign",
];

async function runCron() {
  console.log(`[${new Date().toISOString()}] Starting competitor update cron...`);
  for (const url of competitorsToTrack) {
    try {
      const result = await updateCompetitor(url);
      console.log(`[${new Date().toISOString()}] Updated ${url}:`, result);
    } catch (err) {
      console.error(`[${new Date().toISOString()}] Error updating ${url}:`, err);
    }
  }
}

// Run immediately on start
runCron();

// Run every 5 minutes
setInterval(runCron, 5 * 60 * 1000);
