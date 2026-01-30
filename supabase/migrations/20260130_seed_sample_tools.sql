-- Sample tools data for testing

INSERT INTO tools (name, slug, description, description_en, link, thumbnail_url, admin_rating, tags, pricing, is_featured, pros, cons)
VALUES 
(
  'Cursor',
  'cursor',
  'AI 기반 코드 에디터. VS Code 포크로 만들어졌으며, AI 페어 프로그래밍을 지원합니다.',
  'AI-powered code editor. Built as a VS Code fork, supports AI pair programming.',
  'https://cursor.com',
  'https://cursor.com/brand/icon.svg',
  5,
  ARRAY['vibe-coding', 'claude', 'automation'],
  'freemium',
  true,
  ARRAY['강력한 AI 코드 완성', 'Claude/GPT 모델 지원', 'VS Code 확장 호환', 'Composer로 멀티파일 편집'],
  ARRAY['무료 사용량 제한', '대용량 프로젝트에서 가끔 느림']
),
(
  'v0 by Vercel',
  'v0-vercel',
  'AI로 React/Next.js UI 컴포넌트를 생성하는 도구. 프롬프트로 즉시 UI를 만들 수 있습니다.',
  'AI tool for generating React/Next.js UI components. Create UI instantly with prompts.',
  'https://v0.dev',
  'https://v0.dev/icon-dark-background.png',
  4,
  ARRAY['ui', 'vibe-coding', 'content-creation'],
  'freemium',
  true,
  ARRAY['빠른 UI 프로토타이핑', 'Tailwind CSS 코드 생성', 'shadcn/ui 컴포넌트 호환'],
  ARRAY['복잡한 로직 구현 불가', '크레딧 시스템']
),
(
  'Claude Code',
  'claude-code',
  'Anthropic의 Claude를 활용한 터미널 기반 AI 코딩 어시스턴트.',
  'Terminal-based AI coding assistant powered by Anthropic Claude.',
  'https://docs.anthropic.com/en/docs/claude-code',
  'https://www.anthropic.com/images/icons/safari-pinned-tab.svg',
  5,
  ARRAY['claude', 'vibe-coding', 'automation', 'opensource'],
  'paid',
  true,
  ARRAY['강력한 코드 이해력', '터미널 통합', '멀티파일 편집', 'MCP 지원'],
  ARRAY['API 비용 발생', '인터넷 연결 필요']
),
(
  'bolt.new',
  'bolt-new',
  'StackBlitz의 AI 웹 개발 플랫폼. 브라우저에서 바로 풀스택 앱을 만들 수 있습니다.',
  'AI web development platform by StackBlitz. Build full-stack apps directly in browser.',
  'https://bolt.new',
  'https://bolt.new/social_preview_index.jpg',
  4,
  ARRAY['vibe-coding', 'ui', 'automation'],
  'freemium',
  false,
  ARRAY['브라우저 기반 개발', '즉시 배포 가능', '다양한 프레임워크 지원'],
  ARRAY['복잡한 백엔드 제한', '토큰 사용량 제한']
),
(
  'Windsurf',
  'windsurf',
  'Codeium의 AI IDE. 플로우 기반 AI 코딩으로 자연스러운 개발 경험을 제공합니다.',
  'AI IDE by Codeium. Provides natural development experience with flow-based AI coding.',
  'https://codeium.com/windsurf',
  'https://codeium.com/favicon.svg',
  4,
  ARRAY['vibe-coding', 'automation'],
  'freemium',
  false,
  ARRAY['무료 플랜 제공', '빠른 자동완성', 'Cascade AI 에이전트'],
  ARRAY['Cursor 대비 기능 부족', '커뮤니티 작음']
);
