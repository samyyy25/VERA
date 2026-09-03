"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const complaint_controller_1 = require("../controllers/complaint.controller");
const router = (0, express_1.Router)();
// Citizen: Submit complaint
router.post('/', complaint_controller_1.createComplaint);
// Admin & Feed: List complaints
router.get('/', complaint_controller_1.getComplaints);
// Detail & Timeline: Get single complaint
router.get('/:id', complaint_controller_1.getComplaintById);
// Admin: Update status
router.patch('/:id/status', complaint_controller_1.updateComplaintStatus);
exports.default = router;
