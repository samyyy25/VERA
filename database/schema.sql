-- =========================================================
-- VERA (Voice Emergency Response Assistant) Database Schema
-- Supabase PostgreSQL with Row Level Security (RLS) & Realtime
-- =========================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ---------------------------------------------------------
-- 1. USERS TABLE (Citizen, Admin, Responder)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('citizen', 'admin', 'responder')) DEFAULT 'citizen',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------
-- 2. COMPLAINTS TABLE (Public Issues & Emergency Sources)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.complaints (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reporter_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    device_session_id TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT NOT NULL,
    photo_url TEXT,
    voice_transcript TEXT,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    gps_accuracy DOUBLE PRECISION,
    address TEXT,
    risk_score INTEGER NOT NULL DEFAULT 0 CHECK (risk_score >= 0 AND risk_score <= 100),
    risk_level TEXT NOT NULL CHECK (risk_level IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')) DEFAULT 'LOW',
    status TEXT NOT NULL CHECK (status IN ('Reported', 'Verified', 'In Progress', 'Critical Incident', 'Emergency Response', 'Resolved')) DEFAULT 'Reported',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------
-- 3. INCIDENTS TABLE (Escalated Emergency Incidents)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.incidents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    complaint_id UUID NOT NULL REFERENCES public.complaints(id) ON DELETE CASCADE,
    incident_type TEXT NOT NULL,
    urgency_score INTEGER NOT NULL DEFAULT 0,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    gps_accuracy DOUBLE PRECISION,
    summary TEXT,
    translated_summary TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    escalated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

-- ---------------------------------------------------------
-- 4. INCIDENT_EVENTS TABLE (Full Audit Trail & Timeline)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.incident_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    complaint_id UUID NOT NULL REFERENCES public.complaints(id) ON DELETE CASCADE,
    old_status TEXT,
    new_status TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    changed_by TEXT NOT NULL DEFAULT 'SYSTEM'
);

-- ---------------------------------------------------------
-- 5. EMERGENCY_LOCATIONS TABLE (Nearby Discovered Hospitals/Police)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.emergency_locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    incident_id UUID NOT NULL REFERENCES public.incidents(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('hospital', 'police', 'fire_station', 'other')),
    distance_meters DOUBLE PRECISION NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    address TEXT,
    phone TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------
-- INDEXES FOR HIGH-PERFORMANCE SEARCH & CLUSTERING
-- ---------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_complaints_device_session ON public.complaints(device_session_id);
CREATE INDEX IF NOT EXISTS idx_complaints_status ON public.complaints(status);
CREATE INDEX IF NOT EXISTS idx_complaints_risk_level ON public.complaints(risk_level);
CREATE INDEX IF NOT EXISTS idx_complaints_coordinates ON public.complaints(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_complaints_created_at ON public.complaints(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_incidents_complaint_id ON public.incidents(complaint_id);
CREATE INDEX IF NOT EXISTS idx_incident_events_complaint_id ON public.incident_events(complaint_id);

-- ---------------------------------------------------------
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ---------------------------------------------------------
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incident_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergency_locations ENABLE ROW LEVEL SECURITY;

-- 1. Users policies
CREATE POLICY "Users can view their own profile"
    ON public.users FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
    ON public.users FOR UPDATE
    USING (auth.uid() = id);

-- 2. Complaints policies
-- Anyone (including anonymous citizens) can create a complaint
CREATE POLICY "Allow anonymous and authenticated insert on complaints"
    ON public.complaints FOR INSERT
    WITH CHECK (true);

-- Anyone can view complaints for live feed / transparency (or filtered by session in client)
CREATE POLICY "Allow select on complaints"
    ON public.complaints FOR SELECT
    USING (true);

-- Only authenticated users (admins/responders) or service role can update complaints
CREATE POLICY "Allow service role or admin update on complaints"
    ON public.complaints FOR UPDATE
    USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- 3. Incidents policies
CREATE POLICY "Allow select on incidents"
    ON public.incidents FOR SELECT
    USING (true);

CREATE POLICY "Allow insert/update on incidents"
    ON public.incidents FOR ALL
    USING (true)
    WITH CHECK (true);

-- 4. Incident Events policies
CREATE POLICY "Allow select on incident_events"
    ON public.incident_events FOR SELECT
    USING (true);

CREATE POLICY "Allow insert on incident_events"
    ON public.incident_events FOR INSERT
    WITH CHECK (true);

-- 5. Emergency Locations policies
CREATE POLICY "Allow select on emergency_locations"
    ON public.emergency_locations FOR SELECT
    USING (true);

CREATE POLICY "Allow insert on emergency_locations"
    ON public.emergency_locations FOR INSERT
    WITH CHECK (true);

-- ---------------------------------------------------------
-- SUPABASE REALTIME ENABLEMENT
-- ---------------------------------------------------------
-- Enable Realtime publication on complaints, incidents, incident_events
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'complaints'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.complaints;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'incidents'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.incidents;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'incident_events'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.incident_events;
    END IF;
END $$;
