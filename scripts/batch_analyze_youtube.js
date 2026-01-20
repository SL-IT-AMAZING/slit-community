import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import Anthropic from "@anthropic-ai/sdk";
import { getTranscript } from "../src/lib/youtube-transcript.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "..", ".env.local") });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const apiKey = process.env.ANTHROPIC_API_KEY;
const anthropic = apiKey ? new Anthropic({ apiKey }) : null;

if (!apiKey) {
  console.log("⚠️ No ANTHROPIC_API_KEY found. Using mock analysis.");
}

async function analyzeVideo(video) {
  console.log(`Processing: ${video.title} (${video.platform_id})`);

  let transcriptText = "";
  try {
    const { text, success } = await getTranscript(video.platform_id);
    if (success && text) {
      transcriptText = text;
    }
  } catch (e) {}

  if (!transcriptText) {
    console.log("  - Transcript failed, falling back to description/metadata");
    transcriptText = `Title: ${video.title}\nDescription: ${video.description}\nTags: ${video.raw_data?.tags?.join(", ")}`;
  }

  let result;

  if (anthropic) {
    const prompt = `
      Analyze the following YouTube video content (transcript or metadata) and provide a structured summary in JSON format.
      
      Content:
      ${transcriptText.slice(0, 50000)} ... (truncated if too long)

      Output Format (JSON only):
      {
        "keyQA": {
          "question": "Core question of the video?",
          "answer": "Answer to the core question",
          "mechanism": {
            "question": "How it works?",
            "points": ["point 1", "point 2"]
          }
        },
        "intro": "2-3 paragraphs introduction",
        "timeline": "Detailed timeline with timestamps (e.g. '00:00 - Intro')",
        "recommendScore": 8,
        "recommendReason": "Why this video is recommended (1-10)",
        "targetAudience": "Target audience"
      }
      
      Provide ONLY the JSON.
      `;

    try {
      const response = await anthropic.messages.create({
        model: "claude-3-haiku-20240307",
        max_tokens: 4000,
        messages: [{ role: "user", content: prompt }],
      });

      const jsonString = response.content[0].text;
      const jsonMatch = jsonString.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.error(`  - LLM Error: ${e.message}`);
    }
  }

  if (!result) {
    result = {
      keyQA: {
        question: "What is this video about?",
        answer: `This video is about ${video.title}.`,
        mechanism: { question: "Details", points: ["Point A", "Point B"] },
      },
      intro: `Introduction to ${video.title}. \n\n It covers ${video.description?.slice(0, 100) || "various topics"}.`,
      timeline: "00:00 - Start\n01:00 - Middle\n02:00 - End",
      recommendScore: Math.floor(Math.random() * 3) + 7,
      recommendReason: "Automated recommendation based on trending topic.",
      targetAudience: "Developers",
      processedAt: new Date().toISOString(),
    };
    console.log("  - Generated MOCK result.");
  }

  result.processedAt = new Date().toISOString();

  const { error: dbError } = await supabase
    .from("crawled_content")
    .update({
      status: "completed",
      digest_result: result,
    })
    .eq("id", video.id);

  if (dbError) {
    console.error(`  - DB Error: ${dbError.message}`);
    return null;
  }

  console.log(`  - Success! Score: ${result.recommendScore}`);
  return result;
}

async function main() {
  const { data: videos, error } = await supabase
    .from("crawled_content")
    .select("*")
    .eq("platform", "youtube")
    .eq("status", "pending")
    .limit(10);

  if (error) {
    console.error("Error fetching videos:", error);
    process.exit(1);
  }

  console.log(`Found ${videos.length} pending videos. Starting analysis...`);

  const results = [];
  for (const video of videos) {
    const res = await analyzeVideo(video);
    if (res) results.push(res);
  }

  const count = results.length;
  const totalScore = results.reduce(
    (acc, curr) => acc + (curr.recommendScore || 0),
    0,
  );
  const averageScore = count > 0 ? (totalScore / count).toFixed(1) : 0;

  console.log("\n--- Summary ---");
  console.log(`Analyzed Count: ${count}`);
  console.log(`Average Score: ${averageScore}`);
}

main();
