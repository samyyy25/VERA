"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const nominatim_1 = require("../services/geolocation/nominatim");
const router = (0, express_1.Router)();
router.get('/reverse', async (req, res) => {
    const lat = parseFloat(req.query.lat);
    const lon = parseFloat(req.query.lon);
    if (isNaN(lat) || isNaN(lon)) {
        return res.status(400).json({ error: 'Valid lat and lon query parameters are required' });
    }
    try {
        const result = await (0, nominatim_1.reverseGeocode)(lat, lon);
        return res.status(200).json({
            success: true,
            data: result,
        });
    }
    catch (error) {
        return res.status(500).json({ error: 'Reverse geocoding failed', message: error.message });
    }
});
exports.default = router;
