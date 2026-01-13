/**
 * YouTube OAuth2 토큰 발급 스크립트
 *
 * 사용법:
 * 1. Google Cloud Console에서 OAuth 2.0 클라이언트 ID 생성
 * 2. .env.local에 YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET 설정
 * 3. node scripts/youtube-oauth.js 실행
 * 4. 브라우저에서 로그인 후 code 복사
 * 5. 터미널에 code 입력
 * 6. 출력된 refresh_token을 .env.local에 저장
 */

import { config } from "dotenv";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { google } from "googleapis";
import * as readline from "readline";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "..", ".env.local") });

const SCOPES = ["https://www.googleapis.com/auth/youtube.readonly"];

async function getRefreshToken() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.YOUTUBE_CLIENT_ID,
    process.env.YOUTUBE_CLIENT_SECRET,
    "http://localhost:3000/oauth2callback" // Redirect URI
  );

  // 인증 URL 생성
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
    prompt: "consent", // 항상 refresh_token 받기 위해
  });

  console.log("\n=== YouTube OAuth2 Setup ===\n");
  console.log("1. 아래 URL을 브라우저에서 열어주세요:\n");
  console.log(authUrl);
  console.log("\n2. Google 계정으로 로그인하고 권한을 승인하세요.");
  console.log("3. 리다이렉트된 URL에서 code= 뒤의 값을 복사하세요.");
  console.log("   (예: http://localhost:3000/oauth2callback?code=4/0ABC... 에서 4/0ABC...)\n");

  // 사용자 입력 받기
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const code = await new Promise((resolve) => {
    rl.question("code를 입력하세요: ", (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });

  try {
    // 토큰 교환
    const { tokens } = await oauth2Client.getToken(code);

    console.log("\n=== 토큰 발급 성공 ===\n");
    console.log("아래 내용을 .env.local에 추가하세요:\n");
    console.log(`YOUTUBE_REFRESH_TOKEN=${tokens.refresh_token}`);
    console.log("\n=========================\n");

    // 테스트: 구독 목록 조회
    oauth2Client.setCredentials(tokens);
    const youtube = google.youtube({ version: "v3", auth: oauth2Client });

    const response = await youtube.subscriptions.list({
      part: "snippet",
      mine: true,
      maxResults: 5,
    });

    console.log("테스트 성공! 구독 중인 채널 샘플:");
    response.data.items.forEach((item) => {
      console.log(`  - ${item.snippet.title}`);
    });
  } catch (error) {
    console.error("\n토큰 발급 실패:", error.message);
    if (error.response) {
      console.error("상세:", error.response.data);
    }
  }
}

getRefreshToken();
