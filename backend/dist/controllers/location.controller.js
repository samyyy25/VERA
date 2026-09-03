"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEmergencyPackage = exports.getNearbyResponders = void 0;
const overpassService_1 = require("../services/emergency/overpassService");
const smsService_1 = require("../services/emergency/smsService");
const getNearbyResponders = async (req, res) => {
    try {
        const lat = parseFloat(req.query.lat);
        const lon = parseFloat(req.query.lon);
        const radius = parseInt(req.query.radius || '5000', 10);
        if (isNaN(lat) || isNaN(lon)) {
            return res.status(400).json({ error: 'Valid lat and lon query parameters are required' });
        }
        const responders = await overpassService_1.overpassService.findNearbyResponders(lat, lon, radius);
        return res.status(200).json({
            success: true,
            data: responders,
        });
    }
    catch (error) {
        return res.status(500).json({ error: 'Nearby search failed', message: error.message });
    }
};
exports.getNearbyResponders = getNearbyResponders;
const getEmergencyPackage = async (req, res) => {
    try {
        const lat = parseFloat(req.query.lat);
        const lon = parseFloat(req.query.lon);
        const category = req.query.category || 'Accident';
        const riskScore = parseInt(req.query.risk_score || '85', 10);
        const description = req.query.description || 'Emergency incident';
        if (isNaN(lat) || isNaN(lon)) {
            return res.status(400).json({ error: 'Valid lat and lon query parameters are required' });
        }
        const responders = await overpassService_1.overpassService.findNearbyResponders(lat, lon, 5000);
        const nearestHospitalKm = responders.hospital ? responders.hospital.distance_meters / 1000 : undefined;
        const smsPayload = smsService_1.smsService.generateCompressedSMS(category, lat, lon, riskScore, description, nearestHospitalKm);
        return res.status(200).json({
            success: true,
            responders,
            smsPayload,
        });
    }
    catch (error) {
        return res.status(500).json({ error: 'Emergency package generation failed', message: error.message });
    }
};
exports.getEmergencyPackage = getEmergencyPackage;
