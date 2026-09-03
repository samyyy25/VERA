"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const incident_controller_1 = require("../controllers/incident.controller");
const router = (0, express_1.Router)();
router.get('/', incident_controller_1.getIncidents);
router.get('/:id', incident_controller_1.getIncidentById);
router.post('/:id/escalate', incident_controller_1.escalateIncident);
exports.default = router;
