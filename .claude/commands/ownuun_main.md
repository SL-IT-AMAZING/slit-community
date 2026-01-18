# Ownuun Main Pipeline

6개 SNS 콘텐츠를 크롤링 → 분석 → 게시하는 메인 파이프라인입니다.
**Task 도구를 사용하여 서브 에이전트를 병렬로 실행합니다.**

## 아키텍처

```
/ownuun_main (오케스트레이터)
    │
    ├─ Phase 1: 6개 에이전트 병렬 실행 (각자 크롤링+분석까지 완료)
    │      ├─ GitHub 에이전트: 크롤링 → 완료 (분석 없음)
    │      ├─ LinkedIn 에이전트: 크롤링 → 완료 (분석 없음)
    │      ├─ Reddit 에이전트: 크롤링 → 분석 → 완료
    │      ├─ YouTube 에이전트: 크롤링 → 분석 → 완료
    │      ├─ X 에이전트: 크롤링 → 분석 → 완료
    │      └─ Threads 에이전트: 크롤링 → 분석 → 완료
    │
    ├─ Phase 2: 게시 (메인 에이전트)
    │      ├─ 7점 이상: 자동 게시
    │      ├─ 7점 미만: 목록 나열 → 사용자 선택
    │      └─ GitHub/LinkedIn: 전부 게시
    │
    └─ Phase 3: 스토리지 정리 (자동)
           └─ 비디오 스토리지 90% 초과 시 조회수 하위 30% 삭제
```

---

## Phase 1: 병렬 에이전트 (6개 동시 실행)

### 실행 방법

**Task 도구로 6개 에이전트를 동시에 실행합니다. 각 에이전트가 크롤링부터 분석까지 독립적으로 완료합니다.**

```
[단일 메시지에서 6개 Task 도구 호출]

Task 1 - GitHub:
  subagent_type: "Bash"
  description: "GitHub 크롤링"
  prompt: "GitHub 트렌딩 크롤링 실행:
    cd /Users/ownuun/conductor/workspaces/v2-v1/kiev && curl -X POST http://localhost:3000/api/crawler/run -H 'Content-Type: application/json' -d '{\"platform\": \"github\", \"options\": {\"since\": \"daily\", \"limit\": 25}}'
    결과를 JSON으로 파싱하여 수집된 개수 반환.
    GitHub은 크롤링 시 README 요약이 이미 완료되므로 추가 분석 불필요."

Task 2 - LinkedIn:
  subagent_type: "Bash"
  description: "LinkedIn 크롤링"
  prompt: "LinkedIn 크롤링 실행:
    LinkedIn은 별도 이미지 업로드가 필요하므로 스킵.
    '크롤링 스킵 (수동 업로드 필요)' 반환."

Task 3 - Reddit:
  subagent_type: "general-purpose"
  description: "Reddit 크롤링+분석"
  prompt: "Reddit 크롤링 및 분석을 진행합니다.

    1. 크롤링 실행:
    cd /Users/ownuun/conductor/workspaces/v2-v1/kiev && curl -X POST http://localhost:3000/api/crawler/run -H 'Content-Type: application/json' -d '{\"platform\": \"reddit\", \"options\": {\"limit\": 20}}'

    2. 분석 실행:
    DB에서 platform='reddit', status='pending_analysis' 콘텐츠를 조회하고 각각에 대해:
    - /ownuun_reddit 슬래시커맨드 워크플로우 실행
    - 텍스트 기반 분석
    - 양방향 번역 + 한 줄 요약
    - 추천점수 (1-10) 평가
    - DB에 digest_result 저장

    3. 완료 후 분석된 개수와 평균 추천점수 반환"

Task 4 - YouTube:
  subagent_type: "general-purpose"
  description: "YouTube 크롤링+분석"
  prompt: "YouTube 크롤링 및 분석을 진행합니다.

    1. 크롤링 실행:
    cd /Users/ownuun/conductor/workspaces/v2-v1/kiev && curl -X POST http://localhost:3000/api/crawler/run -H 'Content-Type: application/json' -d '{\"platform\": \"youtube\"}'

    2. 분석 실행:
    DB에서 platform='youtube', status='pending' 콘텐츠를 조회하고 각각에 대해:
    - /ownuun_youtube 슬래시커맨드 워크플로우 실행
    - 트랜스크립트 추출
    - Part 1~4 분석 (핵심 Q&A, 소개문구, 타임라인, 추천점수)
    - DB에 digest_result 저장

    3. 완료 후 분석된 개수와 평균 추천점수 반환"

Task 5 - X:
  subagent_type: "general-purpose"
  description: "X 크롤링+분석"
  prompt: "X 크롤링 및 분석을 진행합니다.

    1. 크롤링 실행:
    cd /Users/ownuun/conductor/workspaces/v2-v1/kiev && curl -X POST http://localhost:3000/api/crawler/run -H 'Content-Type: application/json' -d '{\"platform\": \"x\", \"options\": {\"limit\": 20}}'

    2. 분석 실행:
    DB에서 platform='x', status='pending_analysis' 콘텐츠를 조회하고 각각에 대해:
    - /ownuun_x 슬래시커맨드 워크플로우 실행
    - 스크린샷 Vision 분석
    - 양방향 번역 + 한 줄 요약
    - 추천점수 (1-10) 평가
    - DB에 digest_result 저장

    3. 완료 후 분석된 개수와 평균 추천점수 반환"

Task 6 - Threads:
  subagent_type: "general-purpose"
  description: "Threads 크롤링+분석"
  prompt: "Threads 크롤링 및 분석을 진행합니다.

    1. 크롤링 실행:
    cd /Users/ownuun/conductor/workspaces/v2-v1/kiev && curl -X POST http://localhost:3000/api/crawler/run -H 'Content-Type: application/json' -d '{\"platform\": \"threads\", \"options\": {\"limit\": 20}}'

    2. 분석 실행:
    DB에서 platform='threads', status='pending_analysis' 콘텐츠를 조회하고 각각에 대해:
    - /ownuun_threads 슬래시커맨드 워크플로우 실행
    - 스크린샷 Vision 분석
    - 양방향 번역 + 한 줄 요약
    - 추천점수 (1-10) 평가
    - DB에 digest_result 저장

    3. 완료 후 분석된 개수와 평균 추천점수 반환"
```

