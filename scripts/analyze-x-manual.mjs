/**
 * X 콘텐츠 수동 분석 스크립트
 * Gemini API 할당량 초과 시 사용
 * 간단한 규칙 기반 분석 수행
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';

// Supabase 클라이언트
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// 간단한 카테고리 분류 키워드
const categoryKeywords = {
  'AI': ['ai', 'artificial intelligence', 'machine learning', 'ml', 'llm', 'gpt', 'claude', 'openai', 'anthropic', 'agi', 'neural', 'deep learning', 'agent'],
  'Tech': ['tech', 'software', 'hardware', 'computer', 'digital', 'engineering', 'code'],
  'Programming': ['code', 'coding', 'developer', 'programming', 'javascript', 'python', 'typescript', 'react', 'cursor', 'vim', 'editor'],
  'Startup': ['startup', 'founder', 'vc', 'venture', 'investment', 'funding', 'entrepreneur'],
  'Opinion': ['think', 'believe', 'opinion', 'should', 'agree', 'disagree', 'hot take'],
  'Career': ['career', 'job', 'hiring', 'salary', 'interview', 'work', 'hire', 'developer'],
  'Tutorial': ['tutorial', 'how to', 'guide', 'tips', 'learn', 'example'],
  'News': ['breaking', 'announce', 'launch', 'release', 'new', 'just']
};

// 간단한 추천 점수 계산
function calculateScore(content, author) {
  let score = 5; // 기본 점수
  const lowerContent = content.toLowerCase();

  // AI/Tech 관련 키워드 있으면 +
  const aiKeywords = ['ai', 'agi', 'llm', 'gpt', 'claude', 'agent', 'anthropic', 'openai'];
  aiKeywords.forEach(kw => {
    if (lowerContent.includes(kw)) score += 0.5;
  });

  // 유명 계정이면 +
  const famousAuthors = ['elonmusk', 'AndrewYNg', 'sama', 'ylecun', 'karpathy', 'shadcn', 'steve_yegge'];
  if (famousAuthors.some(a => author?.toLowerCase().includes(a.toLowerCase()))) {
    score += 1.5;
  }

  // 실용적 정보 있으면 +
  if (lowerContent.includes('how') || lowerContent.includes('tutorial') || lowerContent.includes('tip')) {
    score += 0.5;
  }

  // 트렌드 관련이면 +
  if (lowerContent.includes('breakthrough') || lowerContent.includes('new') || lowerContent.includes('launch')) {
    score += 0.5;
  }

  // 짧은 콘텐츠면 -
  if (content.length < 50) score -= 1;

  return Math.max(1, Math.min(10, Math.round(score)));
}

// 카테고리 추출
function extractCategories(content) {
  const lowerContent = content.toLowerCase();
  const categories = [];

  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    if (keywords.some(kw => lowerContent.includes(kw))) {
      categories.push(category);
    }
  }

  return categories.length > 0 ? categories.slice(0, 3) : ['Tech'];
}

// 한 줄 요약 생성 (간단한 방식)
function generateSummary(content) {
  // 첫 문장 추출
  const firstSentence = content.split(/[.!?]\s/)[0];
  if (firstSentence.length <= 80) return firstSentence;
  return firstSentence.substring(0, 77) + '...';
}

// 메인 분석 함수
async function analyzeXContent() {
  console.log('=== X Content Manual Analysis ===\n');

  // pending_analysis 상태의 X 콘텐츠 조회
  const { data: records, error } = await supabase
    .from('crawled_content')
    .select('*')
    .eq('platform', 'x')
    .eq('status', 'pending_analysis')
    .order('crawled_at', { ascending: false });

  if (error) {
    console.error('DB query error:', error);
    return;
  }

  // content가 있는 레코드만 필터링
  const validRecords = records.filter(r => r.raw_data?.content && r.raw_data.content.length > 10);

  console.log(`Total pending_analysis: ${records?.length || 0}`);
  console.log(`Records with content: ${validRecords.length}\n`);

  if (validRecords.length === 0) {
    return { analyzed: 0, avgScore: 0, results: [] };
  }

  let analyzed = 0;
  let totalScore = 0;
  const results = [];

  for (const record of validRecords) {
    const content = record.raw_data.content;
    const author = record.author_name || 'Unknown';

    console.log(`\n--- Processing: ${record.platform_id} ---`);
    console.log(`Author: ${author}`);

    // 분석
    const categories = extractCategories(content);
    const recommendScore = calculateScore(content, author);
    const summary = generateSummary(content);

    console.log(`Categories: ${categories.join(', ')}`);
    console.log(`Score: ${recommendScore}/10`);
    console.log(`Summary: ${summary}`);

    // DB 업데이트
    const authorName = author.replace('@', '');
    const updateData = {
      title: `${authorName} - ${summary}`,
      content_text: content,
      translated_content: content, // 번역 없이 원문 사용
      digest_result: {
        summary_oneline: summary,
        categories,
        metrics: {
          engagement_potential: recommendScore >= 7 ? 'high' : recommendScore >= 4 ? 'medium' : 'low',
          information_value: categories.includes('Tutorial') || categories.includes('AI') ? 'high' : 'medium',
          originality: 'medium'
        },
        author_handle: author,
        recommendScore,
        recommendReason: `${categories.join('/')} 관련 콘텐츠 (규칙 기반 분석)`,
        processedAt: new Date().toISOString()
      },
      status: 'pending'
    };

    const { error: updateError } = await supabase
      .from('crawled_content')
      .update(updateData)
      .eq('id', record.id);

    if (updateError) {
      console.error(`Update error:`, updateError);
      continue;
    }

    console.log('DB updated successfully');

    analyzed++;
    totalScore += recommendScore;
    results.push({
      id: record.id,
      platform_id: record.platform_id,
      author,
      summary,
      score: recommendScore,
      categories
    });
  }

  const avgScore = analyzed > 0 ? (totalScore / analyzed).toFixed(2) : 0;

  console.log('\n=== Analysis Complete ===');
  console.log(`Analyzed: ${analyzed} records`);
  console.log(`Average Score: ${avgScore}/10`);

  console.log('\n=== Results Summary ===');
  results
    .sort((a, b) => b.score - a.score)
    .forEach((r, i) => {
      console.log(`${i + 1}. [${r.score}/10] ${r.author}: ${r.summary}`);
    });

  return { analyzed, avgScore: parseFloat(avgScore), results };
}

// 실행
analyzeXContent()
  .then(result => {
    console.log('\nFinal Result:', JSON.stringify(result, null, 2));
  })
  .catch(err => {
    console.error('Script error:', err);
    process.exit(1);
  });
