# Ownuun LinkedIn - LinkedIn 전체 파이프라인

LinkedIn 포스트를 **수집 → 분석 → 게시**하는 전체 파이프라인입니다.

**⚠️ LinkedIn 특수사항**: 자동 피드 크롤링 불가. 사용자가 링크를 직접 제공해야 합니다.

---

## 아키텍처

```
/ownuun_linkedin (독립 파이프라인)
    │
    ├─ Phase 1: 링크 수집
    │      └─ .claude/linkedin_links.md에서 링크 읽기
    │
    ├─ Phase 2: WebFetch로 정보 추출 + 분석
    │      └─ 각 링크에서 본문, 작성자, 메트릭 추출 → DB 저장
    │
    └─ Phase 3: 게시
           └─ 전부 게시 (점수 기준 없음)
```

---

## Phase 1: 링크 수집

### Step 1.1: 링크 파일 확인/생성

`.claude/linkedin_links.md` 파일에 수집할 LinkedIn 포스트 링크를 추가합니다:

```markdown
# LinkedIn Links

수집할 LinkedIn 포스트 링크 목록

## 대기 중

- https://www.linkedin.com/feed/update/urn:li:activity:7416954701042077696/
- https://www.linkedin.com/feed/update/urn:li:activity:7417123456789012345/

## 완료

<!-- 처리 완료된 링크는 자동으로 이동됨 -->
```

### Step 1.2: 링크 파일 읽기

```
Read 도구로 .claude/linkedin_links.md 파일 읽기
```

---

## Phase 2: 정보 추출 + 분석

### Step 2.1: 각 링크 WebFetch로 정보 추출

**각 LinkedIn 링크에 대해 WebFetch 도구 호출:**

```
WebFetch 도구 호출:
- url: https://www.linkedin.com/feed/update/urn:li:activity:XXXXX/
- format: markdown
```

### Step 2.2: 정보 분석 및 JSON 정리

**WebFetch 결과에서 추출할 정보:**

- 작성자 이름 (author_name)
- 작성자 직함/회사 (author_title)
- 본문 내용 (content) - **원문 그대로**
- 게시 날짜 (published_at)
- 좋아요/추천 수 (likes)
- 댓글 수 (comments)
- 퍼감/리포스트 수 (reposts)
- 첨부 이미지 URL (media_urls)
- **카테고리 (중복 허용)**

**분석 후 JSON 형식으로 정리:**

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
  "media_urls": ["https://..."],
  "summary_oneline": "한 줄 요약 (40자 이내)"
}
```

### Step 2.3: DB 저장

각 포스트 분석 완료 후 **즉시** DB 저장:

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
  author_title: '...',
  published_at: '2026-01-13',
  metrics: { likes: 189, comments: 2, reposts: 5 },
  categories: ['llm', 'ai-tools'],
  media_urls: [],
  summary_oneline: '...'
};
const url = 'https://www.linkedin.com/feed/update/urn:li:activity:XXXXX/';

// LinkedIn URL에서 activity ID 추출
const activityMatch = url.match(/activity:(\d+)/);
const platformId = activityMatch ? activityMatch[1] : Date.now().toString();

async function save() {
  const { error } = await supabase
    .from('crawled_content')
    .upsert({
      platform: 'linkedin',
      platform_id: platformId,
      url: url,
      title: analysis.author_name + ' - ' + analysis.summary_oneline,
      content_text: analysis.content_en,
      translated_content: analysis.content_ko,
      author_name: analysis.author_name,
      thumbnail_url: analysis.media_urls?.[0] || null,
      published_at: analysis.published_at,
      digest_result: {
        summary_oneline: analysis.summary_oneline,
        categories: analysis.categories,
        metrics: analysis.metrics,
        author_title: analysis.author_title,
        processedAt: new Date().toISOString()
      },
      raw_data: {
        media_urls: analysis.media_urls
      },
      status: 'pending'
    }, {
      onConflict: 'platform,platform_id'
    });

  console.log(error ? 'Error: ' + error.message : 'Saved: ' + platformId);
}
save();
"
```

### Step 2.4: 링크 파일 정리

**각 링크 처리 완료 후 즉시** `.claude/linkedin_links.md` 파일 업데이트:

1. 처리 완료된 링크를 "## 대기 중" 섹션에서 삭제
2. "## 완료" 섹션으로 이동

```markdown
# LinkedIn Links

수집할 LinkedIn 포스트 링크 목록

## 대기 중

<!-- 처리 완료된 링크는 자동 삭제됨 -->

## 완료

- https://www.linkedin.com/feed/update/urn:li:activity:7416954701042077696/ (2026-01-25 처리)
```

### Step 2.5: 수집 완료 보고

모든 링크 처리 완료 후:

```
=== LinkedIn 수집 완료 ===
DB 저장: N건

1. 정구봉 - Claude Cowork 분석, Claude Code Wrapper
   카테고리: LLM, AI 도구
   좋아요: 189 | 댓글: 2 | 퍼감: 5

2. 홍길동 - AI 에이전트 개발 팁 공유
   카테고리: AI 도구
   좋아요: 523 | 댓글: 15 | 퍼감: 32
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
    .select('id, title, url, digest_result, author_name')
    .eq('platform', 'linkedin')
    .in('status', ['pending', 'completed']);

  console.log('=== LinkedIn 게시 대상 (전부 게시) ===');
  data?.forEach((i, n) => {
    const metrics = i.digest_result?.metrics || {};
    console.log((n+1) + '. ' + i.author_name + ' - ' + (i.digest_result?.summary_oneline || '').substring(0, 40));
    console.log('   좋아요: ' + (metrics.likes || 0) + ' | 댓글: ' + (metrics.comments || 0));
  });
  console.log('\\n총: ' + (data?.length || 0) + '개');

  console.log('\\n--- DATA ---');
  console.log('IDS=' + JSON.stringify((data || []).map(i => i.id)));
}
getTargets();
"
```

### Step 3.2: 게시 조건

- **LinkedIn**: 전부 게시 (점수 기준 없음)

### Step 3.3: 게시 실행

```bash
# ID 목록 저장
echo '["uuid1", "uuid2", "uuid3"]' > /tmp/publish_ids.json

# 게시 실행
cd /Users/ownuun/conductor/workspaces/v2-v1/kiev && node scripts/publish-batch.js
```

---

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

---

## 파일 경로

- 링크 목록: `.claude/linkedin_links.md`
- 미디어: LinkedIn CDN URL 직접 사용 (다운로드 안 함)
- 게시: `scripts/publish-batch.js`

---

## 주의사항

- LinkedIn은 로그인 필요한 비공개 포스트는 WebFetch로 접근 불가
- 이미지는 LinkedIn CDN URL을 그대로 사용 (다운로드 시 CORS 제한)
- 리포스트("퍼감") 수는 때때로 표시 안 될 수 있음
- **자동 크롤링 불가** - 사용자가 링크를 직접 제공해야 함
