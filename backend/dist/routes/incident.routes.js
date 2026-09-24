"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const incident_controller_1 = require("../controllers/incident.controller");
const router = (0, express_1.Router)();
router.get('/', incident_controller_1.getIncidents);
router.get('/:id', incident_controller_1.getIncidentById);
router.post('/:id/escalate', incident_controller_1.escalateIncident);
// Phase 2: Response Orchestration Routes
router.get('/:id/response-plan', incident_controller_1.getResponsePlan);
router.post('/:id/confirm-response', incident_controller_1.confirmResponsePlan);
router.post('/:id/modify-response', incident_controller_1.modifyResponsePlan);
// Live Incident Updates Routes
router.get('/:id/updates', incident_controller_1.getIncidentUpdates);
router.post('/:id/updates', incident_controller_1.createIncidentUpdate);
router.patch('/:id/updates/:updateId/pin', incident_controller_1.togglePinUpdate);
exports.default = router;
