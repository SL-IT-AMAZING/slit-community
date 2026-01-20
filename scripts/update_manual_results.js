import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import fs from "fs";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const results = JSON.parse(
  fs.readFileSync("scripts/manual_results.json", "utf8"),
);

async function updateManual() {
  console.log(`Updating ${results.length} records...`);
  let updated = 0;
  let totalScore = 0;

  for (const r of results) {
    const authorName = r.author_handle.replace("@", "");
    const title = `${authorName} - ${r.summary_oneline}`;

    const updateData = {
      title: title,
      content_text: r.content_en,
      translated_content: r.content_ko,
      published_at: new Date().toISOString(), // Using current time as fallback
      digest_result: {
        summary_oneline: r.summary_oneline,
        categories: r.categories,
        metrics: r.metrics,
        author_handle: r.author_handle,
        recommendScore: r.recommendScore,
        recommendReason: r.recommendReason,
        processedAt: new Date().toISOString(),
      },
      status: "pending",
    };

    const { error } = await supabase
      .from("crawled_content")
      .update(updateData)
      .eq("platform_id", r.platform_id)
      .eq("platform", "threads");

    if (error) {
      console.error(`Error updating ${r.platform_id}:`, error.message);
    } else {
      updated++;
      totalScore += r.recommendScore;
      console.log(`Updated: ${r.platform_id} - Score: ${r.recommendScore}`);
    }
  }

  console.log("\n========== 분석 완료 ==========");
  console.log("분석된 개수:", updated);
  console.log(
    "평균 추천점수:",
    updated > 0 ? (totalScore / updated).toFixed(2) : "N/A",
  );
}

updateManual();
