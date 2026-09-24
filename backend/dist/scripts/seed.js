"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const supabase_1 = require("../lib/supabase");
const demoSeed_1 = require("../utils/demoSeed");
async function runSeed() {
    console.log('🌱 Starting VERA Demo Data Seed...');
    const supabase = (0, supabase_1.getSupabase)();
    if (!supabase) {
        console.log('⚠️ Supabase client not initialized (missing SUPABASE_URL or keys). Demo data will be served by in-memory store.');
        return;
    }
    try {
        console.log(`📡 Seeding ${demoSeed_1.DEMO_COMPLAINTS.length} demo complaints into Supabase...`);
        for (const comp of demoSeed_1.DEMO_COMPLAINTS) {
            const payload = {
                id: comp.id,
                reporter_id: comp.reporter_id,
                device_session_id: comp.device_session_id,
                category: comp.category,
                description: comp.description,
                photo_url: comp.photo_url,
                voice_transcript: comp.voice_transcript,
                latitude: comp.latitude,
                longitude: comp.longitude,
                gps_accuracy: comp.gps_accuracy,
                address: comp.address,
                risk_score: comp.risk_score,
                risk_level: comp.risk_level,
                status: comp.status,
                created_at: comp.created_at,
                updated_at: comp.updated_at,
            };
            const { error: compErr } = await supabase.from('complaints').upsert(payload, { onConflict: 'id' });
            if (compErr) {
                console.warn(`  ⚠️ Could not upsert complaint ${comp.id}:`, compErr.message);
            }
            else {
                console.log(`  ✅ Inserted complaint: [${comp.risk_level}] ${comp.category} - INC-${comp.id.slice(0, 5).toUpperCase()}`);
            }
        }
        console.log(`📡 Seeding ${demoSeed_1.DEMO_INCIDENTS.length} escalated incidents into Supabase...`);
        for (const inc of demoSeed_1.DEMO_INCIDENTS) {
            const { error: incErr } = await supabase.from('incidents').upsert(inc, { onConflict: 'id' });
            if (incErr) {
                console.warn(`  ⚠️ Could not upsert incident ${inc.id}:`, incErr.message);
            }
            else {
                console.log(`  ✅ Inserted incident for complaint: INC-${inc.complaint_id.slice(0, 5).toUpperCase()}`);
            }
        }
        console.log(`📡 Seeding ${demoSeed_1.DEMO_EVENTS.length} audit events into Supabase...`);
        for (const evt of demoSeed_1.DEMO_EVENTS) {
            const { error: evtErr } = await supabase.from('incident_events').upsert(evt, { onConflict: 'id' });
            if (evtErr) {
                console.warn(`  ⚠️ Could not upsert event ${evt.id}:`, evtErr.message);
            }
        }
        console.log('🎉 VERA Demo Data Seeding Completed Successfully!');
    }
    catch (err) {
        console.error('❌ Error while seeding demo data:', err.message);
    }
}
runSeed();
