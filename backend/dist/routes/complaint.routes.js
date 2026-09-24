"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const complaint_controller_1 = require("../controllers/complaint.controller");
const incident_controller_1 = require("../controllers/incident.controller");
const router = (0, express_1.Router)();
// Seed demo data (4 realistic records)
router.post('/seed', complaint_controller_1.seedDemoComplaints);
// Citizen: Submit complaint
router.post('/', complaint_controller_1.createComplaint);
// Admin & Feed: List complaints
router.get('/', complaint_controller_1.getComplaints);
// Recent events across all complaints (for Dashboard feed)
router.get('/events', complaint_controller_1.getRecentEvents);
// Detail & Timeline: Get single complaint
router.get('/:id', complaint_controller_1.getComplaintById);
// Admin: Update status
router.patch('/:id/status', complaint_controller_1.updateComplaintStatus);
// Live Incident Updates
router.get('/:id/updates', incident_controller_1.getIncidentUpdates);
router.post('/:id/updates', incident_controller_1.createIncidentUpdate);
router.patch('/:id/updates/:updateId/pin', incident_controller_1.togglePinUpdate);
exports.default = router;
