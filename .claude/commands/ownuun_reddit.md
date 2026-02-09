# Ownuun Reddit - Reddit 전체 파이프라인

Reddit 콘텐츠를 **크롤링 → 분석 → 게시**하는 전체 파이프라인입니다.

---

## 아키텍처

```
/ownuun_reddit (독립 파이프라인)
    │
    ├─ Phase 1: 크롤링
    │      └─ node scripts/crawl-reddit.mjs → DB 저장 (pending_analysis)
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
cd /Users/ownuun/conductor/workspaces/v2-v1/kiev && node scripts/crawl-reddit.mjs --limit=20
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
    .eq('platform', 'reddit')
    .eq('status', 'pending_analysis');

  const status = (count || 0) >= MINIMUM ? '✅' : '❌ (부족: ' + (MINIMUM - count) + '개 더 필요)';
  console.log(status + ' Reddit pending_analysis: ' + (count || 0) + '개');
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
    .select('id, platform_id, screenshot_url, raw_data, title, url')
    .eq('platform', 'reddit')
    .eq('status', 'pending_analysis')
    .order('crawled_at', { ascending: false });

  console.log('=== Pending Reddit Posts ===');
  console.log('Total:', data?.length || 0);
  data?.forEach((item, i) => {
    console.log('\\n' + (i+1) + '. ID: ' + item.id);
    console.log('   Title: ' + (item.title || item.raw_data?.title || 'N/A'));
    console.log('   Screenshot: ' + item.screenshot_url);
    console.log('   URL: ' + item.url);
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
- file_path: public/screenshots/reddit/[스크린샷 경로]
- goal: "이 Reddit 포스트에서 다음 정보를 추출하세요:
  1. 포스트 제목
  2. 본문 내용 (있는 경우)
  3. 서브레딧 (r/xxx)
  4. 작성자 (u/xxx)
  5. 업보트 수, 댓글 수
  6. 게시 시간"
```

**분석 후 JSON 형식으로 정리:**

```json
{
  "title": "포스트 제목",
  "content_en": "영어 본문 (원문 그대로 또는 한국어→영어 번역)",
  "content_ko": "한국어 본문 (원문 그대로 또는 영어→한국어 번역)",
  "author_name": "u/username",
  "subreddit": "r/LocalLLaMA",
  "published_at": "2026-01-20T12:00:00Z",
  "metrics": {
    "upvotes": 1500,
    "comments": 234
  },
  "categories": ["llm", "open-source"],
  "summary_oneline": "한 줄 요약 (40자 이내)",
  "recommendScore": 8,
  "recommendReason": "추천 이유"
}
```

### 본문 추출 및 번역 규칙

1. **Self post (텍스트 포스트)**: `content_text` 필드에서 본문 가져오기
2. **Link post (링크 공유)**: 크롤링 시 `raw_data.linked_url`에서 자동 추출됨
3. **번역**:
   - 원문이 영어 → `content_en = 원문`, `content_ko = 번역`
   - 원문이 한국어 → `content_ko = 원문`, `content_en = 번역`
4. **최소 길이**: 본문이 50자 미만이면 스크린샷 Vision으로 추출 시도

### Step 2.3: DB 업데이트

각 분석 완료 후 즉시 DB 업데이트:

```bash
cd /Users/ownuun/conductor/workspaces/v2-v1/kiev && node -e "
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// 분석 결과
const analysis = {
  title: '...',
  content_ko: '...',
  content_en: '...',
  author_name: 'u/...',
  subreddit: 'r/...',
  summary_oneline: '...',
  categories: ['llm'],
  metrics: { upvotes: 0, comments: 0 },
  recommendScore: 7,
  recommendReason: '...'
};
const recordId = 'UUID-HERE';

async function update() {
  // content_text가 있으면 사용, 없으면 분석 결과 사용
  const existingContent = (await supabase.from('crawled_content').select('content_text').eq('id', recordId).single()).data?.content_text;
  const contentEn = existingContent || analysis.content_en;
  const contentKo = analysis.content_ko;

  const { error } = await supabase
    .from('crawled_content')
    .update({
      title: analysis.subreddit + ' - ' + analysis.summary_oneline,
      content_text: contentEn,
      translated_content: contentKo,
      digest_result: {
        original_title: analysis.title,
        summary_oneline: analysis.summary_oneline,
        categories: analysis.categories,
        metrics: analysis.metrics,
        subreddit: analysis.subreddit,
        author_name: analysis.author_name,
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
=== Reddit 분석 완료 ===
분석된 개수: N개
평균 추천점수: X.X점

1. [r/LocalLLaMA 8점] 한 줄 요약
2. [r/MachineLearning 7점] 한 줄 요약
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
    .eq('platform', 'reddit')
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

- 스크린샷: `public/screenshots/reddit/`
- 크롤러: `scripts/crawl-reddit.mjs`
- 게시: `scripts/publish-batch.js`
