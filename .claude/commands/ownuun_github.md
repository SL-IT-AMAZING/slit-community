# Ownuun GitHub - GitHub 오픈소스 분석

GitHub 트렌딩 크롤링 데이터를 분석하고 소개글을 생성합니다.

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

## 환경변수

```
NEXT_PUBLIC_SUPABASE_URL=https://ylhlsuuvlrxypxkqslvg.supabase.co
SUPABASE_SERVICE_ROLE_KEY=(환경변수에서 로드)
```

## 워크플로우

### 1단계: pending_analysis 상태의 GitHub 콘텐츠 조회

**DB에서 조회** (Supabase):
```javascript
const { data } = await supabase
  .from('crawled_content')
  .select('*')
  .eq('platform', 'github')
  .eq('status', 'pending_analysis')
  .order('crawled_at', { ascending: false });
```

조회된 각 레코드:
- `title`: owner/repo 형식
- `description`: 영어 한 줄 설명
- `screenshot_url`: README 스크린샷 경로
- `raw_data.star_history_screenshot`: 스타 히스토리 차트
- `ranking`: 트렌딩 순위 정보

### 2단계: README 스크린샷 분석

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
  "categories": ["ai-tools", "open-source"]
}
```

### 3단계: 소개글 생성 (한국어/영어 둘 다)

**템플릿 구조:**

```
1. 🔥 후킹 헤드라인 (경쟁자 언급 or 충격적 사실)
2. 핵심 가치 한 줄 (<<<강조>>>)
3. 왜 대박인지 클로드코드의 의견
4. ✅ 주요 기능 bullet (5-6개)
5. 실무 활용 예시
6. 🔗 GitHub 링크 + "무료" 어필
```

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

**영어 버전 (content_en):**

```
A challenger to #{competitor} just hit #1 on GitHub Trending 🔥

Meet {project_name}, an open-source "{one_liner}" that lets you
<{killer_feature}> and {additional_features}.

Unlike {competitor} which only offers {traditional_approach},
<<<{innovative_feature}>>> is what makes this a game-changer.
I've used {competitor} before, but {pain_point} was always an issue.
This project completely eliminates that barrier.

✅ Key Features
• {feature1}
• {feature2}
• {feature3}
• {feature4}
• {feature5}

Deploy with a single {install_method} command - perfect for practitioners.
Ready to use for {usecase1}, {usecase2}, {usecase3}.

🔗 GitHub: {link}
100% free and open source!
```

### 4단계: DB 저장 필드 매핑

- `content_text` = 영어 버전 (content_en)
- `translated_content` = 한국어 버전 (content_ko)

### 5단계: DB 업데이트

분석 완료 후 각 레코드를 **DB에 업데이트**:

```javascript
await supabase
  .from('crawled_content')
  .update({
    title: `${analysis.project_name} - ${analysis.tagline}`,
    content_text: analysis.content_en,        // 영어 소개글
    translated_content: analysis.content_ko,  // 한국어 소개글
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
    status: "pending"  // pending_analysis → pending 상태 전환
  })
  .eq('id', record.id);
```

**중요**: 각 레포 분석 완료 후 즉시 DB 업데이트 (배치 아님)

### 6단계: 완료 후 안내

```
=== GitHub 분석 완료 ===
DB 업데이트: N건

1. Sim Studio - 노코드 AI 에이전트 워크플로우 빌더
   경쟁자: n8n | 킬러피처: 자연어 노드 생성
   ⭐ 12.3K | 트렌딩: daily #1

2. RAGFlow - 올인원 RAG 프레임워크
   경쟁자: LangChain | 킬러피처: ReACT 자동 조합
   ⭐ 8.5K | 트렌딩: weekly #3

분석 완료! 관리자 페이지(admin/content)에서 발행하세요.
```

## 파일 경로

- README 스크린샷: `public/screenshots/github/{timestamp}/{owner-repo}_readme.png`
- 스타 히스토리: `public/screenshots/github/{timestamp}/{owner-repo}_stars.png`
