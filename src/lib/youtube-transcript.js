/**
 * YouTube 트랜스크립트 추출
 * youtube-transcript 패키지 사용
 */

import { YoutubeTranscript } from "youtube-transcript";

/**
 * YouTube 비디오에서 트랜스크립트 추출
 * @param {string} videoId - YouTube 비디오 ID
 * @returns {Promise<{text: string, segments: Array}>}
 */
export async function getTranscript(videoId) {
  try {
    const segments = await YoutubeTranscript.fetchTranscript(videoId);

    // 전체 텍스트로 합치기
    const fullText = segments.map((s) => s.text).join(" ");

    return {
      text: fullText,
      segments,
      success: true,
    };
  } catch (error) {
    console.error(`Failed to get transcript for ${videoId}:`, error.message);

    // 트랜스크립트가 없는 경우도 있음 (비활성화, 언어 미지원 등)
    return {
      text: null,
      segments: [],
      success: false,
      error: error.message,
    };
  }
}

/**
 * 트랜스크립트를 시간 기반 청크로 분할
 * @param {Array} segments - 트랜스크립트 세그먼트
 * @param {number} chunkDurationSeconds - 청크당 시간 (초)
 * @returns {Array<{startTime: number, text: string}>}
 */
export function chunkTranscript(segments, chunkDurationSeconds = 300) {
  if (!segments || segments.length === 0) return [];

  const chunks = [];
  let currentChunk = { startTime: 0, texts: [] };
  let chunkEndTime = chunkDurationSeconds;

  for (const segment of segments) {
    const segmentTime = segment.offset / 1000; // ms to seconds

    if (segmentTime >= chunkEndTime) {
      // 현재 청크 저장
      chunks.push({
        startTime: currentChunk.startTime,
        text: currentChunk.texts.join(" "),
      });

      // 새 청크 시작
      currentChunk = { startTime: segmentTime, texts: [] };
      chunkEndTime = segmentTime + chunkDurationSeconds;
    }

    currentChunk.texts.push(segment.text);
  }

  // 마지막 청크 저장
  if (currentChunk.texts.length > 0) {
    chunks.push({
      startTime: currentChunk.startTime,
      text: currentChunk.texts.join(" "),
    });
  }

  return chunks;
}
