-- ============================================================================
-- Migration / Seed: 002_seed_demo_data.sql
-- Description: 4 comprehensive demo incidents for VERA with full audit trails & incidents
-- Target: Supabase PostgreSQL (SQL Editor safe & idempotent)
-- ============================================================================

-- 1. Insert 4 Demo Complaints
INSERT INTO public.complaints (
    id,
    reporter_id,
    device_session_id,
    category,
    description,
    photo_url,
    voice_transcript,
    latitude,
    longitude,
    gps_accuracy,
    address,
    risk_score,
    risk_level,
    status,
    routed_department,
    created_at,
    updated_at
) VALUES
(
    '11111111-1111-4111-8111-111111111111',
    NULL,
    'demo-session-fire-01',
    'Fire',
    'Major commercial LPG gas cylinder explosion and active blaze at MG Road Market. Thick black smoke engulfing adjacent shops. Urgent fire tenders and medical evacuation required immediately!',
    'https://images.unsplash.com/photo-1542385151-efd9000785a0?auto=format&fit=crop&w=800&q=80',
    'Emergency! Major gas cylinder explosion at the central market on MG Road, fire is spreading fast towards textile shops, send fire brigade and ambulances immediately!',
    12.9716,
    77.5946,
    4.5,
    'Shop 42, Commercial Complex, Mahatma Gandhi Road, Bengaluru, Karnataka 560001',
    92,
    'CRITICAL',
    'Critical Incident',
    'Fire & Emergency Services',
    NOW() - INTERVAL '18 minutes',
    NOW() - INTERVAL '15 minutes'
),
(
    '22222222-2222-4222-8222-222222222222',
    NULL,
    'demo-session-accident-02',
    'Accident',
    'Multi-vehicle pileup involving a commuter bus and two cars at Outer Ring Road Flyover. Both outbound lanes completely blocked. Casualties with minor trauma reported.',
    'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=800&q=80',
    'Heavy crash on the flyover junction, a city bus and two cars collided, traffic is halted and people need first aid.',
    12.9562,
    77.7019,
    6.2,
    'Marathahalli Outer Ring Road Junction, Bengaluru, Karnataka 560037',
    74,
    'HIGH',
    'In Progress',
    'Traffic Police Department',
    NOW() - INTERVAL '45 minutes',
    NOW() - INTERVAL '30 minutes'
),
(
    '33333333-3333-4333-8333-333333333333',
    NULL,
    'demo-session-water-03',
    'Water leakage',
    'High-pressure primary water transmission pipeline burst causing severe road flooding and asphalt subsidence near Metro Pillar 140. Impassable for low-clearance vehicles.',
    'https://images.unsplash.com/photo-1541888946425-d0fbb186156f?auto=format&fit=crop&w=800&q=80',
    'Large water pipeline burst under the road near Metro pillar 140, water is gushing out heavily and flooding the street.',
    12.9784,
    77.6408,
    5.0,
    'Near Metro Pillar 140, 100 Feet Road, Indiranagar, Bengaluru, Karnataka 560038',
    48,
    'MEDIUM',
    'Verified',
    'Water Supply & Sewerage Board',
    NOW() - INTERVAL '2 hours',
    NOW() - INTERVAL '1 hour'
),
(
    '44444444-4444-4444-8444-444444444444',
    NULL,
    'demo-session-power-04',
    'Streetlight problems',
    'Streetlight feeder failure causing total darkness across 5th Cross for 4 consecutive nights. Open excavation trench left unprotected, creating severe hazard for night commuters.',
    'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?auto=format&fit=crop&w=800&q=80',
    'The entire street lighting line has been non-functional for four nights and an open trench on 5th cross is completely unlit.',
    12.9340,
    77.6225,
    8.0,
    '5th Cross Road, 4th Block, Koramangala, Bengaluru, Karnataka 560034',
    22,
    'LOW',
    'Reported',
    'Electricity & Power Board',
    NOW() - INTERVAL '5 hours',
    NOW() - INTERVAL '5 hours'
)
ON CONFLICT (id) DO UPDATE SET
    category = EXCLUDED.category,
    description = EXCLUDED.description,
    photo_url = EXCLUDED.photo_url,
    voice_transcript = EXCLUDED.voice_transcript,
    latitude = EXCLUDED.latitude,
    longitude = EXCLUDED.longitude,
    address = EXCLUDED.address,
    risk_score = EXCLUDED.risk_score,
    risk_level = EXCLUDED.risk_level,
    status = EXCLUDED.status,
    routed_department = EXCLUDED.routed_department;

