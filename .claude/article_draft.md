“이건 GPT, 클로드가 더 잘할 것 같은데…”
“디자인은 Gemini한테 시키고 싶다…”
AI 쓰면서 이런 생각 해본 적 있으신가요?
요즘 쓰레드에서 OpenCode가 핫하게 떠오르고 있습니다. 잘 쓰는 사람과 못 쓰는 사람의 격차가 점점 벌어지고 있는 AI 코딩 도구 시장에서, 어제 직접 16시간 동안 opencode를 써보며 느낀 점을 공유합니다. OpenCode는 GitHub 스타 32.8k를 기록한 오픈소스 프로젝트로, SST 팀에서 개발한 터미널 기반 AI 코딩 에이전트입니다.
공식 페이지: https://opencode.ai
GitHub: https://github.com/anomalyco/opencode

OpenCode가 무엇인지?
한마디로 Claude Code의 오픈소스 대안입니다. 핵심 차이점은 ‘모델 자유’입니다. Claude Code가 Anthropic에 종속되어 있다면, OpenCode는 OpenAI, Google, Anthropic, 심지어 로컬 모델까지 자유롭게 연결할 수 있습니다. 내가 구독 중인 Claude, Gemini, GPT를 한 곳에서 API 키로 연결해서 쓸 수 있다는 뜻입니다.
OpenCode Zen이라는 자체 모델 게이트웨이도 제공하는데, 무료로 쓸 수 있는 모델들이 있습니다. Big Pickle은 무료 기간 동안 제공되는 스텔스 모델로, 200,000 토큰 컨텍스트 윈도우를 지원 합니다. GLM 4.7과 Grok Code Fast 1도 무료 기간 동안 사용 가능 합니다. Big Pickle이 GLM 4.6 기반이라는 추측이 커뮤니티에서 돌고 있을 정도로 성능이 나쁘지 않습니다.

<실사용 후기>
IDE 익스텐션에서 터미널을 여러 개 띄워 병렬 작업을 해봤습니다. 결론부터 말하면

1. 무료 모델 병렬 사용 - 1개 이상의 터미널에서 동일한 무료모델 병렬 사용 시 버벅거림이 심해서 하나의 모델은 하나의 작업만 하는 것이 좋았습니다. 

2. 유료 구독 모델 병렬 사용 - 제가 구독한 Claude, GPT를 연결했을 때는 병렬 작업이 쾌적하게 진행되었습니다. 

3. 내가 원하는 모델로 바로 전환 - “이 작업은 GPT가 더 잘하네” 싶으면 바로 바꿔서 진행 가능합니다. 사람마다 체감하는 LLM 강점이 다른데, 그걸 쉽게 반영할 수 있습니다. 

Oh-My-OpenCode란?
Oh-My-OpenCode는 한국인 개발자가 만든 OpenCode 플러그인인데, 최근 해외에서도 인기가 점점 높아지고 있습니다. 다양한 LLM을 적재적소에 활용하는 오케스트레이팅이 가능한 플러그인 입니다.
GitHub: https://github.com/code-yeongyu/oh-my-opencode
이 플러그인에는 두 가지 모드가 있습니다
1. 시시푸스 모드(Sisyphus Mode) - Claude Code의 일반 모드와 비슷. 실제 코드 수정이 발생하는 실행 모드
 
2. 플래너 시시푸스 모드 - Claude Code의 Plan 모드와 유사합니다. 코드 수정 없이 계획만 짜고, 마지막에는 복붙하면 되는 완성된 프롬프트를 작성해줍니다. 완성된 프롬프트를 시시푸스 모드에 복붙하면 됩니다. 

<에이전트 자동 배치>
시시푸스 모드에서는 10개 이상의 에이전트들이 준비되어 있고, 사용자의 요청사항의 키워드나 맥락을 통해 자동으로 배치 됩니다
1. OmO - Claude Opus 4.5 기반 메인 오케스트레이터
2. Oracle - GPT 5.2 기반, 아키텍처 설계와 디버깅 담당
3. Librarian - Claude Sonnet 4.5 기반, 공식 문서와 오픈소스 구현체 탐색
4. Frontend UI/UX Engineer - Gemini 3 Pro 기반, 프론트엔드 개발 특화
5. Explore - Grok Code 기반, 초고속 코드베이스 탐색

각 에이전트는 해당 작업에 가장 특화된 LLM을 우선순위로 정해두고, 사용자가 연결해둔 모델 중 우선순위에 맞게 자동 선택됩니다. 어제 테스트 해볼때는 제가 부탁한 작업이 단순해서인지 여러 에이전트가 한 번에 돌아가는 모습은 못 봤지만, 대규모 리팩토링이나 고난이도 작업에서는 ‘ultrawork’ 모드로 병렬 에이전트를 돌릴 수 있다고 합니다.

Claude Code 대비 opencode의 장점
1. 어떤 작업을 시켜도 TODO를 먼저 작성하고 진행 
2. 다양한 LLM 모델을 적재적소에 활용하는 자동 라우팅 
3. 백그라운드 에이전트 실행 - Gemini가 프론트엔드 작업하는 동안 Claude가 백엔드 처리 
4. LSP, AST-Grep 같은 IDE급 도구를 에이전트도 사용 가능 
5. Claude Code 호환 레이어 - 기존 Claude Code 설정 그대로 사용 가능 

멀티 에이전트 오케스트레이션에 대해 조금 더 궁금하다면, 제가 저번에 찾아봤던 관련 연구들이 있는데, 이 분야에 관심 있으신 분들께 공유드립니다.
∙ Multi-Agent Collaboration via Evolving Orchestration - 중앙 오케스트레이터가 여러 에이전트를 동적으로 지휘하는 연구 (https://arxiv.org/abs/2511.21689)
∙ LLM-Agents-Papers - LLM 기반 에이전트 관련 논문 모음, GitHub 스타 9k+ (https://github.com/AGI-Edgerunners/LLM-Agents-Papers)
자신의 상황에 맞게 참고해보시면 좋을 것 같습니다.

핵심은 명확합니다
AI 코딩 도구의 미래는 ‘단일 모델’이 아니라 ‘오케스트레이션’입니다. 각 모델의 강점을 살려 적재적소에 배치하는 것과 각각의 LLM마다 특화된 작업 (GPT의 논리력, Claude의 코드 이해력, Gemini의 창의적 UI 감각)을 조합해 쓰는 겁니다.

OpenCode + Oh-My-OpenCode 조합은 지금 무료로 시작할 수 있습니다. 이미 Claude, GPT, Gemini 구독 중이라면 그 구독을 그대로 연결해서 병렬로 돌릴 수 있습니다.