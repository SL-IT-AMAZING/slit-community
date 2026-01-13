-- Migration: Add content display enhancement fields
-- Date: 2025-01-13
-- Purpose: Add fields for profile photos, media, translations, and new status values

-- Add new columns to crawled_content
ALTER TABLE crawled_content ADD COLUMN IF NOT EXISTS author_title TEXT;
ALTER TABLE crawled_content ADD COLUMN IF NOT EXISTS media_urls JSONB DEFAULT '[]';
ALTER TABLE crawled_content ADD COLUMN IF NOT EXISTS translated_title TEXT;
ALTER TABLE crawled_content ADD COLUMN IF NOT EXISTS translated_content TEXT;

-- Drop existing status constraint and add updated one with new values
ALTER TABLE crawled_content DROP CONSTRAINT IF EXISTS crawled_content_status_check;
ALTER TABLE crawled_content ADD CONSTRAINT crawled_content_status_check
  CHECK (status IN ('pending', 'processing', 'completed', 'ignored', 'translated', 'queued'));

-- Add index for queued status (YouTube processing workflow)
CREATE INDEX IF NOT EXISTS idx_crawled_content_queued
  ON crawled_content(status)
  WHERE status = 'queued';

-- Add index for translated status
CREATE INDEX IF NOT EXISTS idx_crawled_content_translated
  ON crawled_content(status)
  WHERE status = 'translated';

-- Comment on new columns
COMMENT ON COLUMN crawled_content.author_title IS 'Author title/bio (e.g., LinkedIn job title)';
COMMENT ON COLUMN crawled_content.media_urls IS 'Array of media URLs (images, videos) attached to the content';
COMMENT ON COLUMN crawled_content.translated_title IS 'Korean translation of the title';
COMMENT ON COLUMN crawled_content.translated_content IS 'Korean translation of the content';
