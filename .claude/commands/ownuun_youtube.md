# Ownuun YouTube - YouTube 콘텐츠 분석

YouTube 영상을 **에이전트가 직접** 분석하고 DB에 저장합니다.

---

## 🚀 실행 흐름

### Step 1: pending 영상 확인

```bash
cd /Users/ownuun/conductor/workspaces/v2-v1/kiev && node -e "
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data } = await supabase
    .from('crawled_content')
    .select('id, platform_id, title, author_name, status, digest_result')
    .eq('platform', 'youtube')
    .in('status', ['pending', 'pending_analysis'])
    .order('crawled_at', { ascending: false })
    .limit(10);

  console.log('=== Pending YouTube Videos ===');
  data?.forEach((v, i) => {
    const hasTimeline = v.digest_result?.timeline?.length > 500;
    console.log((i+1) + '. ' + v.title?.substring(0, 50));
    console.log('   ID: ' + v.id);
    console.log('   Video: ' + v.platform_id);
    console.log('   Channel: ' + v.author_name);
    console.log('   Timeline: ' + (hasTimeline ? '✅ ' + v.digest_result.timeline.length + '자' : '❌ 없음/부족'));
  });
  if (!data?.length) console.log('No pending videos');
}
check();
"
```

---

### Step 2: 자막 추출 (타임스탬프 포함) ⭐ 필수 실행

**반드시 아래 스크립트를 실행하여 자막을 추출하세요!**

```bash
cd /Users/ownuun/conductor/workspaces/v2-v1/kiev && node -e "
const { getTranscript, formatTranscriptWithTimestamps } = require('./src/lib/youtube-transcript.js');

async function extract(videoId) {
  console.log('Extracting transcript for: ' + videoId);
  const result = await getTranscript(videoId);
  if (result?.segments?.length) {
    const ts = formatTranscriptWithTimestamps(result.segments);
    console.log('=== Transcript (' + result.segments.length + ' segments, ' + ts.length + ' chars) ===');
    console.log(ts);
    console.log('\\n=== END OF TRANSCRIPT ===');
  } else {
    console.log('❌ No transcript available. Error: ' + (result?.error || 'Unknown'));
  }
}
extract('VIDEO_ID_HERE');  // <-- 여기에 videoId 입력!
"
```

**자막 추출 결과를 반드시 읽고 아래 분석에 활용하세요!**

---

### Step 3: 에이전트가 직접 분석

자막을 읽고 아래 형식으로 **매우 상세하게** 분석합니다.

#### 출력 JSON 형식

```json
{
  "keyQA": {
    "question": "📌 [영상의 핵심 질문]은 무엇이며, [핵심 개념]은 무엇인가?",
    "answer": "영상 전체를 관통하는 핵심 답변 1-2문장",
    "mechanism": {
      "question": "💡 [메커니즘/원리 질문]?",
      "points": [
        "포인트 1: 구체적 설명",
        "포인트 2: 구체적 설명",
        "포인트 3: 구체적 설명",
        "포인트 4: 구체적 설명 (필요시)",
        "포인트 5: 구체적 설명 (필요시)"
      ]
    }
  },
  "intro": "영상 개요 2-3문단...",
  "timeline": "상세 타임라인 노트 (최소 1500자)...",
  "recommendScore": 8,
  "recommendReason": "추천 이유 1-2문장",
  "targetAudience": "이 영상이 도움될 대상"
}
```

---

## 📋 분석 가이드라인

### keyQA (핵심 Q&A)

| 필드                 | 작성 방법                               |
| -------------------- | --------------------------------------- |
| `question`           | "~은 무엇이며, ~은 어떻게 하는가?" 형태 |
| `answer`             | 핵심 개념과 중요성을 담은 1-2문장       |
| `mechanism.question` | "~가 ~를 처리하는 원리는?" 형태         |
| `mechanism.points`   | 핵심 메커니즘 3-5개 (구체적 설명 포함)  |

### intro (영상 개요)

- 2-3문단으로 영상 전체 소개
- **"핵심 구성 요소:"**, **"목표:"** 등 라벨 포함
- 시청자가 얻을 인사이트 명시

### timeline (상세 타임라인) ⭐ 가장 중요!

- **최소 1500자 이상** 작성
- **실제 타임스탬프 사용**: 자막의 `[M:SS]` 형식을 참고하여 각 섹션 시작 시간을 `**0:00**`, `**1:30**`, `**7:20**` 형식으로 표기
- 형식: `**타임스탬프** - 섹션 제목\n내용`
- **계층 구조 엄격 준수**: 1. > 1.1. > 1.2. > 2. > 2.1.
- 구체적인 내용, 예시, 인용 포함
- **영상의 90% 내용**을 담아야 함

