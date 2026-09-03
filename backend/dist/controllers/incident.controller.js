"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.escalateIncident = exports.getIncidentById = exports.getIncidents = void 0;
const complaintStore_1 = require("../services/store/complaintStore");
const getIncidents = async (_req, res) => {
    try {
        const incidents = await complaintStore_1.complaintStore.getAllIncidents();
        return res.status(200).json({
            success: true,
            count: incidents.length,
            incidents,
        });
    }
    catch (error) {
        return res.status(500).json({ error: 'Internal Server Error', message: error.message });
    }
};
exports.getIncidents = getIncidents;
const getIncidentById = async (req, res) => {
    try {
        const { id } = req.params;
        const { complaint, events, incident } = await complaintStore_1.complaintStore.getComplaintById(id);
        if (!complaint) {
            return res.status(404).json({ error: 'Incident not found' });
        }
        return res.status(200).json({
            success: true,
            complaint,
            incident,
            events,
        });
    }
    catch (error) {
        return res.status(500).json({ error: 'Internal Server Error', message: error.message });
    }
};
exports.getIncidentById = getIncidentById;
const escalateIncident = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason, note } = req.body;
        const updated = await complaintStore_1.complaintStore.updateStatus(id, 'Critical Incident', 'ADMIN_OVERRIDE', note || `Manual emergency escalation triggered: ${reason || 'Operator discretion'}`);
        if (!updated) {
            return res.status(404).json({ error: 'Complaint not found' });
        }
        return res.status(200).json({
            success: true,
            message: 'Incident escalated to Critical Emergency',
            complaint: updated,
        });
    }
    catch (error) {
        return res.status(500).json({ error: 'Internal Server Error', message: error.message });
    }
};
exports.escalateIncident = escalateIncident;
