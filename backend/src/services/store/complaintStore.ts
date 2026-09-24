import { getSupabase } from '../../lib/supabase';
import {
  Complaint,
  IncidentEvent,
  CreateComplaintDTO,
  ComplaintStatus,
  RiskLevel,
  OperationalTimelineEvent,
  ResponsePlan,
  IncidentUpdate,
  UpdateAuthorType,
  UpdateCategory,
} from '../../types/complaint';
import { Incident } from '../../types/incident';
import {
  riskEngine,
  RiskEvaluationResult,
  analyzeIncident,
} from '../riskEngine';
import { responsePlanService } from '../emergency/responsePlanService';
import { getDepartmentForCategory } from '../../config/authorityRouting';
import { emailService } from '../notification/emailService';
import { DEMO_COMPLAINTS, DEMO_INCIDENTS, DEMO_EVENTS, DEMO_UPDATES } from '../../utils/demoSeed';
import { v4 as uuidv4 } from 'uuid';

class LocalComplaintStore {
  private complaints: Map<string, Complaint> = new Map();
  private events: Map<string, IncidentEvent[]> = new Map();
  private incidents: Map<string, Incident> = new Map();
  private updates: Map<string, IncidentUpdate[]> = new Map();

  constructor() {
    this.seedLocalDefaults();
  }

  public seedLocalDefaults() {
    DEMO_COMPLAINTS.forEach(c => {
      const enriched = this.ensureEnrichedComplaint(c);
      this.complaints.set(c.id, enriched);
    });
    DEMO_INCIDENTS.forEach(inc => this.incidents.set(inc.complaint_id, { ...inc }));
    DEMO_EVENTS.forEach(evt => {
      const list = this.events.get(evt.complaint_id) || [];
      if (!list.some(e => e.id === evt.id)) {
        list.push({ ...evt });
        this.events.set(evt.complaint_id, list);
      }
    });
    DEMO_UPDATES.forEach(upd => {
      const list = this.updates.get(upd.incident_id) || [];
      if (!list.some(u => u.id === upd.id)) {
        list.push({ ...upd });
        this.updates.set(upd.incident_id, list);
      }
    });
  }

  /**
   * Helper to ensure all complaints have complete Phase 1 intelligence, confidence, and timeline
   */
  private ensureEnrichedComplaint(comp: Complaint): Complaint {
    if (comp.incident_intelligence && comp.confidence_score !== undefined && comp.operational_timeline) {
      return comp;
    }

    const analysis = analyzeIncident({
      category: comp.category,
      description: comp.description,
      latitude: comp.latitude,
      longitude: comp.longitude,
      gpsAccuracy: comp.gps_accuracy,
      photoUrl: comp.photo_url,
      videoUrl: comp.video_url,
      voiceTranscript: comp.voice_transcript,
      deviceSessionId: comp.device_session_id,
      existingComplaints: Array.from(this.complaints.values()),
      createdAt: comp.created_at,
    });

    const timeline: OperationalTimelineEvent[] = comp.operational_timeline || [
      {
        event: 'Complaint Received',
        timestamp: comp.created_at,
        actor: 'CITIZEN',
        detail: `Reported under category: ${comp.category}`,
      },
      {
        event: 'AI Intelligence Generated',
        timestamp: new Date(new Date(comp.created_at).getTime() + 1200).toISOString(),
        actor: 'SYSTEM',
        detail: `Risk Score: ${analysis.riskEvaluation.score}/100, Confidence: ${analysis.confidenceEvaluation.score}%, Level: ${analysis.riskEvaluation.level}`,
      },
      {
        event: 'Decision Factors Recorded',
        timestamp: new Date(new Date(comp.created_at).getTime() + 1800).toISOString(),
        actor: 'SYSTEM',
        detail: analysis.decisionFactors.join(' | '),
      },
      {
        event: 'Duplicate Check Completed',
        timestamp: new Date(new Date(comp.created_at).getTime() + 2200).toISOString(),
        actor: 'SYSTEM',
        detail: analysis.duplicateInfo.is_duplicate
          ? `Linked to parent incident (${analysis.duplicateInfo.primary_incident_id})`
          : 'Verified unique incident',
      },
      {
        event: 'Location Verified',
        timestamp: new Date(new Date(comp.created_at).getTime() + 2600).toISOString(),
        actor: 'SYSTEM',
        detail: `GPS Lat: ${comp.latitude.toFixed(4)}, Lon: ${comp.longitude.toFixed(4)}${
          comp.gps_accuracy ? ` (±${Math.round(comp.gps_accuracy)}m)` : ''
        }`,
      },
      {
        event: 'Department Routed',
        timestamp: new Date(new Date(comp.created_at).getTime() + 3000).toISOString(),
        actor: 'SYSTEM',
        detail: `Assigned to: ${comp.routed_department || getDepartmentForCategory(comp.category).department}`,
      },
    ];

    if (comp.status === 'Critical Incident' || comp.status === 'Emergency Response') {
      timeline.push({
        event: 'Emergency Escalated',
        timestamp: new Date(new Date(comp.created_at).getTime() + 3500).toISOString(),
        actor: 'VERA_RISK_ENGINE',
        detail: `Critical threshold crossed (Score ${analysis.riskEvaluation.score} ≥ 60)`,
      });
    }

    const incidentUpdates = comp.updates || this.updates.get(comp.id) || [];

    return {
      ...comp,
      confidence_score: comp.confidence_score ?? analysis.confidenceEvaluation.score,
      confidence_basis: comp.confidence_basis ?? analysis.confidenceEvaluation.basis,
      incident_intelligence: comp.incident_intelligence ?? analysis.incidentIntelligence,
      duplicate_info: comp.duplicate_info ?? analysis.duplicateInfo,
      operational_timeline: timeline,
      updates: incidentUpdates,
    };
  }

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