#### 타임라인 작성 예시

```
**0:00** - 인트로: 영상 주제 소개
모든 AI 코딩 튜토리얼이 X를 추천하지만, 200명 이상을 도운 경험상 이 조언이 오히려 발목을 잡음.

**0:30** - 1. 환경 관리의 복잡성: 두 개의 리모컨 vs 하나의 리모컨

**X의 분리된 환경:**
- 코드 영역: 앱의 로그인 및 실제 기능 코드
- 대시보드 영역: 테이블, 데이터, 규칙(Rules)
- AI 코더가 코드 작성과 대시보드 조작 사이를 끊임없이 전환
- 비유: TV의 그림과 소리를 제어하는 두 개의 다른 리모컨

**Y의 통합 환경:**
- 데이터베이스 규칙, 테이블 정의, 비즈니스 로직이 모두 앱 코드와 동일 위치
- AI가 모든 것을 보고, 이해하고, 즉시 변경 가능

**1:43** - 2. 테스트 환경 설정의 어려움

**X의 문제:**
- 개발/스테이징 환경 설정이 복잡하고 추가 비용 발생
- 발표자 사례: 수백 명 유료 사용자가 있었지만 테스트 환경이 너무 번거로워 안 함
- 결과: 버그 배포, 변경 사항 미구현
...
```

---

## 🎯 추천점수 기준

| 점수 | 기준                                      |
| ---- | ----------------------------------------- |
| 9-10 | 반드시 포함. 트렌드 선도, 높은 engagement |
| 7-8  | 포함 권장. 관련성 높고 유익               |
| 5-6  | 선택적. 괜찮지만 특별하지 않음            |
| 3-4  | 비추천. 주제와 거리 있음                  |
| 1-2  | 제외. 스팸성/관련 없음                    |

---

## ⚠️ 분석 시 주의사항

1. **분량**: 최소 1500자 이상 (timeline)
2. **계층 구조**: 대섹션(1.) > 소섹션(1.1.) > 하위 주제 > 불릿
3. **굵은글씨**: 핵심 키워드, 도구명, 기술명은 `**굵은글씨**`
4. **구체성**: 숫자, 도구명, 방법론 반드시 포함
5. **전문 용어**: 괄호 안에 영어 원어 병기 (예: 반응성(Reactivity))
6. **타임스탬프**: 자막의 `[M:SS]`를 참고하여 정확한 시간 표기
7. **비교 구조**: X의 문제 → Y의 해결책 형식으로 대비

---

### Step 4: DB 저장

```bash
cd /Users/ownuun/conductor/workspaces/v2-v1/kiev && node -e "
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const digestResult = {
  // 에이전트가 생성한 분석 결과 여기에 붙여넣기
};

// 검증: timeline이 1500자 이상인지 확인
if (!digestResult.timeline || digestResult.timeline.length < 1500) {
  console.log('❌ ERROR: timeline이 ' + (digestResult.timeline?.length || 0) + '자로 1500자 미만입니다!');
  console.log('자막을 다시 분석하여 더 상세한 타임라인을 작성하세요.');
  process.exit(1);
}

async function save(id) {
  const { error } = await supabase
    .from('crawled_content')
    .update({ status: 'completed', digest_result: digestResult })
    .eq('id', id);
  console.log(error ? 'Error: ' + error.message : '✅ Saved: ' + id + ' (timeline: ' + digestResult.timeline.length + '자)');
}
save('RECORD_UUID_HERE');
"
```

**⚠️ timeline이 1500자 미만이면 저장 실패!**

---

## 🔧 유틸리티

### 영상을 pending으로 변경 (재분석)

```bash
cd /Users/ownuun/conductor/workspaces/v2-v1/kiev && node -e "
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function setPending(id) {
  const { error } = await supabase
    .from('crawled_content')
    .update({ status: 'pending' })
    .eq('id', id);
  console.log(error ? 'Error: ' + error.message : 'Set to pending: ' + id);
}
setPending('VIDEO_UUID_HERE');
"
```

---

## 📁 관련 파일

| 파일                            | 역할                                       |
| ------------------------------- | ------------------------------------------ |
| `src/lib/youtube-transcript.js` | 자막 추출 + 타임스탬프 변환                |
| `scripts/youtube-processor.js`  | 자동 처리 스크립트 (Anthropic API 사용 시) |
