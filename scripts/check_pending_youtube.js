import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkPendingYouTube() {
  const { data, error } = await supabase
    .from("crawled_content")
    .select("*")
    .eq("platform", "youtube")
    .eq("status", "pending");

  if (error) {
    console.error("Error:", error);
    return;
  }

  console.log(`Found ${data.length} pending YouTube videos.`);
  if (data.length > 0) {
    console.log("Sample:", JSON.stringify(data[0], null, 2));
  }
}

checkPendingYouTube();
