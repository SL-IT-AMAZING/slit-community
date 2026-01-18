import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// 분석 데이터 (스크린샷에서 수동 추출)
const analysisData = [
  {
    platform_id: 'DTpC_67DS8H',
    author_handle: '@yoonkwon_ai',
    content_ko: '나 퇴사했다.\n\n인수인계랑 노트북 반납까지 다 끝났어.\n그리고 한 달 뒤, 1억 투자받았다.\n\n이제 진짜 새로운 시작이야.\n솔직히 두렵고 떨린다.\n\n근데 이 떨림이 싫지 않아.',
    content_en: 'I resigned.\n\nFinished handover and laptop return.\nAnd a month later, I received 100 million won investment.\n\nThis is truly a new beginning.\nHonestly, I\'m scared and nervous.\n\nBut I don\'t hate this nervousness.',
    summary_oneline: '퇴사 후 1억 투자받은 새로운 시작 이야기',
    categories: ['창업', '투자', '커리어'],
    metrics: { likes: 72, replies: 11, reposts: 3, views: 1400 },
    recommendScore: 7,
    recommendReason: '창업/투자 성공 사례로 동기부여가 되는 콘텐츠'
  },
  {
    platform_id: 'DTpEqcSgo3J',
    author_handle: '@choi.openai',
    content_ko: '진짜 사진이랑 구별이 안 간다.\n\nNative 4K와 압도적인 디테일의 ImagineArt 1.5 Pro가 공개되었습니다.\n\n개발사가 불편할 정도로 리얼하다고 표현할 만큼 실사에 목숨을 걸었습니다.\nUltimate이나 Creator 플랜 쓰시는 분들은 추가 비용 없이 바로 쓸 수 있고, 비주얼 작업이나 프레젠테이션 고퀄 소스가 필요했던 분들에게는 최고의 선택지가 될 것 같습니다.',
    content_en: 'Can\'t tell the difference from real photos.\n\nImagineArt 1.5 Pro with Native 4K and overwhelming detail has been released.\n\nThe developers went all-in on realism to the point of calling it uncomfortably realistic.\nUltimate and Creator plan users can use it without extra cost, perfect for visual work and high-quality presentation assets.',
    summary_oneline: 'ImagineArt 1.5 Pro 출시 - 네이티브 4K 이미지 생성',
    categories: ['AI', '이미지생성', '도구'],
    metrics: { likes: 0, replies: 0, reposts: 1, views: 455 },
    recommendScore: 8,
    recommendReason: '최신 AI 이미지 생성 도구 정보로 실용적'
  },
  {
    platform_id: 'DTkbJ9KiaNx',
    author_handle: '@goos.kim',
    content_ko: '2월 에이전틱 코딩 강의는 "MoAI-ADK로 앱인토스 @toss.appsintoss 앱 만들어 수익화 하기" 일단 우리 모두의사주 앱 부터 출시.',
    content_en: 'February agentic coding lecture is "Making money with MoAI-ADK by creating AppinToss apps" - First, let\'s launch our fortune-telling app.',
    summary_oneline: 'MoAI-ADK 활용 앱 개발 및 수익화 강의 안내',
    categories: ['AI', '개발', '강의'],
    metrics: { likes: 4, replies: 0, reposts: 1, views: 666 },
    recommendScore: 7,
    recommendReason: 'AI 에이전트 개발 실습 강의 정보'
  },
  {
    platform_id: 'DToytookr_b',
    author_handle: '@stayfit_irene',
    content_ko: '돈도, 시간도 부족한 1인 개발자를 위한 극강의 효율 스택.\n\n#스타트업 #1인개발 #개발자 #바이브코딩',
    content_en: 'Ultimate efficiency stack for solo developers with limited money and time.\n\n#startup #solodeveloper #developer #vibecoding',
    summary_oneline: '1인 개발자를 위한 효율적인 기술 스택 소개',
    categories: ['개발', '스타트업', '생산성'],
    metrics: { likes: 48, replies: 8, reposts: 11, views: 1300 },
    recommendScore: 8,
    recommendReason: '1인 개발자에게 실용적인 기술 스택 정보'
  },
  {
    platform_id: 'DTpFLxikXhj',
    author_handle: '@galih.pratama',
    content_ko: 'SaaS 만들 때 보통 어떤 어려움을 겪나요? vibe coding인가요 아니면 non vibe coding인가요?',
    content_en: 'What difficulties do you usually face when building SaaS? Is it vibe coding or non vibe coding?',
    summary_oneline: 'SaaS 개발 시 vibe coding 관련 질문',
    categories: ['개발', 'SaaS'],
    metrics: { likes: 0, replies: 0, reposts: 0, views: 32 },
    recommendScore: 4,
    recommendReason: '단순 질문형 포스트로 정보 가치 낮음'
  },
  {
    platform_id: 'DTpFJFLCRgr',
    author_handle: '@yelin_saju',
    content_ko: '1. 법정 결과의 현실적 시나리오\n시나리오 A (가장 가능성 높음)\n합의(Settlement)\nMS-OpenAI → 거액 배상 + 구조 일부 수정\n머스크 → 소송 철회 + xAI 독자 노선 강화\n왜냐하면\n배심원 재판까지 가면\nOpenAI의 내부 구조, 계약, 정부 연계가 전부 공개된다.\nMS는 그걸 감당 못 한다.\n\n시나리오 B\n머스크 부분 승소\n"비영리 취지 위반" 인정\nOpenAI 영리 구조 제한\nMS 독점 권한 축소\n이 경우\nAI는 정부·빅테크 단일 통제 모델 → 다극 체제로 간다.\n\n*이건 어디까지나 시나리오다 애들아!',
    content_en: '1. Realistic scenarios for legal outcomes\nScenario A (Most likely)\nSettlement\nMS-OpenAI → Large compensation + partial restructuring\nMusk → Drop lawsuit + Strengthen xAI independence\nBecause if it goes to jury trial, OpenAI\'s internal structure, contracts, and government ties will all be exposed. MS can\'t handle that.\n\nScenario B\nMusk partial victory\n"Non-profit purpose violation" recognized\nOpenAI commercial structure limited\nMS monopoly reduced\nIn this case, AI goes from single government-bigtech control → multipolar system.\n\n*This is just a scenario, folks!',
    summary_oneline: 'MS-OpenAI vs 머스크 법정 싸움 시나리오 분석',
    categories: ['AI', '비즈니스', '법률'],
    metrics: { likes: 1, replies: 2, reposts: 0, views: 89 },
    recommendScore: 7,
    recommendReason: 'AI 업계 법적 분쟁에 대한 통찰력 있는 분석'
  },
  {
    platform_id: 'DTpEp4rAWrF',
    author_handle: '@careernomad_',
    content_ko: '하루아침에 되는 신기루 없습니다.\n\n대신, 지겹고 재미없는 지옥의 J커브를\n매일 경험하는 제가 같이 견뎌드립니다.\n오래도록 고기 잡는 법을 알려드립니다.\n\n지쳐서 잠시 쉬다오셔도 됩니다.\n저는 항상 여기 깃발 꽂고 있습니다.\n\n망형열차 타세요 여러분, 매일 달립니다.',
    content_en: 'There are no overnight miracles.\n\nInstead, I\'ll endure the boring, joyless hell of the J-curve with you every day.\nI\'ll teach you how to fish for the long term.\n\nYou can take a break when you\'re tired.\nI\'m always here, flag planted.\n\nGet on the hustle train, everyone. We run daily.',
    summary_oneline: '꾸준한 노력과 동기부여에 대한 메시지',
    categories: ['동기부여', '커리어', '성장'],
    metrics: { likes: 6, replies: 4, reposts: 0, views: 422 },
    recommendScore: 5,
    recommendReason: '동기부여 콘텐츠지만 구체적 정보 부족'
  },
  {
    platform_id: 'DTo-N0gkX4j',
    author_handle: '@td117111',
    content_ko: 'Programming, at its core, is the art of suffering',
    content_en: 'Programming, at its core, is the art of suffering',
    summary_oneline: '프로그래밍은 고통의 예술이라는 유머',
    categories: ['개발', '유머'],
    metrics: { likes: 0, replies: 0, reposts: 0, views: 158 },
    recommendScore: 3,
    recommendReason: '단순 유머 포스트로 정보 가치 낮음'
  },
  {
    platform_id: 'DTo93K0kT7U',
    author_handle: '@esakrissa',
    content_ko: 'When your code works perfectly on your machine and summons demons on production. - dev gets it.',
    content_en: 'When your code works perfectly on your machine and summons demons on production. - dev gets it.',
    summary_oneline: '로컬과 프로덕션 환경 차이에 대한 개발자 밈',
    categories: ['개발', '유머'],
    metrics: { likes: 0, replies: 0, reposts: 0, views: 146 },
    recommendScore: 3,
    recommendReason: '개발자 유머 밈으로 정보 가치 낮음'
  },
  {
    platform_id: 'DTo8HVPkaGu',
    author_handle: '@lawtech.kr',
    content_ko: '"ENTJ랑 친구하면.."\n\n맨날 최신 AI 활용 알려주고\n생각나는 좋은 링크주고\n존재 자체가 유익해\n\n친구 사업도 도와주고\n뭐든지 다 꿀정보 이득 넘겨줌\n\n제 친구들도 다 사업에서\n합작사에서 들어오는 외주 건 있으면\n넘겨주고 돈 벌게 해줘..\n\n전남친들 다 재벌에 정딱지\n하는 일 저랑같아서 시선 교정, 재테크 팁쓰도\n돈 버는 재밌는 걸 거.\n사람 인생 바뀌줌..\n',
    content_en: '"If you\'re friends with an ENTJ.."\n\nAlways sharing latest AI usage tips\nSharing good links that come to mind\nTheir existence itself is beneficial\n\nHelps friends\' businesses\nPasses on all the useful info\n\nMy friends in business\nWhen there are outsourcing projects from joint ventures\nPass them on to help make money..\n\nAll my exes are rich and well-connected\nDoing similar work so they share eye correction, investment tips\nFun ways to make money.\nChanges people\'s lives..',
    summary_oneline: 'ENTJ 성격 유형의 네트워킹 장점 소개',
    categories: ['MBTI', '네트워킹', '라이프스타일'],
    metrics: { likes: 0, replies: 16, reposts: 0, views: 108 },
    recommendScore: 4,
    recommendReason: 'MBTI 관련 가벼운 콘텐츠'
  },
  {
    platform_id: 'DTnTChEAUhy',
    author_handle: '@feelfree_ai',
    content_ko: '브라우저에서 100% 로컬로 돌아가는 실시간 비디오 캡셔닝이라니, 상상이 되시나요?\n\n무거운 서버 없이, 오직 웹 브라우저와 Small Vision LM만으로 실시간 자막 생성이 가능해졌습니다.\n\n개인 정보 보호는 물론 속도까지 챙긴 이 놀라운 기술,\n지금 바로 경험해보세요! AI가 웹 환경을 어떻게 바꾸고 있는지 직접 확인하실 수 있습니다.',
    content_en: 'Can you imagine real-time video captioning running 100% locally in your browser?\n\nWithout heavy servers, real-time caption generation is now possible with just a web browser and Small Vision LM.\n\nThis amazing technology that ensures privacy and speed,\nExperience it now! See firsthand how AI is changing the web environment.',
    summary_oneline: '브라우저 로컬 실시간 비디오 캡셔닝 기술 소개',
    categories: ['AI', '웹기술', '비전'],
    metrics: { likes: 7, replies: 1, reposts: 3, views: 371 },
    recommendScore: 9,
    recommendReason: '최신 AI 웹 기술 (LFM2.5-VL + WebGPU) 실용 정보'
  },
  {
    platform_id: 'DTpE9YMlIZI',
    author_handle: '@yooha12',
    content_ko: '<오픈소스 기여모임 10기 기여 도움 세션>\n일주일에만 250개의 이슈 선점!\n80개의 PR Open 40개의 PR merge를\n한 모임이 있다?!\n\n지금 서울창업허브에서 뜨거운 모임중입니다.\n김인제님(@injae-kim)과 운영진분들과 함께\n참가자분이 서로 돕고 이야기 나누며\n오픈소스 기여를 할 수 있는 시간을 보내고 있습니다.\n\n저기 소젯에 서서 기여 기술에 대해 이야기나누고\n이슈 선점 및 대략적이라도 스토리 노트,\nAI도 적극 활용하는 방법도 공유하고\n같이 서로 스타놀러주는 훈훈한 약속했습니다.\n\n두 번째 스프린트가 끝나는 4시가 기대됩니다!!\n\n#오픈소스기여모임 #오픈소스',
    content_en: '<Open Source Contribution Meetup 10th - Contribution Help Session>\n250 issues claimed in just one week!\n80 PRs Open, 40 PRs merged\nIs there such a meetup?!\n\nCurrently having a hot meetup at Seoul Startup Hub.\nWith Kim Injae (@injae-kim) and the organizing team,\nParticipants are helping each other, sharing stories,\nand spending time contributing to open source.\n\nStanding at the podium discussing contribution techniques,\nSharing issue claiming and rough story notes,\nand how to actively use AI,\nMade a heartwarming promise to star each other\'s repos.\n\nLooking forward to 4pm when the second sprint ends!!\n\n#OpenSourceContribution #OpenSource',
    summary_oneline: '서울 오픈소스 기여모임 10기 현장 스케치',
    categories: ['오픈소스', '커뮤니티', '개발'],
    metrics: { likes: 0, replies: 0, reposts: 0, views: 12 },
    recommendScore: 7,
    recommendReason: '오픈소스 기여 커뮤니티 활동 정보'
  },
  {
    platform_id: 'DTpAGwNEYd9',
    author_handle: '@94.sunset',
    content_ko: '눕기싫다.',
    content_en: 'I don\'t want to lie down.',
    summary_oneline: '단순 일상 토로',
    categories: ['일상'],
    metrics: { likes: 2, replies: 0, reposts: 0, views: 176 },
    recommendScore: 1,
    recommendReason: '정보 가치 없는 단순 일상 포스트'
  },
  {
    platform_id: 'DTpCB_GktKO',
    author_handle: '@growth.bite',
    content_ko: '요즘 \'저 이렇게 망했어요\' 하면서 동정표 얻는 게 유행인데 말이조\n\n근데 실패는 극복해나가는게 콘텐츠지,\n현재 진행형이면 그냥 무능력으로 보여요.\n\n대책 없는 하소연은 팔로워를 피로하게 만들어요.\n그사람들도 감정쓰레기통이 아니거든요.',
    content_en: 'These days it\'s trendy to say "I failed like this" and get sympathy votes.\n\nBut failure content is about overcoming it,\nIf it\'s ongoing, it just looks incompetent.\n\nComplaining without solutions makes followers tired.\nThey\'re not emotional trash cans.',
    summary_oneline: '실패 콘텐츠의 올바른 방향에 대한 의견',
    categories: ['콘텐츠', '마케팅', '조언'],
    metrics: { likes: 7, replies: 5, reposts: 1, views: 180 },
    recommendScore: 6,
    recommendReason: '콘텐츠 제작 관점의 인사이트 제공'
  },
  {
    platform_id: 'DTpEfKwEuwr',
    author_handle: '@theaiempire_',
    content_ko: 'This guy literally breaks down the research system behind the world\'s smartest AI models.\n\nFollow @theaiempire_ for more content.',
    content_en: 'This guy literally breaks down the research system behind the world\'s smartest AI models.\n\nFollow @theaiempire_ for more content.',
    summary_oneline: 'OpenAI 연구 책임자 인터뷰 영상 공유',
    categories: ['AI', '연구', 'OpenAI'],
    metrics: { likes: 0, replies: 188, reposts: 0, views: 91 },
    recommendScore: 7,
    recommendReason: 'OpenAI 연구 시스템에 대한 인터뷰 콘텐츠'
  },
  {
    platform_id: 'DTmmhp3Dosg',
    author_handle: '@lapin_dev',
    content_ko: '드디어 준비하던 롱폼 자동화 프로그램 완성했습니다.\n\n더 개선하고 싶은 부분이 계속 보이지만\n그러면 영영 오픈 못할 것 같아서 그냥 오픈합니다.\n\n대신 저와 같이 개선 진행해주실 분들을 위해\n50% 할인된 가격으로 제공할게요. (한정 수량)',
    content_en: 'Finally completed the long-form automation program I\'ve been preparing.\n\nI keep seeing areas for improvement,\nbut I\'ll never open it if I wait, so here it is.\n\nInstead, for those who want to help improve it with me,\nI\'ll offer it at 50% discount. (Limited quantity)',
    summary_oneline: '롱폼 콘텐츠 자동화 프로그램 출시 안내',
    categories: ['AI', '자동화', '도구'],
    metrics: { likes: 23, replies: 7, reposts: 3, views: 1700 },
    recommendScore: 7,
    recommendReason: '콘텐츠 자동화 도구 출시 정보'
  },
  {
    platform_id: 'DTpArnJjMGI',
    author_handle: '@harpist_lee',
    content_ko: '쪼잔하다는건 어떤걸까\n\n예들들어줘',
    content_en: 'What does being petty mean?\n\nGive me examples',
    summary_oneline: '쪼잔함에 대한 질문형 포스트',
    categories: ['일상', '질문'],
    metrics: { likes: 6, replies: 4, reposts: 0, views: 2000 },
    recommendScore: 2,
    recommendReason: '일반적인 질문형 포스트로 기술 관련성 없음'
  },
  {
    platform_id: 'DTpEx-uDx1R',
    author_handle: '@radon_techxx',
    content_ko: 'Do You Also Want To Create A Website For Your Business Or Online Store?',
    content_en: 'Do You Also Want To Create A Website For Your Business Or Online Store?',
    summary_oneline: '웹사이트 제작 서비스 홍보',
    categories: ['웹개발', '광고'],
    metrics: { likes: 1, replies: 0, reposts: 0, views: 4 },
    recommendScore: 2,
    recommendReason: '단순 광고성 포스트'
  },
  {
    platform_id: 'DTpDvoRkVR1',
    author_handle: '@ykdojo',
    content_ko: 'Is anyone into bouldering here?',
    content_en: 'Is anyone into bouldering here?',
    summary_oneline: '볼더링 취미 관련 질문',
    categories: ['취미', '운동'],
    metrics: { likes: 1, replies: 0, reposts: 0, views: 63 },
    recommendScore: 2,
    recommendReason: '기술/AI 관련 없는 취미 질문'
  },
  {
    platform_id: 'DTo_q0djxMl',
    author_handle: '@koojh',
    content_ko: '뭐 만들 게 있어서 ChatGPT Pro를 다시 구독했다.\n구독하니까 토큰을 남김없이 다 쓰고 싶은 생각에 의욕이 생긴다.',
    content_en: 'I had something to build so I resubscribed to ChatGPT Pro.\nAfter subscribing, I feel motivated to use up all the tokens.',
    summary_oneline: 'ChatGPT Pro 재구독 후 사용 의욕 생김',
    categories: ['AI', 'ChatGPT', '일상'],
    metrics: { likes: 0, replies: 0, reposts: 0, views: 129 },
    recommendScore: 4,
    recommendReason: 'AI 도구 사용 관련 가벼운 일상 공유'
  }
];