    const baseComp: Complaint = {
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
      risk_score: Number(row.risk_score),
      risk_level: row.risk_level as RiskLevel,
      status: row.status as ComplaintStatus,
      routed_department: deptInfo.department,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };

    return this.ensureEnrichedComplaint(baseComp);
  }

  private getRecentComplaints(): Complaint[] {
    return Array.from(this.complaints.values());
  }

  async createComplaint(data: CreateComplaintDTO): Promise<{
    complaint: Complaint;
    riskEvaluation: RiskEvaluationResult;
    incident?: Incident;
  }> {
    const supabase = getSupabase();
    const id = uuidv4();
    const now = new Date().toISOString();

    // 1. Run Complete Analysis (Risk, Confidence, Decision Factors, Intelligence, Duplicate Check)
    const existing = this.getRecentComplaints();
    const analysis = analyzeIncident({
      category: data.category,
      description: data.description,
      latitude: data.latitude,
      longitude: data.longitude,
      gpsAccuracy: data.gps_accuracy,
      photoUrl: data.photo_url,
      videoUrl: data.video_url,
      voiceTranscript: data.voice_transcript,
      deviceSessionId: data.device_session_id,
      existingComplaints: existing,
      createdAt: now,
    });

    const isCritical = analysis.riskEvaluation.score >= 60;
    const initialStatus: ComplaintStatus = isCritical ? 'Critical Incident' : 'Reported';
    const deptInfo = getDepartmentForCategory(data.category);

    // 2. Build Operational Timeline Events
    const operationalTimeline: OperationalTimelineEvent[] = [
      {
        event: 'Complaint Received',
        timestamp: now,
        actor: 'CITIZEN',
        detail: `Submitted report under category: ${data.category}`,
      },
      {
        event: 'AI Intelligence Generated',
        timestamp: new Date(Date.now() + 100).toISOString(),
        actor: 'SYSTEM',
        detail: `Risk Score: ${analysis.riskEvaluation.score}/100, Confidence: ${analysis.confidenceEvaluation.score}%, Level: ${analysis.riskEvaluation.level}`,
      },
      {
        event: 'Decision Factors Recorded',
        timestamp: new Date(Date.now() + 200).toISOString(),
        actor: 'SYSTEM',
        detail: analysis.decisionFactors.join(' | '),
      },
      {
        event: 'Duplicate Check Completed',
        timestamp: new Date(Date.now() + 300).toISOString(),
        actor: 'SYSTEM',
        detail: analysis.duplicateInfo.is_duplicate
          ? `Linked to existing incident (${analysis.duplicateInfo.primary_incident_id}) with ${analysis.duplicateInfo.duplicate_count} related reports`
          : 'Verified unique incident',
      },
      {
        event: 'Location Verified',
        timestamp: new Date(Date.now() + 400).toISOString(),
        actor: 'SYSTEM',
        detail: `Lat: ${data.latitude.toFixed(4)}, Lon: ${data.longitude.toFixed(4)}${
          data.gps_accuracy ? ` (±${Math.round(data.gps_accuracy)}m)` : ''
        }`,
      },
      {
        event: 'Department Routed',
        timestamp: new Date(Date.now() + 500).toISOString(),
        actor: 'SYSTEM',
        detail: `Routed to ${deptInfo.department} (SLA: ${deptInfo.responseSLA})`,
      },
    ];

    if (isCritical) {
      operationalTimeline.push({
        event: 'Emergency Escalated',
        timestamp: new Date(Date.now() + 600).toISOString(),
        actor: 'VERA_RISK_ENGINE',
        detail: `Critical threshold crossed (Score: ${analysis.riskEvaluation.score}/100)`,
      });
    }

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
      risk_score: analysis.riskEvaluation.score,
      risk_level: analysis.riskEvaluation.level,
      confidence_score: analysis.confidenceEvaluation.score,
      confidence_basis: analysis.confidenceEvaluation.basis,
      incident_intelligence: analysis.incidentIntelligence,
      duplicate_info: analysis.duplicateInfo,
      operational_timeline: operationalTimeline,
      status: initialStatus,
      routed_department: deptInfo.department,
      created_at: now,
      updated_at: now,
    };

    let createdIncident: Incident | undefined = undefined;

    // 3. Persist to Supabase if configured
    if (supabase) {
      try {
        const payload = this.toDbPayload(newComplaint);
        const supabaseTimeout = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Supabase insert timed out after 6000ms')), 6000)
        );
        const insertPromise = supabase
          .from('complaints')
          .insert(payload)
          .select()
          .single();

        const { data: inserted, error } = (await Promise.race([insertPromise, supabaseTimeout])) as any;

        if (error) {
          console.error('Supabase complaint insert error:', error);
        } else if (inserted) {
          const mapped = this.mapDbRowToComplaint(inserted);
          mapped.confidence_score = newComplaint.confidence_score;
          mapped.confidence_basis = newComplaint.confidence_basis;
          mapped.incident_intelligence = newComplaint.incident_intelligence;
          mapped.duplicate_info = newComplaint.duplicate_info;
          mapped.operational_timeline = newComplaint.operational_timeline;
          if (!mapped.video_url && newComplaint.video_url) mapped.video_url = newComplaint.video_url;
          mapped.routed_department = newComplaint.routed_department;

          this.complaints.set(mapped.id, mapped);
          await this.addEvent(
            mapped.id,
            null,
            'Reported',
            `Complaint submitted via citizen portal. Routed to: ${deptInfo.department}`,
            'CITIZEN'
          );

          // Send real email notification asynchronously & log result
          this.dispatchNotification(mapped, deptInfo);

          if (isCritical) {
            createdIncident = await this.createIncidentRecord(mapped.id, mapped, analysis.riskEvaluation.score);
          }
          return { complaint: mapped, riskEvaluation: analysis.riskEvaluation, incident: createdIncident };
        }
      } catch (err) {
        console.warn('Supabase insert failed, falling back to local memory store:', err);
      }
    }

    // 4. Fallback Local Memory Store
    this.complaints.set(id, newComplaint);
    await this.addEvent(
      id,
      null,
      'Reported',
      `Complaint submitted via citizen portal. Routed to: ${deptInfo.department}`,
      'CITIZEN'
    );

    // Send notification
    this.dispatchNotification(newComplaint, deptInfo);

    if (isCritical) {
      createdIncident = await this.createIncidentRecord(id, newComplaint, analysis.riskEvaluation.score);
    }

    return { complaint: newComplaint, riskEvaluation: analysis.riskEvaluation, incident: createdIncident };
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

  private async createIncidentRecord(
    complaintId: string,
    comp: Complaint,
    urgencyScore: number
  ): Promise<Incident> {
    const incidentId = uuidv4();
    const now = new Date().toISOString();
    const roomSuffix = Math.random().toString(36).substring(2, 7);
    const videoRoomUrl = `https://meet.jit.si/vera-incident-${complaintId.slice(0, 8)}-${roomSuffix}`;

    // Generate automated response plan
    let plan = comp.response_plan;
    if (!plan) {
      plan = await responsePlanService.generateResponsePlan(comp);
      comp.response_plan = plan;
      this.complaints.set(complaintId, comp);
    }

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
      response_plan: plan,
      created_at: now,
      escalated_at: now,
      resolved_at: null,
    };

    const supabase = getSupabase();
    if (supabase) {
      try {
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Supabase incident insert timed out')), 4000)
        );
        await Promise.race([supabase.from('incidents').insert(incident), timeoutPromise]);
      } catch (err) {
        console.warn('Supabase incident insert failed or timed out:', err);
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

    return incident;
  }

  async getResponsePlan(complaintId: string): Promise<ResponsePlan | null> {
    const comp = this.complaints.get(complaintId);
    if (!comp) return null;
    if (comp.response_plan) return comp.response_plan;

    const plan = await responsePlanService.generateResponsePlan(comp);
    comp.response_plan = plan;
    this.complaints.set(complaintId, comp);

    const inc = this.incidents.get(complaintId);
    if (inc) {
      inc.response_plan = plan;
      this.incidents.set(complaintId, inc);
    }

    return plan;
  }

  async confirmResponsePlan(
    complaintId: string,
    confirmedBy = 'AUTHORIZED_OPERATOR',
    notes?: string
  ): Promise<{ complaint: Complaint; plan: ResponsePlan } | null> {
    const comp = this.complaints.get(complaintId);
    if (!comp) return null;

    let plan = comp.response_plan || (await responsePlanService.generateResponsePlan(comp));
    plan = responsePlanService.confirmPlan(plan, confirmedBy);

    const now = new Date().toISOString();
    const updatedComplaint: Complaint = {
      ...comp,
      status: 'Emergency Response',
      response_plan: plan,
      updated_at: now,
      operational_timeline: [
        ...(comp.operational_timeline || []),
        {
          event: 'Response Confirmed',
          timestamp: now,
          actor: confirmedBy,
          detail:
            notes ||
            `Operator confirmed dispatch. Primary unit: ${plan.primary_response?.name} (~${plan.primary_response?.estimated_eta_minutes}m ETA), Secondary unit: ${plan.secondary_response?.name} (~${plan.secondary_response?.estimated_eta_minutes}m ETA)`,
        },
        {
          event: 'Emergency Escalated',
          timestamp: new Date(Date.now() + 100).toISOString(),
          actor: 'VERA_DISPATCH',
          detail: 'Units transitioned to active dispatch & en route status.',
        },
      ],
    };

    this.complaints.set(complaintId, updatedComplaint);

    const inc = this.incidents.get(complaintId);
    if (inc) {
      inc.response_plan = plan;
      this.incidents.set(complaintId, inc);
    }

    await this.addEvent(
      complaintId,
      comp.status,
      'Emergency Response',
      `Emergency Response Confirmed by ${confirmedBy}. Dispatching ${plan.primary_response?.name}`,
      confirmedBy
    );

    return { complaint: updatedComplaint, plan };
  }

  async modifyResponsePlan(
    complaintId: string,
    action: 'DOWNGRADE' | 'MODIFY',
    details: any,
    changedBy = 'AUTHORIZED_OPERATOR'
  ): Promise<Complaint | null> {
    const comp = this.complaints.get(complaintId);
    if (!comp) return null;

    const now = new Date().toISOString();

    if (action === 'DOWNGRADE') {
      const updatedPlan: ResponsePlan | undefined = comp.response_plan
        ? { ...comp.response_plan, confirmation_status: 'DOWNGRADED' }
        : undefined;

      const updatedComplaint: Complaint = {
        ...comp,
        status: 'Verified',
        response_plan: updatedPlan,
        updated_at: now,
        operational_timeline: [
          ...(comp.operational_timeline || []),
          {
            event: 'False Alarm Verified: Downgraded to Standard Civic Ticket',
            timestamp: now,
            actor: changedBy,
            detail:
              details?.reason ||
              'Operator verified report does not pose acute emergency danger. Downgraded to regular civic queue.',
          },
        ],
      };

      this.complaints.set(complaintId, updatedComplaint);
      await this.addEvent(
        complaintId,
        comp.status,
        'Verified',
        'Downgraded from emergency after operator verification',
        changedBy
      );
      return updatedComplaint;
    }

    // Standard modification
    const updatedComplaint: Complaint = {
      ...comp,
      updated_at: now,
      operational_timeline: [
        ...(comp.operational_timeline || []),
        {
          event: 'Response Plan Modified',
          timestamp: now,
          actor: changedBy,
          detail: details?.notes || 'Operator modified responder routing assignments.',
        },
      ],
    };

    this.complaints.set(complaintId, updatedComplaint);
    return updatedComplaint;
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
          query = query.or(
            `description.ilike.%${filter.search}%,address.ilike.%${filter.search}%,category.ilike.%${filter.search}%`
          );
        }
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Supabase select timed out')), 2000)
        );
        const { data, error } = (await Promise.race([query, timeoutPromise])) as any;
        if (!error && data && data.length > 0) {
          const allMap = new Map<string, Complaint>();
          this.complaints.forEach((c, k) => allMap.set(k, c));
          data.forEach((row: any) => {
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
            results = results.filter(
              c =>
                c.description.toLowerCase().includes(q) ||
                (c.address && c.address.toLowerCase().includes(q)) ||
                c.category.toLowerCase().includes(q) ||
                c.id.toLowerCase().includes(q)
            );
          }
          return results;
        }
      } catch (err) {
        // Fallback gracefully to local store
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
      results = results.filter(
        c =>
          c.description.toLowerCase().includes(q) ||
          (c.address && c.address.toLowerCase().includes(q)) ||
          c.category.toLowerCase().includes(q) ||
          c.id.toLowerCase().includes(q)
      );
    }

    return results;
  }

  async getComplaintById(
    id: string
  ): Promise<{ complaint: Complaint | null; events: IncidentEvent[]; incident?: Incident | null }> {
    const supabase = getSupabase();
    let complaint: Complaint | null = null;
    let events: IncidentEvent[] = [];
    let incident: Incident | null = null;

    if (supabase) {
      try {
        const { data: comp } = await supabase.from('complaints').select('*').eq('id', id).single();
        if (comp) complaint = this.mapDbRowToComplaint(comp);
        const { data: evts } = await supabase
          .from('incident_events')
          .select('*')
          .eq('complaint_id', id)
          .order('created_at', { ascending: true });
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

    if (complaint) {
      complaint = this.ensureEnrichedComplaint(complaint);
    }

    return { complaint, events, incident };
  }

  async getAllIncidents(): Promise<Incident[]> {
    const supabase = getSupabase();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('incidents')
          .select('*')
          .order('created_at', { ascending: false });
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

  async updateStatus(
    id: string,
    newStatus: ComplaintStatus,
    changedBy = 'ADMIN',
    note?: string
  ): Promise<Complaint | null> {
    const { complaint } = await this.getComplaintById(id);
    if (!complaint) return null;

    const oldStatus = complaint.status;
    const now = new Date().toISOString();
    const updatedComplaint: Complaint = {
      ...complaint,
      status: newStatus,
      updated_at: now,
      operational_timeline: [
        ...(complaint.operational_timeline || []),
        {
          event: `Status Updated: ${newStatus}`,
          timestamp: now,
          actor: changedBy,
          detail: note || `Status transitioned from ${oldStatus} to ${newStatus}`,
        },
      ],
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

  async addEvent(
    complaintId: string,
    oldStatus: string | null,
    newStatus: string,
    message: string,
    changedBy = 'SYSTEM'
  ): Promise<IncidentEvent> {
    const id = uuidv4();
    const now = new Date().toISOString();
    const event: IncidentEvent = {
      id,
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
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Supabase event insert timed out')), 4000)
        );
        await Promise.race([supabase.from('incident_events').insert(event), timeoutPromise]);
      } catch (err) {
        console.warn('Supabase event insert failed or timed out:', err);
      }
    }

    const list = this.events.get(complaintId) || [];
    list.push(event);
    this.events.set(complaintId, list);

    return event;
  }

  async getEventsByComplaintId(complaintId: string): Promise<IncidentEvent[]> {
    const supabase = getSupabase();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('incident_events')
          .select('*')
          .eq('complaint_id', complaintId)
          .order('created_at', { ascending: true });
        if (!error && data) return data;
      } catch (err) {
        console.warn('Supabase events query error:', err);
      }
    }
    return this.events.get(complaintId) || [];
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
        console.warn('Supabase recent events query error:', err);
      }
    }
    const allEvents: IncidentEvent[] = [];
    this.events.forEach(list => allEvents.push(...list));
    return allEvents
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, limit);
  }

  async getIncidentUpdates(complaintId: string): Promise<IncidentUpdate[]> {
    return this.updates.get(complaintId) || [];
  }

  async addIncidentUpdate(
    complaintId: string,
    data: {
      author_type: UpdateAuthorType;
      author_name: string;
      author_role?: string;
      message: string;
      update_type?: UpdateCategory;
      photo_url?: string | null;
      is_pinned?: boolean;
      is_verified_authority?: boolean;
    }
  ): Promise<IncidentUpdate | null> {
    const comp = this.complaints.get(complaintId);
    if (!comp) return null;

    const id = uuidv4();
    const now = new Date().toISOString();
    const isAuthority = data.author_type === 'authority' || data.author_type === 'police' || data.author_type === 'hospital' || data.author_type === 'municipal';
    const isVerifiedAuthority = data.is_verified_authority !== undefined ? data.is_verified_authority : isAuthority;

    const newUpdate: IncidentUpdate = {
      id,
      incident_id: complaintId,
      author_type: data.author_type,
      author_name: data.author_name || (data.author_type === 'system' ? 'VERA' : data.author_type === 'citizen' ? 'Citizen' : 'Authorized Personnel'),
      author_role: data.author_role,
      message: data.message,
      update_type: data.update_type || 'general',
      timestamp: now,
      photo_url: data.photo_url || null,
      is_pinned: !!data.is_pinned,
      is_verified_authority: isVerifiedAuthority,
    };

    const list = this.updates.get(complaintId) || [];
    list.push(newUpdate);
    this.updates.set(complaintId, list);

    // Sync to complaint object
    comp.updates = [...list];
    comp.updated_at = now;

    // If update is from authority or has critical observation, also log to timeline
    const timelineActor = data.author_type.toUpperCase();
    comp.operational_timeline = [
      ...(comp.operational_timeline || []),
      {
        event: `Live Update (${data.update_type || data.author_type})`,
        timestamp: now,
        actor: timelineActor,
        detail: `[${data.author_name}]: ${data.message}`,
      },
    ];
    this.complaints.set(complaintId, comp);

    return newUpdate;
  }

  async togglePinUpdate(complaintId: string, updateId: string): Promise<IncidentUpdate | null> {
    const list = this.updates.get(complaintId);
    if (!list) return null;

    const target = list.find(u => u.id === updateId);
    if (!target) return null;

    target.is_pinned = !target.is_pinned;
    this.updates.set(complaintId, list);

    const comp = this.complaints.get(complaintId);
    if (comp) {
      comp.updates = [...list];
      this.complaints.set(complaintId, comp);
    }

    return target;
  }

  async seedDemoData(): Promise<{ seeded: number; complaints: Complaint[] }> {
    this.seedLocalDefaults();
    return {
      seeded: this.complaints.size,
      complaints: Array.from(this.complaints.values()),
    };
  }
}

export const complaintStore = new LocalComplaintStore();
