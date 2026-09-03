import axios from 'axios';
import { Complaint, IncidentEvent, CreateComplaintInput, ComplaintStatus } from '../types';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

export const apiClient = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

export interface HealthResponse {
  status: string;
  timestamp: string;
  version: string;
  service: string;
  services: {
    database: string;
    omniroute: string;
    translation: string;
    maps: string;
    omniroute_model?: string;
  };
}

export const checkHealth = async (): Promise<HealthResponse> => {
  const response = await apiClient.get<HealthResponse>('/health');
  return response.data;
};

export const submitComplaint = async (data: CreateComplaintInput): Promise<{ success: boolean; complaint: Complaint }> => {
  const response = await apiClient.post<{ success: boolean; complaint: Complaint }>('/complaints', data);
  return response.data;
};

export const fetchComplaints = async (filters?: {
  category?: string;
  status?: string;
  risk_level?: string;
  search?: string;
}): Promise<{ success: boolean; count: number; complaints: Complaint[] }> => {
  const response = await apiClient.get<{ success: boolean; count: number; complaints: Complaint[] }>('/complaints', {
    params: filters,
  });
  return response.data;
};

export const fetchComplaintById = async (id: string): Promise<{
  success: boolean;
  complaint: Complaint;
  events: IncidentEvent[];
}> => {
  const response = await apiClient.get<{ success: boolean; complaint: Complaint; events: IncidentEvent[] }>(`/complaints/${id}`);
  return response.data;
};

export const updateComplaintStatus = async (
  id: string,
  status: ComplaintStatus,
  note?: string,
  changed_by?: string
): Promise<{ success: boolean; complaint: Complaint }> => {
  const response = await apiClient.patch<{ success: boolean; complaint: Complaint }>(`/complaints/${id}/status`, {
    status,
    note,
    changed_by: changed_by || 'ADMIN',
  });
  return response.data;
};

export const reverseGeocodeCoords = async (lat: number, lon: number): Promise<{ address: string }> => {
  const response = await apiClient.get<{ success: boolean; data: { address: string } }>('/geocode/reverse', {
    params: { lat, lon },
  });
  return response.data.data;
};

// ─── AI Triage ──────────────────────────────────────────────────────────────

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AITriageResponse {
  success: boolean;
  data: {
    message: string;
    source: 'omniroute' | 'rule_fallback';
    modelUsed?: string;
  };
}

export const getTriageQuestion = async (
  category: string,
  description: string,
  conversationHistory: ChatMessage[]
): Promise<AITriageResponse> => {
  const response = await apiClient.post<AITriageResponse>('/ai/respond', {
    category,
    description,
    conversationHistory,
  });
  return response.data;
};

export const generateResponderSummary = async (
  category: string,
  description: string,
  conversationHistory: ChatMessage[],
  address?: string
): Promise<{ success: boolean; summary: string }> => {
  const response = await apiClient.post<{ success: boolean; summary: string }>('/ai/summary', {
    category,
    description,
    conversationHistory,
    address,
  });
  return response.data;
};

export const checkAIStatus = async (): Promise<{ omniroute_online: boolean }> => {
  const response = await apiClient.get<{ success: boolean; omniroute_online: boolean }>('/ai/status');
  return response.data;
};

// ─── Translation ─────────────────────────────────────────────────────────────

export interface TranslationResult {
  originalText: string;
  translatedText: string;
  sourceLang: string;
  targetLang: string;
  service: string;
}

export const translateText = async (
  text: string,
  targetLang = 'en',
  sourceLang = 'auto'
): Promise<{ success: boolean; data: TranslationResult }> => {
  const response = await apiClient.post<{ success: boolean; data: TranslationResult }>('/translate', {
    text,
    targetLang,
    sourceLang,
  });
  return response.data;
};

// ─── Nearby Emergency Services ───────────────────────────────────────────────

export interface ResponderLocation {
  id: string;
  name: string;
  type: 'hospital' | 'police' | 'fire_station' | 'other';
  distance_meters: number;
  latitude: number;
  longitude: number;
  address?: string;
  phone?: string;
  directionsUrl: string;
}

export interface NearbyRespondersResponse {
  success: boolean;
  data: {
    hospital: ResponderLocation | null;
    policeStation: ResponderLocation | null;
    allLocations: ResponderLocation[];
    searchRadiusMeters: number;
    source: string;
  };
  smsPayload?: {
    rawPayload: string;
    charCount: number;
    label: string;
    fields: Record<string, string>;
  };
}

export const fetchNearbyResponders = async (
  lat: number,
  lon: number,
  radius = 5000
): Promise<NearbyRespondersResponse> => {
  const response = await apiClient.get<NearbyRespondersResponse>('/locations/nearby', {
    params: { lat, lon, radius },
  });
  return response.data;
};

export const fetchEmergencyPackage = async (
  lat: number,
  lon: number,
  category: string,
  riskScore: number,
  description: string
): Promise<NearbyRespondersResponse> => {
  const response = await apiClient.get<NearbyRespondersResponse>('/locations/emergency-package', {
    params: { lat, lon, category, risk_score: riskScore, description },
  });
  return response.data;
};

// ─── Recent Events (cross-incident, for Dashboard feed) ──────────────────────

export const fetchRecentEvents = async (
  limit = 50
): Promise<{ success: boolean; count: number; events: import('../types').IncidentEvent[] }> => {
  const response = await apiClient.get('/complaints/events', { params: { limit } });
  return response.data;
};
