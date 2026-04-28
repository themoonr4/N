-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends Supabase auth)
CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    email TEXT,
    full_name TEXT,
    avatar_url TEXT,
    role TEXT DEFAULT 'user',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Categories table
CREATE TABLE public.categories (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    icon TEXT,
    color TEXT DEFAULT '#c00000',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- News table
CREATE TABLE public.news (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    excerpt TEXT,
    content TEXT NOT NULL,
    category_id INTEGER REFERENCES categories(id),
    author_id UUID REFERENCES profiles(id),
    featured_image TEXT,
    images TEXT[] DEFAULT '{}',
    videos TEXT[] DEFAULT '{}',
    tags TEXT[] DEFAULT '{}',
    views INTEGER DEFAULT 0,
    likes INTEGER DEFAULT 0,
    bookmarks INTEGER DEFAULT 0,
    shares INTEGER DEFAULT 0,
    reading_time INTEGER,
    is_featured BOOLEAN DEFAULT false,
    is_premium BOOLEAN DEFAULT false,
    status TEXT DEFAULT 'draft',
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Comments table
CREATE TABLE public.comments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    news_id UUID REFERENCES news(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id),
    parent_id UUID REFERENCES comments(id),
    content TEXT NOT NULL,
    likes INTEGER DEFAULT 0,
    is_approved BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bookmarks table
CREATE TABLE public.bookmarks (
    user_id UUID REFERENCES profiles(id),
    news_id UUID REFERENCES news(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, news_id)
);

-- Reading history
CREATE TABLE public.reading_history (
    user_id UUID REFERENCES profiles(id),
    news_id UUID REFERENCES news(id),
    read_at TIMESTAMPTZ DEFAULT NOW(),
    read_duration INTEGER,
    PRIMARY KEY (user_id, news_id)
);

-- Indexes for performance
CREATE INDEX idx_news_slug ON news(slug);
CREATE INDEX idx_news_category ON news(category_id);
CREATE INDEX idx_news_status ON news(status);
CREATE INDEX idx_news_published ON news(published_at DESC);
CREATE INDEX idx_comments_news ON comments(news_id);
CREATE INDEX idx_comments_user ON comments(user_id);

-- Row Level Security (RLS) policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE news ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Public profiles are viewable by everyone" ON profiles
    FOR SELECT USING (true);

CREATE POLICY "Published news is viewable by everyone" ON news
    FOR SELECT USING (status = 'published');

CREATE POLICY "Users can insert their own profile" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

-- Functions
CREATE OR REPLACE FUNCTION increment_views(news_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE news SET views = views + 1 WHERE id = news_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION increment_likes(news_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE news SET likes = likes + 1 WHERE id = news_id;
END;
$$ LANGUAGE plpgsql;

-- Insert default categories
INSERT INTO categories (name, slug, description, icon, color) VALUES
    ('Technology', 'tech', 'Latest tech news and innovations', '💻', '#3b82f6'),
    ('Sports', 'sports', 'Cricket, football and all sports', '🏏', '#10b981'),
    ('Business', 'business', 'Stock market and business news', '📊', '#f59e0b'),
    ('Politics', 'politics', 'Political news and analysis', '🏛️', '#ef4444'),
    ('Study', 'study', 'Education, jobs and career', '📚', '#8b5cf6'),
    ('Entertainment', 'entertainment', 'Movies, music and celebrity news', '🎬', '#ec4899'),
    ('Health', 'health', 'Health tips and medical news', '🏥', '#14b8a6'),
    ('Science', 'science', 'Scientific discoveries and research', '🔬', '#06b6d4');

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_news_updated_at BEFORE UPDATE ON news
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
