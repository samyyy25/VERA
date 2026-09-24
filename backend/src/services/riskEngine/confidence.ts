import { ConfidenceBasis } from '../../types/complaint';

export interface ConfidenceEvaluationInput {
  text: string;
  category: string;
  latitude: number;
  longitude: number;
  gpsAccuracy?: number | null;
  photoUrl?: string | null;
  videoUrl?: string | null;
  voiceTranscript?: string | null;
}

export interface ConfidenceEvaluationResult {
  score: number;
  basis: ConfidenceBasis;
}

/**
 * Calculates a transparent, heuristic confidence score (0-100%)
 * based on input completeness, category clarity, location precision, and evidence strength.
 */
export function calculateConfidence(input: ConfidenceEvaluationInput): ConfidenceEvaluationResult {
  const text = (input.text || '').trim();
  const wordCount = text.length > 0 ? text.split(/\s+/).length : 0;

  // 1. Input Completeness (0-100)
  let inputCompleteness = 30;
  if (wordCount >= 20) {
    inputCompleteness = 95;
  } else if (wordCount >= 10) {
    inputCompleteness = 80;
  } else if (wordCount >= 5) {
    inputCompleteness = 60;
  } else if (wordCount >= 1) {
    inputCompleteness = 45;
  }

  // 2. Category Clarity (0-100)
  const recognizedCategories = new Set([
    'Accident',
    'Fire',
    'Medical Emergency',
    'Road damage',
    'Garbage/waste',
    'Streetlight problems',
    'Water leakage',
    'Noise complaints',
    'Harassment',
    'Suspicious activity',
  ]);

  let categoryClarity = 50;
  if (input.category && input.category !== 'Other civic issues' && recognizedCategories.has(input.category)) {
    categoryClarity = 95;
  } else if (input.category && input.category !== 'Other civic issues') {
    categoryClarity = 75;
  }

  // 3. Location Availability & Precision (0-100)
  let locationAvailability = 20;
  const hasCoordinates =
    typeof input.latitude === 'number' &&
    typeof input.longitude === 'number' &&
    !isNaN(input.latitude) &&
    !isNaN(input.longitude) &&
    (input.latitude !== 0 || input.longitude !== 0);

  if (hasCoordinates) {
    const accuracy = input.gpsAccuracy;
    if (accuracy != null && accuracy > 0) {
      if (accuracy <= 15) {
        locationAvailability = 95;
      } else if (accuracy <= 50) {
        locationAvailability = 85;
      } else if (accuracy <= 100) {
        locationAvailability = 70;
      } else {
        locationAvailability = 55;
      }
    } else {
      locationAvailability = 65; // coordinates present without explicit accuracy
    }
  }

  // 4. Evidence Strength (0-100)
  let evidenceStrength = 65; // base text report
  const hasPhoto = Boolean(input.photoUrl && input.photoUrl.trim().length > 0);
  const hasVideo = Boolean(input.videoUrl && input.videoUrl.trim().length > 0);
  const hasVoice = Boolean(input.voiceTranscript && input.voiceTranscript.trim().length > 0);

  if (hasPhoto || hasVideo) {
    evidenceStrength = 95;
  } else if (hasVoice) {
    evidenceStrength = 85;
  }

  const basis: ConfidenceBasis = {
    input_completeness: inputCompleteness,
    category_clarity: categoryClarity,
    location_availability: locationAvailability,
    evidence_strength: evidenceStrength,
  };

  // Weighted composition
  const weightedScore =
    basis.input_completeness * 0.35 +
    basis.category_clarity * 0.25 +
    basis.location_availability * 0.25 +
    basis.evidence_strength * 0.15;

  const score = Math.min(Math.max(Math.round(weightedScore), 10), 100);

  return {
    score,
    basis,
  };
}
