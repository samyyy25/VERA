"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.smsService = exports.SMSService = void 0;
class SMSService {
    /**
     * Compress incident data into a compact SMS payload for offline fallback
     */
    generateCompressedSMS(category, latitude, longitude, riskScore, description, nearestHospitalDistanceKm) {
        // Map category to 3-letter code
        const typeMap = {
            'Accident': 'ACC',
            'Fire': 'FIR',
            'Medical Emergency': 'MED',
            'Harassment': 'HRS',
            'Suspicious activity': 'SUS',
            'Road damage': 'ROD',
            'Water leakage': 'WAT',
            'Streetlight problems': 'LGT',
            'Garbage/waste': 'WST',
            'Noise complaints': 'NOI',
        };
        const typeCode = typeMap[category] || 'GEN';
        // Format coordinates to 4 decimal places (~11m accuracy)
        const coordStr = `${latitude.toFixed(4)},${longitude.toFixed(4)}`;
        const riskCode = `R${riskScore}`;
        // Extract quick tags from description
        const lower = description.toLowerCase();
        const tags = [];
        if (lower.includes('unconscious'))
            tags.push('UNC');
        if (lower.includes('bleed') || lower.includes('blood'))
            tags.push('BLD');
        if (lower.includes('trapped'))
            tags.push('TRP');
        if (lower.includes('injur') || lower.includes('hurt'))
            tags.push('INJ');
        if (lower.includes('fire') || lower.includes('burn'))
            tags.push('FLM');
        const urgencyTag = tags.length > 0 ? tags.join('+') : 'STD';
        const responderInfo = nearestHospitalDistanceKm !== undefined
            ? `HOSP_${nearestHospitalDistanceKm.toFixed(1)}KM`
            : 'LOC_VERIFIED';
        const rawPayload = `VERA|${typeCode}|${coordStr}|${riskCode}|${urgencyTag}|${responderInfo}`;
        return {
            rawPayload,
            charCount: rawPayload.length,
            maxSmsLength: 160,
            label: 'SMS FALLBACK — SIMULATION',
            fields: {
                protocol: 'VERA-v1',
                typeCode,
                coordinates: coordStr,
                riskCode,
                urgencyTag,
                responderInfo,
            },
        };
    }
}
exports.SMSService = SMSService;
exports.smsService = new SMSService();
