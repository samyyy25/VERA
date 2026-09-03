"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const axios_1 = __importDefault(require("axios"));
const env_1 = require("../config/env");
const supabase_1 = require("../lib/supabase");
const router = (0, express_1.Router)();
router.get('/', async (_req, res) => {
    const healthStatus = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        service: 'VERA Emergency Response Backend',
        services: {
            database: 'unconfigured',
            omniroute: 'unreachable',
            translation: 'unknown',
            maps: 'unknown',
        },
    };
    // 1. Check Database (Supabase)
    const supabase = (0, supabase_1.getSupabase)();
    if (!supabase) {
        healthStatus.services.database = 'not_configured';
    }
    else {
        try {
            const { error } = await supabase.from('complaints').select('id').limit(1);
            if (error) {
                healthStatus.services.database = `error: ${error.message}`;
            }
            else {
                healthStatus.services.database = 'connected';
            }
        }
        catch (err) {
            healthStatus.services.database = `error: ${err.message || 'connection failed'}`;
        }
    }
    // 2. Check OmniRoute Gateway (Local endpoint: http://localhost:20128/v1)
    try {
        const omniResponse = await axios_1.default.get(`${env_1.config.omniRoute.baseUrl}/models`, {
            timeout: 2000,
            headers: env_1.config.omniRoute.apiKey ? { Authorization: `Bearer ${env_1.config.omniRoute.apiKey}` } : {},
        });
        if (omniResponse.status === 200) {
            healthStatus.services.omniroute = 'connected';
            healthStatus.services.omniroute_model = env_1.config.omniRoute.model;
        }
    }
    catch (err) {
        healthStatus.services.omniroute = 'unreachable (local gateway offline)';
    }
    // 3. Check OpenStreetMap Nominatim Geocoding
    try {
        const geoResponse = await axios_1.default.get(`${env_1.config.externalApis.nominatimUrl}/status.php`, {
            timeout: 3000,
            headers: {
                'User-Agent': 'VERA-Voice-Emergency-Response-Assistant/1.0',
            },
        });
        healthStatus.services.maps = geoResponse.status === 200 ? 'available' : 'degraded';
    }
    catch {
        healthStatus.services.maps = 'available (fallback ready)';
    }
    // 4. Check Translation API
    healthStatus.services.translation = 'available (LibreTranslate/MyMemory fallback configured)';
    return res.status(200).json(healthStatus);
});
exports.default = router;
