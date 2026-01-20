# Ownuun X - X 크롤링 분석

X(Twitter) 크롤링 데이터를 분석하고 DB에 저장합니다.

## 빠른 실행

### 방법 1: 스크립트 실행 (권장)

```bash
cd /Users/ownuun/conductor/workspaces/v2-v1/kiev && node scripts/analyze-x-content.mjs
```

**출력 예시:**

```
=== X Content Analysis Started ===
Found 20 records to analyze

--- Processing: 2011230958377439366 ---
URL: https://x.com/user/status/xxx
Content (150 chars): AI 코딩 도구의 미래는...
Analyzing with Gemini...
Summary: AI 코딩 도구 발전 방향 제시
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
  -d '{"platform": "x", "options": {"limit": 20}}'

# 분석 실행
cd /Users/ownuun/conductor/workspaces/v2-v1/kiev && node scripts/analyze-x-content.mjs
```

---

## API 레이트 리밋 주의

| API         | 제한   | 스크립트 딜레이 |
| ----------- | ------ | --------------- |
| Gemini Free | 15 RPM | 5초             |

### 429 에러 발생 시

```bash
# 1분 대기 후 재시도
sleep 60 && node scripts/analyze-x-content.mjs
```

### Threads와 동시 실행 금지

X와 Threads 분석 스크립트는 **순차 실행**을 권장합니다 (둘 다 Gemini API 사용).

---

## 스크립트 상세 (analyze-x-content.mjs)

### 처리 흐름

1. **DB 조회**: `status='pending_analysis'` AND `platform='x'`
2. **텍스트 추출**: `raw_data.content` 또는 스크린샷 Vision OCR
3. **Gemini 분석**: 번역, 요약, 카테고리, 추천점수
4. **DB 업데이트**: `status='pending'`으로 변경

### 환경변수 필수

```
GEMINI_API_KEY=        # Gemini 2.0 Flash 사용
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

---

## 수동 분석 (슬래시커맨드로 직접)

스크립트 대신 에이전트가 직접 분석할 경우:

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
    .eq('platform', 'x')
    .eq('status', 'pending_analysis')
    .order('crawled_at', { ascending: false });

  console.log('Found', data?.length || 0, 'pending X posts');
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

각 스크린샷을 `look_at` 도구로 분석:

**추출할 정보:**

- 본문 내용 (content)
- 작성자 이름/핸들
- 게시 시간
- 좋아요, 리트윗, 답글, 조회수
- 카테고리 (중복 허용)

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
    "retweets": 9600,
    "replies": 460,
    "views": 794000
  },
  "categories": ["llm", "research-papers"],
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

// 분석 결과 (위에서 추출한 JSON)
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

```
Image not found: /path/to/screenshot.png
```

→ `public/screenshots/x/` 디렉토리 확인

### Gemini 429 에러

```
[429 Too Many Requests] You exceeded your current quota
```

→ 1분 대기 후 재시도, Threads와 순차 실행

### 텍스트 추출 실패

```
Could not extract content, skipping...
```

→ 스크린샷이 비어있거나 로그인 페이지일 수 있음. 쿠키 갱신 필요.

---

## 파일 경로

- 스크립트: `scripts/analyze-x-content.mjs`
- 스크린샷: `public/screenshots/x/`
- JSON 백업: `public/screenshots/x_analyzed.json` (선택)
