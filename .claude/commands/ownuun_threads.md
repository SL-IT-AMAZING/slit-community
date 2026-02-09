# Ownuun Threads - Threads 전체 파이프라인

Threads 콘텐츠를 **크롤링 → 분석 → 게시**하는 전체 파이프라인입니다.

---

## 아키텍처

```
/ownuun_threads (독립 파이프라인)
    │
    ├─ Phase 1: 크롤링
    │      └─ node scripts/crawl-threads.mjs → DB 저장 (pending_analysis)
    │
    ├─ Phase 2: 에이전트 직접 분석
    │      └─ look_at으로 스크린샷 Vision 분석 → DB 업데이트 (pending)
    │
    └─ Phase 3: 게시
           ├─ 7점 이상: 자동 게시
           └─ 7점 미만: 사용자 선택
```

---

## Phase 1: 크롤링

### Step 1.1: 크롤러 실행

```bash
cd /Users/ownuun/conductor/workspaces/v2-v1/kiev && node scripts/crawl-threads.mjs --limit=20
```

### Step 1.2: 크롤링 결과 확인

```bash
cd /Users/ownuun/conductor/workspaces/v2-v1/kiev && node -e "
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const MINIMUM = 10;

async function check() {
  const { count } = await supabase
    .from('crawled_content')
    .select('*', { count: 'exact', head: true })
    .eq('platform', 'threads')
    .eq('status', 'pending_analysis');

  const status = (count || 0) >= MINIMUM ? '✅' : '❌ (부족: ' + (MINIMUM - count) + '개 더 필요)';
  console.log(status + ' Threads pending_analysis: ' + (count || 0) + '개');

  if ((count || 0) < MINIMUM) {
    console.log('\\n⚠️ 최소 ' + MINIMUM + '개 필요. 쿠키 만료 확인 또는 --limit 값 증가 필요');
  }
}
check();
"
```

---

## Phase 2: 분석

### Step 2.1: pending_analysis 콘텐츠 조회

```bash
cd /Users/ownuun/conductor/workspaces/v2-v1/kiev && node -e "
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function getPending() {
  const { data } = await supabase
    .from('crawled_content')
    .select('id, platform_id, screenshot_url, raw_data, author_name, url')
    .eq('platform', 'threads')
    .eq('status', 'pending_analysis')
    .order('crawled_at', { ascending: false });

  console.log('=== Pending Threads Posts ===');
  console.log('Total:', data?.length || 0);
  data?.forEach((item, i) => {
    console.log('\\n' + (i+1) + '. ID: ' + item.id);
    console.log('   Platform ID: ' + item.platform_id);
    console.log('   Screenshot: ' + item.screenshot_url);
    console.log('   URL: ' + item.url);
    console.log('   Content preview: ' + (item.raw_data?.content?.substring(0, 80) || 'N/A'));
  });
}
getPending();
"
```

### Step 2.2: 스크린샷 Vision 분석

각 콘텐츠의 스크린샷을 `look_at` 도구로 분석합니다.

**분석 시 추출할 정보:**

```
look_at 도구 호출:
- file_path: public/screenshots/threads/[스크린샷 경로]
- goal: "이 Threads 포스트에서 다음 정보를 추출하세요:
  1. 본문 내용 전체
  2. 작성자 이름과 핸들 (@xxx)
  3. 게시 시간 (상대 시간도 OK)
  4. 좋아요, 답글, 리포스트 수
  5. 이미지/미디어 포함 여부"
```

**분석 후 JSON 형식으로 정리:**

```json
{
  "content_ko": "한국어 본문 (원문이 영어면 번역)",
  "content_en": "영어 본문 (원문이 한국어면 번역)",
  "author_name": "표시 이름",
  "author_handle": "@handle",
  "published_at": "2026-01-20T12:00:00Z",
  "metrics": {
    "likes": 17800,
    "replies": 460,
    "reposts": 9600
  },
  "categories": ["llm", "ai-tools"],
  "summary_oneline": "한 줄 요약 (40자 이내)",
  "recommendScore": 8,
  "recommendReason": "추천 이유"
}
```

### Step 2.3: DB 업데이트

각 분석 완료 후 즉시 DB 업데이트:

