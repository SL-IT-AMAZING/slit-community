/**
 * 비디오 스토리지 정리 스크립트
 * - Supabase Storage 용량 90% 초과 시 조회수 하위 30% 비디오 삭제
 * - 사용법: node scripts/cleanup-videos.mjs [--dry-run] [--force]
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

// .env.local 로드
import { config } from 'dotenv';
config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// 설정
const BUCKET_NAME = 'videos';
const MAX_STORAGE_GB = 1; // Supabase 무료 티어 1GB
const THRESHOLD_PERCENT = 90; // 90% 초과 시 정리
const DELETE_PERCENT = 30; // 하위 30% 삭제

const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const isForce = args.includes('--force');

async function getStorageUsage() {
  // videos 버킷의 모든 파일 목록 가져오기
  const { data: files, error } = await supabase.storage
    .from(BUCKET_NAME)
    .list('', { limit: 1000, sortBy: { column: 'created_at', order: 'desc' } });

  if (error) {
    console.error('Failed to list files:', error.message);
    return null;
  }

  // 플랫폼별 폴더 내 파일들도 가져오기
  const platforms = ['x', 'threads'];
  const allFiles = [];

  for (const platform of platforms) {
    const { data: platformFiles, error: platformError } = await supabase.storage
      .from(BUCKET_NAME)
      .list(platform, { limit: 1000 });

    if (!platformError && platformFiles) {
      platformFiles.forEach(file => {
        if (file.name && file.metadata) {
          allFiles.push({
            path: `${platform}/${file.name}`,
            size: file.metadata.size || 0,
            created_at: file.created_at,
          });
        }
      });
    }
  }

  const totalSize = allFiles.reduce((sum, f) => sum + f.size, 0);
  const totalSizeGB = totalSize / (1024 * 1024 * 1024);
  const usagePercent = (totalSizeGB / MAX_STORAGE_GB) * 100;

  return {
    files: allFiles,
    totalSize,
    totalSizeGB,
    usagePercent,
    fileCount: allFiles.length,
  };
}

async function getVideosWithViewCount() {
  // downloadedVideoUrl이 있는 콘텐츠 조회 (view_count 포함)
  const { data, error } = await supabase
    .from('content')
    .select('id, slug, title, view_count, social_metadata')
    .not('social_metadata->downloadedVideoUrl', 'is', null)
    .order('view_count', { ascending: true });

  if (error) {
    console.error('Failed to fetch content:', error.message);
    return [];
  }

  return data.filter(item => {
    const videoUrl = item.social_metadata?.downloadedVideoUrl;
    // Supabase Storage URL만 대상 (로컬 URL 제외)
    return videoUrl && videoUrl.includes('supabase.co');
  });
}

function extractFilePath(url) {
  // URL에서 파일 경로 추출
  // 예: https://xxx.supabase.co/storage/v1/object/public/videos/x/video_123.mp4
  const match = url.match(/\/videos\/(.+)$/);
  return match ? match[1] : null;
}

async function deleteVideo(content) {
  const videoUrl = content.social_metadata.downloadedVideoUrl;
  const filePath = extractFilePath(videoUrl);

  if (!filePath) {
    console.log(`  ⚠️ Could not extract file path from URL: ${videoUrl}`);
    return false;
  }

  if (isDryRun) {
    console.log(`  [DRY-RUN] Would delete: ${filePath}`);
    return true;
  }

  // Storage에서 삭제
  const { error: deleteError } = await supabase.storage
    .from(BUCKET_NAME)
    .remove([filePath]);

  if (deleteError) {
    console.error(`  ❌ Failed to delete ${filePath}:`, deleteError.message);
    return false;
  }

  // DB에서 downloadedVideoUrl 제거
  const updatedMetadata = { ...content.social_metadata };
  delete updatedMetadata.downloadedVideoUrl;

  const { error: updateError } = await supabase
    .from('content')
    .update({ social_metadata: updatedMetadata })
    .eq('id', content.id);

  if (updateError) {
    console.error(`  ⚠️ File deleted but DB update failed:`, updateError.message);
    return false;
  }

  console.log(`  ✅ Deleted: ${filePath}`);
  return true;
}

async function main() {
  console.log('🎬 Video Storage Cleanup Script');
  console.log('================================');
  console.log(`Mode: ${isDryRun ? 'DRY-RUN (no actual deletion)' : isForce ? 'FORCE' : 'NORMAL'}`);
  console.log('');

  // 1. 스토리지 사용량 확인
  console.log('📊 Checking storage usage...');
  const usage = await getStorageUsage();

  if (!usage) {
    console.error('Failed to get storage usage');
    return;
  }

  console.log(`  Total files: ${usage.fileCount}`);
  console.log(`  Total size: ${usage.totalSizeGB.toFixed(2)} GB / ${MAX_STORAGE_GB} GB`);
  console.log(`  Usage: ${usage.usagePercent.toFixed(1)}%`);
  console.log('');

  // 2. 정리 필요 여부 확인
  if (usage.usagePercent < THRESHOLD_PERCENT && !isForce) {
    console.log(`✨ Storage usage is below ${THRESHOLD_PERCENT}%. No cleanup needed.`);
    console.log('   Use --force to cleanup anyway.');
    return;
  }

  console.log(`⚠️ Storage usage exceeds ${THRESHOLD_PERCENT}%. Starting cleanup...`);
  console.log('');

  // 3. 조회수 기준으로 비디오 목록 가져오기
  console.log('📋 Fetching videos sorted by view count...');
  const videos = await getVideosWithViewCount();

  if (videos.length === 0) {
    console.log('No videos found in Supabase Storage.');
    return;
  }

  console.log(`  Found ${videos.length} videos with Supabase Storage URLs`);

  // 4. 하위 30% 계산
  const deleteCount = Math.ceil(videos.length * (DELETE_PERCENT / 100));
  const toDelete = videos.slice(0, deleteCount);

  console.log(`  Will delete bottom ${DELETE_PERCENT}%: ${deleteCount} videos`);
  console.log('');

  // 5. 삭제 대상 출력
  console.log('🗑️ Videos to delete (sorted by view count):');
  toDelete.forEach((v, i) => {
    console.log(`  ${i + 1}. [${v.view_count || 0} views] ${v.title?.slice(0, 50)}...`);
  });
  console.log('');

  // 6. 삭제 실행
  console.log('🚀 Deleting videos...');
  let deleted = 0;
  let failed = 0;

  for (const video of toDelete) {
    const success = await deleteVideo(video);
    if (success) deleted++;
    else failed++;
  }

  console.log('');
  console.log('📊 Cleanup Summary:');
  console.log(`  ✅ Deleted: ${deleted}`);
  console.log(`  ❌ Failed: ${failed}`);

  // 7. 최종 사용량 확인
  if (!isDryRun && deleted > 0) {
    console.log('');
    console.log('📊 Final storage usage...');
    const finalUsage = await getStorageUsage();
    if (finalUsage) {
      console.log(`  Total size: ${finalUsage.totalSizeGB.toFixed(2)} GB`);
      console.log(`  Usage: ${finalUsage.usagePercent.toFixed(1)}%`);
    }
  }
}

main().catch(console.error);
