import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

async function getPending() {
  const { data: records, error } = await supabase
    .from("crawled_content")
    .select("id, platform_id, screenshot_url, raw_data")
    .eq("platform", "threads")
    .eq("status", "pending_analysis")
    .order("crawled_at", { ascending: false })
    .limit(5); // Analyze top 5 for now to avoid context limit issues

  if (error) {
    console.error("Error:", error);
    return;
  }

  console.log(JSON.stringify(records, null, 2));
}

getPending();
