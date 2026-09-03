import { Complaint, RiskLevel } from '../../types/complaint';

export interface KeywordMatch {
  keyword: string;
  weight: number;
}

export interface RiskEvaluationResult {
  score: number;
  level: RiskLevel;
  breakdown: {
    keywordScore: number;
    matchedKeywords: KeywordMatch[];
    categoryScore: number;
    frequencyScore: number;
    clusterScore: number;
    nearbyIncidentCount: number;
    reporterFrequencyCount: number;
  };
}

// 1. Weighted Danger Keywords & Patterns
const DANGER_KEYWORDS: { pattern: RegExp; keyword: string; weight: number }[] = [
  { pattern: /\b(explosion|blast|bomb|detonat\w*)\b/i, keyword: 'explosion', weight: 40 },
  { pattern: /\b(dead|death|fatal\w*|casualt\w*|kill\w*)\b/i, keyword: 'fatality/casualty', weight: 40 },
  { pattern: /\b(unconscious|passed out|faint\w*|unresponsive)\b/i, keyword: 'unconscious', weight: 35 },
  { pattern: /\b(bleed\w*|blood|hemorrhag\w*)\b/i, keyword: 'bleeding', weight: 35 },
  { pattern: /\b(collaps\w*|crush\w*|trapped)\b/i, keyword: 'collapsed/trapped', weight: 35 },
  { pattern: /\b(gun\w*|knife|knives|weapon\w*|stab\w*|shot|shoot\w*)\b/i, keyword: 'weapon/assault', weight: 35 },
  { pattern: /\b(fire|flame\w*|blaz\w*|burn\w*)\b/i, keyword: 'fire', weight: 30 },
  { pattern: /\b(accident|crash\w*|collis\w*|wreck\w*)\b/i, keyword: 'accident', weight: 30 },
  { pattern: /\b(attack\w*|assault\w*|mob\b|violenc\w*|violent)\b/i, keyword: 'violence/attack', weight: 30 },
  { pattern: /\b(emergency|critical|danger\w*|life-threatening)\b/i, keyword: 'emergency/danger', weight: 30 },
  { pattern: /\b(threat\w*|hostage|stalk\w*)\b/i, keyword: 'threat', weight: 25 },
  { pattern: /\b(injur\w*|wound\w*|fractur\w*|burns|hurt)\b/i, keyword: 'injury', weight: 20 },
  { pattern: /\b(smoke|toxic|poison\w*|hazard\w*)\b/i, keyword: 'hazard/smoke', weight: 20 },
];

// 2. Category Base Severity Weights
const CATEGORY_WEIGHTS: Record<string, number> = {
  'Fire': 30,
  'Medical Emergency': 30,
  'Accident': 30,
  'Harassment': 20,
  'Suspicious activity': 15,
  'Road damage': 5,
  'Water leakage': 5,
  'Streetlight problems': 0,
  'Garbage/waste': 0,
  'Noise complaints': 0,
  'Other civic issues': 0,
};

// 3. Haversine distance in meters
export const calculateDistanceMeters = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371e3; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export class RiskEngine {
  /**
   * Deterministic Risk Calculation:
   * text keywords + category + reporter frequency + location clustering -> 0-100 score
   */
  public evaluateRisk(
    text: string,
    category: string,
    latitude: number,
    longitude: number,
    deviceSessionId: string,
    existingComplaints: Complaint[] = []
  ): RiskEvaluationResult {
    const combinedText = (text || '').toLowerCase();
    let keywordScore = 0;
    const matchedKeywords: KeywordMatch[] = [];

    // A. Keyword Analysis (Deduplicated across matching patterns)
    const seenKeywords = new Set<string>();
    for (const rule of DANGER_KEYWORDS) {
      if (rule.pattern.test(combinedText)) {
        if (!seenKeywords.has(rule.keyword)) {
          seenKeywords.add(rule.keyword);
          matchedKeywords.push({ keyword: rule.keyword, weight: rule.weight });
          keywordScore += rule.weight;
        }
      }
    }

    // B. Category Severity Points
    const categoryScore = CATEGORY_WEIGHTS[category] ?? 0;

    // C. Reporter Frequency Points (within last 15 minutes)
    const fifteenMinutesAgo = Date.now() - 15 * 60 * 1000;
    const recentReportsBySameDevice = existingComplaints.filter(c => 
      c.device_session_id === deviceSessionId &&
      new Date(c.created_at).getTime() > fifteenMinutesAgo
    );
    const reporterFrequencyCount = recentReportsBySameDevice.length;
    let frequencyScore = 0;
    if (reporterFrequencyCount >= 2) {
      frequencyScore = 20;
    } else if (reporterFrequencyCount === 1) {
      frequencyScore = 10;
    }

    // D. Location Clustering (Within 100m, past 30 minutes)
    const thirtyMinutesAgo = Date.now() - 30 * 60 * 1000;
    const nearbyReports = existingComplaints.filter(c => {
      if (new Date(c.created_at).getTime() < thirtyMinutesAgo) return false;
      const distance = calculateDistanceMeters(latitude, longitude, c.latitude, c.longitude);
      return distance <= 100;
    });
    const nearbyIncidentCount = nearbyReports.length;
    let clusterScore = 0;
    if (nearbyIncidentCount >= 2) {
      clusterScore = 25;
    } else if (nearbyIncidentCount === 1) {
      clusterScore = 15;
    }

    // E. Total Score Calculation & Clamping
    const rawScore = keywordScore + categoryScore + frequencyScore + clusterScore;
    const finalScore = Math.min(Math.max(rawScore, 0), 100);

    // F. Risk Level Classification
    let level: RiskLevel = 'LOW';
    if (finalScore >= 80) {
      level = 'CRITICAL';
    } else if (finalScore >= 60) {
      level = 'HIGH';
    } else if (finalScore >= 30) {
      level = 'MEDIUM';
    } else {
      level = 'LOW';
    }

    return {
      score: finalScore,
      level,
      breakdown: {
        keywordScore,
        matchedKeywords,
        categoryScore,
        frequencyScore,
        clusterScore,
        nearbyIncidentCount,
        reporterFrequencyCount,
      },
    };
  }
}

export const riskEngine = new RiskEngine();
