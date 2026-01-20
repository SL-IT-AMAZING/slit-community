# Ownuun Main Pipeline

6개 SNS 콘텐츠를 크롤링 → 분석 → 게시하는 메인 파이프라인입니다.

## 아키텍처

```
/ownuun_main (오케스트레이터)
    │
    ├─ Phase 1: 병렬 크롤링 (Bash 직접 실행)
    │      ├─ GitHub: curl API 호출
    │      ├─ YouTube: curl API 호출
    │      ├─ Reddit: curl API 호출
    │      ├─ X: curl API 호출
    │      └─ Threads: curl API 호출
    │
    ├─ Phase 2: 병렬 분석 (스크립트 실행)
    │      ├─ YouTube: node scripts/batch_analyze_youtube.js
    │      ├─ X: node scripts/analyze-x-content.mjs
    │      ├─ Threads: node scripts/analyze-threads.mjs
    │      └─ Reddit: (Vision 분석 또는 스킵)
    │
    ├─ Phase 3: 게시 (메인 에이전트)
    │      ├─ 7점 이상: 자동 게시
    │      ├─ 7점 미만: 목록 나열 → 사용자 선택
    │      └─ GitHub: 전부 게시
    │
    └─ Phase 4: 스토리지 정리 (자동)
           └─ 비디오 스토리지 90% 초과 시 조회수 하위 30% 삭제
```

---

## Phase 1: 병렬 크롤링 (5개 동시 실행)

### 실행 방법

**Bash 도구로 5개 크롤러를 병렬 실행합니다.**

```bash
# 5개 API 호출을 동시에 실행 (각각 별도 Bash 호출)

# GitHub 크롤링
curl -X POST http://localhost:3000/api/crawler/run \
  -H 'Content-Type: application/json' \
  -d '{"platform": "github", "options": {"since": "daily", "limit": 25}}' \
  2>/dev/null

# YouTube 크롤링
curl -X POST http://localhost:3000/api/crawler/run \
  -H 'Content-Type: application/json' \
  -d '{"platform": "youtube"}' \
  2>/dev/null

# Reddit 크롤링
curl -X POST http://localhost:3000/api/crawler/run \
  -H 'Content-Type: application/json' \
  -d '{"platform": "reddit", "options": {"limit": 20}}' \
  2>/dev/null

# X 크롤링
curl -X POST http://localhost:3000/api/crawler/run \
  -H 'Content-Type: application/json' \
  -d '{"platform": "x", "options": {"limit": 20}}' \
  2>/dev/null

# Threads 크롤링
curl -X POST http://localhost:3000/api/crawler/run \
  -H 'Content-Type: application/json' \
  -d '{"platform": "threads", "options": {"limit": 20}}' \
  2>/dev/null
```

### 크롤링 결과 확인

```bash
cd /Users/ownuun/conductor/workspaces/v2-v1/kiev && node -e "
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkCrawled() {
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
checkCrawled();
"
```

---

## Phase 2: 병렬 분석 (스크립트 실행)

**중요: 분석 스크립트를 직접 실행합니다. API 레이트 리밋에 주의하세요.**

### 분석 스크립트 실행 (3개 병렬)

```bash
# X 분석 (Gemini API - 5초 간격)
cd /Users/ownuun/conductor/workspaces/v2-v1/kiev && node scripts/analyze-x-content.mjs

# Threads 분석 (Gemini API - 5초 간격)
cd /Users/ownuun/conductor/workspaces/v2-v1/kiev && node scripts/analyze-threads.mjs

# YouTube 분석 (Anthropic API)
cd /Users/ownuun/conductor/workspaces/v2-v1/kiev && node scripts/batch_analyze_youtube.js
```

### API 레이트 리밋 주의사항

| API         | 제한        | 현재 딜레이 | 권장                       |
| ----------- | ----------- | ----------- | -------------------------- |
| Gemini Free | 15 RPM      | 5초         | X와 Threads 순차 실행 권장 |
| Anthropic   | Tier별 상이 | 없음        | 병렬 OK                    |

### 분석 실패 시 재시도

```bash
# 429 에러 발생 시 1분 대기 후 재시도
sleep 60 && node scripts/analyze-x-content.mjs
```

### 분석 결과 확인

```bash
cd /Users/ownuun/conductor/workspaces/v2-v1/kiev && node -e "
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkAnalyzed() {
  const { data } = await supabase
    .from('crawled_content')
    .select('platform, status, digest_result')
    .in('status', ['pending', 'completed']);

  const byPlatform = {};
  data?.forEach(item => {
    const p = item.platform;
    if (!byPlatform[p]) byPlatform[p] = { total: 0, withScore: 0, totalScore: 0 };
    byPlatform[p].total++;
    if (item.digest_result?.recommendScore) {
      byPlatform[p].withScore++;
      byPlatform[p].totalScore += item.digest_result.recommendScore;
    }
  });

  console.log('=== 분석 결과 ===');
  Object.entries(byPlatform).forEach(([p, stats]) => {
    const avg = stats.withScore > 0 ? (stats.totalScore / stats.withScore).toFixed(1) : 'N/A';
    console.log(p + ': ' + stats.total + '개 (분석완료: ' + stats.withScore + '개, 평균: ' + avg + '점)');
  });
}
checkAnalyzed();
"
```

