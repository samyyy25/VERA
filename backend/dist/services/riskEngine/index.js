"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeIncident = analyzeIncident;
const riskScorer_1 = require("./riskScorer");
const confidence_1 = require("./confidence");
const decisionFactors_1 = require("./decisionFactors");
const incidentIntelligence_1 = require("./incidentIntelligence");
const duplicateDetector_1 = require("./duplicateDetector");
__exportStar(require("./riskScorer"), exports);
__exportStar(require("./confidence"), exports);
__exportStar(require("./decisionFactors"), exports);
__exportStar(require("./incidentIntelligence"), exports);
__exportStar(require("./duplicateDetector"), exports);
/**
 * Orchestrates pure Risk Scoring, Confidence Evaluation, Decision Factor Extraction,
 * Incident Intelligence generation, and Duplicate Incident Detection.
 */
function analyzeIncident(input) {
    const combinedText = [input.description || '', input.voiceTranscript || ''].filter(Boolean).join(' ');
    const existingComplaints = input.existingComplaints || [];
    // 1. Evaluate Pure Risk
    const riskEvaluation = riskScorer_1.riskEngine.evaluateRisk(combinedText, input.category, input.latitude, input.longitude, input.deviceSessionId, existingComplaints);
    // 2. Evaluate Confidence
    const confidenceEvaluation = (0, confidence_1.calculateConfidence)({
        text: combinedText,
        category: input.category,
        latitude: input.latitude,
        longitude: input.longitude,
        gpsAccuracy: input.gpsAccuracy,
        photoUrl: input.photoUrl,
        videoUrl: input.videoUrl,
        voiceTranscript: input.voiceTranscript,
    });
    // 3. Extract Human-Readable Decision Factors
    const hasLocation = typeof input.latitude === 'number' &&
        typeof input.longitude === 'number' &&
        !isNaN(input.latitude) &&
        !isNaN(input.longitude) &&
        (input.latitude !== 0 || input.longitude !== 0);
    const decisionFactors = (0, decisionFactors_1.extractDecisionFactors)({
        category: input.category,
        matchedKeywords: riskEvaluation.breakdown.matchedKeywords,
        nearbyIncidentCount: riskEvaluation.breakdown.nearbyIncidentCount,
        reporterFrequencyCount: riskEvaluation.breakdown.reporterFrequencyCount,
        hasLocation,
        gpsAccuracy: input.gpsAccuracy,
        riskScore: riskEvaluation.score,
        hasEvidence: Boolean(input.photoUrl || input.videoUrl || input.voiceTranscript),
    });
    // 4. Build Structured Incident Intelligence Card
    const incidentIntelligence = (0, incidentIntelligence_1.buildIncidentIntelligence)({
        category: input.category,
        description: combinedText,
        riskScore: riskEvaluation.score,
        riskLevel: riskEvaluation.level,
        confidenceScore: confidenceEvaluation.score,
        decisionFactors,
        latitude: input.latitude,
        longitude: input.longitude,
        gpsAccuracy: input.gpsAccuracy,
    });
    // 5. Detect Duplicate Incident & Cluster Relation
    const duplicateInfo = (0, duplicateDetector_1.detectDuplicateIncident)({
        category: input.category,
        description: combinedText,
        latitude: input.latitude,
        longitude: input.longitude,
        createdAt: input.createdAt,
        existingComplaints,
    });
    return {
        riskEvaluation,
        confidenceEvaluation,
        decisionFactors,
        incidentIntelligence,
        duplicateInfo,
    };
}
