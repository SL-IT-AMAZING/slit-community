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

## Crawler Scheduler

SNS 콘텐츠 자동 크롤링 스케줄러 실행 방법:

```bash
cd /Users/ownuun/conductor/workspaces/v2-v1/kiev

# 포그라운드 실행 (터미널 닫으면 종료)
node scripts/scheduler.js

# 백그라운드 실행 (터미널 닫아도 계속 실행)
nohup node scripts/scheduler.js > crawler.log 2>&1 &
```

**크롤링 주기:**
- YouTube, Reddit, X, Threads: 1.5~2.5시간마다
- GitHub, Trendshift: 24시간마다

**백그라운드 프로세스 종료:**
```bash
# 프로세스 찾기
ps aux | grep scheduler

# 종료
kill <PID>
```

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/deployment) for more details.
