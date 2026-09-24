export type ComplaintStatus =
  | 'Reported'
  | 'Verified'
  | 'In Progress'
  | 'Critical Incident'
  | 'Emergency Response'
  | 'Resolved';

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type ComplaintCategory =
  | 'Road damage'
  | 'Garbage/waste'
  | 'Streetlight problems'
  | 'Water leakage'
  | 'Noise complaints'
  | 'Harassment'
  | 'Suspicious activity'
  | 'Accident'
  | 'Fire'
  | 'Medical Emergency'
  | 'Other civic issues';

export interface ConfidenceBasis {
  input_completeness: number;
  category_clarity: number;
  location_availability: number;
  evidence_strength: number;
}

export interface IncidentIntelligence {
  incident_type: string;
  severity: RiskLevel;
  risk_score: number;
  confidence_score: number;
  people_affected_estimate: string;
  possible_injury: boolean;
  location_confirmed: boolean;
  recommended_action: string;
  decision_factors: string[];
}

export interface DuplicateInfo {
  is_duplicate: boolean;
  primary_incident_id?: string | null;
  similarity_score: number;
  duplicate_count: number;
  reasons: string[];
}

export interface OperationalTimelineEvent {
  event: string;
  timestamp: string;
  actor: string;
  detail?: string;
}

export type UpdateAuthorType = 'citizen' | 'authority' | 'police' | 'hospital' | 'municipal' | 'system';

export type UpdateCategory = 
  | 'situation_update' 
  | 'additional_evidence' 
  | 'location_info' 
  | 'help_arrived' 
  | 'dispatch_update' 
  | 'responder_update' 
  | 'status_update' 
  | 'resolution_update' 
  | 'general';

export interface IncidentUpdate {
  id: string;
  incident_id: string;
  author_type: UpdateAuthorType;
  author_name: string;
  author_role?: string;
  message: string;
  update_type?: UpdateCategory;
  timestamp: string;
  photo_url?: string | null;
  is_pinned?: boolean;
  is_verified_authority?: boolean;
}

export interface ResponseUnit {
  id: string;
  name: string;
  type: 'hospital' | 'police' | 'fire_station' | 'municipal' | 'other';
  distance_km: number;
  estimated_eta_minutes: number;
  is_estimate: boolean;
  phone?: string;
  address?: string;
  directions_url: string;
  latitude: number;
  longitude: number;
  status: 'Standby' | 'Alerted' | 'Dispatched' | 'En route' | 'On scene';
}

export interface ResponderStatusMap {
  police: 'Standby' | 'Alerted' | 'Dispatched' | 'On scene';
  hospital: 'Standby' | 'Alerted' | 'En route' | 'Admitted';
  ambulance: 'Standby' | 'En route' | 'On scene' | 'Completed';
  citizen: 'Safe / Awaiting assistance' | 'Evacuated' | 'Assisted' | 'In contact';
}

export type ConfirmationStatus = 'PENDING_CONFIRMATION' | 'CONFIRMED' | 'OVERRIDDEN' | 'DOWNGRADED';

export interface ResponsePlan {
  incident_id: string;
  priority: RiskLevel;
  primary_response: ResponseUnit | null;
  secondary_response: ResponseUnit | null;
  all_responders: ResponseUnit[];
  recommended_action: string;
  human_confirmation_required: boolean;
  confirmation_status: ConfirmationStatus;
  confirmed_at?: string | null;
  confirmed_by?: string | null;
  responder_status: ResponderStatusMap;
  created_at: string;
}

export interface Complaint {
  id: string;
  reporter_id?: string | null;
  device_session_id: string;
  category: ComplaintCategory | string;
  description: string;
  photo_url?: string | null;
  video_url?: string | null;
  voice_transcript?: string | null;
  latitude: number;
  longitude: number;
  gps_accuracy?: number | null;
  address?: string | null;
  risk_score: number;
  risk_level: RiskLevel;
  confidence_score?: number;
  confidence_basis?: ConfidenceBasis;
  incident_intelligence?: IncidentIntelligence;
  duplicate_info?: DuplicateInfo;
  operational_timeline?: OperationalTimelineEvent[];
  response_plan?: ResponsePlan | null;
  updates?: IncidentUpdate[];
  status: ComplaintStatus;
  routed_department?: string | null;
  created_at: string;
  updated_at: string;
}

export interface IncidentEvent {
  id: string;
  complaint_id: string;
  old_status?: string | null;
  new_status: string;
  message: string;
  created_at: string;
  changed_by: string;
}

export interface CreateComplaintDTO {
  category: string;
  description: string;
  latitude: number;
  longitude: number;
  gps_accuracy?: number;
  address?: string;
  photo_url?: string;
  video_url?: string;
  voice_transcript?: string;
  device_session_id: string;
}
