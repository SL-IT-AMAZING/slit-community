/**
 * YouTube 트랜스크립트 추출
 * youtube-caption-extractor 패키지 사용
 */

import { getSubtitles } from "youtube-caption-extractor";

/**
 * YouTube 비디오에서 트랜스크립트 추출
 * @param {string} videoId - YouTube 비디오 ID
 * @returns {Promise<{text: string, segments: Array}>}
 */
export async function getTranscript(videoId) {
  try {
    const subtitles = await getSubtitles({ videoID: videoId, lang: "en" });

    if (!subtitles?.length) {
      const koSubtitles = await getSubtitles({ videoID: videoId, lang: "ko" });
      if (koSubtitles?.length) {
        const segments = koSubtitles.map((s) => ({
          offset: parseFloat(s.start) * 1000,
          text: s.text,
          duration: parseFloat(s.dur) * 1000,
        }));
        return {
          text: segments.map((s) => s.text).join(" "),
          segments,
          success: true,
        };
      }
    }

    const segments = subtitles.map((s) => ({
      offset: parseFloat(s.start) * 1000,
      text: s.text,
      duration: parseFloat(s.dur) * 1000,
    }));

    return {
      text: segments.map((s) => s.text).join(" "),
      segments,
      success: true,
    };
  } catch (error) {
    console.error(`Failed to get transcript for ${videoId}:`, error.message);

    return {
      text: null,
      segments: [],
      success: false,
      error: error.message,
    };
  }
}

/**
 * 세그먼트를 타임스탬프 포함 텍스트로 포맷 (LLM 분석용)
 * @param {Array} segments - [{offset: 90000, text: "..."}]
 * @returns {string} - "[1:30] text\n[1:35] text..."
 */
export function formatTranscriptWithTimestamps(segments) {
  if (!segments?.length) return "";

  return segments
    .map((seg) => {
      const totalSec = Math.floor(seg.offset / 1000);
      const min = Math.floor(totalSec / 60);
      const sec = totalSec % 60;
      const ts = `${min}:${sec.toString().padStart(2, "0")}`;
      return `[${ts}] ${seg.text}`;
    })
    .join("\n");
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
