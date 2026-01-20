# Ownuun YouTube

YouTube 영상을 **영상을 안 봐도 될 정도로** 상세하게 요약합니다.

## 빠른 실행

### 방법 1: 배치 분석 스크립트 (권장)

```bash
cd /Users/ownuun/conductor/workspaces/v2-v1/kiev && node scripts/batch_analyze_youtube.js
```

**출력 예시:**

```
Found 10 pending videos. Starting analysis...
Processing: Claude Code 완벽 가이드 (abc123)
  - Transcript failed, falling back to description/metadata
  - Success! Score: 8

--- Summary ---
Analyzed Count: 8
Average Score: 7.5
```

### 방법 2: 크롤링 + 분석 통합

```bash
# 크롤링 먼저
curl -X POST http://localhost:3000/api/crawler/run \
  -H 'Content-Type: application/json' \
  -d '{"platform": "youtube"}'

# 배치 분석 실행
cd /Users/ownuun/conductor/workspaces/v2-v1/kiev && node scripts/batch_analyze_youtube.js
```

### 방법 3: 단일 영상 분석 (슬래시커맨드)

```
/ownuun_youtube https://www.youtube.com/watch?v=VIDEO_ID
```

---

## 스크립트 상세 (batch_analyze_youtube.js)

### 처리 흐름

1. **DB 조회**: `status='pending'` AND `platform='youtube'`
2. **자막 추출**: `youtube-transcript` 라이브러리 사용
3. **Anthropic 분석**: Claude Haiku로 요약 생성
4. **DB 업데이트**: `status='completed'`, `digest_result` 저장

### 환경변수 필수

```
ANTHROPIC_API_KEY=     # Claude Haiku 사용 (없으면 Mock 분석)
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

### Mock 분석 모드

`ANTHROPIC_API_KEY`가 없으면 자동으로 Mock 분석 수행:

- 메타데이터 기반 간이 요약
- 랜덤 추천점수 (7-9점)

---

## 단일 영상 상세 분석

슬래시커맨드로 개별 영상을 상세 분석할 때:

### 1. 메타데이터 & 자막 추출

```bash
# 자막 추출 (youtube-transcript 사용)
cd /Users/ownuun/conductor/workspaces/v2-v1/kiev && node -e "
const { getTranscript } = require('./src/lib/youtube-transcript.js');
getTranscript('VIDEO_ID').then(r => console.log(r.text?.substring(0, 1000)));
"
```

### 2. 맥락 파악 (WebSearch)

고유명사 정확한 표기 수집:

- `"{영상 제목}" {채널명} summary`
- `"{발표자명}" {주제 키워드}`

### 3. 상세 분석 (Part 1-4)

**Part 1: 핵심 Q&A**

```
📌 **[핵심 질문]**은 무엇이며, **[핵심 개념]**은 무엇인가?
[1-2문장 답변]

💡 **[메커니즘 질문]**?
- **[포인트 1]**: [설명]
- **[포인트 2]**: [설명]
```

**Part 2: 영상 개요 (2-3문단)**

**Part 3: 상세 타임라인 노트 (1500자 이상)**

**Part 4: 추천점수**

- 점수: 1-10
- 이유: 1-2문장
- 대상 독자

### 4. 결과 JSON

```json
{
  "keyQA": {
    "question": "핵심 질문",
    "answer": "1-2문장 답변",
    "mechanism": {
      "question": "메커니즘 질문",
      "points": ["포인트1", "포인트2", "포인트3"]
    }
  },
  "intro": "영상 개요 2-3문단",
  "timeline": "상세 타임라인 노트 (1500자 이상)",
  "recommendScore": 8,
  "recommendReason": "추천 이유",
  "targetAudience": "대상 독자"
}
```

### 5. DB 저장

```bash
cd /Users/ownuun/conductor/workspaces/v2-v1/kiev && node scripts/save-digest.js "VIDEO_ID" '<JSON_RESULT>'
```

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

## 분석 시 주의사항

1. **분량**: 최소 1500자 이상
2. **계층 구조**: 대섹션(1.) > 소섹션(1.1.) > 하위 주제 > 불릿
3. **굵은글씨**: 핵심 키워드, 도구명, 기술명은 `**굵은글씨**`
4. **구체성**: 숫자, 도구명, 방법론 포함
5. **전문 용어**: 괄호 안에 영어 원어 병기

---

## 트러블슈팅

### 자막 추출 실패

```
Transcript failed, falling back to description/metadata
```

→ 영상에 자막이 없거나 비공개. 메타데이터 기반 분석 진행.

### ANTHROPIC_API_KEY 없음

```
⚠️ No ANTHROPIC_API_KEY found. Using mock analysis.
```

→ `.env.local`에 키 추가 또는 Mock 분석 결과 사용

### DB 저장 실패

```
Error saving to DB: ...
```

→ Supabase 환경변수 확인

---

## 파일 경로

- 배치 스크립트: `scripts/batch_analyze_youtube.js`
- 단일 저장: `scripts/save-digest.js`
- 자막 라이브러리: `src/lib/youtube-transcript.js`
