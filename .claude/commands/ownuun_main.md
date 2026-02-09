# Ownuun Main Pipeline

5개 SNS 플랫폼 콘텐츠를 **병렬로** 크롤링 → 분석 → 게시하는 메인 오케스트레이터입니다.

**각 플랫폼별 독립 실행도 가능**: `/ownuun_x`, `/ownuun_threads`, `/ownuun_reddit`, `/ownuun_youtube`, `/ownuun_github`

---

## 아키텍처

```
/ownuun_main (오케스트레이터)
    │
    ├─ Phase 1: 병렬 크롤링 (5개 스크립트 동시 실행)
    │      ├─ node scripts/crawl-github.mjs
    │      ├─ node scripts/crawl-youtube.mjs
    │      ├─ node scripts/crawl-reddit.mjs
    │      ├─ node scripts/crawl-x.mjs
    │      └─ node scripts/crawl-threads.mjs
    │
    ├─ Phase 2: 에이전트 직접 분석 (5개 Task 병렬)
    │      ├─ /ownuun_x → X 분석
    │      ├─ /ownuun_threads → Threads 분석
    │      ├─ /ownuun_reddit → Reddit 분석
    │      ├─ /ownuun_youtube → YouTube 분석
    │      └─ /ownuun_github → GitHub 분석 (llm_summary 생성)
    │
    ├─ Phase 3: 게시
    │      ├─ 7점 이상: 자동 게시
    │      ├─ 7점 미만: 사용자 선택
    │      └─ GitHub: 전부 게시
    │
    └─ Phase 4: 스토리지 정리 (선택)
```

---

## Phase 1: 병렬 크롤링

**5개 크롤러를 병렬로 실행합니다.**

> **최소 크롤링 규정**: 각 SNS 플랫폼별 최소 **10개 이상** 크롤링 필수

### Step 0: GitHub 크롤링 옵션 확인 (필수)

**크롤링 실행 전 사용자에게 GitHub 옵션을 물어봅니다:**

```
GitHub 크롤링 옵션을 선택해주세요:

1. 기간 (since):
   - daily (기본) - 오늘의 트렌딩
   - weekly - 이번 주 트렌딩
   - monthly - 이번 달 트렌딩
   - all - daily + weekly + monthly 모두

2. 개수 (limit): 기본 25개 (최소 10개)

3. 언어별 크롤링 (includeLanguages):
   - false (기본) - 전체 트렌딩만
   - true - 주요 14개 언어별 트렌딩도 포함
     (python, javascript, typescript, go, rust, java, c++, c, swift, kotlin, php, c#, ruby, dart)

예시 응답: "daily, 25개, 언어별 포함" 또는 "weekly만 20개"
```

### Step 1: 5개 크롤러 병렬 실행

```bash
# 병렬 실행 (각 터미널 또는 백그라운드)
cd /Users/ownuun/conductor/workspaces/v2-v1/kiev

# GitHub (사용자 옵션에 따라)
node scripts/crawl-github.mjs --since=daily --limit=25

# 또는 전체 기간
node scripts/crawl-github.mjs --all

# YouTube (24시간 내 구독 피드에서 자동 수집)
node scripts/crawl-youtube.mjs

# Reddit (최소 10개, 권장 20개)
node scripts/crawl-reddit.mjs --limit=20

# X (최소 10개, 권장 20개)
node scripts/crawl-x.mjs --limit=20

# Threads (최소 10개, 권장 20개)
node scripts/crawl-threads.mjs --limit=20
```

### 크롤링 결과 확인 (최소 10개 검증 포함)

```bash
cd /Users/ownuun/conductor/workspaces/v2-v1/kiev && node -e "
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const MINIMUM_REQUIRED = 10;

async function check() {
  const platforms = ['github', 'youtube', 'reddit', 'x', 'threads'];
  const results = {};
  let allPassed = true;

  console.log('=== 크롤링 결과 확인 (최소 ' + MINIMUM_REQUIRED + '개 규정) ===\n');

  for (const p of platforms) {
    const { count } = await supabase
      .from('crawled_content')
      .select('*', { count: 'exact', head: true })
      .eq('platform', p)
      .in('status', ['pending', 'pending_analysis']);

    const actualCount = count || 0;
    const passed = actualCount >= MINIMUM_REQUIRED;
    const status = passed ? '✅' : '❌ (부족: ' + (MINIMUM_REQUIRED - actualCount) + '개 더 필요)';

    results[p] = { count: actualCount, passed };
    if (!passed) allPassed = false;

    console.log(status + ' ' + p + ': ' + actualCount + '개 대기');
  }

  console.log('');
  if (allPassed) {
    console.log('✅ 모든 플랫폼이 최소 ' + MINIMUM_REQUIRED + '개 요구사항 충족');
  } else {
    console.log('⚠️ 일부 플랫폼이 최소 ' + MINIMUM_REQUIRED + '개 미달 - 추가 크롤링 필요');
    console.log('   미달 플랫폼의 경우:');
    console.log('   - 쿠키 만료 확인 (X, Threads)');
    console.log('   - 피드에 콘텐츠가 부족한지 확인');
    console.log('   - 크롤러를 다시 실행하거나 limit 값 증가');
  }
}
check();
"
```

