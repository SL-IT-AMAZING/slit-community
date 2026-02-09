# Ownuun Article - 추천 콘텐츠 추가

`.claude/article_draft.md` 파일에 작성된 글을 마크다운으로 다듬어서 추천 콘텐츠(Featured Content)로 DB에 추가합니다.

## 사용법

1. `.claude/article_draft.md` 파일에 글 작성
2. `/ownuun_article` 실행

```
/ownuun_article
```

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

## 환경변수

```
NEXT_PUBLIC_SUPABASE_URL=https://ylhlsuuvlrxypxkqslvg.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlsaGxzdXV2bHJ4eXB4a3FzbHZnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODA5OTM4MSwiZXhwIjoyMDgzNjc1MzgxfQ.afilH_6dq8Mmh7y2xPz3qa5pb5YAxlW7qhzMvwxwczQ
```

## 워크플로우

### 0단계: 원본 글 읽기

`.claude/article_draft.md` 파일을 읽어서 원본 글을 가져옵니다.

```
Read 도구로 .claude/article_draft.md 파일 읽기
```

---

### 1단계: 글 분석 및 메타데이터 추출

읽어온 글에서 다음 정보를 추출/생성:

**추출할 정보:**

- 제목 (title): 글의 핵심을 담은 한 문장 (호기심 유발)
- 설명 (description): 2-3문장 요약
- 카테고리: 위 목록에서 가장 적합한 것 선택
- 태그: 관련 키워드 3-5개
- 외부 링크: 글에 언급된 링크가 있으면 추출

---

### 2단계: 글 다듬기 (가독성 최적화)

**[중요] 반드시 적용해야 하는 규칙:**

#### 2-1. 문단 분리 (호흡 조절)

- **1-2문장마다 줄바꿈** (빈 줄 추가)
- 긴 문단은 쪼개기
- 독자가 숨 쉴 틈을 주기

```
❌ Bad:
Claude Code는 멈추지 않고 몇 시간이고 돌아갑니다. 단순히 프롬프트 잘 쓰는 것만으로는 안 됩니다. 핵심은 Stop Hook과 Ralph Loop입니다. 직접 공식 저장소를 뜯어봤습니다.

✅ Good:
Claude Code는 '멈추지 않고' 몇 시간이고 돌아갑니다.

단순히 프롬프트 잘 쓰는 것만으로는 안 됩니다.

핵심은 **Stop Hook** 과 **Ralph Loop** 입니다.

직접 공식 저장소를 뜯어봤습니다.
```

#### 2-2. 굵게(\*\*) 처리 규칙

**[핵심] `**텍스트**` 뒤에 특수문자가 오면 반드시 공백 추가!**

마크다운 파서가 제대로 인식하려면:

```
❌ Bad (파싱 실패):
**비결정적(non-deterministic)**입니다.
**Ralph Wiggum**(심슨 가족)
"**핵심 개발자**"로 만드는

✅ Good (파싱 성공):
**비결정적(non-deterministic)** 입니다.
**Ralph Wiggum** (심슨 가족)
**핵심 개발자** 로 만드는
```

**적용할 패턴:**

- `**텍스트**` + 한글/영문 → 공백 추가: `**텍스트** 다음글자`
- `**텍스트**` + `(` → 공백 추가: `**텍스트** (`
- `**텍스트**` + `)` → 공백 추가: `**텍스트**) ` → 괄호 안으로: `**(텍스트)**`
- `**텍스트**` + `.` → OK (공백 불필요)
- `**텍스트**` + `,` → OK (공백 불필요)

#### 2-3. 강조할 대상

다음 항목에 `**굵게**` 적용:

- 핵심 용어/개념 (Stop Hook, Ralph Loop 등)
- 숫자/통계 (259개의 PR, 40,000줄, 4시간 49분)
- 인물 이름 (Boris Journey)
- 중요 결론/메시지

#### 2-4. 구조화 요소

- **제목**: `##` h2 사용 (섹션 구분)
- **구분선**: `---` (주제 전환 시)
- **인용**: `>` (핵심 메시지/결론)
- **목록**: 순서 있으면 `1. 2. 3.`, 없으면 `- - -`
- **코드**: 백틱 `` ` `` (명령어, 파일명)

#### 2-5. 마무리 패턴

글 마지막에:

```markdown
---

> 핵심 메시지를 인용 블록으로

**공식 레포**: https://github.com/...

행동 유도 문구 (이번 주말에 해보세요!)
```

---

### 3단계: 슬러그 생성

제목에서 슬러그 자동 생성:

- 영문 소문자 변환
- 공백/특수문자 → 하이픈
- 핵심 키워드만 추출

**예시:**

- "Claude Code가 몇 시간이고 멈추지 않는 비밀" → `claude-code-stop-hook-guide`

---

### 4단계: Supabase에 추가

**curl 명령어:**

```bash
curl -X POST "https://ylhlsuuvlrxypxkqslvg.supabase.co/rest/v1/content" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlsaGxzdXV2bHJ4eXB4a3FzbHZnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODA5OTM4MSwiZXhwIjoyMDgzNjc1MzgxfQ.afilH_6dq8Mmh7y2xPz3qa5pb5YAxlW7qhzMvwxwczQ" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlsaGxzdXV2bHJ4eXB4a3FzbHZnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODA5OTM4MSwiZXhwIjoyMDgzNjc1MzgxfQ.afilH_6dq8Mmh7y2xPz3qa5pb5YAxlW7qhzMvwxwczQ" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{
    "slug": "생성된-슬러그",
    "title": "제목",
    "title_en": "English Title",
    "description": "2-3문장 요약",
    "description_en": "English description",
    "body": "마크다운 본문 (위 규칙 적용)",
    "type": "article",
    "category": "카테고리",
    "tags": ["태그1", "태그2", "태그3"],
    "external_url": "외부링크",
    "is_premium": false,
    "is_featured": true,
    "status": "published",
    "published_at": "현재시간 ISO 형식"
  }'
```

---

### 5단계: 결과 확인

```
=== 추천 콘텐츠 추가 완료 ===

제목: Claude Code가 몇 시간이고 멈추지 않는 비밀
슬러그: claude-code-stop-hook-guide
카테고리: claude-code
태그: #claude-code #stop-hook #ralph-loop

ID: xxxx-xxxx-xxxx
URL: /content/claude-code-stop-hook-guide

홈페이지 추천 콘텐츠 섹션에 표시됩니다.
```

---

## 체크리스트 (DB 추가 전 확인)

- [ ] 1-2문장마다 줄바꿈 했는가?
- [ ] `**굵게**` 뒤에 특수문자 오면 공백 추가했는가?
- [ ] 핵심 용어/숫자에 굵게 적용했는가?
- [ ] `##` 제목으로 섹션 구분했는가?
- [ ] 마지막에 `>` 인용 + 행동 유도 있는가?
- [ ] `is_featured: true` 설정했는가?

## 주의사항

- `is_featured: true` 필수 (추천 콘텐츠)
- `type: "article"` 또는 `"news"` (추천 섹션 조건)
- `status: "published"` (즉시 공개)
- 본문은 반드시 마크다운 형식 (HTML 태그 X)
