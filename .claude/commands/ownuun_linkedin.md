# Ownuun LinkedIn - LinkedIn 포스트 수집

LinkedIn 포스트 링크를 수집하고 DB에 저장합니다.

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

### 1단계: 링크 파일 읽기

`.claude/linkedin_links.md` 파일에서 LinkedIn 포스트 링크 목록 읽기:

```markdown
# LinkedIn Links

- https://www.linkedin.com/feed/update/urn:li:activity:7416954701042077696/
- https://www.linkedin.com/feed/update/urn:li:activity:...
```

### 2단계: 각 링크 WebFetch로 정보 추출

WebFetch 도구로 각 LinkedIn 포스트에서 정보 추출:

**추출할 정보:**
- 작성자 이름 (author_name)
- 작성자 직함/회사 (author_title)
- 본문 내용 (content) - **원문 그대로**
- 게시 날짜 (published_at)
- 좋아요/추천 수 (likes)
- 댓글 수 (comments)
- 퍼감/리포스트 수 (reposts)
- 첨부 이미지 URL (media_urls)
- **카테고리 (중복 허용)**

**추출 시 JSON 형식:**
```json
{
  "content_ko": "한국어 본문 (원문이 한국어면 그대로, 영어면 번역)",
  "content_en": "영어 본문 (원문이 영어면 그대로, 한국어면 번역)",
  "author_name": "정구봉",
  "author_title": "AI Developer @ Company",
  "published_at": "2026-01-13",
  "metrics": {
    "likes": 189,
    "comments": 2,
    "reposts": 5
  },
  "categories": ["llm", "ai-tools"],
  "media_urls": ["https://..."]
}
```

### 3단계: 번역 (요약 없음)

- 원문 언어 감지
- 한국어 ↔ 영어 양방향 번역
- **요약 생성 없음** - 원문 그대로 저장

### 4단계: DB 저장

각 포스트를 `crawled_content` 테이블에 저장 (Supabase MCP 도구 사용):

```javascript
// LinkedIn URL에서 activity ID 추출
const activityMatch = url.match(/activity:(\d+)/);
const platformId = activityMatch ? activityMatch[1] : url;

await supabase
  .from('crawled_content')
  .upsert({
    platform: 'linkedin',
    platform_id: platformId,
    url: url,
    title: `${analysis.author_name} - LinkedIn 포스트`,
    content_text: analysis.content_en,           // 영어 버전
    translated_content: analysis.content_ko,     // 한국어 버전
    author_name: analysis.author_name,
    thumbnail_url: analysis.media_urls?.[0] || null,
    published_at: analysis.published_at,         // 게시 시간 (ISO 형식)
    digest_result: {
      categories: analysis.categories,
      metrics: analysis.metrics,
      author_title: analysis.author_title,
      processedAt: new Date().toISOString()
    },
    raw_data: {
      media_urls: analysis.media_urls,
      followers: analysis.followers
    },
    status: 'pending'  // LinkedIn은 바로 pending (분석 완료)
  }, {
    onConflict: 'platform,platform_id'
  });
```

**중요**: 각 포스트 처리 완료 후 즉시 DB 저장 (배치 아님)

### 5단계: 완료 후 발행 안내

```
=== LinkedIn 수집 완료 ===
DB 저장: N건

1. 정구봉 - Claude Cowork 분석, Claude Code Wrapper
   카테고리: LLM, AI 도구
   좋아요: 189 | 댓글: 2 | 퍼감: 5

2. 홍길동 - AI 에이전트 개발 팁 공유
   카테고리: AI 도구
   좋아요: 523 | 댓글: 15 | 퍼감: 32

수집 완료! 관리자 페이지(admin/content)에서 발행하세요.
```

### 6단계: 링크 파일 정리

**각 링크 처리 완료 후 즉시** `.claude/linkedin_links.md` 파일 업데이트:

1. 처리 완료된 링크를 "## 대기 중" 섹션에서 삭제
2. "## 완료" 섹션으로 이동 (선택사항)

```markdown
# LinkedIn Links

수집할 LinkedIn 포스트 링크 목록

## 대기 중

<!-- 처리 완료된 링크는 자동 삭제됨 -->

## 완료

- https://www.linkedin.com/feed/update/urn:li:activity:7416954701042077696/ (2026-01-15 처리)
```

**중요**: 모든 링크 처리 완료 후 "## 대기 중" 섹션이 비어있어야 함

## 파일 경로

- 링크 목록: `.claude/linkedin_links.md`
- 미디어: LinkedIn CDN URL 직접 사용 (다운로드 안 함)

## 주의사항

- LinkedIn은 로그인 필요한 비공개 포스트는 WebFetch로 접근 불가
- 이미지는 LinkedIn CDN URL을 그대로 사용 (다운로드 시 CORS 제한)
- 리포스트("퍼감") 수는 때때로 표시 안 될 수 있음
