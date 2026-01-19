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

async function checkPendingAnalysis() {
  const { data, error } = await supabase
    .from("crawled_content")
    .select("id, platform, platform_id, title, status, screenshot_url")
    .eq("status", "pending_analysis")
    .order("crawled_at", { ascending: false });

  if (error) {
    console.error("Error:", error.message);
    return;
  }

  const grouped = {};
  data.forEach((item) => {
    if (!grouped[item.platform]) grouped[item.platform] = [];
    grouped[item.platform].push(item);
  });

  console.log("=== pending_analysis 상태 콘텐츠 ===");
  Object.keys(grouped).forEach((platform) => {
    console.log(
      "\n[" + platform.toUpperCase() + "] - " + grouped[platform].length + "개"
    );
    grouped[platform].slice(0, 5).forEach((item, i) => {
      console.log("  " + (i + 1) + ". " + (item.title || item.platform_id));
    });
    if (grouped[platform].length > 5) {
      console.log("  ... 외 " + (grouped[platform].length - 5) + "개");
    }
  });

  console.log("\n총 " + data.length + "개 분석 대기 중");
}

checkPendingAnalysis();
