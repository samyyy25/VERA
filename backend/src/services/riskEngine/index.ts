import { Complaint, IncidentIntelligence, DuplicateInfo, RiskLevel } from '../../types/complaint';
import { riskEngine, RiskEngine, RiskEvaluationResult, KeywordMatch, calculateDistanceMeters } from './riskScorer';
import { calculateConfidence, ConfidenceEvaluationResult } from './confidence';
import { extractDecisionFactors } from './decisionFactors';
import { buildIncidentIntelligence } from './incidentIntelligence';
import { detectDuplicateIncident } from './duplicateDetector';

export * from './riskScorer';
export * from './confidence';
export * from './decisionFactors';
export * from './incidentIntelligence';
export * from './duplicateDetector';

export interface CompleteIncidentAnalysisInput {
  category: string;
  description: string;
  latitude: number;
  longitude: number;
  gpsAccuracy?: number | null;
  photoUrl?: string | null;
  videoUrl?: string | null;
  voiceTranscript?: string | null;
  deviceSessionId: string;
  existingComplaints?: Complaint[];
  createdAt?: string;
}

export interface CompleteIncidentAnalysisResult {
  riskEvaluation: RiskEvaluationResult;
  confidenceEvaluation: ConfidenceEvaluationResult;
  decisionFactors: string[];
  incidentIntelligence: IncidentIntelligence;
  duplicateInfo: DuplicateInfo;
}

/**
 * Orchestrates pure Risk Scoring, Confidence Evaluation, Decision Factor Extraction,
 * Incident Intelligence generation, and Duplicate Incident Detection.
 */
export function analyzeIncident(input: CompleteIncidentAnalysisInput): CompleteIncidentAnalysisResult {
  const combinedText = [input.description || '', input.voiceTranscript || ''].filter(Boolean).join(' ');
  const existingComplaints = input.existingComplaints || [];

  // 1. Evaluate Pure Risk
  const riskEvaluation = riskEngine.evaluateRisk(
    combinedText,
    input.category,
    input.latitude,
    input.longitude,
    input.deviceSessionId,
    existingComplaints
  );

  // 2. Evaluate Confidence
  const confidenceEvaluation = calculateConfidence({
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
  const hasLocation =
    typeof input.latitude === 'number' &&
    typeof input.longitude === 'number' &&
    !isNaN(input.latitude) &&
    !isNaN(input.longitude) &&
    (input.latitude !== 0 || input.longitude !== 0);

  const decisionFactors = extractDecisionFactors({
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
  const incidentIntelligence = buildIncidentIntelligence({
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
  const duplicateInfo = detectDuplicateIncident({
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
