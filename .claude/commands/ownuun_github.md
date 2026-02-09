# Ownuun GitHub - GitHub 전체 파이프라인

GitHub 트렌딩 레포지토리를 **크롤링 → 분석 → 게시**하는 전체 파이프라인입니다.

---

## 아키텍처

```
/ownuun_github (독립 파이프라인)
    │
    ├─ Phase 1: 크롤링
    │      └─ node scripts/crawl-github.mjs → DB 저장 (pending_analysis)
    │
    ├─ Phase 2: 에이전트 직접 분석
    │      └─ README 스크린샷 분석 → 소개글 생성 → DB 업데이트 (pending)
    │
    └─ Phase 3: 게시
           └─ GitHub은 전부 게시
```

---

## Phase 1: 크롤링

### Step 1.0: GitHub 크롤링 옵션 확인 (필수)

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

예시 응답: "daily, 25개" 또는 "all, 언어별 포함"
```

### Step 1.1: 크롤러 실행

```bash
# 기본 (daily만)
cd /Users/ownuun/conductor/workspaces/v2-v1/kiev && node scripts/crawl-github.mjs

# daily만 25개
cd /Users/ownuun/conductor/workspaces/v2-v1/kiev && node scripts/crawl-github.mjs --since=daily --limit=25

# 전체 기간 (daily + weekly + monthly)
cd /Users/ownuun/conductor/workspaces/v2-v1/kiev && node scripts/crawl-github.mjs --all

# 전체 기간 + 언어별 포함
cd /Users/ownuun/conductor/workspaces/v2-v1/kiev && node scripts/crawl-github.mjs --all --includeLanguages
```

### Step 1.2: 크롤링 결과 확인

```bash
cd /Users/ownuun/conductor/workspaces/v2-v1/kiev && node -e "
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const MINIMUM = 10;

