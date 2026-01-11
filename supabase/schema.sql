-- AI Community Platform - Supabase Schema
-- Run this in the Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ===== USERS TABLE =====
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  display_name TEXT,
  photo_url TEXT,
  provider TEXT DEFAULT 'credentials',
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  is_premium BOOLEAN DEFAULT FALSE,
  subscription_tier TEXT CHECK (subscription_tier IN ('monthly', 'yearly')),
  subscription_end_date TIMESTAMPTZ,
  stripe_customer_id TEXT,
  toss_customer_id TEXT,
  language TEXT DEFAULT 'ko' CHECK (language IN ('ko', 'en')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===== CONTENT TABLE =====
CREATE TABLE IF NOT EXISTS content (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  title_en TEXT,
  description TEXT,
  description_en TEXT,
  body TEXT,
  body_en TEXT,
  type TEXT NOT NULL CHECK (type IN (
    'article', 'news', 'video', 'open-source',
    'x-thread', 'linkedin', 'threads', 'newsletter', 'monetization-guide', 'reddit'
  )),
  category TEXT NOT NULL CHECK (category IN (
    'ai-basics', 'llm', 'image-generation', 'ai-tools',
    'tutorials', 'industry-trends', 'open-source', 'ai-monetization', 'research-papers'
  )),
  tags TEXT[] DEFAULT '{}',
  thumbnail_url TEXT,
  external_url TEXT,
  is_premium BOOLEAN DEFAULT FALSE,
  is_featured BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  view_count INTEGER DEFAULT 0,
  bookmark_count INTEGER DEFAULT 0,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  -- SNS 관련 필드 (v2 추가)
  social_metadata JSONB DEFAULT '{}',
  platform_id TEXT,
  author_info JSONB DEFAULT '{}',
  readme_image_url TEXT
);

-- ===== BOOKMARKS TABLE (Many-to-Many) =====
CREATE TABLE IF NOT EXISTS bookmarks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  content_id UUID REFERENCES content(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, content_id)
);

-- ===== SUBSCRIPTIONS TABLE =====
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  plan TEXT NOT NULL CHECK (plan IN ('monthly', 'yearly')),
  payment_method TEXT NOT NULL CHECK (payment_method IN ('stripe', 'toss', 'coinbase')),
  payment_id TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired', 'pending')),
  start_date TIMESTAMPTZ DEFAULT NOW(),
  end_date TIMESTAMPTZ NOT NULL,
  auto_renew BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===== CATEGORIES TABLE =====
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  name_en TEXT,
  description TEXT,
  description_en TEXT,
  icon TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===== NEWSLETTER SUBSCRIBERS TABLE =====
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  subscribed_at TIMESTAMPTZ DEFAULT NOW(),
  unsubscribed_at TIMESTAMPTZ
);

-- ===== METRICS HISTORY TABLE (트렌드 그래프용) =====
CREATE TABLE IF NOT EXISTS metrics_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content_id UUID REFERENCES content(id) ON DELETE CASCADE,
  recorded_at TIMESTAMPTZ DEFAULT NOW(),
  metrics JSONB NOT NULL  -- { stars: 1500, forks: 200, likes: 5000, views: 10000, ... }
);

-- ===== INDEXES =====
CREATE INDEX IF NOT EXISTS idx_content_slug ON content(slug);
CREATE INDEX IF NOT EXISTS idx_content_type ON content(type);
CREATE INDEX IF NOT EXISTS idx_content_category ON content(category);
CREATE INDEX IF NOT EXISTS idx_content_status ON content(status);
CREATE INDEX IF NOT EXISTS idx_content_is_featured ON content(is_featured);
CREATE INDEX IF NOT EXISTS idx_content_published_at ON content(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_bookmarks_user_id ON bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_content_id ON bookmarks(content_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
-- SNS 관련 인덱스
CREATE INDEX IF NOT EXISTS idx_content_social_metadata ON content USING GIN (social_metadata);
CREATE INDEX IF NOT EXISTS idx_content_platform_id ON content(platform_id);
CREATE INDEX IF NOT EXISTS idx_metrics_history_content ON metrics_history(content_id);
CREATE INDEX IF NOT EXISTS idx_metrics_history_time ON metrics_history(recorded_at DESC);

-- ===== ROW LEVEL SECURITY (RLS) =====

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE content ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE metrics_history ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid()::text = id::text);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid()::text = id::text);

CREATE POLICY "Users can insert own profile" ON users
  FOR INSERT WITH CHECK (auth.uid()::text = id::text);

CREATE POLICY "Service role can manage all users" ON users
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Content policies (public read for published content)
CREATE POLICY "Anyone can view published content" ON content
  FOR SELECT USING (status = 'published');

CREATE POLICY "Admins can manage all content" ON content
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role = 'admin')
  );

-- Bookmarks policies
CREATE POLICY "Users can view own bookmarks" ON bookmarks
  FOR SELECT USING (user_id::text = auth.uid()::text);

