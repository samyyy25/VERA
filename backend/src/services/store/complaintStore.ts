import { getSupabase } from '../../lib/supabase';
import { Complaint, IncidentEvent, CreateComplaintDTO, ComplaintStatus, RiskLevel } from '../../types/complaint';
import { Incident } from '../../types/incident';
import { riskEngine, RiskEvaluationResult } from '../riskEngine/riskScorer';
import { getDepartmentForCategory } from '../../config/authorityRouting';
import { emailService } from '../notification/emailService';
import { v4 as uuidv4 } from 'uuid';

class LocalComplaintStore {
  private complaints: Map<string, Complaint> = new Map();
  private events: Map<string, IncidentEvent[]> = new Map();
  private incidents: Map<string, Incident> = new Map();

  private toDbPayload(comp: Complaint) {
    let dbPhotoUrl = comp.photo_url || null;
    if (comp.video_url) {
      if (comp.photo_url) {
        dbPhotoUrl = JSON.stringify({ photo: comp.photo_url, video: comp.video_url });
      } else {
        dbPhotoUrl = comp.video_url;
      }
    }

    return {
      id: comp.id,
      reporter_id: comp.reporter_id || null,
      device_session_id: comp.device_session_id,
      category: comp.category,
      description: comp.description,
      photo_url: dbPhotoUrl,
      voice_transcript: comp.voice_transcript || null,
      latitude: comp.latitude,
      longitude: comp.longitude,
      gps_accuracy: comp.gps_accuracy || null,
      address: comp.address || null,
      risk_score: comp.risk_score,
      risk_level: comp.risk_level,
      status: comp.status,
      created_at: comp.created_at,
      updated_at: comp.updated_at,
    };
  }

  private mapDbRowToComplaint(row: any): Complaint {
    let photo_url = row.photo_url || null;
    let video_url: string | null = null;

    if (photo_url) {
      if (typeof photo_url === 'string' && photo_url.startsWith('{"') && photo_url.endsWith('}')) {
        try {
          const parsed = JSON.parse(photo_url);
          photo_url = parsed.photo || null;
          video_url = parsed.video || null;
        } catch {
          // keep photo_url as is
        }
      } else if (
        typeof photo_url === 'string' &&
        (photo_url.startsWith('data:video/') ||
          photo_url.endsWith('.mp4') ||
          photo_url.endsWith('.webm') ||
          photo_url.endsWith('.mov'))
      ) {
        video_url = photo_url;
        photo_url = null;
      }
    }

    const deptInfo = getDepartmentForCategory(row.category);

    return {
      id: row.id,
      reporter_id: row.reporter_id || null,
      device_session_id: row.device_session_id || 'anonymous_device',
      category: row.category,
      description: row.description,
      photo_url,
      video_url,
      voice_transcript: row.voice_transcript || null,
      latitude: Number(row.latitude),
      longitude: Number(row.longitude),
      gps_accuracy: row.gps_accuracy != null ? Number(row.gps_accuracy) : null,
      address: row.address || null,
      risk_score: Number(row.risk_score || 0),
      risk_level: row.risk_level || 'LOW',
      status: row.status || 'Reported',
      routed_department: row.routed_department || deptInfo.department,
      created_at: row.created_at,
      updated_at: row.updated_at || row.created_at,
    };
  }

