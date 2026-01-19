This is a [Next.js](https://nextjs.org/) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/basic-features/font-optimization) to automatically optimize and load Inter, a custom Google Font.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js/) - your feedback and contributions are welcome!

## Credentials Maintenance (정기 유지관리)

크롤러가 정상 작동하려면 아래 인증 정보들을 주기적으로 갱신해야 합니다.

### 1. SNS 로그인 쿠키 (X, Threads)

**갱신 주기:** 1~2주마다 (또는 크롤링 실패 시)

**저장 위치:** `cookies/x.json`, `cookies/threads.json`

**갱신 방법:**
```bash
# 브라우저에서 세션 저장 (로그인 상태에서)
node scripts/save-session.js x
node scripts/save-session.js threads
```

또는 Cookie-Editor 확장 프로그램 사용:
1. 브라우저에서 X/Threads에 로그인
2. Cookie-Editor 확장 프로그램으로 쿠키 Export (JSON)
3. `cookies/x.json` 또는 `cookies/threads.json`에 저장

**만료 증상:**
- 크롤링 로그에 "No cookies found" 또는 "Login required" 오류
- 스크린샷이 로그인 페이지로 캡처됨

---

### 2. GitHub Personal Access Token

**용도:** star-history.com API 호출 (스타 히스토리 스크린샷 캡처 시 rate limit 방지)

**갱신 주기:** 토큰 만료일 전 (기본 90일, 설정에 따라 다름)

**환경변수:** `GITHUB_TOKEN`

**갱신 방법:**
1. https://github.com/settings/tokens 접속
2. "Generate new token (classic)" 클릭
3. 권한: `public_repo` (최소 권한)
4. `.env.local` 파일에 업데이트:
   ```
   GITHUB_TOKEN=ghp_xxxxxxxxxxxxx
   ```

**만료 증상:**
- star-history 스크린샷 캡처 실패
- GitHub API rate limit 초과 오류

---

### 3. YouTube OAuth Token

**용도:** YouTube 채널 구독 피드 크롤링

**갱신 주기:** Refresh Token은 장기 유효 (6개월 비사용 시 만료)

**환경변수:** `YOUTUBE_CLIENT_ID`, `YOUTUBE_CLIENT_SECRET`, `YOUTUBE_REFRESH_TOKEN`

**갱신 방법:**
1. https://console.cloud.google.com/ 접속
2. YouTube Data API v3 활성화
3. OAuth 2.0 클라이언트 ID 생성
4. OAuth 동의 화면에서 refresh_token 발급
5. `.env.local` 파일에 업데이트

---

### 환경변수 체크리스트

| 변수명 | 용도 | 갱신 주기 |
|--------|------|-----------|
| `GITHUB_TOKEN` | star-history 스크린샷 | 90일 |
| `YOUTUBE_REFRESH_TOKEN` | YouTube 피드 | 6개월 (비사용시) |
| `cookies/x.json` | X 크롤링 | 1~2주 |
| `cookies/threads.json` | Threads 크롤링 | 1~2주 |

**환경변수 파일:** `.env.local` (git에 커밋하지 않음)

---

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/deployment) for more details.
