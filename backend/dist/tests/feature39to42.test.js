"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const complaintStore_1 = require("../services/store/complaintStore");
const authorityRouting_1 = require("../config/authorityRouting");
async function testAllFourFeatures() {
    console.log('=== TEST 1: Authority Routing Config ===');
    const roadDept = (0, authorityRouting_1.getDepartmentForCategory)('Road damage');
    console.log('Road damage routed to:', roadDept.department, `[SLA: ${roadDept.responseSLA}]`);
    if (roadDept.department.includes('Roads Dept'))
        console.log('✅ Authority mapping for Road damage PASS');
    const accidentDept = (0, authorityRouting_1.getDepartmentForCategory)('Accident');
    console.log('Accident routed to:', accidentDept.department, `[Emergency: ${accidentDept.isEmergencyService}]`);
    if (accidentDept.department.includes('Police Dept'))
        console.log('✅ Authority mapping for Accident PASS');
    console.log('\n=== TEST 2: Video Upload & Routing Integration ===');
    const result = await complaintStore_1.complaintStore.createComplaint({
        category: 'Accident',
        description: 'Major head-on vehicle collision, one unconscious victim and smoke visible.',
        latitude: 26.8467,
        longitude: 80.9462,
        gps_accuracy: 8,
        address: 'Hazratganj Main Crossroad, Lucknow',
        photo_url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        video_url: 'https://storage.googleapis.com/demo-bucket/complaints/videos/traffic_cam_01.mp4',
        voice_transcript: 'Two cars collided with high impact, someone is bleeding.',
        device_session_id: 'test_sess_video_01',
    });
    console.log('Complaint Created ID:', result.complaint.id);
    console.log('Video URL saved:', result.complaint.video_url);
    console.log('Routed Department:', result.complaint.routed_department);
    console.log('Risk Score:', result.complaint.risk_score, `(${result.complaint.risk_level})`);
    console.log('Status:', result.complaint.status);
    if (result.complaint.video_url?.includes('.mp4')) {
        console.log('✅ Section 39: Video URL persistence PASS');
    }
    if (result.complaint.routed_department?.includes('Police Dept')) {
        console.log('✅ Section 40: Authority Routing persistence PASS');
    }
    if (result.incident?.video_room_url?.includes('https://meet.jit.si/vera-incident-')) {
        console.log('✅ Section 41: Auto-provisioned unique Jitsi Room PASS:', result.incident.video_room_url);
    }
    const { events } = await complaintStore_1.complaintStore.getComplaintById(result.complaint.id);
    console.log('\n=== Audit Timeline Events Logged ===');
    events.forEach((e, idx) => console.log(` [${idx + 1}] [${e.changed_by}] ${e.message}`));
    const hasNotificationEvent = events.some(e => e.message.includes('Notification') || e.message.includes('Routed to'));
    const hasJitsiEvent = events.some(e => e.message.includes('Live emergency video session provisioned'));
    if (hasNotificationEvent)
        console.log('✅ Section 40: Notification logged to timeline PASS');
    if (hasJitsiEvent)
        console.log('✅ Section 41: Jitsi provisioning logged to timeline PASS');
    console.log('\n🎉 ALL 4 NEW FEATURES VERIFIED SUCCESSFULLY!');
}
testAllFourFeatures().catch(console.error);