  async createComplaint(data: CreateComplaintDTO): Promise<{ complaint: Complaint; riskEvaluation: RiskEvaluationResult; incident?: Incident }> {
    const supabase = getSupabase();
    const id = uuidv4();
    const now = new Date().toISOString();

    // 1. Evaluate deterministic risk score on the backend
    const existing = this.getRecentComplaints();
    const riskEvaluation = riskEngine.evaluateRisk(
      `${data.category} ${data.description}`,
      data.category,
      data.latitude,
      data.longitude,
      data.device_session_id,
      existing
    );

    const isCritical = riskEvaluation.score >= 60;
    const initialStatus: ComplaintStatus = isCritical ? 'Critical Incident' : 'Reported';
    const deptInfo = getDepartmentForCategory(data.category);

    const newComplaint: Complaint = {
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

    let createdIncident: Incident | undefined = undefined;

    // 2. Persist to Supabase if configured
    if (supabase) {
      try {
        const payload = this.toDbPayload(newComplaint);
        const { data: inserted, error } = await supabase
          .from('complaints')
          .insert(payload)
          .select()
          .single();

        if (error) {
          console.error('Supabase complaint insert error:', error);
        } else if (inserted) {
          const mapped = this.mapDbRowToComplaint(inserted);
          if (!mapped.video_url && newComplaint.video_url) mapped.video_url = newComplaint.video_url;
          mapped.routed_department = newComplaint.routed_department;

          this.complaints.set(mapped.id, mapped);
          await this.addEvent(mapped.id, null, 'Reported', `Complaint submitted via citizen portal. Routed to: ${deptInfo.department}`, 'CITIZEN');

          // Send real email notification asynchronously & log result
          this.dispatchNotification(mapped, deptInfo);

          if (isCritical) {
            createdIncident = await this.createIncidentRecord(mapped.id, mapped, riskEvaluation.score);
          }
          return { complaint: mapped, riskEvaluation, incident: createdIncident };
        }
      } catch (err) {
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

  private async dispatchNotification(comp: Complaint, deptInfo: any) {
    try {
      const result = await emailService.notifyDepartment(comp, deptInfo);
      await this.addEvent(
        comp.id,
        null,
        comp.status,
        result.statusMessage,
        'VERA_DISPATCH'
      );
    } catch (err: any) {
      await this.addEvent(
        comp.id,
        null,
        comp.status,
        `Notification failed to ${deptInfo.department} — retry queued`,
        'VERA_DISPATCH'
      );
    }
  }

  private async createIncidentRecord(complaintId: string, comp: Complaint, urgencyScore: number): Promise<Incident> {
    const incidentId = uuidv4();
    const now = new Date().toISOString();
    const roomSuffix = Math.random().toString(36).substring(2, 7);
    const videoRoomUrl = `https://meet.jit.si/vera-incident-${complaintId.slice(0, 8)}-${roomSuffix}`;

    const incident: Incident = {
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

    const supabase = getSupabase();
    if (supabase) {
      try {
        await supabase.from('incidents').insert(incident);
      } catch (err) {
        console.warn('Supabase incident insert failed:', err);
      }
    }

    this.incidents.set(complaintId, incident);

    // Add automated escalation audit event
    await this.addEvent(
      complaintId,
      'Reported',
      'Critical Incident',
      `🚨 Incident automatically escalated to Critical Incident by VERA Risk Engine (Score: ${urgencyScore}/100, Level: ${comp.risk_level})`,
      'VERA_RISK_ENGINE'
    );

    // Add Jitsi live video session provisioned audit event
    await this.addEvent(
      complaintId,
      'Critical Incident',
      'Critical Incident',
      `🎥 Live emergency video session provisioned: ${videoRoomUrl}`,
      'VERA_JITSI_PROVISIONER'
    );

    return incident;
  }


  async getAllComplaints(filter?: {
    category?: string;
    status?: string;
    risk_level?: string;
    search?: string;
  }): Promise<Complaint[]> {
    const supabase = getSupabase();
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
          const allMap = new Map<string, Complaint>();
          // 1. Overlay any local memory items (in case of offline/fallback)
          this.complaints.forEach((c, k) => allMap.set(k, c));
          // 2. Map Supabase rows and overlay them
          data.forEach(row => {
            const mapped = this.mapDbRowToComplaint(row);
            allMap.set(mapped.id, mapped);
            this.complaints.set(mapped.id, mapped);
          });
          let results = Array.from(allMap.values()).sort(
            (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );

          if (filter?.category && filter.category !== 'ALL') {
            results = results.filter(c => c.category.toLowerCase() === filter.category!.toLowerCase());
          }
          if (filter?.status && filter.status !== 'ALL') {
            results = results.filter(c => c.status === filter.status);
          }
          if (filter?.risk_level && filter.risk_level !== 'ALL') {
            results = results.filter(c => c.risk_level === filter.risk_level);
          }
          if (filter?.search) {
            const q = filter.search.toLowerCase();
            results = results.filter(c => 
              c.description.toLowerCase().includes(q) || 
              (c.address && c.address.toLowerCase().includes(q)) ||
              c.category.toLowerCase().includes(q) ||
              c.id.toLowerCase().includes(q)
            );
          }
          return results;
        }
      } catch (err) {
        console.warn('Supabase select failed, reading local store:', err);
      }
    }

    let results = Array.from(this.complaints.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    if (filter?.category && filter.category !== 'ALL') {
      results = results.filter(c => c.category.toLowerCase() === filter.category!.toLowerCase());
    }
    if (filter?.status && filter.status !== 'ALL') {
      results = results.filter(c => c.status === filter.status);
    }
    if (filter?.risk_level && filter.risk_level !== 'ALL') {
      results = results.filter(c => c.risk_level === filter.risk_level);
    }
    if (filter?.search) {
      const q = filter.search.toLowerCase();
      results = results.filter(c => 
        c.description.toLowerCase().includes(q) || 
        (c.address && c.address.toLowerCase().includes(q)) ||
        c.category.toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q)
      );
    }

    return results;
  }

  async getComplaintById(id: string): Promise<{ complaint: Complaint | null; events: IncidentEvent[]; incident?: Incident | null }> {
    const supabase = getSupabase();
    let complaint: Complaint | null = null;
    let events: IncidentEvent[] = [];
    let incident: Incident | null = null;

    if (supabase) {
      try {
        const { data: comp } = await supabase.from('complaints').select('*').eq('id', id).single();
        if (comp) complaint = this.mapDbRowToComplaint(comp);
        const { data: evts } = await supabase.from('incident_events').select('*').eq('complaint_id', id).order('created_at', { ascending: true });
        if (evts) events = evts;
        const { data: inc } = await supabase.from('incidents').select('*').eq('complaint_id', id).single();
        if (inc) incident = inc;
      } catch (err) {
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

  async getAllIncidents(): Promise<Incident[]> {
    const supabase = getSupabase();
    if (supabase) {
      try {
        const { data, error } = await supabase.from('incidents').select('*').order('created_at', { ascending: false });
        if (!error && data) {
          data.forEach(inc => this.incidents.set(inc.complaint_id, inc));
          return data;
        }
      } catch (err) {
        console.warn('Supabase incidents query error:', err);
      }
    }
    return Array.from(this.incidents.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  async updateStatus(id: string, newStatus: ComplaintStatus, changedBy = 'ADMIN', note?: string): Promise<Complaint | null> {
    const { complaint } = await this.getComplaintById(id);
    if (!complaint) return null;

    const oldStatus = complaint.status;
    const now = new Date().toISOString();
    const updatedComplaint: Complaint = {
      ...complaint,
      status: newStatus,
      updated_at: now,
    };

    const supabase = getSupabase();
    if (supabase) {
      try {
        await supabase.from('complaints').update({ status: newStatus, updated_at: now }).eq('id', id);
        if (newStatus === 'Resolved') {
          await supabase.from('incidents').update({ resolved_at: now }).eq('complaint_id', id);
        }
      } catch (err) {
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

  async addEvent(complaintId: string, oldStatus: string | null, newStatus: string, message: string, changedBy = 'SYSTEM'): Promise<IncidentEvent> {
    const eventId = uuidv4();
    const now = new Date().toISOString();
    const newEvent: IncidentEvent = {
      id: eventId,
      complaint_id: complaintId,
      old_status: oldStatus,
      new_status: newStatus,
      message,
      created_at: now,
      changed_by: changedBy,
    };

    const supabase = getSupabase();
    if (supabase) {
      try {
        await supabase.from('incident_events').insert(newEvent);
      } catch (err) {
        console.warn('Supabase event insert failed:', err);
      }
    }

    const currentEvents = this.events.get(complaintId) || [];
    currentEvents.push(newEvent);
    this.events.set(complaintId, currentEvents);
    return newEvent;
  }

  getRecentComplaints(): Complaint[] {
    return Array.from(this.complaints.values());
  }

  async getRecentEvents(limit = 50): Promise<IncidentEvent[]> {
    const supabase = getSupabase();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('incident_events')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(limit);
        if (!error && data) return data;
      } catch (err) {
        console.warn('Supabase getRecentEvents failed, falling back to local:', err);
      }
    }
    // Local memory fallback: flatten all per-complaint event arrays
    const all: IncidentEvent[] = [];
    for (const events of this.events.values()) {
      all.push(...events);
    }
    return all
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, limit);
  }
}

export const complaintStore = new LocalComplaintStore();