CREATE POLICY "Users can manage own bookmarks" ON bookmarks
  FOR ALL USING (user_id::text = auth.uid()::text);

-- Subscriptions policies
CREATE POLICY "Users can view own subscriptions" ON subscriptions
  FOR SELECT USING (user_id::text = auth.uid()::text);

-- Categories (public read)
CREATE POLICY "Anyone can view categories" ON categories
  FOR SELECT USING (true);

-- Newsletter (insert only for anonymous)
CREATE POLICY "Anyone can subscribe to newsletter" ON newsletter_subscribers
  FOR INSERT WITH CHECK (true);

-- Metrics History (public read, admin write)
CREATE POLICY "Anyone can view metrics history" ON metrics_history
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage metrics history" ON metrics_history
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role = 'admin')
  );

-- ===== FUNCTIONS =====

-- Function to increment view count
CREATE OR REPLACE FUNCTION increment_view_count(content_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE content SET view_count = view_count + 1 WHERE id = content_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update bookmark count
CREATE OR REPLACE FUNCTION update_bookmark_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE content SET bookmark_count = bookmark_count + 1 WHERE id = NEW.content_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE content SET bookmark_count = bookmark_count - 1 WHERE id = OLD.content_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for bookmark count
CREATE TRIGGER on_bookmark_change
  AFTER INSERT OR DELETE ON bookmarks
  FOR EACH ROW EXECUTE FUNCTION update_bookmark_count();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_content_updated_at
  BEFORE UPDATE ON content
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ===== AUTH TRIGGER: 회원가입 시 자동 users 테이블 생성 =====

-- Function: Supabase Auth 회원가입 시 users 테이블에 자동 INSERT
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, display_name, photo_url, provider)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture'),
    COALESCE(NEW.raw_app_meta_data->>'provider', 'credentials')
  )
  ON CONFLICT (email) DO UPDATE SET
    display_name = COALESCE(EXCLUDED.display_name, users.display_name),
    photo_url = COALESCE(EXCLUDED.photo_url, users.photo_url),
    provider = COALESCE(EXCLUDED.provider, users.provider),
    updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: auth.users 테이블에 새 유저 생성 시 실행
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ===== SEED DATA: CATEGORIES =====
INSERT INTO categories (slug, name, name_en, description, description_en, icon, sort_order) VALUES
  ('ai-basics', 'AI 기초', 'AI Basics', 'AI 기초 개념과 입문 가이드', 'AI fundamentals and beginner guides', 'FaBrain', 1),
  ('llm', 'LLM/언어모델', 'LLM', 'ChatGPT, Claude 등 대형 언어 모델', 'Large Language Models like ChatGPT, Claude', 'FaRobot', 2),
  ('image-generation', '이미지 생성', 'Image Generation', 'Midjourney, DALL-E, Stable Diffusion', 'AI image generation tools', 'FaImage', 3),
  ('ai-tools', 'AI 도구', 'AI Tools', '유용한 AI 도구 및 서비스', 'Useful AI tools and services', 'FaWrench', 4),
  ('tutorials', '튜토리얼', 'Tutorials', '실습 가이드 및 튜토리얼', 'Hands-on guides and tutorials', 'FaGraduationCap', 5),
  ('industry-trends', '업계 동향', 'Industry Trends', 'AI 업계 뉴스 및 트렌드', 'AI industry news and trends', 'FaChartLine', 6),
  ('open-source', '오픈소스', 'Open Source', '오픈소스 AI 프로젝트', 'Open source AI projects', 'FaCodeBranch', 7),
  ('ai-monetization', 'AI 수익화', 'AI Monetization', 'AI로 수익 창출하기', 'Making money with AI', 'FaDollarSign', 8),
  ('research-papers', '연구논문', 'Research Papers', 'AI 연구 논문 해설', 'AI research paper summaries', 'FaFileAlt', 9)
ON CONFLICT (slug) DO NOTHING;

-- ===== MIGRATION: SNS 기능 추가 (기존 DB 업데이트용) =====
-- 이미 content 테이블이 있는 경우 아래 명령어로 컬럼 추가

-- ALTER TABLE content ADD COLUMN IF NOT EXISTS social_metadata JSONB DEFAULT '{}';
-- ALTER TABLE content ADD COLUMN IF NOT EXISTS platform_id TEXT;
-- ALTER TABLE content ADD COLUMN IF NOT EXISTS author_info JSONB DEFAULT '{}';
-- ALTER TABLE content ADD COLUMN IF NOT EXISTS readme_image_url TEXT;

-- reddit 타입 추가 (기존 제약 조건 업데이트)
-- ALTER TABLE content DROP CONSTRAINT IF EXISTS content_type_check;
-- ALTER TABLE content ADD CONSTRAINT content_type_check CHECK (type IN (
--   'article', 'news', 'video', 'open-source',
--   'x-thread', 'linkedin', 'threads', 'newsletter', 'monetization-guide', 'reddit'
-- ));
