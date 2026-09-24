"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.togglePinUpdate = exports.createIncidentUpdate = exports.getIncidentUpdates = exports.modifyResponsePlan = exports.confirmResponsePlan = exports.getResponsePlan = exports.escalateIncident = exports.getIncidentById = exports.getIncidents = void 0;
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
const getResponsePlan = async (req, res) => {
    try {
        const { id } = req.params;
        const plan = await complaintStore_1.complaintStore.getResponsePlan(id);
        if (!plan) {
            return res.status(404).json({ error: 'Complaint not found or no response plan available' });
        }
        return res.status(200).json({
            success: true,
            plan,
        });
    }
    catch (error) {
        console.error('Error fetching response plan:', error);
        return res.status(500).json({ error: 'Internal Server Error', message: error.message });
    }
};
exports.getResponsePlan = getResponsePlan;
const confirmResponsePlan = async (req, res) => {
    try {
        const { id } = req.params;
        const { confirmed_by, notes } = req.body;
        const result = await complaintStore_1.complaintStore.confirmResponsePlan(id, confirmed_by || 'AUTHORIZED_OPERATOR', notes);
        if (!result) {
            return res.status(404).json({ error: 'Complaint not found' });
        }
        return res.status(200).json({
            success: true,
            message: 'Emergency response plan confirmed and units dispatched',
            complaint: result.complaint,
            plan: result.plan,
        });
    }
    catch (error) {
        console.error('Error confirming response plan:', error);
        return res.status(500).json({ error: 'Internal Server Error', message: error.message });
    }
};
exports.confirmResponsePlan = confirmResponsePlan;
const modifyResponsePlan = async (req, res) => {
    try {
        const { id } = req.params;
        const { action, details, changed_by } = req.body;
        const updated = await complaintStore_1.complaintStore.modifyResponsePlan(id, action || 'MODIFY', details, changed_by || 'AUTHORIZED_OPERATOR');
        if (!updated) {
            return res.status(404).json({ error: 'Complaint not found' });
        }
        return res.status(200).json({
            success: true,
            message: action === 'DOWNGRADE' ? 'Incident downgraded to civic queue' : 'Response plan modified',
            complaint: updated,
        });
    }
    catch (error) {
        console.error('Error modifying response plan:', error);
        return res.status(500).json({ error: 'Internal Server Error', message: error.message });
    }
};
exports.modifyResponsePlan = modifyResponsePlan;
const getIncidentUpdates = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = await complaintStore_1.complaintStore.getIncidentUpdates(id);
        return res.status(200).json({
            success: true,
            count: updates.length,
            updates,
        });
    }
    catch (error) {
        console.error('Error fetching incident updates:', error);
        return res.status(500).json({ error: 'Internal Server Error', message: error.message });
    }
};
exports.getIncidentUpdates = getIncidentUpdates;
const createIncidentUpdate = async (req, res) => {
    try {
        const { id } = req.params;
        const { author_type, author_name, author_role, message, update_type, photo_url, is_pinned, is_verified_authority } = req.body;
        if (!message || !message.trim()) {
            return res.status(400).json({ error: 'Message content is required' });
        }
        const created = await complaintStore_1.complaintStore.addIncidentUpdate(id, {
            author_type: author_type || 'citizen',
            author_name: author_name || (author_type === 'citizen' ? 'Citizen' : 'Authorized Officer'),
            author_role,
            message: message.trim(),
            update_type,
            photo_url,
            is_pinned,
            is_verified_authority,
        });
        if (!created) {
            return res.status(404).json({ error: 'Incident/Complaint not found' });
        }
        return res.status(201).json({
            success: true,
            message: 'Update posted successfully',
            update: created,
        });
    }
    catch (error) {
        console.error('Error posting incident update:', error);
        return res.status(500).json({ error: 'Internal Server Error', message: error.message });
    }
};
exports.createIncidentUpdate = createIncidentUpdate;
const togglePinUpdate = async (req, res) => {
    try {
        const { id, updateId } = req.params;
        const updated = await complaintStore_1.complaintStore.togglePinUpdate(id, updateId);
        if (!updated) {
            return res.status(404).json({ error: 'Incident or update not found' });
        }
        return res.status(200).json({
            success: true,
            message: updated.is_pinned ? 'Update pinned to top' : 'Update unpinned',
            update: updated,
        });
    }
    catch (error) {
        console.error('Error toggling pin on update:', error);
        return res.status(500).json({ error: 'Internal Server Error', message: error.message });
    }
};
exports.togglePinUpdate = togglePinUpdate;
