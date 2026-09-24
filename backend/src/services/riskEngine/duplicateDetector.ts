import { Complaint, DuplicateInfo } from '../../types/complaint';
import { calculateDistanceMeters } from './riskScorer';

export interface DuplicateDetectionInput {
  category: string;
  description: string;
  latitude: number;
  longitude: number;
  createdAt?: string;
  existingComplaints: Complaint[];
}

/**
 * Calculates text token Jaccard similarity (0.0 - 1.0)
 */
function calculateTextSimilarity(textA: string, textB: string): number {
  const tokenize = (t: string) =>
    new Set(
      (t || '')
        .toLowerCase()
        .replace(/[^\w\s]/g, '')
        .split(/\s+/)
        .filter(w => w.length > 2)
    );

  const setA = tokenize(textA);
  const setB = tokenize(textB);

  if (setA.size === 0 || setB.size === 0) return 0;

  let intersection = 0;
  for (const word of setA) {
    if (setB.has(word)) intersection++;
  }

  const union = setA.size + setB.size - intersection;
  return union > 0 ? intersection / union : 0;
}

/**
 * Detects whether a complaint is a duplicate of an existing active incident (within 150m and 45min).
 * Does NOT delete or overwrite records; returns structured metadata for linking and cluster tracking.
 */
export function detectDuplicateIncident(input: DuplicateDetectionInput): DuplicateInfo {
  const now = input.createdAt ? new Date(input.createdAt).getTime() : Date.now();
  const fortyFiveMinutesAgo = now - 45 * 60 * 1000;

  // Filter existing complaints within the 45-minute window
  const activeCandidates = input.existingComplaints.filter(c => {
    const time = new Date(c.created_at).getTime();
    return time >= fortyFiveMinutesAgo && c.status !== 'Resolved';
  });

  let bestMatch: {
    complaint: Complaint;
    distanceMeters: number;
    timeDiffMinutes: number;
    similarityScore: number;
    reasons: string[];
  } | null = null;

  for (const candidate of activeCandidates) {
    const distanceMeters = calculateDistanceMeters(
      input.latitude,
      input.longitude,
      candidate.latitude,
      candidate.longitude
    );

    // Distance threshold: <= 150 meters
    if (distanceMeters <= 150) {
      const timeDiffMinutes = Math.max(
        0,
        Math.round((now - new Date(candidate.created_at).getTime()) / (60 * 1000))
      );
      const textSim = calculateTextSimilarity(input.description, candidate.description);
      const sameCategory =
        input.category.toLowerCase().trim() === (candidate.category || '').toLowerCase().trim();

      // Proximity score (1.0 at 0m down to 0.0 at 150m)
      const proximityScore = Math.max(0, 1 - distanceMeters / 150);
      // Recency score (1.0 at 0m down to 0.0 at 45m)
      const recencyScore = Math.max(0, 1 - timeDiffMinutes / 45);
      // Category match weight
      const catScore = sameCategory ? 1 : 0.4;

      // Composite similarity score
      const similarityScore = +(
        0.45 * proximityScore +
        0.25 * recencyScore +
        0.2 * catScore +
        0.1 * textSim
      ).toFixed(2);

      if (similarityScore >= 0.65) {
        const reasons: string[] = [
          `Within 150m (${Math.round(distanceMeters)}m from prior report)`,
          `Within 45 minutes (${timeDiffMinutes} min ago)`,
        ];
        if (sameCategory) {
          reasons.push(`Matching category: ${input.category}`);
        }
        if (textSim >= 0.3) {
          reasons.push(`High descriptive overlap (${Math.round(textSim * 100)}% match)`);
        }

        if (!bestMatch || similarityScore > bestMatch.similarityScore) {
          bestMatch = {
            complaint: candidate,
            distanceMeters,
            timeDiffMinutes,
            similarityScore,
            reasons,
          };
        }
      }
    }
  }

  if (bestMatch) {
    // Count how many existing reports already link to this primary incident
    const clusterMembers = input.existingComplaints.filter(
      c =>
        c.id === bestMatch!.complaint.id ||
        c.duplicate_info?.primary_incident_id === bestMatch!.complaint.id
    );

    return {
      is_duplicate: true,
      primary_incident_id: bestMatch.complaint.id,
      similarity_score: bestMatch.similarityScore,
      duplicate_count: clusterMembers.length + 1,
      reasons: bestMatch.reasons,
    };
  }

  return {
    is_duplicate: false,
    primary_incident_id: null,
    similarity_score: 0,
    duplicate_count: 0,
    reasons: [],
  };
}
