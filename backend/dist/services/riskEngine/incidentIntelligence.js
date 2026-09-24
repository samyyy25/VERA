"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildIncidentIntelligence = buildIncidentIntelligence;
/**
 * Builds the structured Incident Intelligence card from risk, confidence, text analysis, and location signals.
 */
function buildIncidentIntelligence(input) {
    const text = (input.description || '').toLowerCase();
    // 1. Standardized Incident Type
    let incidentType = input.category || 'Civic Issue';
    if (incidentType === 'Accident')
        incidentType = 'Road Accident';
    if (incidentType === 'Fire')
        incidentType = 'Fire Outbreak';
    if (incidentType === 'Medical Emergency')
        incidentType = 'Medical Emergency';
    // 2. People Affected Estimation
    let peopleAffected = '1';
    if (/\b(crowd|mob|bus|train|gathering|dozens|scores)\b/.test(text)) {
        peopleAffected = '5+';
    }
    else if (/\b(two|three|four|five|several|multiple|passengers|victims|people|2|3|4|5)\b/.test(text)) {
        peopleAffected = '2+';
    }
    else if (/\b(person|someone|driver|pedestrian|one|1)\b/.test(text)) {
        peopleAffected = '1';
    }
    else if (input.riskLevel === 'CRITICAL' || input.riskLevel === 'HIGH') {
        peopleAffected = '1-2';
    }
    // 3. Possible Injury Detection
    const injuryPatterns = /\b(injur\w*|wound\w*|bleed\w*|blood|unconscious|passed out|faint\w*|fractur\w*|burns|hurt|casualt\w*|death|dead|kill\w*|pain)\b/i;
    const possibleInjury = injuryPatterns.test(text) || input.category === 'Medical Emergency';
    // 4. Location Confirmed
    const locationConfirmed = typeof input.latitude === 'number' &&
        typeof input.longitude === 'number' &&
        !isNaN(input.latitude) &&
        !isNaN(input.longitude) &&
        (input.latitude !== 0 || input.longitude !== 0);
    // 5. Recommended Action
    let recommendedAction = 'Standard department queue routing';
    if (input.riskLevel === 'CRITICAL') {
        if (input.category === 'Accident') {
            recommendedAction = 'Immediate medical and police escalation';
        }
        else if (input.category === 'Fire') {
            recommendedAction = 'Immediate fire brigade and medical escalation';
        }
        else if (input.category === 'Medical Emergency') {
            recommendedAction = 'Immediate ambulance dispatch and hospital alert';
        }
        else {
            recommendedAction = 'Immediate emergency escalation and multi-agency alert';
        }
    }
    else if (input.riskLevel === 'HIGH') {
        recommendedAction = 'Priority response unit review and verification';
    }
    else if (input.riskLevel === 'MEDIUM') {
        recommendedAction = 'Expedited municipal department routing';
    }
    return {
        incident_type: incidentType,
        severity: input.riskLevel,
        risk_score: input.riskScore,
        confidence_score: input.confidenceScore,
        people_affected_estimate: peopleAffected,
        possible_injury: possibleInjury,
        location_confirmed: locationConfirmed,
        recommended_action: recommendedAction,
        decision_factors: input.decisionFactors,
    };
}
