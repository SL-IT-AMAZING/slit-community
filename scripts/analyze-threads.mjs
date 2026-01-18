import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

async function analyzeThreads() {
  // pending_analysis 상태의 threads 콘텐츠 조회
  const { data: records, error } = await supabase
    .from('crawled_content')
    .select('*')
    .eq('platform', 'threads')
    .eq('status', 'pending_analysis')
    .order('crawled_at', { ascending: false });

  if (error) {
    console.error('DB Error:', error);
    return;
  }

  console.log('Found', records.length, 'records to analyze');

  let analyzed = 0;
  let totalScore = 0;

  for (const record of records) {
    console.log('\nAnalyzing:', record.platform_id);

    let content = '';
    let metrics = null;
    let authorHandle = record.author_name || '';
    let publishedAt = null;

    // raw_data.content가 있으면 사용
    if (record.raw_data?.content && record.raw_data.content.trim()) {
      content = record.raw_data.content;
      console.log('  Using DOM content:', content.slice(0, 50) + '...');
    }

    // 스크린샷에서 Vision으로 추출
    const screenshotUrl = record.screenshot_url || record.raw_data?.screenshotUrls?.[0];
    if (screenshotUrl) {
      const imagePath = path.join('/Users/ownuun/conductor/workspaces/v2-v1/kiev/public', screenshotUrl);

      if (fs.existsSync(imagePath)) {
        console.log('  Analyzing screenshot:', screenshotUrl);

        const buffer = fs.readFileSync(imagePath);
        const base64 = buffer.toString('base64');
        const mimeType = imagePath.endsWith('.png') ? 'image/png' : 'image/jpeg';

        const extractPrompt = `이 Threads 포스트 스크린샷을 분석해서 다음 정보를 JSON으로 추출해주세요.

다음 형식으로 JSON만 출력하세요:
{
  "authorName": "작성자 이름 (@ 없이)",
  "authorHandle": "작성자 핸들 (@username 형식)",
  "content": "포스트 본문 전체 (줄바꿈 포함)",
  "publishedAt": "게시 시간 (예: 2h, 1d, Jan 14 등 화면에 보이는 그대로)",
  "metrics": {
    "likes": 좋아요 수 (숫자만, 없으면 0),
    "replies": 답글 수 (숫자만, 없으면 0),
    "reposts": 리포스트 수 (숫자만, 없으면 0)
  }
}

주의사항:
- 숫자에 K, M이 있으면 그대로 숫자로 변환 (1.2K → 1200, 2M → 2000000)
- 본문은 줄바꿈을 \\n으로 표현
- 확인할 수 없는 정보는 null로

JSON만 출력하세요.`;

        try {
          const extractResult = await model.generateContent([
            extractPrompt,
            { inlineData: { mimeType, data: base64 } }
          ]);

          const extractText = extractResult.response.text().trim();
          const jsonMatch = extractText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const extracted = JSON.parse(jsonMatch[0]);
            if (!content && extracted.content) {
              content = extracted.content;
            }
            if (extracted.metrics) {
              metrics = extracted.metrics;
            }
            if (extracted.authorHandle) {
              authorHandle = extracted.authorHandle;
            }
            if (extracted.publishedAt) {
              // 상대 시간을 ISO로 변환
              const now = new Date();
              const str = extracted.publishedAt.toString().toLowerCase().trim();
              const timeMatch = str.match(/^(\d+)\s*(s|sec|m|min|h|hr|d|w|mo|y)/i);
              if (timeMatch) {
                const value = parseInt(timeMatch[1]);
                const unit = timeMatch[2].toLowerCase();
                switch (unit) {
                  case 's': case 'sec': now.setSeconds(now.getSeconds() - value); break;
                  case 'm': case 'min': now.setMinutes(now.getMinutes() - value); break;
                  case 'h': case 'hr': now.setHours(now.getHours() - value); break;
                  case 'd': now.setDate(now.getDate() - value); break;
                  case 'w': now.setDate(now.getDate() - (value * 7)); break;
                  case 'mo': now.setMonth(now.getMonth() - value); break;
                  case 'y': now.setFullYear(now.getFullYear() - value); break;
                }
              }
              publishedAt = now.toISOString();
            }
            console.log('  Extracted metrics:', metrics);
          }
        } catch (e) {
          console.log('  Vision extraction failed:', e.message);
        }
      }
    }

    if (!content) {
      console.log('  No content found, skipping');
      continue;
    }

    // 분석 프롬프트
    const analysisPrompt = `다음 Threads 포스트를 분석해주세요.

원문:
${content}

다음 형식으로 JSON만 출력하세요:
{
  "content_ko": "한국어 번역 (원문이 한국어면 그대로)",
  "content_en": "영어 번역 (원문이 영어면 그대로)",
  "summary_oneline": "한 줄 요약 (한국어, 50자 이내)",
  "categories": ["AI", "개발" 등 관련 카테고리 1-3개],
  "recommendScore": 1-10점 (기술/AI 관련 유용성 기준),
  "recommendReason": "추천 이유 (한국어, 50자 이내)"
}

JSON만 출력하세요.`;

    try {
      const analysisResult = await model.generateContent(analysisPrompt);
      const analysisText = analysisResult.response.text().trim();
      const analysisMatch = analysisText.match(/\{[\s\S]*\}/);

      if (analysisMatch) {
        const analysis = JSON.parse(analysisMatch[0]);

        const authorName = authorHandle.replace('@', '') || record.author_name?.replace('@', '') || 'Unknown';
        const title = `${authorName} - ${analysis.summary_oneline}`;

        const updateData = {
          title: title,
          content_text: analysis.content_en,
          translated_content: analysis.content_ko,
          published_at: publishedAt || record.crawled_at,
          digest_result: {
            summary_oneline: analysis.summary_oneline,
            categories: analysis.categories,
            metrics: metrics,
            author_handle: authorHandle,
            recommendScore: analysis.recommendScore,
            recommendReason: analysis.recommendReason,
            processedAt: new Date().toISOString()
          },
          status: 'pending'
        };

        const { error: updateError } = await supabase
          .from('crawled_content')
          .update(updateData)
          .eq('id', record.id);

        if (updateError) {
          console.log('  Update error:', updateError.message);
        } else {
          analyzed++;
          totalScore += analysis.recommendScore;
          console.log('  Score:', analysis.recommendScore, '- ', analysis.summary_oneline);
        }
      }
    } catch (e) {
      console.log('  Analysis failed:', e.message);
    }

    // Rate limit - 5초 대기로 증가
    await new Promise(r => setTimeout(r, 5000));
  }

  console.log('\n========== 분석 완료 ==========');
  console.log('분석된 개수:', analyzed);
  console.log('평균 추천점수:', analyzed > 0 ? (totalScore / analyzed).toFixed(2) : 'N/A');
}

analyzeThreads();
