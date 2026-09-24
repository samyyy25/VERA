"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedDemoComplaints = exports.getRecentEvents = exports.updateComplaintStatus = exports.getComplaintById = exports.getComplaints = exports.createComplaint = void 0;
const zod_1 = require("zod");
const complaintStore_1 = require("../services/store/complaintStore");
const nominatim_1 = require("../services/geolocation/nominatim");
const createComplaintSchema = zod_1.z.object({
    category: zod_1.z.string().min(1, 'Category is required'),
    description: zod_1.z.string().min(3, 'Description must be at least 3 characters'),
    latitude: zod_1.z.number().min(-90).max(90),
    longitude: zod_1.z.number().min(-180).max(180),
    gps_accuracy: zod_1.z.number().optional().nullable(),
    address: zod_1.z.string().optional().nullable(),
    photo_url: zod_1.z.string().optional().nullable(),
    video_url: zod_1.z.string().optional().nullable(),
    voice_transcript: zod_1.z.string().optional().nullable(),
    device_session_id: zod_1.z.string().min(1, 'Device session ID is required'),
});
const updateStatusSchema = zod_1.z.object({
    status: zod_1.z.enum([
        'Reported',
        'Verified',
        'In Progress',
        'Critical Incident',
        'Emergency Response',
        'Resolved',
    ]),
    note: zod_1.z.string().optional(),
    changed_by: zod_1.z.string().optional().default('ADMIN'),
});
const createComplaint = async (req, res) => {
    try {
        const parseResult = createComplaintSchema.safeParse(req.body);
        if (!parseResult.success) {
            return res.status(400).json({
                error: 'Validation failed',
                details: parseResult.error.errors,
            });
        }
        const data = parseResult.data;
        // Automatic reverse geocoding if address wasn't provided by client
        let address = data.address;
        if (!address || address.trim() === '') {
            const geo = await (0, nominatim_1.reverseGeocode)(data.latitude, data.longitude);
            address = geo.address;
        }
        const result = await complaintStore_1.complaintStore.createComplaint({
            ...data,
            address: address || undefined,
            gps_accuracy: data.gps_accuracy || undefined,
            photo_url: data.photo_url || undefined,
            video_url: data.video_url || undefined,
            voice_transcript: data.voice_transcript || undefined,
        });
        return res.status(201).json({
            success: true,
            message: result.complaint.status === 'Critical Incident'
                ? '🚨 Emergency detected: Incident automatically escalated to Critical Incident'
                : 'Complaint submitted successfully',
            complaint: result.complaint,
            risk_evaluation: result.riskEvaluation,
            incident: result.incident,
        });
    }
    catch (error) {
        console.error('Error creating complaint:', error);
        return res.status(500).json({ error: 'Internal Server Error', message: error.message });
    }
};
exports.createComplaint = createComplaint;
const getComplaints = async (req, res) => {
    try {
        const { category, status, risk_level, search } = req.query;
        const complaints = await complaintStore_1.complaintStore.getAllComplaints({
            category: category,
            status: status,
            risk_level: risk_level,
            search: search,
        });
        return res.status(200).json({
            success: true,
            count: complaints.length,
            complaints,
        });
    }
    catch (error) {
        console.error('Error listing complaints:', error);
        return res.status(500).json({ error: 'Internal Server Error', message: error.message });
    }
};
exports.getComplaints = getComplaints;
const getComplaintById = async (req, res) => {
    try {
        const { id } = req.params;
        const { complaint, events } = await complaintStore_1.complaintStore.getComplaintById(id);
        if (!complaint) {
            return res.status(404).json({ error: 'Complaint not found' });
        }
        return res.status(200).json({
            success: true,
            complaint,
            events,
        });
    }
    catch (error) {
        console.error('Error fetching complaint details:', error);
        return res.status(500).json({ error: 'Internal Server Error', message: error.message });
    }
};
exports.getComplaintById = getComplaintById;
const updateComplaintStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const parseResult = updateStatusSchema.safeParse(req.body);
        if (!parseResult.success) {
            return res.status(400).json({
                error: 'Validation failed',
                details: parseResult.error.errors,
            });
        }
        const { status, note, changed_by } = parseResult.data;
        const updated = await complaintStore_1.complaintStore.updateStatus(id, status, changed_by || 'ADMIN', note);
        if (!updated) {
            return res.status(404).json({ error: 'Complaint not found' });
        }
        return res.status(200).json({
            success: true,
            message: `Complaint status updated to ${status}`,
            complaint: updated,
        });
    }
    catch (error) {
        console.error('Error updating status:', error);
        return res.status(500).json({ error: 'Internal Server Error', message: error.message });
    }
};
exports.updateComplaintStatus = updateComplaintStatus;
const getRecentEvents = async (req, res) => {
    try {
        const limit = Math.min(Number(req.query.limit) || 50, 100);
        const events = await complaintStore_1.complaintStore.getRecentEvents(limit);
        return res.status(200).json({ success: true, count: events.length, events });
    }
    catch (error) {
        console.error('Error fetching recent events:', error);
        return res.status(500).json({ error: 'Internal Server Error', message: error.message });
    }
};
exports.getRecentEvents = getRecentEvents;
const seedDemoComplaints = async (_req, res) => {
    try {
        const result = await complaintStore_1.complaintStore.seedDemoData();
        return res.status(200).json({
            success: true,
            message: `Successfully seeded ${result.seeded} demo complaints into VERA`,
            count: result.complaints.length,
            complaints: result.complaints,
        });
    }
    catch (error) {
        console.error('Error seeding demo data:', error);
        return res.status(500).json({ error: 'Internal Server Error', message: error.message });
    }
};
exports.seedDemoComplaints = seedDemoComplaints;