async function check() {
  const { count } = await supabase
    .from('crawled_content')
    .select('*', { count: 'exact', head: true })
    .eq('platform', 'github')
    .in('status', ['pending', 'pending_analysis']);

  const status = (count || 0) >= MINIMUM ? '✅' : '❌ (부족)';
  console.log(status + ' GitHub pending: ' + (count || 0) + '개');
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

---

## Phase 2: 분석

### Step 2.1: pending_analysis 상태의 GitHub 콘텐츠 조회

```bash
cd /Users/ownuun/conductor/workspaces/v2-v1/kiev && node -e "
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function getPending() {
  const { data } = await supabase
    .from('crawled_content')
    .select('id, title, description, screenshot_url, raw_data, ranking')
    .eq('platform', 'github')
    .eq('status', 'pending_analysis')
    .order('crawled_at', { ascending: false });

  console.log('=== Pending GitHub Repos ===');
  console.log('Total:', data?.length || 0);
  data?.forEach((item, i) => {
    console.log('\\n' + (i+1) + '. ' + item.title);
    console.log('   ID: ' + item.id);
    console.log('   Description: ' + (item.description?.substring(0, 80) || 'N/A'));
    console.log('   README screenshot: ' + item.screenshot_url);
    console.log('   Stars: ' + item.raw_data?.stars);
    console.log('   Ranking: ' + JSON.stringify(item.ranking));
  });
}
getPending();
"
```

### Step 2.2: README 스크린샷 분석

각 레포의 README 스크린샷 이미지를 읽어서 분석:

**추출할 정보:**

- 프로젝트 핵심 기능
- 주요 특징 (5-6개)
- 설치 방법
- 기술 스택
- 경쟁 제품/대안

**분석 시 JSON 형식:**

```json
{
  "project_name": "Sim Studio",
  "tagline": "노코드 AI 에이전트 워크플로우 빌더",
  "competitor": "n8n",
  "killer_feature": "자연어로 노드 생성",
  "features": [
    "Copilot으로 자연어 노드 생성",
    "OpenAI/Anthropic/Gemini + Ollama 로컬 LLM 지원",
    "드래그&드롭 워크플로우 설계",
    "Docker Compose 원클릭 배포",
    "REST API + Web UI 제공"
  ],
  "install_method": "Docker Compose",
  "use_cases": ["AI 자동화", "에이전트 워크플로우", "노코드 개발"],
  "license": "MIT",
  "categories": ["ai-tools", "open-source"],
  "target_audience": "AI 자동화가 필요한 개발자",
  "beginner_description": "n8n처럼 노드를 연결해서 자동화 워크플로우를 만드는 도구인데, AI가 자연어로 노드를 자동 생성해줘서 코딩 없이도 복잡한 AI 에이전트를 만들 수 있어요."
}
```

### Step 2.3: 소개글 생성 (한국어/영어 둘 다)

**한국어 버전 (content_ko):**

```
#{경쟁자}를 위협할 #GitHub_트렌딩_1위 오픈소스가 등장했습니다🔥

{핵심기능}을 통해 <{킬러피처}>하고 {추가기능}까지 가능한
"{한줄설명}" 오픈소스, {프로젝트명}입니다.

{경쟁자}처럼 {기존방식}뿐만 아니라, <<<{혁신기능}>>>이
개인적으로 대박이라 느껴져요. {경쟁자} 써봤지만 {기존문제}가 있었는데,
이 오픈소스는 그 장벽을 완전 없애버렸네요.

✅ 주요 기능
• {기능1}
• {기능2}
• {기능3}
• {기능4}
• {기능5}

{설치방법} 한 줄로 배포 가능하다는 점이 실무자에게 딱이네요.
{유스케이스1}, {유스케이스2}, {유스케이스3}에 바로 적용 가능합니다.

🔗 GitHub: {링크}
오픈소스인 만큼 당연히 100% 무료입니다!
```

### Step 2.4: DB 업데이트

분석 완료 후 각 레코드를 **DB에 업데이트**:

```bash
cd /Users/ownuun/conductor/workspaces/v2-v1/kiev && node -e "
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// 분석 결과
const analysis = {
  content_en: '...', // 영어 소개글
  content_ko: '...', // 한국어 소개글
  tagline: '...',
  competitor: '...',
  killer_feature: '...',
  features: ['...'],
  use_cases: ['...'],
  license: 'MIT',
  categories: ['ai-tools', 'open-source'],
  target_audience: '...',
  beginner_description: '...'
};
const recordId = 'UUID-HERE';

async function update() {
  const { data: record } = await supabase
    .from('crawled_content')
    .select('raw_data, screenshot_url, ranking')
    .eq('id', recordId)
    .single();

  const { error } = await supabase
    .from('crawled_content')
    .update({
      content_text: analysis.content_en,
      translated_content: analysis.content_ko,
      thumbnail_url: record.screenshot_url,
      digest_result: {
        tagline: analysis.tagline,
        competitor: analysis.competitor,
        killer_feature: analysis.killer_feature,
        features: analysis.features,
        use_cases: analysis.use_cases,
        license: analysis.license,
        categories: analysis.categories,
        ranking: record.ranking,
        processedAt: new Date().toISOString()
      },
      raw_data: {
        ...record.raw_data,
        llm_summary: {
          summary: analysis.tagline,
          features: analysis.features.slice(0, 3),
          targetAudience: analysis.target_audience,
          beginner_description: analysis.beginner_description
        }
      },
      status: 'pending'
    })
    .eq('id', recordId);

  console.log(error ? 'Error: ' + error.message : 'Updated: ' + recordId);
}
update();
"
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
    .select('id, title, raw_data, ranking')
    .eq('platform', 'github')
    .in('status', ['pending', 'pending_analysis', 'completed']);

  console.log('=== GitHub 게시 대상 (전부 게시) ===');
  data?.forEach((i, n) => {
    const stars = i.raw_data?.stars || 0;
    const ranking = JSON.stringify(i.ranking || {});
    console.log((n+1) + '. ' + i.title + ' ⭐' + stars.toLocaleString() + ' ' + ranking);
  });
  console.log('\\n총: ' + (data?.length || 0) + '개');

  console.log('\\n--- DATA ---');
  console.log('IDS=' + JSON.stringify((data || []).map(i => i.id)));
}
getTargets();
"
```

### Step 3.2: 게시 조건

- **GitHub**: 전부 게시 (점수 기준 없음)

### Step 3.3: 게시 실행

```bash
# ID 목록 저장
echo '["uuid1", "uuid2", "uuid3"]' > /tmp/publish_ids.json

# 게시 실행
cd /Users/ownuun/conductor/workspaces/v2-v1/kiev && node scripts/publish-batch.js
```

**게시 주의사항:**

- **category**: 반드시 `open-source` 사용 (DB 제약조건: `content_category_check`)
- **스크린샷 저장 위치**:
  - `crawled_content.screenshot_url` → `content.social_metadata.readme_screenshot`
  - `crawled_content.raw_data.star_history_screenshot` → `content.social_metadata.star_history_screenshot`
  - `scripts/publish-batch.js`가 자동 처리

---

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

---

## 파일 경로

- README 스크린샷: `public/screenshots/github/{timestamp}/{owner-repo}_readme.png`
- 스타 히스토리: `public/screenshots/github/{timestamp}/{owner-repo}_stars.png`
- 크롤러: `scripts/crawl-github.mjs`
- 게시: `scripts/publish-batch.js`
