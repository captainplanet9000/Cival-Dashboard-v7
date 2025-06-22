-- File Management System for Trading Farm Dashboard
-- Run this script in Supabase SQL Editor to set up tables and policies

-- Create trigger functions for managing created_at and updated_at columns
CREATE OR REPLACE FUNCTION public.handle_created_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.created_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create file_uploads table
CREATE TABLE IF NOT EXISTS public.file_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  content_type TEXT NOT NULL,
  file_type TEXT NOT NULL,
  data_format TEXT,
  description TEXT,
  tags TEXT[] DEFAULT '{}',
  is_processed BOOLEAN DEFAULT FALSE,
  data_schema JSONB,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
);

-- Create agent_permissions table
CREATE TABLE IF NOT EXISTS public.agent_permissions (
  agent_id TEXT PRIMARY KEY,
  risk_level TEXT NOT NULL DEFAULT 'low',
  max_trade_size NUMERIC NOT NULL DEFAULT 0,
  allowed_markets TEXT[] DEFAULT '{}',
  data_access_level TEXT NOT NULL DEFAULT 'none',
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  
  CONSTRAINT data_access_level_check CHECK (data_access_level IN ('read', 'write', 'none'))
);

-- Create file_access_permissions table
CREATE TABLE IF NOT EXISTS public.file_access_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id UUID REFERENCES public.file_uploads(id) ON DELETE CASCADE,
  agent_id TEXT REFERENCES public.agent_permissions(agent_id) ON DELETE CASCADE,
  access_level TEXT NOT NULL DEFAULT 'read',
  granted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  
  CONSTRAINT file_agent_unique UNIQUE (file_id, agent_id),
  CONSTRAINT access_level_check CHECK (access_level IN ('read', 'write'))
);

-- Create agent_file_access_logs table to track usage
CREATE TABLE IF NOT EXISTS public.agent_file_access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id TEXT REFERENCES public.agent_permissions(agent_id) ON DELETE CASCADE,
  file_id UUID REFERENCES public.file_uploads(id) ON DELETE CASCADE,
  operation TEXT NOT NULL,
  accessed_at TIMESTAMP WITH TIME ZONE NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE
);

-- Create triggers for created_at and updated_at columns
DO $$
BEGIN
  -- Only create trigger if it doesn't exist yet
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_file_uploads_created_at') THEN
    CREATE TRIGGER set_file_uploads_created_at
    BEFORE INSERT ON public.file_uploads
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_created_at();
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_file_uploads_updated_at') THEN
    CREATE TRIGGER set_file_uploads_updated_at
    BEFORE UPDATE ON public.file_uploads
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_agent_permissions_created_at') THEN
    CREATE TRIGGER set_agent_permissions_created_at
    BEFORE INSERT ON public.agent_permissions
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_created_at();
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_agent_permissions_updated_at') THEN
    CREATE TRIGGER set_agent_permissions_updated_at
    BEFORE UPDATE ON public.agent_permissions
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_file_access_permissions_created_at') THEN
    CREATE TRIGGER set_file_access_permissions_created_at
    BEFORE INSERT ON public.file_access_permissions
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_created_at();
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_file_access_permissions_updated_at') THEN
    CREATE TRIGGER set_file_access_permissions_updated_at
    BEFORE UPDATE ON public.file_access_permissions
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();
  END IF;
END$$;

-- Enable Row Level Security (RLS)
ALTER TABLE public.file_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.file_access_permissions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for file_uploads
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'file_uploads' AND policyname = 'Users can view their own uploads') THEN
    CREATE POLICY "Users can view their own uploads"
    ON public.file_uploads
    FOR SELECT
    USING (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'file_uploads' AND policyname = 'Users can insert their own uploads') THEN
    CREATE POLICY "Users can insert their own uploads"
    ON public.file_uploads
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'file_uploads' AND policyname = 'Users can update their own uploads') THEN
    CREATE POLICY "Users can update their own uploads"
    ON public.file_uploads
    FOR UPDATE
    USING (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'file_uploads' AND policyname = 'Users can delete their own uploads') THEN
    CREATE POLICY "Users can delete their own uploads"
    ON public.file_uploads
    FOR DELETE
    USING (auth.uid() = user_id);
  END IF;
