"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.reverseGeocode = void 0;
const axios_1 = __importDefault(require("axios"));
const env_1 = require("../../config/env");
// In-memory cache for reverse geocoding to respect OSM rate limits (max 1 req/sec)
const geocodeCache = new Map();
const CACHE_TTL_MS = 1000 * 60 * 60; // 1 hour
const reverseGeocode = async (latitude, longitude) => {
    // Round to 4 decimal places (~11 meters) for caching efficiency
    const cacheKey = `${latitude.toFixed(4)},${longitude.toFixed(4)}`;
    const cached = geocodeCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
        return cached.result;
    }
    try {
        const url = `${env_1.config.externalApis.nominatimUrl}/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`;
        const response = await axios_1.default.get(url, {
            timeout: 5000,
            headers: {
                'User-Agent': 'VERA-Voice-Emergency-Response-Assistant/1.0 (vera-emergency-app@local.dev)',
                'Accept-Language': 'en',
            },
        });
        if (response.data && response.data.display_name) {
            const data = response.data;
            const addr = data.address || {};
            const result = {
                address: data.display_name,
                city: addr.city || addr.town || addr.village || addr.suburb,
                state: addr.state,
                country: addr.country,
                postcode: addr.postcode,
                raw: data,
            };
            geocodeCache.set(cacheKey, { result, timestamp: Date.now() });
            return result;
        }
    }
    catch (error) {
        console.warn(`Reverse geocoding failed for [${latitude}, ${longitude}]:`, error.message);
    }
    // Fallback if Nominatim fails or times out
    const fallbackResult = {
        address: `Coordinates: ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`,
    };
    return fallbackResult;
};
exports.reverseGeocode = reverseGeocode;