-- 2. Insert Escalated Incidents for Critical and High Risk Demo Complaints
INSERT INTO public.incidents (
    id,
    complaint_id,
    incident_type,
    urgency_score,
    latitude,
    longitude,
    gps_accuracy,
    summary,
    video_room_url,
    created_at,
    escalated_at
) VALUES
(
    'a1111111-1111-4111-8111-111111111111',
    '11111111-1111-4111-8111-111111111111',
    'Fire',
    92,
    12.9716,
    77.5946,
    4.5,
    'Major commercial LPG gas cylinder explosion and active blaze at MG Road Market.',
    'https://meet.jit.si/vera-incident-11111111-live',
    NOW() - INTERVAL '18 minutes',
    NOW() - INTERVAL '18 minutes'
),
(
    'a2222222-2222-4222-8222-222222222222',
    '22222222-2222-4222-8222-222222222222',
    'Accident',
    74,
    12.9562,
    77.7019,
    6.2,
    'Multi-vehicle pileup involving a commuter bus and two cars at Outer Ring Road Flyover.',
    'https://meet.jit.si/vera-incident-22222222-live',
    NOW() - INTERVAL '45 minutes',
    NOW() - INTERVAL '45 minutes'
)
ON CONFLICT (id) DO UPDATE SET
    urgency_score = EXCLUDED.urgency_score,
    summary = EXCLUDED.summary;

-- 3. Insert Incident Events / Audit Timeline Trail
INSERT INTO public.incident_events (
    id,
    complaint_id,
    old_status,
    new_status,
    message,
    created_at,
    changed_by
) VALUES
-- Events for Demo 1 (Fire)
(
    'e1111111-1111-4111-8111-111111111101',
    '11111111-1111-4111-8111-111111111111',
    NULL,
    'Reported',
    'Citizen submitted emergency voice report. Routed to Fire & Emergency Services.',
    NOW() - INTERVAL '18 minutes',
    'CITIZEN'
),
(
    'e1111111-1111-4111-8111-111111111102',
    '11111111-1111-4111-8111-111111111111',
    'Reported',
    'Critical Incident',
    '🚨 VERA Deterministic Risk Engine automatically escalated incident to Critical Incident (Score: 92/100, Level: CRITICAL).',
    NOW() - INTERVAL '18 minutes',
    'VERA_RISK_ENGINE'
),
(
    'e1111111-1111-4111-8111-111111111103',
    '11111111-1111-4111-8111-111111111111',
    'Critical Incident',
    'Critical Incident',
    '🎥 Live emergency WebRTC tactical room provisioned: https://meet.jit.si/vera-incident-11111111-live',
    NOW() - INTERVAL '17 minutes',
    'VERA_JITSI_PROVISIONER'
),
(
    'e1111111-1111-4111-8111-111111111104',
    '11111111-1111-4111-8111-111111111111',
    'Critical Incident',
    'Critical Incident',
    'Fire tenders Engine-4 & Engine-9 dispatched from Central Station with priority sirens.',
    NOW() - INTERVAL '15 minutes',
    'DISPATCH_OFFICER'
),

-- Events for Demo 2 (Accident)
(
    'e2222222-2222-4222-8222-222222222201',
    '22222222-2222-4222-8222-222222222222',
    NULL,
    'Reported',
    'Citizen submitted traffic accident report via voice assistant. Routed to Traffic Police Department.',
    NOW() - INTERVAL '45 minutes',
    'CITIZEN'
),
(
    'e2222222-2222-4222-8222-222222222202',
    '22222222-2222-4222-8222-222222222222',
    'Reported',
    'Verified',
    'CCTV highway junction feed confirmed 3-vehicle pileup blocking lanes.',
    NOW() - INTERVAL '40 minutes',
    'TRAFFIC_CONTROL'
),
(
    'e2222222-2222-4222-8222-222222222203',
    '22222222-2222-4222-8222-222222222222',
    'Verified',
    'In Progress',
    'Traffic patrol unit 12 arrived on scene. Crane requested to tow damaged vehicles.',
    NOW() - INTERVAL '30 minutes',
    'PATROL_OFFICER'
),

-- Events for Demo 3 (Water Leak)
(
    'e3333333-3333-4333-8333-333333333301',
    '33333333-3333-4333-8333-333333333333',
    NULL,
    'Reported',
    'Citizen submitted civic issue report for ruptured pipeline.',
    NOW() - INTERVAL '2 hours',
    'CITIZEN'
),
(
    'e3333333-3333-4333-8333-333333333302',
    '33333333-3333-4333-8333-333333333333',
    'Reported',
    'Verified',
    'Municipal engineer verified main pipeline valve shutoff required.',
    NOW() - INTERVAL '1 hour',
    'WATER_BOARD_INSPECTOR'
),

-- Events for Demo 4 (Streetlight)
(
    'e4444444-4444-4444-8444-444444444401',
    '44444444-4444-4444-8444-444444444444',
    NULL,
    'Reported',
    'Complaint submitted via citizen portal. Routed to Electricity & Power Board.',
    NOW() - INTERVAL '5 hours',
    'CITIZEN'
)
ON CONFLICT (id) DO NOTHING;
