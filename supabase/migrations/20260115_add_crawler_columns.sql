-- Migration: Add crawler enhancement columns
-- Date: 2026-01-15
-- Purpose: Add screenshot_url_bottom, ranking, and update status values

-- Add new columns for screenshots (top/bottom split)
ALTER TABLE crawled_content ADD COLUMN IF NOT EXISTS screenshot_url_bottom TEXT;

-- Add ranking column for GitHub trending data
ALTER TABLE crawled_content ADD COLUMN IF NOT EXISTS ranking JSONB DEFAULT '{}';

-- Drop existing status constraint and add updated one with pending_analysis
ALTER TABLE crawled_content DROP CONSTRAINT IF EXISTS crawled_content_status_check;
ALTER TABLE crawled_content ADD CONSTRAINT crawled_content_status_check
  CHECK (status IN ('pending', 'pending_analysis', 'processing', 'completed', 'ignored', 'translated', 'queued'));

-- Comment on new columns
COMMENT ON COLUMN crawled_content.screenshot_url_bottom IS 'URL for bottom portion of screenshot (for X/Threads split screenshots)';
COMMENT ON COLUMN crawled_content.ranking IS 'Ranking data with history: {weekly: 5, daily_history: [{rank: 1, date: "2026-01-15"}], python: {weekly: 3}}';
