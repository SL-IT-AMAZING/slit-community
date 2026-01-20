# Ownuun X - X 콘텐츠 분석

X(Twitter) 크롤링 데이터를 **에이전트가 직접** 분석하고 DB에 저장합니다.

## 실행 방법

이 슬래시커맨드가 호출되면 에이전트가 다음을 수행합니다:

1. DB에서 `pending_analysis` 상태의 X 콘텐츠 조회
2. 각 콘텐츠의 스크린샷을 `look_at` 도구로 Vision 분석
3. 분석 결과를 DB에 업데이트

---

## Step 1: pending_analysis 콘텐츠 조회

```bash
cd /Users/ownuun/conductor/workspaces/v2-v1/kiev && node -e "
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function getPending() {
  const { data } = await supabase
    .from('crawled_content')
    .select('id, platform_id, screenshot_url, raw_data, author_name, url')
    .eq('platform', 'x')
    .eq('status', 'pending_analysis')
    .order('crawled_at', { ascending: false });

  console.log('=== Pending X Posts ===');
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

---

## Step 2: 스크린샷 Vision 분석

각 콘텐츠의 스크린샷을 `look_at` 도구로 분석합니다.

**분석 시 추출할 정보:**

```
look_at 도구 호출:
- file_path: public/screenshots/x/[스크린샷 경로]
- goal: "이 X(Twitter) 포스트에서 다음 정보를 추출하세요:
  1. 본문 내용 전체
  2. 작성자 이름과 핸들 (@xxx)
  3. 게시 시간
  4. 좋아요, 리트윗, 답글, 조회수
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
    "retweets": 9600,
    "replies": 460,
    "views": 794000
  },
  "categories": ["llm", "ai-tools"],
  "summary_oneline": "한 줄 요약 (40자 이내)",
  "recommendScore": 8,
  "recommendReason": "추천 이유"
}
```

---

## Step 3: DB 업데이트

각 분석 완료 후 즉시 DB 업데이트:

```bash
cd /Users/ownuun/conductor/workspaces/v2-v1/kiev && node -e "
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// 분석 결과 (위에서 정리한 JSON)
const analysis = {
  content_ko: '...',
  content_en: '...',
  author_name: '...',
  author_handle: '@...',
  summary_oneline: '...',
  categories: ['llm'],
  metrics: { likes: 0, retweets: 0, replies: 0, views: 0 },
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

---

## Step 4: 완료 보고

모든 분석 완료 후:

```
=== X 분석 완료 ===
분석된 개수: N개
평균 추천점수: X.X점

1. [@작성자 8점] 한 줄 요약
2. [@작성자 7점] 한 줄 요약
...
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

- 스크린샷: `public/screenshots/x/`
