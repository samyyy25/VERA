export interface Incident {
  id: string;
  complaint_id: string;
  incident_type: string;
  urgency_score: number;
  latitude: number;
  longitude: number;
  gps_accuracy?: number | null;
  summary?: string | null;
  translated_summary?: string | null;
  video_room_url?: string | null;
  created_at: string;
  escalated_at: string;
  resolved_at?: string | null;
}

export interface EmergencyLocation {
  id: string;
  incident_id: string;
  name: string;
  type: 'hospital' | 'police' | 'fire_station' | 'other';
  distance_meters: number;
  latitude: number;
  longitude: number;
  address?: string | null;
  phone?: string | null;
  created_at: string;
}
