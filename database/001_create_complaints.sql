-- ============================================================================
-- Migration: 001_create_complaints.sql
-- Description: Create public.complaints table with exact VERA backend schema
-- Target: Supabase PostgreSQL (SQL Editor safe & idempotent)
-- ============================================================================

-- 1. Ensure required extensions are available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Create updated_at trigger helper function (if not exists)
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Create the public.complaints table matching backend TypeScript types exactly
CREATE TABLE IF NOT EXISTS public.complaints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id UUID,
    device_session_id TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT NOT NULL,
    photo_url TEXT,
    video_url TEXT,
    voice_transcript TEXT,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    gps_accuracy DOUBLE PRECISION,
    address TEXT,
    risk_score INTEGER NOT NULL DEFAULT 0 CHECK (risk_score >= 0 AND risk_score <= 100),
    risk_level TEXT NOT NULL DEFAULT 'LOW' CHECK (risk_level IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    status TEXT NOT NULL DEFAULT 'Reported' CHECK (status IN ('Reported', 'Verified', 'In Progress', 'Critical Incident', 'Emergency Response', 'Resolved')),
    routed_department TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Create high-performance indexes based on backend queries & risk engine
CREATE INDEX IF NOT EXISTS idx_complaints_device_session ON public.complaints (device_session_id);
CREATE INDEX IF NOT EXISTS idx_complaints_status ON public.complaints (status);
CREATE INDEX IF NOT EXISTS idx_complaints_risk_level ON public.complaints (risk_level);
CREATE INDEX IF NOT EXISTS idx_complaints_category ON public.complaints (category);
CREATE INDEX IF NOT EXISTS idx_complaints_coordinates ON public.complaints (latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_complaints_created_at ON public.complaints (created_at DESC);

-- 5. Attach updated_at automatic trigger
DROP TRIGGER IF EXISTS set_complaints_updated_at ON public.complaints;
CREATE TRIGGER set_complaints_updated_at
    BEFORE UPDATE ON public.complaints
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- 6. Enable Row Level Security (RLS)
ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;

-- 7. Configure RLS Policies for Citizen Portal and Admin Dashboard (Safe for Anon & Authenticated roles)
DROP POLICY IF EXISTS "Allow public read access to complaints" ON public.complaints;
CREATE POLICY "Allow public read access to complaints"
    ON public.complaints
    FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Allow public insert access to complaints" ON public.complaints;
CREATE POLICY "Allow public insert access to complaints"
    ON public.complaints
    FOR INSERT
    WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update access to complaints" ON public.complaints;
CREATE POLICY "Allow public update access to complaints"
    ON public.complaints
    FOR UPDATE
    USING (true)
    WITH CHECK (true);

-- 8. Add table to Supabase Realtime publication (if publication exists)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.complaints;
    END IF;
EXCEPTION
    WHEN duplicate_object THEN
        NULL; -- Table is already part of the publication
END $$;
