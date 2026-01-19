-- Migration: Add open-source and video types to content_type_check
-- Date: 2026-01-16
-- Purpose: Allow GitHub (open-source) and YouTube (video) content types

-- Drop existing constraint and add updated one with new values
ALTER TABLE content DROP CONSTRAINT IF EXISTS content_type_check;
ALTER TABLE content ADD CONSTRAINT content_type_check CHECK (type IN (
  'article', 'news', 'video', 'open-source',
  'x-thread', 'linkedin', 'threads', 'newsletter', 'monetization-guide', 'reddit'
));

-- Comment
COMMENT ON CONSTRAINT content_type_check ON content IS 'Allowed content types including open-source (GitHub) and video (YouTube)';
