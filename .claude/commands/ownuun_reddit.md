# Ownuun Reddit - Reddit 크롤링 분석

Reddit 크롤링 데이터를 분석하고 DB에 저장합니다.

## 카테고리 목록 (중복 허용)

- `ai-basics` - AI 기초
- `llm` - LLM/언어모델
- `image-generation` - 이미지/영상 생성
- `ai-tools` - AI 도구
- `claude-code` - 클로드코드
- `industry-trends` - 산업 트렌드
- `open-source` - 오픈소스
- `ai-monetization` - AI 수익화
- `research-papers` - 연구/논문

## 환경변수

```
NEXT_PUBLIC_SUPABASE_URL=https://ylhlsuuvlrxypxkqslvg.supabase.co
SUPABASE_SERVICE_ROLE_KEY=(환경변수에서 로드)
```

## 워크플로우

### 1단계: pending_analysis 상태의 Reddit 콘텐츠 조회

**DB에서 조회** (Supabase):
```javascript
const { data } = await supabase
  .from('crawled_content')
  .select('*')
  .eq('platform', 'reddit')
  .eq('status', 'pending_analysis')
  .order('crawled_at', { ascending: false });
```

조회된 각 레코드의 `screenshot_url` 필드에서 스크린샷 경로 확인

### 2단계: 스크린샷 분석

각 포스트의 스크린샷 이미지를 읽어서 분석:

**추출할 정보:**
- 제목 (title)
- 본문 내용 (content)
- 작성자 (author)
- 서브레딧 (subreddit)
- 게시 시간
- 업보트, 댓글 수
- **카테고리 (중복 허용)**

**분석 시 JSON 형식:**
```json
{
  "title": "포스트 제목",
  "content_ko": "한국어 본문 (원문이 한국어면 그대로, 영어면 번역)",
  "content_en": "영어 본문 (원문이 영어면 그대로, 한국어면 번역)",
  "author_name": "u/username",
  "subreddit": "r/LocalLLaMA",
  "published_at": "2026-01-14T09:16:00Z",
  "metrics": {
    "upvotes": 1500,
    "comments": 234
  },
  "categories": ["llm", "open-source"],
  "summary_oneline": "한 줄 요약",
  "recommendScore": 8,
  "recommendReason": "AI 트렌드 최신 정보, 실용적 팁 포함"
}
```

**추천점수 기준 (1-10점):**
| 점수 | 기준 |
|------|------|
| 9-10 | 반드시 포함. 트렌드 선도, 높은 engagement |
| 7-8 | 포함 권장. 관련성 높고 유익 |
| 5-6 | 선택적. 괜찮지만 특별하지 않음 |
| 3-4 | 비추천. 주제와 거리 있음 |
| 1-2 | 제외. 스팸성/관련 없음 |

### 3단계: 양방향 번역 + 한 줄 요약

- 원문 언어 감지 (한국어/영어)
- **한국어 원문** → `content_ko`에 원문, `content_en`에 영어 번역
- **영어 원문** → `content_en`에 원문, `content_ko`에 한국어 번역
- 한 줄 요약 생성 (40자 이내)

### 4단계: DB 업데이트

분석 완료 후 각 레코드를 **DB에 업데이트** (Supabase MCP 도구 사용):

```javascript
// 각 포스트 분석 완료 후 업데이트
await supabase
  .from('crawled_content')
  .update({
    title: `${analysis.subreddit} - ${analysis.summary_oneline}`,
    content_text: analysis.content_en,           // 영어 버전
    translated_content: analysis.content_ko,     // 한국어 버전
    thumbnail_url: analysis.media_url || record.screenshot_url,
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
    status: "pending"  // pending_analysis → pending 상태 전환
  })
  .eq('id', record.id);
```

**중요**: 각 포스트 분석 완료 후 즉시 DB 업데이트 (배치 아님)

### 5단계: JSON 백업 (선택)

필요시 분석 결과를 `public/screenshots/reddit_analyzed.json`에도 백업:

```json
{
  "analyzed_at": "2026-01-14T12:00:00Z",
  "posts": [
    {
      "id": "db-record-id",
      "platform_id": "abc123",
      "screenshot_url": "/screenshots/reddit/...",
      "url": "https://reddit.com/r/.../comments/...",
      "title": "...",
      "content_en": "...",
      "content_ko": "...",
      "summary_oneline": "...",
      "author_name": "u/...",
      "subreddit": "r/...",
      "published_at": "...",
      "metrics": { ... },
      "categories": ["llm", "ai-tools"]
    }
  ]
}
```

### 6단계: 완료 후 발행 안내

```
=== Reddit 분석 완료 ===
DB 업데이트: N건

1. r/LocalLLaMA - 한 줄 요약
   카테고리: LLM, 오픈소스
   업보트: 1.5K | 댓글: 234

2. r/MachineLearning - 한 줄 요약
   카테고리: 연구/논문
   업보트: 2.3K | 댓글: 156

분석 완료! 관리자 페이지(admin/content)에서 발행하세요.
```

## 파일 경로

- 스크린샷: `public/screenshots/reddit/` (타임스탬프 폴더)
- JSON 백업: `public/screenshots/reddit_analyzed.json` (선택)
