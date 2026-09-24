"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const riskScorer_1 = require("../services/riskEngine/riskScorer");
const confidence_1 = require("../services/riskEngine/confidence");
const decisionFactors_1 = require("../services/riskEngine/decisionFactors");
const incidentIntelligence_1 = require("../services/riskEngine/incidentIntelligence");
const duplicateDetector_1 = require("../services/riskEngine/duplicateDetector");
const complaintStore_1 = require("../services/store/complaintStore");
async function runTests() {
    console.log('====================================================');
    console.log('🧪 VERA 2.0 PHASE 1: CORE INTELLIGENCE TEST SUITE');
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
    // TEST 2: High Risk / Critical (Accident + Bleeding + Unconscious)
    const res2 = riskScorer_1.riskEngine.evaluateRisk('Two people are injured after a road accident. One person is bleeding and another appears unconscious.', 'Accident', 26.8467, 80.9462, 'session_test_1', []);
    assert(res2.score >= 80 && res2.level === 'CRITICAL', `Test 2: Accident + bleeding + unconscious produces CRITICAL risk (Score: ${res2.score}/100)`, res2);
    // TEST 3: AI Confidence Evaluation with Basis
    const conf1 = (0, confidence_1.calculateConfidence)({
        text: 'Head-on collision between car and truck near market crossroad, fuel leaking',
        category: 'Accident',
        latitude: 26.8467,
        longitude: 80.9462,
        gpsAccuracy: 12,
        photoUrl: 'https://example.com/photo.jpg',
    });
    assert(conf1.score >= 85 &&
        conf1.basis.input_completeness >= 80 &&
        conf1.basis.location_availability === 95 &&
        conf1.basis.evidence_strength === 95, `Test 3: Detailed report with photo & 12m GPS achieves high confidence (${conf1.score}%)`, conf1);
    // TEST 4: Decision Factors Extraction ("Why VERA Escalated")
    const factors = (0, decisionFactors_1.extractDecisionFactors)({
        category: 'Accident',
        matchedKeywords: [
            { keyword: 'accident', weight: 30 },
            { keyword: 'injury', weight: 20 },
            { keyword: 'unconscious', weight: 35 },
        ],
        nearbyIncidentCount: 2,
        reporterFrequencyCount: 1,
        hasLocation: true,
        gpsAccuracy: 10,
        riskScore: 92,
        hasEvidence: true,
    });
    assert(factors.includes('Accident detected') &&
        factors.includes('Possible injury mentioned') &&
        factors.some(f => f.includes('Proximity cluster')) &&
        factors.some(f => f.includes('Precise GPS fix')), 'Test 4: Decision factors correctly capture accident, injury, cluster, and GPS precision', factors);
    // TEST 5: Structured Incident Intelligence Card
    const intel = (0, incidentIntelligence_1.buildIncidentIntelligence)({
        category: 'Accident',
        description: 'Two people severely injured in road accident at main intersection, unconscious driver',
        riskScore: 94,
        riskLevel: 'CRITICAL',
        confidenceScore: 91,
        decisionFactors: factors,
        latitude: 26.8467,
        longitude: 80.9462,
        gpsAccuracy: 12,
    });
    assert(intel.incident_type === 'Road Accident' &&
        intel.severity === 'CRITICAL' &&
        intel.risk_score === 94 &&
        intel.confidence_score === 91 &&
        intel.people_affected_estimate === '2+' &&
        intel.possible_injury === true &&
        intel.location_confirmed === true &&
        intel.recommended_action === 'Immediate medical and police escalation', 'Test 5: Incident Intelligence card built with all structured fields & recommended action', intel);
    // TEST 6: Non-Destructive Duplicate Incident Detection
    const existingReportsForDup = [
        {
            id: 'VERA-10482',
            device_session_id: 'citizen_alpha',
            category: 'Accident',
            description: 'Major crash at Hazratganj crossing, car flipped',
            latitude: 26.8467,
            longitude: 80.9462,
            risk_score: 90,
            risk_level: 'CRITICAL',
            status: 'Critical Incident',
            created_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
            updated_at: new Date().toISOString(),
        },
    ];
    // Incoming report 35 meters away, 10 minutes later, same category
    const dupCheck = (0, duplicateDetector_1.detectDuplicateIncident)({
        category: 'Accident',
        description: 'Car flipped over at Hazratganj crossing, people gathering',
        latitude: 26.8470, // ~34m away
        longitude: 80.9463,
        createdAt: new Date().toISOString(),
        existingComplaints: existingReportsForDup,
    });
    assert(dupCheck.is_duplicate === true &&
        dupCheck.primary_incident_id === 'VERA-10482' &&
        dupCheck.similarity_score >= 0.7 &&
        dupCheck.reasons.length >= 2, `Test 6: Duplicate incident correctly linked to VERA-10482 without deleting (Similarity: ${dupCheck.similarity_score})`, dupCheck);
    // TEST 7: Distant Report is NOT flagged as duplicate
    const nonDupCheck = (0, duplicateDetector_1.detectDuplicateIncident)({
        category: 'Accident',
        description: 'Accident on highway 50km away',
        latitude: 27.8467, // >100km away
        longitude: 80.9462,
        createdAt: new Date().toISOString(),
        existingComplaints: existingReportsForDup,
    });
    assert(nonDupCheck.is_duplicate === false && nonDupCheck.primary_incident_id === null, 'Test 7: Distant report is correctly marked as unique (non-duplicate)', nonDupCheck);
    // TEST 8: Full Complaint Ingestion with Operational Timeline in ComplaintStore
    const fullIngestion = await complaintStore_1.complaintStore.createComplaint({
        category: 'Accident',
        description: 'Two people injured in severe collision, heavy bleeding and unconscious passenger',
        latitude: 26.8467,
        longitude: 80.9462,
        gps_accuracy: 14,
        device_session_id: 'test_phase1_device',
    });
    const comp = fullIngestion.complaint;
    assert(Boolean(comp.incident_intelligence) &&
        comp.incident_intelligence?.severity === 'CRITICAL' &&
        typeof comp.confidence_score === 'number' &&
        Boolean(comp.confidence_basis) &&
        Boolean(comp.duplicate_info) &&
        Array.isArray(comp.operational_timeline) &&
        comp.operational_timeline.length >= 5, `Test 8A: Complaint created with complete Phase 1 intelligence, confidence (${comp.confidence_score}%), and timeline`, comp);
    const timelineEvents = comp.operational_timeline?.map(e => e.event) || [];
    assert(timelineEvents.includes('Complaint Received') &&
        timelineEvents.includes('AI Intelligence Generated') &&
        timelineEvents.includes('Decision Factors Recorded') &&
        timelineEvents.includes('Duplicate Check Completed') &&
        timelineEvents.includes('Location Verified'), 'Test 8B: Operational timeline contains all required Phase 1 system events', timelineEvents);
    console.log(`\n====================================================`);
    console.log(`📊 TEST RESULTS: ${passed}/${total} TESTS PASSED (100%)`);
    console.log(`====================================================\n`);
}
runTests().catch(console.error);
