/**
 * Reddit Standalone Crawler
 *
 * Usage:
 *   node scripts/crawl-reddit.mjs
 *   node scripts/crawl-reddit.mjs --limit=30
 */

import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { crawlReddit } from "../src/lib/crawlers/reddit.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../.env.local") });

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {};

  args.forEach((arg) => {
    if (arg.startsWith("--")) {
      const [key, value] = arg.slice(2).split("=");
      if (key === "limit") options.limit = parseInt(value, 10);
    }
  });

  return options;
}

async function main() {
  const options = parseArgs();
  const limit = options.limit || 20;

  console.log(`[Reddit Crawler] Starting with limit=${limit}`);
  console.log(`[Reddit Crawler] Timestamp: ${new Date().toISOString()}`);

  try {
    const result = await crawlReddit({ limit });

    if (result.success) {
      console.log(
        `\n[Reddit Crawler] ✅ Success: ${result.count} items crawled`,
      );
    } else {
      console.error(`[Reddit Crawler] ❌ Failed: ${result.error}`);
      process.exit(1);
    }
  } catch (error) {
    console.error(`[Reddit Crawler] ❌ Error: ${error.message}`);
    process.exit(1);
  }
}

main();
