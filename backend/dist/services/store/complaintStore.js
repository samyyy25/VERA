"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.complaintStore = void 0;
const supabase_1 = require("../../lib/supabase");
const riskScorer_1 = require("../riskEngine/riskScorer");
const authorityRouting_1 = require("../../config/authorityRouting");
const emailService_1 = require("../notification/emailService");
const uuid_1 = require("uuid");
class LocalComplaintStore {
    complaints = new Map();
    events = new Map();
    incidents = new Map();
    async createComplaint(data) {
        const supabase = (0, supabase_1.getSupabase)();
        const id = (0, uuid_1.v4)();
        const now = new Date().toISOString();
        // 1. Evaluate deterministic risk score on the backend
        const existing = this.getRecentComplaints();
        const riskEvaluation = riskScorer_1.riskEngine.evaluateRisk(`${data.category} ${data.description}`, data.category, data.latitude, data.longitude, data.device_session_id, existing);
        const isCritical = riskEvaluation.score >= 60;
        const initialStatus = isCritical ? 'Critical Incident' : 'Reported';
        const deptInfo = (0, authorityRouting_1.getDepartmentForCategory)(data.category);
        const newComplaint = {
            id,
            reporter_id: null,
            device_session_id: data.device_session_id,
            category: data.category,
            description: data.description,
            photo_url: data.photo_url || null,
            video_url: data.video_url || null,
            voice_transcript: data.voice_transcript || null,
            latitude: data.latitude,
            longitude: data.longitude,
            gps_accuracy: data.gps_accuracy || null,
            address: data.address || null,
            risk_score: riskEvaluation.score,
            risk_level: riskEvaluation.level,
            status: initialStatus,
            routed_department: deptInfo.department,
            created_at: now,
            updated_at: now,
        };
        let createdIncident = undefined;
        // 2. Persist to Supabase if configured
        if (supabase) {
            try {
                const { data: inserted, error } = await supabase
                    .from('complaints')
                    .insert(newComplaint)
                    .select()
                    .single();
                if (!error && inserted) {
                    this.complaints.set(inserted.id, inserted);
                    await this.addEvent(inserted.id, null, 'Reported', `Complaint submitted via citizen portal. Routed to: ${deptInfo.department}`, 'CITIZEN');
                    // Send real email notification asynchronously & log result
                    this.dispatchNotification(inserted, deptInfo);
                    if (isCritical) {
                        createdIncident = await this.createIncidentRecord(inserted.id, inserted, riskEvaluation.score);
                    }
                    return { complaint: inserted, riskEvaluation, incident: createdIncident };
                }
            }
            catch (err) {
                console.warn('Supabase insert failed, falling back to local memory store:', err);
            }
        }
        // 3. Fallback Local Memory Store
        this.complaints.set(id, newComplaint);
        await this.addEvent(id, null, 'Reported', `Complaint submitted via citizen portal. Routed to: ${deptInfo.department}`, 'CITIZEN');
        // Send notification
        this.dispatchNotification(newComplaint, deptInfo);
        if (isCritical) {
            createdIncident = await this.createIncidentRecord(id, newComplaint, riskEvaluation.score);
        }
        return { complaint: newComplaint, riskEvaluation, incident: createdIncident };
    }
    async dispatchNotification(comp, deptInfo) {
        try {
            const result = await emailService_1.emailService.notifyDepartment(comp, deptInfo);
            await this.addEvent(comp.id, null, comp.status, result.statusMessage, 'VERA_DISPATCH');
        }
        catch (err) {
            await this.addEvent(comp.id, null, comp.status, `Notification failed to ${deptInfo.department} — retry queued`, 'VERA_DISPATCH');
        }
    }
    async createIncidentRecord(complaintId, comp, urgencyScore) {
        const incidentId = (0, uuid_1.v4)();
        const now = new Date().toISOString();
        const roomSuffix = Math.random().toString(36).substring(2, 7);
        const videoRoomUrl = `https://meet.jit.si/vera-incident-${complaintId.slice(0, 8)}-${roomSuffix}`;
        const incident = {
            id: incidentId,
            complaint_id: complaintId,
            incident_type: comp.category,
            urgency_score: urgencyScore,
            latitude: comp.latitude,
            longitude: comp.longitude,
            gps_accuracy: comp.gps_accuracy,
            summary: comp.description,
            translated_summary: null,
            video_room_url: videoRoomUrl,
            created_at: now,
            escalated_at: now,
            resolved_at: null,
        };
        const supabase = (0, supabase_1.getSupabase)();
        if (supabase) {
            try {
                await supabase.from('incidents').insert(incident);
            }
            catch (err) {
                console.warn('Supabase incident insert failed:', err);
            }
        }
        this.incidents.set(complaintId, incident);
        // Add automated escalation audit event
        await this.addEvent(complaintId, 'Reported', 'Critical Incident', `🚨 Incident automatically escalated to Critical Incident by VERA Risk Engine (Score: ${urgencyScore}/100, Level: ${comp.risk_level})`, 'VERA_RISK_ENGINE');
        // Add Jitsi live video session provisioned audit event
        await this.addEvent(complaintId, 'Critical Incident', 'Critical Incident', `🎥 Live emergency video session provisioned: ${videoRoomUrl}`, 'VERA_JITSI_PROVISIONER');
        return incident;
    }
    async getAllComplaints(filter) {
        const supabase = (0, supabase_1.getSupabase)();
        if (supabase) {
            try {
                let query = supabase.from('complaints').select('*').order('created_at', { ascending: false });
                if (filter?.category && filter.category !== 'ALL') {
                    query = query.eq('category', filter.category);
                }
                if (filter?.status && filter.status !== 'ALL') {
                    query = query.eq('status', filter.status);
                }
                if (filter?.risk_level && filter.risk_level !== 'ALL') {
                    query = query.eq('risk_level', filter.risk_level);
                }
                if (filter?.search) {
                    query = query.or(`description.ilike.%${filter.search}%,address.ilike.%${filter.search}%,category.ilike.%${filter.search}%`);
                }
                const { data, error } = await query;
                if (!error && data) {
                    data.forEach(c => this.complaints.set(c.id, c));
                    return data;
                }
            }
            catch (err) {
                console.warn('Supabase select failed, reading local store:', err);
            }
        }
        let results = Array.from(this.complaints.values()).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        if (filter?.category && filter.category !== 'ALL') {
            results = results.filter(c => c.category.toLowerCase() === filter.category.toLowerCase());
        }
        if (filter?.status && filter.status !== 'ALL') {
            results = results.filter(c => c.status === filter.status);
        }
        if (filter?.risk_level && filter.risk_level !== 'ALL') {
            results = results.filter(c => c.risk_level === filter.risk_level);
        }
        if (filter?.search) {
            const q = filter.search.toLowerCase();
            results = results.filter(c => c.description.toLowerCase().includes(q) ||
                (c.address && c.address.toLowerCase().includes(q)) ||
                c.category.toLowerCase().includes(q) ||
                c.id.toLowerCase().includes(q));
        }
        return results;
    }
    async getComplaintById(id) {
        const supabase = (0, supabase_1.getSupabase)();
        let complaint = null;
        let events = [];
        let incident = null;
        if (supabase) {
            try {
                const { data: comp } = await supabase.from('complaints').select('*').eq('id', id).single();
                if (comp)
                    complaint = comp;
                const { data: evts } = await supabase.from('incident_events').select('*').eq('complaint_id', id).order('created_at', { ascending: true });
                if (evts)
                    events = evts;
                const { data: inc } = await supabase.from('incidents').select('*').eq('complaint_id', id).single();
                if (inc)
                    incident = inc;
            }
            catch (err) {
                console.warn('Supabase lookup error:', err);
            }
        }
        if (!complaint) {
            complaint = this.complaints.get(id) || null;
            events = this.events.get(id) || [];
            incident = this.incidents.get(id) || null;
        }
        return { complaint, events, incident };
    }
    async getAllIncidents() {
        const supabase = (0, supabase_1.getSupabase)();
        if (supabase) {
            try {
                const { data, error } = await supabase.from('incidents').select('*').order('created_at', { ascending: false });
                if (!error && data) {
                    data.forEach(inc => this.incidents.set(inc.complaint_id, inc));
                    return data;
                }
            }
            catch (err) {
                console.warn('Supabase incidents query error:', err);
            }
        }
        return Array.from(this.incidents.values()).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
    async updateStatus(id, newStatus, changedBy = 'ADMIN', note) {
        const { complaint } = await this.getComplaintById(id);
        if (!complaint)
            return null;
        const oldStatus = complaint.status;
        const now = new Date().toISOString();
        const updatedComplaint = {
            ...complaint,
            status: newStatus,
            updated_at: now,
        };
        const supabase = (0, supabase_1.getSupabase)();
        if (supabase) {
            try {
                await supabase.from('complaints').update({ status: newStatus, updated_at: now }).eq('id', id);
                if (newStatus === 'Resolved') {
                    await supabase.from('incidents').update({ resolved_at: now }).eq('complaint_id', id);
                }
            }
            catch (err) {
                console.warn('Supabase update status failed:', err);
            }
        }
        this.complaints.set(id, updatedComplaint);
        const incident = this.incidents.get(id);
        if (incident && newStatus === 'Resolved') {
            incident.resolved_at = now;
            this.incidents.set(id, incident);
        }
        const message = note || `Status changed from ${oldStatus} to ${newStatus}`;
        await this.addEvent(id, oldStatus, newStatus, message, changedBy);
        return updatedComplaint;
    }
    async addEvent(complaintId, oldStatus, newStatus, message, changedBy = 'SYSTEM') {
        const eventId = (0, uuid_1.v4)();
        const now = new Date().toISOString();
        const newEvent = {
            id: eventId,
            complaint_id: complaintId,
            old_status: oldStatus,
            new_status: newStatus,
            message,
            created_at: now,
            changed_by: changedBy,
        };
        const supabase = (0, supabase_1.getSupabase)();
        if (supabase) {
            try {
                await supabase.from('incident_events').insert(newEvent);
            }
            catch (err) {
                console.warn('Supabase event insert failed:', err);
            }
        }
        const currentEvents = this.events.get(complaintId) || [];
        currentEvents.push(newEvent);
        this.events.set(complaintId, currentEvents);
        return newEvent;
    }
    getRecentComplaints() {
        return Array.from(this.complaints.values());
    }
}
exports.complaintStore = new LocalComplaintStore();