async function updateAnalysis() {
  console.log('Updating', analysisData.length, 'records...\n');

  let updated = 0;
  let totalScore = 0;

  for (const analysis of analysisData) {
    const now = new Date();
    // 시간 기준 계산 (대략적)
    const publishedAt = new Date(now.getTime() - 60 * 60 * 1000).toISOString(); // 약 1시간 전으로 설정

    const authorName = analysis.author_handle.replace('@', '');
    const title = `${authorName} - ${analysis.summary_oneline}`;

    const updateData = {
      title: title,
      content_text: analysis.content_en,
      translated_content: analysis.content_ko,
      published_at: publishedAt,
      digest_result: {
        summary_oneline: analysis.summary_oneline,
        categories: analysis.categories,
        metrics: analysis.metrics,
        author_handle: analysis.author_handle,
        recommendScore: analysis.recommendScore,
        recommendReason: analysis.recommendReason,
        processedAt: new Date().toISOString()
      },
      status: 'pending'
    };

    const { error } = await supabase
      .from('crawled_content')
      .update(updateData)
      .eq('platform_id', analysis.platform_id)
      .eq('platform', 'threads');

    if (error) {
      console.log(`Error updating ${analysis.platform_id}:`, error.message);
    } else {
      updated++;
      totalScore += analysis.recommendScore;
      console.log(`Updated: ${analysis.platform_id} - Score: ${analysis.recommendScore} - ${analysis.summary_oneline}`);
    }
  }

  console.log('\n========== 분석 완료 ==========');
  console.log('분석된 개수:', updated);
  console.log('평균 추천점수:', updated > 0 ? (totalScore / updated).toFixed(2) : 'N/A');
}

updateAnalysis();