```bash
cd /Users/ownuun/conductor/workspaces/v2-v1/kiev && node -e "
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// 분석 결과
const analysis = {
  content_ko: '...',
  content_en: '...',
  author_name: '...',
  author_handle: '@...',
  summary_oneline: '...',
  categories: ['llm'],
  metrics: { likes: 0, replies: 0, reposts: 0 },
  recommendScore: 7,
  recommendReason: '...'
};
const recordId = 'UUID-HERE';

async function update() {
  const { error } = await supabase
    .from('crawled_content')
    .update({
      title: analysis.author_name + ' - ' + analysis.summary_oneline,
      content_text: analysis.content_en,
      translated_content: analysis.content_ko,
      digest_result: {
        summary_oneline: analysis.summary_oneline,
        categories: analysis.categories,
        metrics: analysis.metrics,
        author_handle: analysis.author_handle,
        recommendScore: analysis.recommendScore,
        recommendReason: analysis.recommendReason,
        processedAt: new Date().toISOString()
      },
      status: 'pending'
    })
    .eq('id', recordId);

  console.log(error ? 'Error: ' + error.message : 'Updated: ' + recordId);
}
update();
"
```

### Step 2.4: 분석 완료 보고

모든 분석 완료 후:

```
=== Threads 분석 완료 ===
분석된 개수: N개
평균 추천점수: X.X점

1. [@작성자 8점] 한 줄 요약
2. [@작성자 7점] 한 줄 요약
...
```

---

## Phase 3: 게시

### Step 3.1: 게시 대상 조회

```bash
cd /Users/ownuun/conductor/workspaces/v2-v1/kiev && node -e "
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function getTargets() {
  const { data } = await supabase
    .from('crawled_content')
    .select('id, title, url, digest_result')
    .eq('platform', 'threads')
    .in('status', ['pending', 'completed']);

  const high = data?.filter(i => i.digest_result?.recommendScore >= 7) || [];
  const low = data?.filter(i => i.digest_result?.recommendScore && i.digest_result?.recommendScore < 7) || [];

  console.log('=== 자동 게시 (7점 이상) ===');
  high.forEach((i, n) => console.log((n+1) + '. [' + i.digest_result?.recommendScore + '점] ' + (i.digest_result?.summary_oneline || i.title || '').substring(0, 50)));
  console.log('총: ' + high.length + '개\\n');

  console.log('=== 7점 미만 (선택) ===');
  low.forEach((i, n) => {
    console.log((n+1) + '. [' + i.digest_result?.recommendScore + '점] ' + (i.digest_result?.summary_oneline || i.title || '').substring(0, 50));
    console.log('   ' + i.url);
  });

  console.log('\\n--- DATA ---');
  console.log('HIGH=' + JSON.stringify(high.map(i => i.id)));
  console.log('LOW=' + JSON.stringify(low.map(i => i.id)));
}
getTargets();
"
```

### Step 3.2: 게시 조건

- **7점 이상**: 자동 게시
- **7점 미만**: 목록 표시 → 사용자 선택

### Step 3.3: 게시 실행

선택한 ID들을 `/tmp/publish_ids.json`에 저장 후:

```bash
# ID 목록 저장 (예시)
echo '["uuid1", "uuid2", "uuid3"]' > /tmp/publish_ids.json

# 게시 실행
cd /Users/ownuun/conductor/workspaces/v2-v1/kiev && node scripts/publish-batch.js
```

---

## 카테고리 목록

- `ai-basics` - AI 기초
- `llm` - LLM/언어모델
- `image-generation` - 이미지/영상 생성
- `ai-tools` - AI 도구
- `claude-code` - 클로드코드
- `industry-trends` - 산업 트렌드
- `open-source` - 오픈소스
- `ai-monetization` - AI 수익화
- `research-papers` - 연구/논문

---

## 추천점수 기준

| 점수 | 기준                                      |
| ---- | ----------------------------------------- |
| 9-10 | 반드시 포함. 트렌드 선도, 높은 engagement |
| 7-8  | 포함 권장. 관련성 높고 유익               |
| 5-6  | 선택적. 괜찮지만 특별하지 않음            |
| 3-4  | 비추천. 주제와 거리 있음                  |
| 1-2  | 제외. 스팸성/관련 없음                    |

---

## 파일 경로

- 스크린샷: `public/screenshots/threads/`
- 크롤러: `scripts/crawl-threads.mjs`
- 게시: `scripts/publish-batch.js`