END$$;

-- Create RLS policies for agent_permissions
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'agent_permissions' AND policyname = 'All users can view agent permissions') THEN
    CREATE POLICY "All users can view agent permissions"
    ON public.agent_permissions
    FOR SELECT
    TO authenticated
    USING (true);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'agent_permissions' AND policyname = 'All authenticated users can insert agent permissions') THEN
    CREATE POLICY "All authenticated users can insert agent permissions"
    ON public.agent_permissions
    FOR INSERT
    TO authenticated
    WITH CHECK (true);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'agent_permissions' AND policyname = 'All authenticated users can update agent permissions') THEN
    CREATE POLICY "All authenticated users can update agent permissions"
    ON public.agent_permissions
    FOR UPDATE
    TO authenticated
    USING (true);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'agent_permissions' AND policyname = 'All authenticated users can delete agent permissions') THEN
    CREATE POLICY "All authenticated users can delete agent permissions"
    ON public.agent_permissions
    FOR DELETE
    TO authenticated
    USING (true);
  END IF;
END$$;

-- Create RLS policies for file_access_permissions
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'file_access_permissions' AND policyname = 'Users can view file access for their uploads') THEN
    CREATE POLICY "Users can view file access for their uploads"
    ON public.file_access_permissions
    FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM public.file_uploads
        WHERE file_uploads.id = file_access_permissions.file_id
        AND file_uploads.user_id = auth.uid()
      )
    );
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'file_access_permissions' AND policyname = 'Users can grant access to their uploads') THEN
    CREATE POLICY "Users can grant access to their uploads"
    ON public.file_access_permissions
    FOR INSERT
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.file_uploads
        WHERE file_uploads.id = file_access_permissions.file_id
        AND file_uploads.user_id = auth.uid()
      )
    );
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'file_access_permissions' AND policyname = 'Users can update access for their uploads') THEN
    CREATE POLICY "Users can update access for their uploads"
    ON public.file_access_permissions
    FOR UPDATE
    USING (
      EXISTS (
        SELECT 1 FROM public.file_uploads
        WHERE file_uploads.id = file_access_permissions.file_id
        AND file_uploads.user_id = auth.uid()
      )
    );
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'file_access_permissions' AND policyname = 'Users can revoke access to their uploads') THEN
    CREATE POLICY "Users can revoke access to their uploads"
    ON public.file_access_permissions
    FOR DELETE
    USING (
      EXISTS (
        SELECT 1 FROM public.file_uploads
        WHERE file_uploads.id = file_access_permissions.file_id
        AND file_uploads.user_id = auth.uid()
      )
    );
  END IF;
END$$;

-- Create storage bucket for file uploads if it doesn't exist
INSERT INTO storage.buckets (id, name, public, avif_autodetection)
VALUES ('file_uploads', 'file_uploads', false, false)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policy to restrict access to own files
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Users can access their own files') THEN
    CREATE POLICY "Users can access their own files"
    ON storage.objects
    FOR ALL
    TO authenticated
    USING (
      bucket_id = 'file_uploads' AND 
      ((storage.foldername(name))[1] = auth.uid()::text)
    );
  END IF;
END$$;

-- Add some demo agent permissions for testing
INSERT INTO public.agent_permissions (agent_id, risk_level, max_trade_size, allowed_markets, data_access_level)
VALUES 
  ('trend-follower-01', 'medium', 10000, '{"FOREX", "CRYPTO"}', 'read'),
  ('mean-reversion-01', 'low', 5000, '{"STOCKS", "ETF"}', 'read'),
  ('arbitrage-bot-01', 'low', 5000, '{"CRYPTO", "FOREX"}', 'read'),
  ('sentiment-trader-01', 'high', 20000, '{"STOCKS", "OPTIONS"}', 'read'),
  ('options-strategist-01', 'high', 25000, '{"OPTIONS"}', 'read')
ON CONFLICT (agent_id) DO NOTHING;

-- Success message
SELECT 'File Management System setup complete!' as status;