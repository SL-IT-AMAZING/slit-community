# Ownuun Threads - Threads 크롤링 분석

Threads 크롤링 데이터를 분석하고 DB에 저장합니다.

## 빠른 실행

### 방법 1: 스크립트 실행 (권장)

```bash
cd /Users/ownuun/conductor/workspaces/v2-v1/kiev && node scripts/analyze-threads.mjs
```

**출력 예시:**

```
Found 20 records to analyze

Analyzing: DTu0fe8E7-x
  Using DOM content: AI 도구의 발전이...
  Analyzing screenshot: /screenshots/threads/...
  Extracted metrics: { likes: 1200, replies: 45, reposts: 230 }
  Score: 7 -  AI 도구 비교 분석 공유

========== 분석 완료 ==========
분석된 개수: 18
평균 추천점수: 6.80
```

### 방법 2: 크롤링 + 분석 통합

```bash
# 크롤링 먼저
curl -X POST http://localhost:3000/api/crawler/run \
  -H 'Content-Type: application/json' \
  -d '{"platform": "threads", "options": {"limit": 20}}'

# 분석 실행
cd /Users/ownuun/conductor/workspaces/v2-v1/kiev && node scripts/analyze-threads.mjs
```

---

## API 레이트 리밋 주의

| API         | 제한   | 스크립트 딜레이 |
| ----------- | ------ | --------------- |
| Gemini Free | 15 RPM | 5초             |

### 429 에러 발생 시

```bash
# 1분 대기 후 재시도
sleep 60 && node scripts/analyze-threads.mjs
```

### X와 동시 실행 금지

X와 Threads 분석 스크립트는 **순차 실행**을 권장합니다 (둘 다 Gemini API 사용).

```bash
# 올바른 순서
node scripts/analyze-x-content.mjs && sleep 60 && node scripts/analyze-threads.mjs
```

---

## 스크립트 상세 (analyze-threads.mjs)

### 처리 흐름

1. **DB 조회**: `status='pending_analysis'` AND `platform='threads'`
2. **텍스트 추출**: `raw_data.content` 또는 스크린샷 Vision OCR
3. **메트릭 추출**: 스크린샷에서 likes, replies, reposts 추출
4. **Gemini 분석**: 번역, 요약, 카테고리, 추천점수
5. **DB 업데이트**: `status='pending'`으로 변경

### 환경변수 필수

```
GEMINI_API_KEY=        # Gemini 2.0 Flash 사용
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

---

## 수동 분석 (슬래시커맨드로 직접)

### 1단계: pending_analysis 콘텐츠 조회

```bash
cd /Users/ownuun/conductor/workspaces/v2-v1/kiev && node -e "
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function getPending() {
  const { data } = await supabase
    .from('crawled_content')
    .select('id, platform_id, screenshot_url, raw_data, author_name')
    .eq('platform', 'threads')
    .eq('status', 'pending_analysis')
    .order('crawled_at', { ascending: false });

  console.log('Found', data?.length || 0, 'pending Threads posts');
  data?.forEach((item, i) => {
    console.log((i+1) + '. ' + item.platform_id);
    console.log('   Screenshot: ' + item.screenshot_url);
    console.log('   Content: ' + (item.raw_data?.content?.substring(0, 50) || 'N/A'));
  });
}
getPending();
"
```

### 2단계: 스크린샷 Vision 분석

각 스크린샷을 `look_at` 도구로 분석하여 추출:

**분석 결과 JSON:**

```json
{
  "content_ko": "한국어 본문",
  "content_en": "영어 본문",
  "author_name": "표시 이름",
  "author_handle": "@handle",
  "published_at": "2026-01-14T09:16:00Z",
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
      title: analysis.author_name + ' - ' + analysis.summary_oneline,
      content_text: analysis.content_en,
      translated_content: analysis.content_ko,
      published_at: analysis.published_at,
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

  if (error) console.error('Error:', error);
  else console.log('Updated:', recordId);
}
updateRecord();
"
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

## 트러블슈팅

### 스크린샷 파일 없음

→ `public/screenshots/threads/` 디렉토리 확인

### Gemini 429 에러

→ 1분 대기 후 재시도, X와 순차 실행

### Vision 추출 실패

→ 스크린샷이 로그인 페이지일 수 있음. `cookies/threads.json` 갱신 필요.

---

## 파일 경로

- 스크립트: `scripts/analyze-threads.mjs`
- 스크린샷: `public/screenshots/threads/`
- JSON 백업: `public/screenshots/threads_analyzed.json` (선택)
