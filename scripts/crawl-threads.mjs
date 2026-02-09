/**
 * Threads Standalone Crawler
 *
 * Usage:
 *   node scripts/crawl-threads.mjs
 *   node scripts/crawl-threads.mjs --limit=30
 */

import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { crawlThreads } from "../src/lib/crawlers/threads.js";

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

  console.log(`[Threads Crawler] Starting with limit=${limit}`);
  console.log(`[Threads Crawler] Timestamp: ${new Date().toISOString()}`);

  try {
    const result = await crawlThreads({ limit });

    if (result.success) {
      console.log(
        `\n[Threads Crawler] ✅ Success: ${result.count} items crawled`,
      );
      if (result.items?.length > 0) {
        console.log("\n=== Crawled Items ===");
        result.items.forEach((item, i) => {
          console.log(`${i + 1}. ${item.author_name} - ${item.platform_id}`);
        });
      }
    } else {
      console.error(`[Threads Crawler] ❌ Failed: ${result.error}`);
      process.exit(1);
    }
  } catch (error) {
    console.error(`[Threads Crawler] ❌ Error: ${error.message}`);
    process.exit(1);
  }
}

main();
