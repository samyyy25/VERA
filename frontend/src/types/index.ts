export type ComplaintStatus =
  | 'Reported'
  | 'Verified'
  | 'In Progress'
  | 'Critical Incident'
  | 'Emergency Response'
  | 'Resolved';

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface Complaint {
  id: string;
  reporter_id?: string | null;
  device_session_id: string;
  category: string;
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

export interface CreateComplaintInput {
  category: string;
  description: string;
  latitude: number;
  longitude: number;
  gps_accuracy?: number | null;
  address?: string;
  photo_url?: string | null;
  video_url?: string | null;
  voice_transcript?: string | null;
  device_session_id: string;
}