---

## Phase 3: 게시

### 게시 조건

- **추천점수 7점 이상**: 자동 게시
- **추천점수 7점 미만**: 목록 나열 → 사용자 선택
- **GitHub**: 전부 게시 (추천점수 없음)

### Step 1: 게시 대상 조회

```bash
cd /Users/ownuun/conductor/workspaces/v2-v1/kiev && node -e "
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function getPublishTargets() {
  // 분석 완료된 콘텐츠
  const { data: scored } = await supabase
    .from('crawled_content')
    .select('id, platform, platform_id, title, url, digest_result, status')
    .in('status', ['pending', 'completed'])
    .in('platform', ['youtube', 'x', 'threads', 'reddit']);

  const highScore = scored?.filter(i => i.digest_result?.recommendScore >= 7) || [];
  const lowScore = scored?.filter(i => i.digest_result?.recommendScore && i.digest_result?.recommendScore < 7) || [];

  // GitHub
  const { data: github } = await supabase
    .from('crawled_content')
    .select('id, platform, platform_id, title, url, status')
    .eq('platform', 'github')
    .in('status', ['pending', 'pending_analysis', 'completed']);

  console.log('=== 자동 게시 대상 (7점 이상) ===');
  highScore.forEach((item, i) => {
    const score = item.digest_result?.recommendScore;
    const summary = item.digest_result?.summary_oneline || item.title || '';
    console.log((i+1) + '. [' + item.platform.toUpperCase() + ' ' + score + '점] ' + summary.substring(0, 60));
  });
  console.log('총: ' + highScore.length + '개\\n');

  console.log('=== GitHub (전부 게시) ===');
  github?.forEach((item, i) => {
    console.log((i+1) + '. ' + (item.title || item.platform_id));
  });
  console.log('총: ' + (github?.length || 0) + '개\\n');

  console.log('=== 7점 미만 (추가 선택 가능) ===');
  lowScore.forEach((item, i) => {
    const score = item.digest_result?.recommendScore;
    const summary = item.digest_result?.summary_oneline || item.title || '';
    console.log((i+1) + '. [' + item.platform.toUpperCase() + ' ' + score + '점] ' + summary.substring(0, 60));
    console.log('   ' + item.url);
  });
  console.log('총: ' + lowScore.length + '개\\n');

  // ID 출력
  console.log('--- DATA ---');
  console.log('HIGH_SCORE_IDS=' + JSON.stringify(highScore.map(i => i.id)));
  console.log('LOW_SCORE_IDS=' + JSON.stringify(lowScore.map(i => i.id)));
  console.log('GITHUB_IDS=' + JSON.stringify((github || []).map(i => i.id)));
}
getPublishTargets();
"
```

### Step 2: 사용자 선택 (7점 미만)

사용자에게 7점 미만 목록을 보여주고 추가 게시할 번호 선택:

- 예: "1,3,5" 또는 "스킵"

### Step 3: 게시 실행

```bash
# 선택된 ID들을 /tmp/publish_ids.json에 저장 후 실행
cd /Users/ownuun/conductor/workspaces/v2-v1/kiev && node scripts/publish-batch.js
```

또는 API 직접 호출:

```bash
curl -X POST http://localhost:3000/api/crawler/publish \
  -H 'Content-Type: application/json' \
  -d '{"ids": ["id1", "id2", "id3"]}'
```

---

## Phase 4: 스토리지 정리

```bash
cd /Users/ownuun/conductor/workspaces/v2-v1/kiev && node scripts/cleanup-videos.mjs
```

### 옵션

| 옵션        | 설명                      |
| ----------- | ------------------------- |
| `--dry-run` | 실제 삭제 없이 시뮬레이션 |
| `--force`   | 90% 미만이어도 강제 정리  |

---

## 전체 실행 흐름

```
1. Phase 1 - 크롤링 (5개 curl 병렬)
   ↓
2. 크롤링 결과 확인
   ↓
3. Phase 2 - 분석 (스크립트 실행)
   - X/Threads: Gemini API (순차 권장)
   - YouTube: Anthropic API (병렬 OK)
   ↓
4. 분석 결과 확인
   ↓
5. Phase 3 - 게시
   - 7점 이상 + GitHub: 자동
   - 7점 미만: 사용자 선택
   ↓
6. Phase 4 - 스토리지 정리
```

---

## 환경변수 필수 확인

`.env.local` 파일에 다음 키가 있어야 합니다:

```
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
GEMINI_API_KEY=           # X, Threads 분석용
ANTHROPIC_API_KEY=        # YouTube 분석용
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

## 트러블슈팅

### Gemini API 429 에러

```
[429 Too Many Requests] You exceeded your current quota
```

→ 1분 대기 후 재시도, 또는 X/Threads 순차 실행

### 스크린샷 파일 없음

```
Image not found: /path/to/screenshot.png
```

→ `public/screenshots/` 디렉토리 확인, 크롤링 재실행

### ANTHROPIC_API_KEY 없음

```
⚠️ No ANTHROPIC_API_KEY found. Using mock analysis.
```

→ `.env.local`에 키 추가 또는 Mock 분석 결과 사용

---

## 실행 예시

```
/ownuun_main
```