### 결과 집계

모든 Task 완료 후 결과를 집계:

```
=== 크롤링+분석 완료 ===
- GitHub: 25개 크롤링
- LinkedIn: 스킵 (수동)
- Reddit: 20개 크롤링, 18개 분석, 평균 6.8점
- YouTube: 8개 크롤링, 6개 분석, 평균 7.8점
- X: 15개 크롤링, 12개 분석, 평균 6.5점
- Threads: 12개 크롤링, 10개 분석, 평균 7.2점
```

---

## Phase 2: 게시 (메인 에이전트가 직접 처리)

### 게시 조건

- **추천점수 7점 이상**: 자동 게시
- **추천점수 7점 미만**: 목록 나열 → 사용자가 추가 포함할 것 선택
- **GitHub/LinkedIn**: 전부 게시 (추천점수 없음)

### Step 1: DB에서 결과 조회

```bash
cd /Users/ownuun/conductor/workspaces/v2-v1/kiev && node -e "
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function getPublishTargets() {
  // 추천점수 있는 플랫폼
  const { data: scored } = await supabase
    .from('crawled_content')
    .select('id, platform, platform_id, title, url, digest_result')
    .eq('status', 'completed')
    .in('platform', ['youtube', 'x', 'threads', 'reddit']);

  const highScore = scored?.filter(i => i.digest_result?.recommendScore >= 7) || [];
  const lowScore = scored?.filter(i => i.digest_result?.recommendScore < 7) || [];

  // GitHub, LinkedIn 전부
  const { data: noScore } = await supabase
    .from('crawled_content')
    .select('id, platform, platform_id, title, url')
    .eq('status', 'completed')
    .in('platform', ['github', 'linkedin']);

  console.log('=== 자동 게시 대상 (7점 이상 + GitHub/LinkedIn) ===');
  console.log('7점 이상:', highScore.length, '개');
  console.log('GitHub/LinkedIn:', noScore?.length || 0, '개');

  console.log('\\n=== 7점 미만 (추가 선택 가능) ===');
  lowScore.forEach((item, i) => {
    const summary = item.digest_result?.summary || item.digest_result?.oneLiner || item.title || item.platform_id;
    console.log(\`\${i+1}. [\${item.platform.toUpperCase()} \${item.digest_result?.recommendScore}점]\`);
    console.log(\`   \${summary.substring(0, 80)}\`);
    console.log(\`   \${item.url}\`);
    console.log();
  });

  // ID 목록 반환
  console.log('\\n--- 데이터 ---');
  console.log('HIGH_SCORE_IDS=' + JSON.stringify(highScore.map(i => i.id)));
  console.log('LOW_SCORE_IDS=' + JSON.stringify(lowScore.map(i => i.id)));
  console.log('NO_SCORE_IDS=' + JSON.stringify((noScore || []).map(i => i.id)));
}
getPublishTargets();
"
```

### Step 2: 사용자에게 질문

