# Ownuun Main Pipeline

6개 SNS 콘텐츠를 크롤링 → 분석 → 게시하는 메인 파이프라인입니다.

**에이전트가 직접 모든 분석을 수행합니다. 외부 API 호출 없음.**

## 아키텍처

```
/ownuun_main (오케스트레이터)
    │
    ├─ Phase 1: 병렬 크롤링 (5개 curl 동시 실행)
    │      ├─ GitHub: curl → DB 저장
    │      ├─ YouTube: curl → DB 저장
    │      ├─ Reddit: curl → DB 저장
    │      ├─ X: curl → DB 저장
    │      └─ Threads: curl → DB 저장
    │
    ├─ Phase 2: 에이전트 직접 분석
    │      ├─ 각 플랫폼별 슬래시커맨드 병렬 실행
    │      ├─ look_at 도구로 스크린샷 Vision 분석
    │      └─ DB 업데이트
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

**5개 curl 명령을 병렬로 실행합니다.**

```bash
# GitHub
curl -s -X POST http://localhost:3000/api/crawler/run \
  -H 'Content-Type: application/json' \
  -d '{"platform": "github", "options": {"since": "daily", "limit": 25}}'

# YouTube
curl -s -X POST http://localhost:3000/api/crawler/run \
  -H 'Content-Type: application/json' \
  -d '{"platform": "youtube"}'

# Reddit
curl -s -X POST http://localhost:3000/api/crawler/run \
  -H 'Content-Type: application/json' \
  -d '{"platform": "reddit", "options": {"limit": 20}}'

# X
curl -s -X POST http://localhost:3000/api/crawler/run \
  -H 'Content-Type: application/json' \
  -d '{"platform": "x", "options": {"limit": 20}}'

# Threads
curl -s -X POST http://localhost:3000/api/crawler/run \
  -H 'Content-Type: application/json' \
  -d '{"platform": "threads", "options": {"limit": 20}}'
```

### 크롤링 결과 확인

```bash
cd /Users/ownuun/conductor/workspaces/v2-v1/kiev && node -e "
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const platforms = ['github', 'youtube', 'reddit', 'x', 'threads'];
  for (const p of platforms) {
    const { count } = await supabase
      .from('crawled_content')
      .select('*', { count: 'exact', head: true })
      .eq('platform', p)
      .in('status', ['pending', 'pending_analysis']);
    console.log(p + ': ' + (count || 0) + '개 대기');
  }
}
check();
"
```

### GitHub Token 필요 여부 확인 (Star History)

GitHub 크롤링 후 Star History 스크린샷에 토큰이 필요한 경우 확인:

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

**토큰 필요 시 사용자에게 요청:**

Star History 캡처에 GitHub 토큰이 필요합니다. 토큰을 제공해주시면 `.env.local`에 저장하고 다시 크롤링하겠습니다.

토큰 생성 방법:

1. https://github.com/settings/tokens 접속
2. "Generate new token (classic)" 클릭
3. 권한: `public_repo` 선택
4. 토큰 복사 후 제공

---

## Phase 2: 에이전트 직접 분석

**각 플랫폼별 슬래시커맨드를 병렬로 Task 도구로 실행합니다.**

```
[4개 Task 도구 병렬 호출]

Task 1 - X 분석:
  prompt: "/ownuun_x 실행하여 pending_analysis 상태의 X 콘텐츠를 모두 분석하고 DB 업데이트. 완료 후 분석 개수와 평균 점수 반환."

Task 2 - Threads 분석:
  prompt: "/ownuun_threads 실행하여 pending_analysis 상태의 Threads 콘텐츠를 모두 분석하고 DB 업데이트. 완료 후 분석 개수와 평균 점수 반환."

Task 3 - Reddit 분석:
  prompt: "/ownuun_reddit 실행하여 pending_analysis 상태의 Reddit 콘텐츠를 모두 분석하고 DB 업데이트. 완료 후 분석 개수와 평균 점수 반환."

Task 4 - YouTube 분석 (⚠️ 상세 분석 필수):
  prompt: |
    /ownuun_youtube 실행. 반드시 아래 요구사항을 준수:

    1. **자막 추출**: youtube-transcript.js의 getTranscript() + formatTranscriptWithTimestamps() 사용하여 타임스탬프 포함된 자막 추출
    2. **timeline 필수 요구사항**:
       - 최소 1500자 이상 작성
       - 실제 타임스탬프 사용 (**0:00**, **1:30**, **7:20** 형식)
       - 영상 내용의 90% 포함
       - 계층 구조: 1. > 1.1. > 1.2. > 2.
    3. **JSON 형식**: keyQA, intro, timeline, recommendScore, recommendReason, targetAudience 모두 포함
    4. **품질 검증**: timeline.length < 1500이면 재분석

    완료 후 분석 개수, 평균 점수, 평균 timeline 길이 반환.
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
1. Phase 1 - 크롤링 (5개 curl 병렬)
2. Phase 2 - 분석 (4개 슬래시커맨드 Task 병렬)
   - 에이전트가 look_at으로 스크린샷 직접 분석
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

## 실행

```
/ownuun_main
```
