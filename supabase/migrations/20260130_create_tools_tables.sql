-- Migration: Create Tools Feature Tables
-- Date: 2026-01-30
-- Purpose: Create tables for tools feature with tracking and ratings

-- ===== TOOLS TABLE =====
CREATE TABLE IF NOT EXISTS tools (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  description_en TEXT,
  link TEXT NOT NULL,
  thumbnail_url TEXT,
  admin_rating INTEGER CHECK (admin_rating >= 1 AND admin_rating <= 5),
  tags TEXT[] DEFAULT '{}',
  pricing TEXT CHECK (pricing IN ('free', 'paid', 'freemium')) DEFAULT 'free',
  is_featured BOOLEAN DEFAULT FALSE,
  pros TEXT[] DEFAULT '{}',
  cons TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===== TOOL CLICKS TABLE (for tracking) =====
CREATE TABLE IF NOT EXISTS tool_clicks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tool_id UUID REFERENCES tools(id) ON DELETE CASCADE,
  clicked_at TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL
);

-- ===== TOOL USER RATINGS TABLE (for future user ratings) =====
CREATE TABLE IF NOT EXISTS tool_user_ratings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tool_id UUID REFERENCES tools(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tool_id, user_id)
);

-- ===== INDEXES =====
CREATE INDEX IF NOT EXISTS idx_tools_slug ON tools(slug);
CREATE INDEX IF NOT EXISTS idx_tools_admin_rating ON tools(admin_rating);
CREATE INDEX IF NOT EXISTS idx_tools_pricing ON tools(pricing);
CREATE INDEX IF NOT EXISTS idx_tools_is_featured ON tools(is_featured);
CREATE INDEX IF NOT EXISTS idx_tools_tags ON tools USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_tool_clicks_tool_id ON tool_clicks(tool_id);
CREATE INDEX IF NOT EXISTS idx_tool_clicks_clicked_at ON tool_clicks(clicked_at DESC);
CREATE INDEX IF NOT EXISTS idx_tool_user_ratings_tool_id ON tool_user_ratings(tool_id);

-- ===== ROW LEVEL SECURITY (RLS) =====

-- Enable RLS
ALTER TABLE tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE tool_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE tool_user_ratings ENABLE ROW LEVEL SECURITY;

-- Tools: public read
CREATE POLICY "Anyone can view tools" ON tools FOR SELECT USING (true);
CREATE POLICY "Admins can manage tools" ON tools FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role = 'admin')
);

-- Clicks: anyone can insert, public read
CREATE POLICY "Anyone can record clicks" ON tool_clicks FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can view clicks" ON tool_clicks FOR SELECT USING (true);

-- User ratings: authenticated users
CREATE POLICY "Users can rate tools" ON tool_user_ratings FOR ALL USING (
  user_id::text = auth.uid()::text
);
CREATE POLICY "Anyone can view ratings" ON tool_user_ratings FOR SELECT USING (true);

-- ===== TRIGGERS =====

-- Trigger for updated_at
CREATE TRIGGER update_tools_updated_at
  BEFORE UPDATE ON tools
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

COMMENT ON TABLE tools IS 'AI tools directory with admin ratings and user tracking';
COMMENT ON TABLE tool_clicks IS 'Track clicks on tools for analytics';
COMMENT ON TABLE tool_user_ratings IS 'User ratings for tools';
