# Ownuun Reddit - Reddit 크롤링 분석

Reddit 크롤링 데이터를 분석하고 DB에 저장합니다.

## 빠른 실행

### 방법 1: 스크립트 실행 (권장)

```bash
cd /Users/ownuun/conductor/workspaces/v2-v1/kiev && node scripts/analyze-reddit.mjs
```

**출력 예시:**

```
=== Reddit Content Analysis Started ===
Found 20 records to analyze

--- Processing: abc123 ---
URL: https://reddit.com/r/LocalLLaMA/comments/...
Title: New local LLM benchmark results...
Subreddit: r/LocalLLaMA
Analyzing with Gemini...
Summary: 로컬 LLM 벤치마크 결과 공유
Score: 8/10
DB updated successfully

=== Analysis Complete ===
Analyzed: 18 records
Average Score: 7.2/10
```

### 방법 2: 크롤링 + 분석 통합

```bash
# 크롤링 먼저
curl -X POST http://localhost:3000/api/crawler/run \
  -H 'Content-Type: application/json' \
  -d '{"platform": "reddit", "options": {"limit": 20}}'

# 분석 실행
cd /Users/ownuun/conductor/workspaces/v2-v1/kiev && node scripts/analyze-reddit.mjs
```

---

## API 레이트 리밋 주의

| API         | 제한   | 스크립트 딜레이 |
| ----------- | ------ | --------------- |
| Gemini Free | 15 RPM | 5초             |

### 429 에러 발생 시

스크립트에 재시도 로직이 내장되어 있습니다 (최대 3회, 60초 대기).

### X/Threads와 순차 실행 권장

Reddit, X, Threads 분석 스크립트는 모두 Gemini API를 사용합니다.

```bash
# 올바른 순서 (순차 실행)
node scripts/analyze-x-content.mjs && \
sleep 60 && \
node scripts/analyze-threads.mjs && \
sleep 60 && \
node scripts/analyze-reddit.mjs
```

---

## 스크립트 상세 (analyze-reddit.mjs)

### 처리 흐름

1. **DB 조회**: `status='pending_analysis'` AND `platform='reddit'`
2. **정보 추출**: `raw_data`에서 제목/본문 또는 스크린샷 Vision OCR
3. **Gemini 분석**: 번역, 요약, 카테고리, 추천점수
4. **DB 업데이트**: `status='pending'`으로 변경

### 환경변수 필수

```
GEMINI_API_KEY=        # Gemini 2.0 Flash 사용
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

---

## 대안: Extract API 사용

```bash
# pending_analysis ID 목록 조회 후 extract 호출
curl -X POST http://localhost:3000/api/crawler/extract \
  -H 'Content-Type: application/json' \
  -d '{"ids": ["id1", "id2", "id3"]}'
```

---

## 수동 분석 워크플로우

### 1단계: pending_analysis 콘텐츠 조회

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

  console.log('Found', data?.length || 0, 'pending Reddit posts');
  data?.forEach((item, i) => {
    console.log((i+1) + '. ' + (item.title || item.platform_id));
    console.log('   URL: ' + item.url);
    console.log('   Screenshot: ' + item.screenshot_url);
  });

  // ID 목록 출력
  console.log('\\nIDS=' + JSON.stringify(data?.map(i => i.id) || []));
}
getPending();
"
```

### 2단계: 스크린샷 Vision 분석

각 스크린샷을 `look_at` 도구로 분석하여 추출:

**추출할 정보:**

- 제목 (title)
- 본문 내용 (content)
- 작성자 (author)
- 서브레딧 (subreddit)
- 게시 시간
- 업보트, 댓글 수
- 카테고리 (중복 허용)

**분석 결과 JSON:**

```json
{
  "title": "포스트 제목",
  "content_ko": "한국어 본문",
  "content_en": "영어 본문",
  "author_name": "u/username",
  "subreddit": "r/LocalLLaMA",
  "published_at": "2026-01-14T09:16:00Z",
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

### 3단계: DB 업데이트

```bash
cd /Users/ownuun/conductor/workspaces/v2-v1/kiev && node -e "
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const analysis = { /* 분석 결과 JSON */ };
const recordId = 'db-record-id';

async function updateRecord() {
  const { error } = await supabase
    .from('crawled_content')
    .update({
      title: analysis.subreddit + ' - ' + analysis.summary_oneline,
      content_text: analysis.content_en,
      translated_content: analysis.content_ko,
      digest_result: {
        original_title: analysis.title,
        summary_oneline: analysis.summary_oneline,
        categories: analysis.categories,
        metrics: analysis.metrics,
        subreddit: analysis.subreddit,
        author_name: analysis.author_name,
        published_at: analysis.published_at,
        recommendScore: analysis.recommendScore,
        recommendReason: analysis.recommendReason,
        processedAt: new Date().toISOString()
      },
      status: 'pending'
    })
    .eq('id', recordId);

  if (error) console.error('Error:', error);
  else console.log('Updated:', recordId);
}
updateRecord();
"
```

---

## 분석 스크립트 생성 필요

Reddit 전용 분석 스크립트(`scripts/analyze-reddit.mjs`)가 필요합니다.

### 필요한 구조:

```javascript
// scripts/analyze-reddit.mjs (예시)
import { createClient } from "@supabase/supabase-js";
import { GoogleGenerativeAI } from "@google/generative-ai";

// 1. DB에서 pending_analysis 조회
// 2. 각 포스트의 raw_data.content 또는 스크린샷 Vision 분석
// 3. Gemini로 번역/요약/카테고리/추천점수
// 4. DB 업데이트 (status='pending')
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

**평가 요소:**

- 주제 관련성: AI/개발/트렌드와의 관련도
- 정보 가치: 새로운 인사이트/실용적 팁
- Engagement: 업보트/댓글 수
- 신뢰성: 출처/작성자 신뢰도
- 시의성: 최신 트렌드 여부

---

## 트러블슈팅

### 스크린샷 파일 없음

→ `public/screenshots/reddit/` 디렉토리 확인

### Gemini 429 에러

→ 스크립트 재시도 로직이 자동 처리 (60초 대기 후 재시도)

### Extract API 타임아웃

→ 한 번에 5개 이하로 분할 처리

### Vision 분석 실패

→ 스크린샷 품질 확인, 직접 `look_at` 도구 사용

---

## 파일 경로

- 스크립트: `scripts/analyze-reddit.mjs`
- 스크린샷: `public/screenshots/reddit/`
- JSON 백업: `public/screenshots/reddit_analyzed.json` (선택)
