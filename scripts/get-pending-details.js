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

async function getPendingDetails() {
  const { data, error } = await supabase
    .from("crawled_content")
    .select("id, platform, platform_id, title, url, screenshot_url, status")
    .eq("status", "pending_analysis")
    .order("crawled_at", { ascending: false });

  if (error) {
    console.error("Error:", error.message);
    return;
  }

  // Output as JSON for easy parsing
  console.log(JSON.stringify(data, null, 2));
}

getPendingDetails();