### GitHub Token 필요 여부 확인 (Star History)

```bash
cd /Users/ownuun/conductor/workspaces/v2-v1/kiev && node -e "
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkTokenNeeded() {
  const { data } = await supabase
    .from('crawled_content')
    .select('id, title, raw_data')
    .eq('platform', 'github')
    .not('raw_data->needs_github_token', 'is', null);

  if (data?.length > 0) {
    console.log('⚠️ GitHub Token 필요: ' + data.length + '개 레포의 Star History 캡처 실패');
    console.log('토큰 없이 캡처된 레포:', data.map(d => d.title).join(', '));
    console.log('');
    console.log('해결 방법:');
    console.log('1. https://github.com/settings/tokens 에서 토큰 생성 (public_repo 권한)');
    console.log('2. .env.local 파일에 GITHUB_TOKEN=ghp_xxx 추가');
    console.log('3. GitHub 크롤러 다시 실행');
  } else {
    console.log('✅ 모든 GitHub 레포 Star History 정상 캡처됨');
  }
}
checkTokenNeeded();
"
```

---

## Phase 2: 에이전트 직접 분석

**각 플랫폼별 슬래시커맨드를 병렬로 Task 도구로 실행합니다.**

### Reddit Link Post 자동 본문 추출

Reddit 크롤러는 **Link Post** (외부 URL을 공유하는 게시물)의 경우 자동으로 해당 URL의 본문을 추출합니다:

- `selftext`가 50자 미만이고 외부 URL이 있으면 → `extractContent()`로 본문 추출
- 추출된 본문은 `content_text` (영어)에 저장
- 분석 시 `/ownuun_reddit`에서 한국어 번역 → `translated_content`에 저장
- 게시 시 `body_en = content_text`, `body = translated_content`로 매핑

```
[5개 Task 도구 병렬 호출]

Task 1 - X 분석:
  prompt: "/ownuun_x Phase 2만 실행 (분석만). pending_analysis 상태의 X 콘텐츠를 모두 분석하고 DB 업데이트. 완료 후 분석 개수와 평균 점수 반환."

Task 2 - Threads 분석:
  prompt: "/ownuun_threads Phase 2만 실행 (분석만). pending_analysis 상태의 Threads 콘텐츠를 모두 분석하고 DB 업데이트. 완료 후 분석 개수와 평균 점수 반환."

Task 3 - Reddit 분석:
  prompt: "/ownuun_reddit Phase 2만 실행 (분석만). pending_analysis 상태의 Reddit 콘텐츠를 모두 분석하고 DB 업데이트. 완료 후 분석 개수와 평균 점수 반환."

Task 4 - YouTube 분석 (⚠️ 상세 분석 필수):
  prompt: |
    /ownuun_youtube Phase 2만 실행 (분석만). 반드시 아래 요구사항을 준수:

    1. **자막 추출**: youtube-transcript.js의 getTranscript() + formatTranscriptWithTimestamps() 사용하여 타임스탬프 포함된 자막 추출
    2. **timeline 필수 요구사항**:
       - 최소 1500자 이상 작성
       - 실제 타임스탬프 사용 (**0:00**, **1:30**, **7:20** 형식)
       - 영상 내용의 90% 포함
       - 계층 구조: 1. > 1.1. > 1.2. > 2.
    3. **JSON 형식**: keyQA, intro, timeline, recommendScore, recommendReason, targetAudience 모두 포함
    4. **품질 검증**: timeline.length < 1500이면 재분석

    완료 후 분석 개수, 평균 점수, 평균 timeline 길이 반환.

Task 5 - GitHub 분석:
  prompt: |
    /ownuun_github Phase 2만 실행 (분석만). pending_analysis 상태의 GitHub 콘텐츠를 분석하고 DB 업데이트.

    각 레포마다:
    1. README 스크린샷(screenshot_url) 분석하여 프로젝트 이해
    2. 한국어/영어 소개글 생성
    3. llm_summary 생성: { summary, features, targetAudience, beginner_description }
    4. raw_data.llm_summary에 저장

    완료 후 분석 개수 반환.
```

### 분석 결과 확인

