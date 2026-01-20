# Ownuun YouTube - YouTube 콘텐츠 분석

YouTube 영상을 **에이전트가 직접** 분석하고 DB에 저장합니다.

## 실행 방법

### 배치 분석 (pending 상태 전체)

에이전트가 다음을 수행합니다:

1. DB에서 `pending` 상태의 YouTube 콘텐츠 조회
2. 각 영상의 자막 추출
3. 자막 기반 상세 분석
4. DB 업데이트

### 단일 영상 분석

```
/ownuun_youtube https://www.youtube.com/watch?v=VIDEO_ID
```

---

## Step 1: pending 콘텐츠 조회

```bash
cd /Users/ownuun/conductor/workspaces/v2-v1/kiev && node -e "
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function getPending() {
  const { data } = await supabase
    .from('crawled_content')
    .select('id, platform_id, title, author_name, url')
    .eq('platform', 'youtube')
    .eq('status', 'pending')
    .order('crawled_at', { ascending: false })
    .limit(10);

  console.log('=== Pending YouTube Videos ===');
  console.log('Total:', data?.length || 0);
  data?.forEach((item, i) => {
    console.log('\\n' + (i+1) + '. ID: ' + item.id);
    console.log('   Video ID: ' + item.platform_id);
    console.log('   Title: ' + item.title);
    console.log('   Channel: ' + item.author_name);
    console.log('   URL: ' + item.url);
  });
}
getPending();
"
```

---

## Step 2: 자막 추출

각 영상의 자막을 추출합니다:

```bash
cd /Users/ownuun/conductor/workspaces/v2-v1/kiev && node -e "
const { getTranscript } = require('./src/lib/youtube-transcript.js');

async function extract(videoId) {
  const { text, success } = await getTranscript(videoId);
  if (success) {
    console.log('=== Transcript ===');
    console.log(text.substring(0, 2000) + '...');
  } else {
    console.log('Transcript not available');
  }
}
extract('VIDEO_ID_HERE');
"
```

자막이 없는 경우 메타데이터(제목, 설명)로 분석합니다.

---

## Step 3: 상세 분석

에이전트가 자막/메타데이터를 바탕으로 다음 형식으로 분석:

### Part 1: 핵심 Q&A

```
📌 **[핵심 질문]**은 무엇이며, **[핵심 개념]**은 무엇인가?
[1-2문장 핵심 답변]

💡 **[메커니즘 질문]**?
- **[포인트 1]**: [설명]
- **[포인트 2]**: [설명]
- **[포인트 3]**: [설명]
```

### Part 2: 영상 개요 (2-3문단)

### Part 3: 상세 타임라인 노트 (1500자 이상)

```
**1. [대섹션 제목]**

[섹션 핵심 내용]

**1.1. [소섹션 제목]**
- **[키워드]**: [설명]
- [세부 내용]

**2. [다음 대섹션]**
...
```

### Part 4: 추천점수

```
**추천점수**: 8/10
**추천 이유**: [1-2문장]
**대상 독자**: [대상 설명]
```

---

## Step 4: DB 업데이트

분석 결과를 JSON으로 정리 후 저장:

```bash
cd /Users/ownuun/conductor/workspaces/v2-v1/kiev && node -e "
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const result = {
  keyQA: {
    question: '핵심 질문',
    answer: '핵심 답변',
    mechanism: {
      question: '메커니즘 질문',
      points: ['포인트1', '포인트2', '포인트3']
    }
  },
  intro: '영상 개요 2-3문단',
  timeline: '상세 타임라인 노트',
  recommendScore: 8,
  recommendReason: '추천 이유',
  targetAudience: '대상 독자',
  processedAt: new Date().toISOString()
};
const recordId = 'UUID-HERE';

async function update() {
  const { error } = await supabase
    .from('crawled_content')
    .update({
      status: 'completed',
      digest_result: result
    })
    .eq('id', recordId);

  console.log(error ? 'Error: ' + error.message : 'Updated: ' + recordId);
}
update();
"
```

---

## Step 5: 완료 보고

모든 분석 완료 후:

```
=== YouTube 분석 완료 ===
분석된 개수: N개
평균 추천점수: X.X점

1. [8점] 영상 제목 - 채널명
2. [7점] 영상 제목 - 채널명
...
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

## 파일 경로

- 자막 추출: `src/lib/youtube-transcript.js`