```
[7점 미만 콘텐츠 - 추가 포함할 것을 선택하세요]

1. [YOUTUBE 6.5점]
   Claude Code 사용법 소개 영상, 초보자 대상
   https://youtube.com/watch?v=xxx

2. [X 5.0점]
   AI 코딩 도구 비교 트윗, GPT vs Claude 성능 분석
   https://x.com/user/status/xxx

3. [THREADS 6.0점]
   개발자 생산성 향상 팁 공유
   https://threads.net/@user/post/xxx

포함할 번호를 입력하세요 (예: 1,3,5) 또는 Enter로 스킵:
```

### Step 3: 선택된 항목 + 자동 대상 게시

```bash
# 예: 사용자가 1,3 선택
cd /Users/ownuun/conductor/workspaces/v2-v1/kiev && node -e "
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function publish() {
  // HIGH_SCORE_IDS, LOW_SCORE_IDS, NO_SCORE_IDS 변수 사용
  // 사용자가 선택한 lowScore 인덱스: [0, 2] (1,3번)
  const selectedLowScoreIds = [LOW_SCORE_IDS[0], LOW_SCORE_IDS[2]];

  const allIds = [...HIGH_SCORE_IDS, ...selectedLowScoreIds, ...NO_SCORE_IDS];

  if (allIds.length > 0) {
    const res = await fetch('http://localhost:3000/api/crawler/publish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: allIds })
    });
    const result = await res.json();
    console.log('게시 완료:', result.published, '개');
  }
}
publish();
"
```

### 게시 완료 후 결과

```
=== 게시 완료 ===
총 게시: 45개
- 7점 이상 자동 게시: 28개
- 7점 미만 사용자 선택: 2개
- GitHub: 12개
- LinkedIn: 3개

content 테이블에 추가되었습니다.
Admin UI에서 확인하세요: /admin/content
```

---

## Phase 3: 스토리지 정리 (자동)

게시가 완료된 후 자동으로 비디오 스토리지를 정리합니다.

### 실행 조건
- Supabase Storage `videos` 버킷 용량이 90% 초과 시
- 조회수(view_count) 하위 30% 비디오 자동 삭제

### 실행 명령어

```bash
cd /Users/ownuun/conductor/workspaces/v2-v1/kiev && node scripts/cleanup-videos.mjs
```

### 결과 예시

```
🎬 Video Storage Cleanup Script
================================
Mode: NORMAL

📊 Checking storage usage...
  Total files: 45
  Total size: 0.92 GB / 1 GB
  Usage: 92.0%

⚠️ Storage usage exceeds 90%. Starting cleanup...

📋 Fetching videos sorted by view count...
  Found 30 videos with Supabase Storage URLs
  Will delete bottom 30%: 9 videos

🗑️ Videos to delete (sorted by view count):
  1. [0 views] AI 코딩 도구 소개...
  2. [2 views] 개발자 생산성 팁...
  ...

🚀 Deleting videos...
  ✅ Deleted: x/video_123.mp4
  ✅ Deleted: threads/video_456.mp4
  ...

📊 Cleanup Summary:
  ✅ Deleted: 9
  ❌ Failed: 0

📊 Final storage usage...
  Total size: 0.65 GB
  Usage: 65.0%
```

### 옵션

| 옵션 | 설명 |
|------|------|
| `--dry-run` | 실제 삭제 없이 시뮬레이션 |
| `--force` | 90% 미만이어도 강제 정리 |

---

## 전체 실행 요약

```
/ownuun_main 실행

Phase 1: 병렬 에이전트 (6개 동시)
├─ 각 에이전트가 크롤링 + 분석까지 독립적으로 완료
├─ 먼저 끝난 에이전트가 먼저 완료
└─ 결과 집계

Phase 2: 게시 (메인 에이전트)
├─ 7점 이상 + GitHub/LinkedIn: 자동 게시
├─ 7점 미만: 목록 나열 → 사용자 선택
└─ 완료 보고

Phase 3: 스토리지 정리 (자동)
├─ 비디오 스토리지 용량 확인
├─ 90% 초과 시 조회수 하위 30% 삭제
└─ 정리 결과 보고
```

---

## 추천점수 기준

| 점수 | 기준 |
|------|------|
| 9-10 | 반드시 포함. 트렌드 선도, 높은 engagement |
| 7-8 | 포함 권장. 관련성 높고 유익 |
| 5-6 | 선택적. 괜찮지만 특별하지 않음 |
| 3-4 | 비추천. 주제와 거리 있음 |
| 1-2 | 제외. 스팸성/관련 없음 |

**평가 요소:**
- 주제 관련성: AI/개발/트렌드와의 관련도
- 정보 가치: 새로운 인사이트/실용적 팁
- Engagement: 좋아요/댓글/공유 수
- 신뢰성: 출처/작성자 신뢰도
- 시의성: 최신 트렌드 여부

---

## 실행 예시

```
/ownuun_main
```
