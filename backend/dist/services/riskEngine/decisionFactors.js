"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractDecisionFactors = extractDecisionFactors;
/**
 * Generates transparent, human-readable decision factors explaining why VERA calculated the risk and escalation.
 */
function extractDecisionFactors(input) {
    const factors = [];
    const keywordMap = new Set(input.matchedKeywords.map(k => k.keyword.toLowerCase()));
    // 1. Specific High-Severity Signals
    if (keywordMap.has('accident')) {
        factors.push('Accident detected');
    }
    if (keywordMap.has('injury') || keywordMap.has('bleeding') || keywordMap.has('unconscious')) {
        factors.push('Possible injury mentioned');
    }
    if (keywordMap.has('explosion') || keywordMap.has('fire') || keywordMap.has('hazard/smoke')) {
        factors.push('Fire / hazardous conditions reported');
    }
    if (keywordMap.has('collapsed/trapped')) {
        factors.push('Trapped individuals or structural collapse indicated');
    }
    if (keywordMap.has('weapon/assault') || keywordMap.has('violence/attack') || keywordMap.has('threat')) {
        factors.push('Violence or security threat reported');
    }
    if (keywordMap.has('emergency/danger') || keywordMap.has('fatality/casualty')) {
        factors.push('Immediate danger indicated');
    }
    // 2. Category Level Signals
    if (['Accident', 'Fire', 'Medical Emergency'].includes(input.category)) {
        if (!factors.some(f => f.toLowerCase().includes(input.category.toLowerCase()))) {
            factors.push(`High-risk category: ${input.category}`);
        }
    }
    // 3. Proximity / Multi-Report Cluster Signals
    if (input.nearbyIncidentCount >= 2) {
        factors.push(`Proximity cluster: ${input.nearbyIncidentCount} nearby reports within 100m`);
    }
    else if (input.nearbyIncidentCount === 1) {
        factors.push('Proximity cluster: 1 adjacent report detected within 100m');
    }
    // 4. Repeated Reporter Frequency
    if (input.reporterFrequencyCount >= 1) {
        factors.push(`Multiple rapid reports from same device (${input.reporterFrequencyCount + 1} total)`);
    }
    // 5. Location Verification
    if (input.hasLocation) {
        if (input.gpsAccuracy != null && input.gpsAccuracy <= 20) {
            factors.push(`Precise GPS fix available (±${Math.round(input.gpsAccuracy)}m)`);
        }
        else {
            factors.push('GPS location available');
        }
    }
    // 6. Routine Civic Fallback (if no critical factors triggered)
    if (factors.length === 0) {
        if (input.riskScore < 30) {
            factors.push('Routine civic maintenance request');
            factors.push('No acute danger keywords detected');
        }
        else {
            factors.push('Standard priority civic report');
        }
    }
    return factors;
}
