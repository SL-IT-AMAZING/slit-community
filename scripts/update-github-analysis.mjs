#!/usr/bin/env node

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "..", ".env.local") });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

async function updateGithubAnalysis(id, analysis) {
  const { data, error } = await supabase
    .from("crawled_content")
    .update({
      title: `${analysis.project_name} - ${analysis.tagline}`,
      content_text: analysis.content_en,
      translated_content: analysis.content_ko,
      thumbnail_url: analysis.screenshot_url,
      digest_result: {
        tagline: analysis.tagline,
        competitor: analysis.competitor,
        killer_feature: analysis.killer_feature,
        features: analysis.features,
        use_cases: analysis.use_cases,
        license: analysis.license,
        categories: analysis.categories,
        ranking: analysis.ranking,
        processedAt: new Date().toISOString(),
      },
      status: "pending",
    })
    .eq("id", id)
    .select();

  if (error) {
    console.error("Error updating:", error.message);
    return null;
  }

  console.log(`Updated: ${analysis.project_name}`);
  return data;
}

// Get arguments
const args = process.argv.slice(2);
if (args.length < 2) {
  console.log("Usage: node update-github-analysis.mjs <id> '<json_analysis>'");
  process.exit(1);
}

const id = args[0];
const analysis = JSON.parse(args[1]);

updateGithubAnalysis(id, analysis).then(() => {
  console.log("Done");
  process.exit(0);
});
