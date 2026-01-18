#!/usr/bin/env node

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "..", ".env.local") });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function updateAnalysis(recordId, analysisData) {
  const { data, error } = await supabase
    .from("crawled_content")
    .update({
      title: analysisData.title,
      content_text: analysisData.content_en,
      translated_content: analysisData.content_ko,
      thumbnail_url: analysisData.thumbnail_url,
      digest_result: {
        summary_oneline: analysisData.summary_oneline,
        categories: analysisData.categories,
        metrics: analysisData.metrics,
        author_handle: analysisData.author_handle,
        author_name: analysisData.author_name,
        published_at: analysisData.published_at,
        recommendScore: analysisData.recommendScore,
        recommendReason: analysisData.recommendReason,
        processedAt: new Date().toISOString(),
      },
      status: "pending",
    })
    .eq("id", recordId)
    .select("id, title");

  if (error) {
    console.error("Error updating:", error.message);
    return null;
  }

  console.log("Updated:", recordId, "->", data[0]?.title);
  return data;
}

// Parse command line arguments
const recordId = process.argv[2];
const analysisJson = process.argv[3];

if (!recordId || !analysisJson) {
  console.error("Usage: node update-analysis.js <record-id> '<json>'");
  process.exit(1);
}

try {
  const analysisData = JSON.parse(analysisJson);
  await updateAnalysis(recordId, analysisData);
} catch (e) {
  console.error("JSON parse error:", e.message);
  process.exit(1);
}
