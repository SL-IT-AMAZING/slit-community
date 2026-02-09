-- Migration: Add source_platform column to content table
-- Date: 2026-01-24
-- Purpose: Track original source platform (github, youtube, x, linkedin, etc.)

ALTER TABLE content ADD COLUMN IF NOT EXISTS source_platform TEXT;

CREATE INDEX IF NOT EXISTS idx_content_source_platform ON content(source_platform);

UPDATE content SET source_platform = 'github' WHERE external_url LIKE '%github.com%' AND source_platform IS NULL;
UPDATE content SET source_platform = 'youtube' WHERE external_url LIKE '%youtube.com%' AND source_platform IS NULL;
UPDATE content SET source_platform = 'x' WHERE (external_url LIKE '%twitter.com%' OR external_url LIKE '%x.com%') AND source_platform IS NULL;
UPDATE content SET source_platform = 'linkedin' WHERE external_url LIKE '%linkedin.com%' AND source_platform IS NULL;
UPDATE content SET source_platform = 'reddit' WHERE external_url LIKE '%reddit.com%' AND source_platform IS NULL;
UPDATE content SET source_platform = 'threads' WHERE external_url LIKE '%threads.net%' AND source_platform IS NULL;

COMMENT ON COLUMN content.source_platform IS 'Original source platform: github, youtube, x, linkedin, reddit, threads, etc.';
