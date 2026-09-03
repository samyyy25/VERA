"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const health_routes_1 = __importDefault(require("./health.routes"));
const complaint_routes_1 = __importDefault(require("./complaint.routes"));
const incident_routes_1 = __importDefault(require("./incident.routes"));
const geocode_routes_1 = __importDefault(require("./geocode.routes"));
const ai_routes_1 = __importDefault(require("./ai.routes"));
const translation_routes_1 = __importDefault(require("./translation.routes"));
const location_routes_1 = __importDefault(require("./location.routes"));
const router = (0, express_1.Router)();
// Health & status endpoints
router.use('/health', health_routes_1.default);
// Complaint Management endpoints
router.use('/complaints', complaint_routes_1.default);
// Escalated Emergency Incidents endpoints
router.use('/incidents', incident_routes_1.default);
// Geolocation & reverse geocoding endpoints
router.use('/geocode', geocode_routes_1.default);
// AI & OmniRoute endpoints
router.use('/ai', ai_routes_1.default);
// Multilingual Translation endpoints
router.use('/translate', translation_routes_1.default);
// Nearby Emergency Services (Overpass POIs) & SMS
router.use('/locations', location_routes_1.default);
exports.default = router;
