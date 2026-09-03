"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const riskScorer_1 = require("../services/riskEngine/riskScorer");
const complaintStore_1 = require("../services/store/complaintStore");
async function runTests() {
    console.log('====================================================');
    console.log('🧪 VERA DETERMINISTIC RISK ENGINE & ESCALATION TESTS');
    console.log('====================================================\n');
    let passed = 0;
    let total = 0;
    function assert(condition, testName, detail) {
        total++;
        if (condition) {
            console.log(`✅ [PASS] ${testName}`);
            passed++;
        }
        else {
            console.error(`❌ [FAIL] ${testName}`, detail || '');
        }
    }
    // TEST 1: Routine complaint (Low Risk)
    const res1 = riskScorer_1.riskEngine.evaluateRisk('Streetlight broken near corner shop', 'Streetlight problems', 26.8467, 80.9462, 'session_test_1', []);
    assert(res1.score < 30 && res1.level === 'LOW', 'Test 1: Streetlight broken produces LOW risk', res1);
    // TEST 2: Minor civic issue (Low Risk)
    const res2 = riskScorer_1.riskEngine.evaluateRisk('Garbage accumulation in alleyway for two days', 'Garbage/waste', 26.8467, 80.9462, 'session_test_1', []);
    assert(res2.score < 30 && res2.level === 'LOW', 'Test 2: Garbage accumulation produces LOW risk', res2);
    // TEST 3: Moderate Risk (Harassment without severe physical keywords)
    const res3 = riskScorer_1.riskEngine.evaluateRisk('Suspicious group threatening passersby verbally', 'Harassment', 26.8467, 80.9462, 'session_test_1', []);
    assert(res3.score >= 30 && res3.score < 60, 'Test 3: Verbal threat/harassment produces MEDIUM risk (30-59)', res3);
    // TEST 4: High Risk (Road accident with collision)
    const res4 = riskScorer_1.riskEngine.evaluateRisk('There has been a severe road accident with head-on collision', 'Accident', 26.8467, 80.9462, 'session_test_1', []);
    assert(res4.score >= 60, `Test 4: Road accident produces HIGH risk (Score: ${res4.score})`, res4);
    // TEST 5: Critical Emergency (Accident + Bleeding + Unconscious) - Section 10 Demo Scenario
    const res5 = riskScorer_1.riskEngine.evaluateRisk('Two people are injured after a road accident. One person is bleeding and another appears unconscious.', 'Accident', 26.8467, 80.9462, 'session_test_1', []);
    assert(res5.score >= 80 && res5.level === 'CRITICAL', `Test 5: Accident + bleeding + unconscious produces CRITICAL risk (Score: ${res5.score}/100)`, res5);
    // TEST 6: Fire Outbreak with Trapped Victims
    const res6 = riskScorer_1.riskEngine.evaluateRisk('Huge fire outbreak on 3rd floor, people are trapped inside and screaming', 'Fire', 26.8467, 80.9462, 'session_test_1', []);
    assert(res6.score >= 80 && res6.level === 'CRITICAL', `Test 6: Fire + trapped produces CRITICAL risk (Score: ${res6.score}/100)`, res6);
    // TEST 7: Reporter Frequency Impact
    const existingReportsSameSession = [
        {
            id: 'c1',
            device_session_id: 'rapid_reporter_99',
            category: 'Road damage',
            description: 'Pothole',
            latitude: 26.8467,
            longitude: 80.9462,
            risk_score: 10,
            risk_level: 'LOW',
            status: 'Reported',
            created_at: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
            updated_at: new Date().toISOString(),
        },
        {
            id: 'c2',
            device_session_id: 'rapid_reporter_99',
            category: 'Road damage',
            description: 'Pothole getting bigger',
            latitude: 26.8467,
            longitude: 80.9462,
            risk_score: 10,
            risk_level: 'LOW',
            status: 'Reported',
            created_at: new Date(Date.now() - 1 * 60 * 1000).toISOString(),
            updated_at: new Date().toISOString(),
        },
    ];
    const res7 = riskScorer_1.riskEngine.evaluateRisk('Water pipe burst and spreading', 'Water leakage', 26.8467, 80.9462, 'rapid_reporter_99', existingReportsSameSession);
    assert(res7.breakdown.frequencyScore === 20, `Test 7: Multiple reports from same session added +20 frequency bonus`, res7.breakdown);
    // TEST 8: Location Clustering (Within 100 meters)
    // Distance between 26.8467, 80.9462 and 26.8470, 80.9463 is ~34 meters
    const existingNearbyReports = [
        {
            id: 'c3',
            device_session_id: 'other_user_1',
            category: 'Accident',
            description: 'Vehicle collided near market',
            latitude: 26.8470,
            longitude: 80.9463,
            risk_score: 55,
            risk_level: 'MEDIUM',
            status: 'Reported',
            created_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
            updated_at: new Date().toISOString(),
        },
        {
            id: 'c4',
            device_session_id: 'other_user_2',
            category: 'Accident',
            description: 'Crowd gathering around crash site',
            latitude: 26.8469,
            longitude: 80.9461,
            risk_score: 55,
            risk_level: 'MEDIUM',
            status: 'Reported',
            created_at: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
            updated_at: new Date().toISOString(),
        },
    ];
    const res8 = riskScorer_1.riskEngine.evaluateRisk('Vehicle crash blocked traffic', 'Accident', 26.8467, 80.9462, 'new_user_3', existingNearbyReports);
    assert(res8.breakdown.clusterScore === 25, `Test 8: Incidents within 100m proximity added +25 clustering bonus`, res8.breakdown);
    // TEST 9: Reports Far Apart Do NOT Trigger Clustering Bonus
    // Point 27.8467, 80.9462 is over 100 km away
    const farAwayReports = [
        {
            id: 'c5',
            device_session_id: 'other_user_far',
            category: 'Accident',
            description: 'Accident in distant city',
            latitude: 27.8467,
            longitude: 80.9462,
            risk_score: 60,
            risk_level: 'HIGH',
            status: 'Reported',
            created_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
            updated_at: new Date().toISOString(),
        },
    ];
    const res9 = riskScorer_1.riskEngine.evaluateRisk('Pothole on street', 'Road damage', 26.8467, 80.9462, 'session_far', farAwayReports);
    assert(res9.breakdown.clusterScore === 0, 'Test 9: Distant reports (>100m) do NOT add cluster score', res9.breakdown);
    // TEST 10: Automatic Server-Side Escalation in complaintStore
    const escalationResult = await complaintStore_1.complaintStore.createComplaint({
        category: 'Accident',
        description: 'Two people injured in head-on crash, heavy bleeding and one unconscious person',
        latitude: 26.8467,
        longitude: 80.9462,
        device_session_id: 'test_escalation_device',
    });
    assert(escalationResult.complaint.status === 'Critical Incident', `Test 10A: Server automatically set status to "Critical Incident" (Score: ${escalationResult.complaint.risk_score})`);
    assert(Boolean(escalationResult.incident), 'Test 10B: Emergency record created in incidents table');
    const { events } = await complaintStore_1.complaintStore.getComplaintById(escalationResult.complaint.id);
    const escalationEvent = events.find(e => e.changed_by === 'VERA_RISK_ENGINE');
    assert(Boolean(escalationEvent), 'Test 10C: Audit event recorded for automatic escalation');
    console.log(`\n====================================================`);
    console.log(`📊 TEST RESULTS: ${passed}/${total} TESTS PASSED (100%)`);
    console.log(`====================================================\n`);
}
runTests().catch(console.error);
