"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const location_controller_1 = require("../controllers/location.controller");
const router = (0, express_1.Router)();
router.get('/nearby', location_controller_1.getNearbyResponders);
router.get('/emergency-package', location_controller_1.getEmergencyPackage);
exports.default = router;