```bash
cd /Users/ownuun/conductor/workspaces/v2-v1/kiev && node -e "
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data } = await supabase
    .from('crawled_content')
    .select('platform, status, digest_result')
    .in('status', ['pending', 'completed']);

  const stats = {};
  data?.forEach(item => {
    const p = item.platform;
    if (!stats[p]) stats[p] = { total: 0, withScore: 0, totalScore: 0 };
    stats[p].total++;
    if (item.digest_result?.recommendScore) {
      stats[p].withScore++;
      stats[p].totalScore += item.digest_result.recommendScore;
    }
  });

  console.log('=== 분석 결과 ===');
  Object.entries(stats).forEach(([p, s]) => {
    const avg = s.withScore > 0 ? (s.totalScore / s.withScore).toFixed(1) : 'N/A';
    console.log(p + ': ' + s.total + '개 (분석: ' + s.withScore + '개, 평균: ' + avg + '점)');
  });
}
check();
"
```

---

## Phase 3: 게시

### 게시 조건

- **7점 이상**: 자동 게시
- **7점 미만**: 목록 나열 → 사용자 선택
- **GitHub**: 전부 게시

### GitHub 게시 주의사항

- **category**: 반드시 `open-source` 사용 (DB 제약조건: `content_category_check`)
- **스크린샷 저장 위치**:
  - `crawled_content.screenshot_url` → `content.social_metadata.readme_screenshot`
  - `crawled_content.raw_data.star_history_screenshot` → `content.social_metadata.star_history_screenshot`
  - `scripts/publish-batch.js`가 자동 처리

### Step 1: 게시 대상 조회

```bash
cd /Users/ownuun/conductor/workspaces/v2-v1/kiev && node -e "
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function getTargets() {
  const { data: scored } = await supabase
    .from('crawled_content')
    .select('id, platform, title, url, digest_result')
    .in('status', ['pending', 'completed'])
    .in('platform', ['youtube', 'x', 'threads', 'reddit']);

  const high = scored?.filter(i => i.digest_result?.recommendScore >= 7) || [];
  const low = scored?.filter(i => i.digest_result?.recommendScore && i.digest_result?.recommendScore < 7) || [];

  const { data: github } = await supabase
    .from('crawled_content')
    .select('id, platform, title')
    .eq('platform', 'github')
    .in('status', ['pending', 'pending_analysis', 'completed']);

  console.log('=== 자동 게시 (7점 이상) ===');
  high.forEach((i, n) => console.log((n+1) + '. [' + i.platform + ' ' + i.digest_result?.recommendScore + '점] ' + (i.digest_result?.summary_oneline || i.title || '').substring(0, 50)));
  console.log('총: ' + high.length + '개\\n');

  console.log('=== GitHub (전부 게시) ===');
  console.log('총: ' + (github?.length || 0) + '개\\n');

  console.log('=== 7점 미만 (선택) ===');
  low.forEach((i, n) => {
    console.log((n+1) + '. [' + i.platform + ' ' + i.digest_result?.recommendScore + '점] ' + (i.digest_result?.summary_oneline || i.title || '').substring(0, 50));
    console.log('   ' + i.url);
  });

  console.log('\\n--- DATA ---');
  console.log('HIGH=' + JSON.stringify(high.map(i => i.id)));
  console.log('LOW=' + JSON.stringify(low.map(i => i.id)));
  console.log('GITHUB=' + JSON.stringify((github || []).map(i => i.id)));
}
getTargets();
"
```

### Step 2: 게시 실행

```bash
# ID 목록을 /tmp/publish_ids.json에 저장 후
cd /Users/ownuun/conductor/workspaces/v2-v1/kiev && node scripts/publish-batch.js
```

---

## Phase 4: 스토리지 정리 (선택)

```bash
cd /Users/ownuun/conductor/workspaces/v2-v1/kiev && node scripts/cleanup-videos.mjs
```

---

## 전체 실행 흐름

```
1. Phase 1 - 크롤링 (5개 스크립트 병렬)
2. Phase 2 - 분석 (5개 슬래시커맨드 Task 병렬)
   - X, Threads, Reddit: look_at으로 스크린샷 분석
   - YouTube: 자막 추출 → 상세 분석
   - GitHub: README 분석 → llm_summary 생성
   - DB 업데이트
3. Phase 3 - 게시 (점수 기반)
4. Phase 4 - 스토리지 정리 (선택)
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

## 개별 플랫폼 실행

각 플랫폼을 독립적으로 실행하려면:

| 플랫폼  | 커맨드            |
| ------- | ----------------- |
| X       | `/ownuun_x`       |
| Threads | `/ownuun_threads` |
| Reddit  | `/ownuun_reddit`  |
| YouTube | `/ownuun_youtube` |
| GitHub  | `/ownuun_github`  |

각 커맨드는 크롤링 → 분석 → 게시 전체 파이프라인을 독립적으로 수행합니다.

---

## 실행

```
/ownuun_main
```
