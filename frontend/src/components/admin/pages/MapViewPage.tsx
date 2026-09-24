import React, { useState, useEffect, useCallback } from 'react';
import { 
  Map as MapIcon, 
  Filter, 
  Shield, 
  Hospital, 
  Clock, 
  MapPin, 
  CheckCircle2, 
  ArrowRight,
  RefreshCw,
} from 'lucide-react';

import { MapContainer, TileLayer, Marker, Circle, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { fetchComplaints, fetchResponsePlan } from '../../../services/api';
import { Complaint } from '../../../types';
import { EmergencyResponse } from '../../emergency/EmergencyResponse';
import { LiveIncidentUpdates } from '../../emergency/LiveIncidentUpdates';
import { IncidentTimelineCard } from '../../emergency/IncidentTimelineCard';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Category-to-Authority Mapping Matrix
export const CATEGORY_AUTHORITY_MAP: Record<
  string,
  {
    type: 'Civic' | 'Urgent';
    primaryName: string;
    primaryType: 'municipal' | 'police' | 'hospital' | 'fire_station';
    secondaryName: string;
    secondaryType: 'municipal' | 'police' | 'hospital' | 'fire_station';
    action: string;
    whyEscalated: string[];
  }
> = {
  'Road damage': {
    type: 'Civic',
    primaryName: 'Municipal Corporation — Roads Dept',
    primaryType: 'municipal',
    secondaryName: 'Local Traffic Police Division',
    secondaryType: 'police',
    action: 'Alert Municipal Corporation Roads Dept for urgent road repair, pothole filling, and barricading.',
    whyEscalated: [
      'Municipal Corporation Roads Dept alerted for pothole filling & asphalt resurfacing',
      'Local Traffic Police Division notified for diversion & lane barrier placement',
      'Direct GPS telemetry logged with high accuracy for municipal inspection crew',
    ],
  },
  'Garbage/waste': {
    type: 'Civic',
    primaryName: 'Municipal Corporation — Sanitation Dept',
    primaryType: 'municipal',
    secondaryName: 'Zonal Health & Hygiene Inspection Unit',
    secondaryType: 'municipal',
    action: 'Dispatch Municipal Sanitation truck and solid waste collection crew for area clearing.',
    whyEscalated: [
      'Municipal Sanitation Dept auto-dispatched for dump clearance and bin emptying',
      'Zonal Health & Hygiene Unit notified for sanitation compliance check',
      'Public hazard flagged to prevent civic health risks and drain clogging',
    ],
  },
  'Streetlight problems': {
    type: 'Civic',
    primaryName: 'Municipal Corporation — Electrical Dept',
    primaryType: 'municipal',
    secondaryName: 'Local Police Night Patrol Unit',
    secondaryType: 'police',
    action: 'Alert Municipal Electrical Dept for streetlight restoration and electrical line inspection.',
    whyEscalated: [
      'Municipal Corporation Electrical Dept scheduled for transformer & luminaire repair',
      'Local Police Night Patrol Unit alerted for enhanced evening visibility patrol',
      'Dark-zone safety alert logged in municipal lighting grid',
    ],
  },
  'Water leakage': {
    type: 'Civic',
    primaryName: 'Municipal Corporation — Water & Sewerage Dept',
    primaryType: 'municipal',
    secondaryName: 'Municipal Jal Sansthan Emergency Response',
    secondaryType: 'municipal',
    action: 'Dispatch Municipal Water & Sewerage repair team to isolate supply line and fix leakage.',
    whyEscalated: [
      'Municipal Water & Sewerage Dept alerted for main pipeline isolation & repair',
      'Emergency Jal Sansthan team queued for supply pressure stabilization',
      'Water loss prevention protocol activated at zonal water station',
    ],
  },
  'Noise complaints': {
    type: 'Civic',
    primaryName: 'Local Police — Non-Emergency Civic Cell',
    primaryType: 'police',
    secondaryName: 'Municipal Corporation Grievance Cell',
    secondaryType: 'municipal',
    action: 'Notify Local Police Civic Cell to investigate noise disturbance and enforce decibel compliance.',
    whyEscalated: [
      'Local Police Non-Emergency Civic Cell notified for on-site decibel verification',
      'Municipal Corporation Grievance Cell alerted for sound ordinance enforcement',
      'Citizen grievance logged into civic cell docket',
    ],
  },
  'Harassment': {
    type: 'Urgent',
    primaryName: 'Police Department — Emergency Control Room',
    primaryType: 'police',
    secondaryName: 'Rapid Action Women Safety & Patrol Squad',
    secondaryType: 'police',
    action: 'Dispatch nearest Police Emergency Response Vehicle and open live tactical monitoring.',
    whyEscalated: [
      'Police Emergency Control Room triggered for immediate PCR intercept',
      'Rapid Action Patrol Unit notified with real-time live GPS telemetry',
      'Live SOS channel activated for responder coordination',
    ],
  },
  'Suspicious activity': {
    type: 'Urgent',
    primaryName: 'Police Department — Patrol Unit',
    primaryType: 'police',
    secondaryName: 'Local Police Station & Surveillance Post',
    secondaryType: 'police',
    action: 'Alert Police Patrol Unit to intercept and inspect suspicious activity at coordinates.',
    whyEscalated: [
      'Police Patrol Unit routed to coordinate perimeter for immediate inspection',
      'Local Police Station notified with user-reported visual intelligence',
      'Sector surveillance cameras cross-referenced with incident location',
    ],
  },
  'Accident': {
    type: 'Urgent',
    primaryName: 'Police Dept + Nearest Hospital Emergency Trauma',
    primaryType: 'hospital',
    secondaryName: 'Police Department — Emergency Traffic & Trauma Unit',
    secondaryType: 'police',
    action: 'Dispatch ALS Ambulance and notify Police Department for urgent rescue and perimeter control.',
    whyEscalated: [
      'Emergency Hospital Trauma Care & ALS Ambulance dispatched with highest priority',
      'Police Department Traffic Division alerted for collision site barricading',
      'Critical risk score computed: golden-hour trauma response active',
    ],
  },
  'Fire': {
    type: 'Urgent',
    primaryName: 'Fire & Rescue Services',
    primaryType: 'fire_station',
    secondaryName: 'Municipal Corporation — Water Dept (Hydrants)',
    secondaryType: 'municipal',
    action: 'Dispatch Fire Tender, alert Trauma Hospital, and notify Municipal Water Dept for hydrant pressure.',
    whyEscalated: [
      'Fire & Rescue Services dispatched with water tender & ladder unit',
      'Municipal Water Dept instructed to boost hydrant main line pressure',
      'Nearest Emergency Hospital Trauma ward placed on standby',
    ],
  },
  'Medical Emergency': {
    type: 'Urgent',
    primaryName: 'Nearest Hospital Emergency & Ambulance Services',
    primaryType: 'hospital',
    secondaryName: 'Local Police Quick Response Team',
    secondaryType: 'police',
    action: 'Dispatch Advanced Life Support (ALS) Ambulance and reserve emergency trauma bed.',
    whyEscalated: [
      'Hospital Emergency & Ambulance Services routed with siren priority',
      'Local Police Quick Response Team notified to clear emergency transit corridor',
      'Hospital ER triage notified of incoming patient vital metrics',
    ],
  },
  'Other civic issues': {
    type: 'Civic',
    primaryName: 'General Municipal Helpdesk & Public Grievances',
    primaryType: 'municipal',
    secondaryName: 'Zonal Civic Action Squad',
    secondaryType: 'municipal',
    action: 'Route complaint to General Municipal Helpdesk and assign field officer.',
    whyEscalated: [
      'General Municipal Helpdesk & Public Grievances ticket created',
      'Zonal Civic Action Squad officer assigned for physical inspection',
      'Complaint tracked with automated municipal SLA timer',
    ],
  },
};

// Custom Leaflet DivIcon Callout Factory
const createGroundZeroCallout = (riskScore: number, riskLevel: string, category: string) => {
  return L.divIcon({
    className: 'custom-ground-zero-callout',
    html: `
      <div style="position:relative;display:flex;flex-direction:column;align-items:center;cursor:pointer;">
        <!-- Floating Red Info Box -->
        <div style="
          position:absolute;
          bottom:24px;
          left:16px;
          background:rgba(15, 20, 44, 0.95);
          border:1.5px solid #EF4444;
          border-radius:12px;
          padding:6px 12px;
          box-shadow:0 8px 24px rgba(239, 68, 68, 0.35);
          white-space:nowrap;
          color:white;
          display:flex;
          align-items:center;
          gap:8px;
          z-index:100;
        ">
          <div style="
            background:#EF4444;
            width:24px;
            height:24px;
            border-radius:50%;
            display:flex;
            align-items:center;
            justify-content:center;
            font-size:12px;
            font-weight:900;
          ">!</div>
          <div>
            <div style="font-weight:800;font-size:11px;color:#FCA5A5;display:flex;align-items:center;gap:6px;">
              <span>${category || 'Ground Zero'}</span>
              <span style="background:#EF4444;color:white;font-size:8px;padding:1px 5px;border-radius:4px;font-weight:900;">${riskLevel || 'CRITICAL'}</span>
            </div>
            <div style="font-size:9px;color:#94A3B8;">Incident Location &bull; Risk: ${riskScore}/100</div>
          </div>
        </div>

        <!-- Animated Center Target Beacon -->
        <div style="position:relative;display:flex;align-items:center;justify-content:center;">
          <div style="position:absolute;width:48px;height:48px;border-radius:50%;background:rgba(239,68,68,0.4);animation:ping 2s cubic-bezier(0,0,0.2,1) infinite;"></div>
          <div style="
            background:#EF4444;
            width:34px;
            height:34px;
            border-radius:50%;
            display:flex;
            align-items:center;
            justify-content:center;
            border:2.5px solid white;
            box-shadow:0 0 20px rgba(239,68,68,0.9);
            color:white;
            font-size:15px;
          ">
            🚨
          </div>
        </div>
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });
};

// Dynamic Authority Callout Maker
const createAuthorityCallout = (
  name: string,
  roleBadge: string,
  type: 'municipal' | 'police' | 'hospital' | 'fire_station',
  dist: string,
  eta: string
) => {
  let theme = {
    border: '#C084FC',
    bg: 'rgba(26, 20, 48, 0.96)',
    iconBg: '#9333EA',
    titleColor: '#F3E8FF',
    subColor: '#E9D5FF',
    emoji: '🏛️',
    typeLabel: 'Municipal Corp',
  };

  if (type === 'hospital') {
    theme = {
      border: '#38BDF8',
      bg: 'rgba(11, 28, 64, 0.96)',
      iconBg: '#0284C7',
      titleColor: '#E0F2FE',
      subColor: '#7DD3FC',
      emoji: '🏥',
      typeLabel: 'Hospital / Trauma',
    };
  } else if (type === 'police') {
    theme = {
      border: '#2DD4BF',
      bg: 'rgba(6, 44, 38, 0.96)',
      iconBg: '#0D9488',
      titleColor: '#CCFBF1',
      subColor: '#5EEAD4',
      emoji: '🛡️',
      typeLabel: 'Police Dept',
    };
  } else if (type === 'fire_station') {
    theme = {
      border: '#FB923C',
      bg: 'rgba(45, 18, 10, 0.96)',
      iconBg: '#EA580C',
      titleColor: '#FFEDD5',
      subColor: '#FED7AA',
      emoji: '🔥',
      typeLabel: 'Fire & Rescue',
    };
  }

  return L.divIcon({
    className: `custom-authority-callout-${type}`,
    html: `
      <div style="position:relative;display:flex;align-items:center;cursor:pointer;">
        <div style="
          background:${theme.bg};
          border:1.5px solid ${theme.border};
          border-radius:12px;
          padding:6px 12px;
          box-shadow:0 8px 24px rgba(0,0,0,0.6);
          white-space:nowrap;
          color:white;
          display:flex;
          align-items:center;
          gap:8px;
        ">
          <div style="
            background:${theme.iconBg};
            width:24px;
            height:24px;
            border-radius:50%;
            display:flex;
            align-items:center;
            justify-content:center;
            font-size:12px;
            font-weight:900;
          ">${theme.emoji}</div>
          <div>
            <div style="font-weight:800;font-size:11px;color:${theme.titleColor};display:flex;align-items:center;gap:5px;">
              <span>${name}</span>
              <span style="background:${theme.iconBg};color:white;font-size:8px;padding:1px 4px;border-radius:4px;font-weight:900;">${roleBadge}</span>
            </div>
            <div style="font-size:9px;color:${theme.subColor};">${theme.typeLabel} &bull; ${dist} (${eta} ETA)</div>
          </div>
        </div>
      </div>
    `,
    iconSize: [230, 44],
    iconAnchor: [115, 22],
  });
};

const createDistancePillIcon = (text: string, color = '#38BDF8') => {
  return L.divIcon({
    className: 'custom-distance-pill',
    html: `
      <div style="
        background:#020617;
        border:1px solid ${color};
        color:${color};
        font-weight:800;
        font-size:9px;
        padding:2px 8px;
        border-radius:12px;
        box-shadow:0 2px 8px rgba(0,0,0,0.8);
        white-space:nowrap;
        text-align:center;
      ">
        ${text}
      </div>
    `,
    iconSize: [90, 20],
    iconAnchor: [45, 10],
  });
};

const createPerimeterLabelIcon = (text: string) => {
  return L.divIcon({
    className: 'custom-perimeter-label',
    html: `
      <div style="
        background:rgba(239, 68, 68, 0.85);
        color:white;
        font-weight:800;
        font-size:9px;
        padding:2px 8px;
        border-radius:12px;
        box-shadow:0 2px 8px rgba(0,0,0,0.8);
        white-space:nowrap;
        border:1px solid rgba(255,255,255,0.4);
      ">
        ${text}
      </div>
    `,
    iconSize: [120, 20],
    iconAnchor: [60, 10],
  });
};

const createGenericPin = (color: string, emoji: string) => {
  return L.divIcon({
    className: 'custom-generic-pin',
    html: `
      <div style="
        background:${color};
        width:24px;
        height:24px;
        border-radius:50%;
        display:flex;
        align-items:center;
        justify-content:center;
        font-size:11px;
        border:1.5px solid white;
        box-shadow:0 2px 6px rgba(0,0,0,0.6);
        cursor:pointer;
      ">
        ${emoji}
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
};

function MapRecenterControl({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, 13);
  }, [center, map]);
  return null;
}

export const MapViewPage: React.FC = () => {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeIncident, setActiveIncident] = useState<Complaint | null>(null);
  const [activeTab, setActiveTab] = useState<'INTELLIGENCE' | 'UPDATES' | 'TIMELINE'>('INTELLIGENCE');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [riskFilter, setRiskFilter] = useState<string>('ALL');
  const [fullEmergencyModal, setFullEmergencyModal] = useState<Complaint | null>(null);
  
  // Open Map Tile Layers: Clean Street OSM (Default) and Satellite (Voyager removed as requested)
  const [tileType, setTileType] = useState<'street' | 'satellite'>('street');

  const tileUrls = {
    street: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  };

  const loadComplaints = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchComplaints();
      if (res.success && res.complaints && res.complaints.length > 0) {
        setComplaints(res.complaints);
        if (!activeIncident) {
          // Select highest risk incident by default
          const sorted = [...res.complaints].sort((a, b) => (b.risk_score || 0) - (a.risk_score || 0));
          setActiveIncident(sorted[0]);
        }
      }
    } catch (err) {
      console.warn('Failed to load complaints for tactical map:', err);
    } finally {
      setLoading(false);
    }
  }, [activeIncident]);

  useEffect(() => {
    loadComplaints();
  }, [loadComplaints]);

  // Comprehensive Category and Risk Filtering
  const filteredComplaints = complaints.filter(c => {
    if (categoryFilter !== 'ALL') {
      const cat = (c.category || '').toLowerCase();
      const filt = categoryFilter.toLowerCase();
      if (cat !== filt && !cat.includes(filt) && !filt.includes(cat)) {
        return false;
      }
    }
    if (riskFilter !== 'ALL') {
      const score = c.risk_score || 0;
      const level = (c.risk_level || '').toUpperCase();
      if (riskFilter === 'CRITICAL' && level !== 'CRITICAL' && score < 80) return false;
      if (riskFilter === 'HIGH' && (score < 60 || score >= 80)) return false;
      if (riskFilter === 'MEDIUM' && (score < 30 || score >= 60)) return false;
      if (riskFilter === 'LOW' && score >= 30) return false;
    }
    return true;
  });

  // When filter changes, update activeIncident to first matching incident
  useEffect(() => {
    if (filteredComplaints.length > 0) {
      if (!activeIncident || !filteredComplaints.some(c => c.id === activeIncident.id)) {
        setActiveIncident(filteredComplaints[0]);
      }
    }
  }, [categoryFilter, riskFilter, complaints]);

  // Load response plan dynamically for the active incident if missing
  useEffect(() => {
    if (activeIncident?.id && !activeIncident.response_plan) {
      fetchResponsePlan(activeIncident.id).then(res => {
        if (res?.success && res.plan) {
          setActiveIncident(prev => prev && prev.id === activeIncident.id ? { ...prev, response_plan: res.plan } : prev);
          setComplaints(prev => prev.map(c => c.id === activeIncident.id ? { ...c, response_plan: res.plan } : c));
        }
      }).catch(() => {});
    }
  }, [activeIncident?.id]);

  // Real Incident Coordinates
  const groundZeroLat = activeIncident?.latitude || 26.8467;
  const groundZeroLng = activeIncident?.longitude || 80.9462;
  const currentCategory = activeIncident?.category || 'Road damage';
  const categoryConfig = CATEGORY_AUTHORITY_MAP[currentCategory] || CATEGORY_AUTHORITY_MAP['Road damage'];

  // Primary and Secondary Authorities based on Active Category Matrix
  const primaryUnit = activeIncident?.response_plan?.primary_response;
  const secondaryUnit = activeIncident?.response_plan?.secondary_response;

  const primaryName = primaryUnit?.name || categoryConfig.primaryName;
  const primaryType = (primaryUnit?.type || categoryConfig.primaryType) as 'municipal' | 'police' | 'hospital' | 'fire_station';
  const primaryDist = primaryUnit?.distance_km ? `${primaryUnit.distance_km} km` : '1.2 km';
  const primaryEta = primaryUnit?.estimated_eta_minutes ? `~${primaryUnit.estimated_eta_minutes} min` : '~3 min';
  const primaryPos: [number, number] = [
    primaryUnit?.latitude || (groundZeroLat + 0.010),
    primaryUnit?.longitude || (groundZeroLng - 0.011),
  ];
  const primaryMidpoint: [number, number] = [(groundZeroLat + primaryPos[0]) / 2, (groundZeroLng + primaryPos[1]) / 2];

  const secondaryName = secondaryUnit?.name || categoryConfig.secondaryName;
  const secondaryType = (secondaryUnit?.type || categoryConfig.secondaryType) as 'municipal' | 'police' | 'hospital' | 'fire_station';
  const secondaryDist = secondaryUnit?.distance_km ? `${secondaryUnit.distance_km} km` : '1.8 km';
  const secondaryEta = secondaryUnit?.estimated_eta_minutes ? `~${secondaryUnit.estimated_eta_minutes} min` : '~5 min';
  const secondaryPos: [number, number] = [
    secondaryUnit?.latitude || (groundZeroLat - 0.011),
    secondaryUnit?.longitude || (groundZeroLng + 0.012),
  ];
  const secondaryMidpoint: [number, number] = [(groundZeroLat + secondaryPos[0]) / 2, (groundZeroLng + secondaryPos[1]) / 2];

  // Colors for route polylines
  const typePolylineColor = (t: string) => {
    switch (t) {
      case 'hospital': return '#0284C7';
      case 'police': return '#0D9488';
      case 'fire_station': return '#EA580C';
      case 'municipal':
      default: return '#9333EA';
    }
  };

  return (
    <div className="flex flex-col lg:flex-row h-full min-h-0 bg-[var(--vera-bg)] overflow-hidden text-[var(--vera-text-primary)]">
      {/* ── Emergency Orchestrator Modal ── */}
      {fullEmergencyModal && (
        <EmergencyResponse
          complaint={fullEmergencyModal}
          onClose={() => setFullEmergencyModal(null)}
          onComplaintUpdated={(updated) => {
            setComplaints(prev => prev.map(c => (c.id === updated.id ? updated : c)));
            if (activeIncident?.id === updated.id) setActiveIncident(updated);
          }}
        />
      )}

      {/* ── Left / Center Column: Map Canvas + Ticker (Flex 1) ── */}
      <div className="flex-1 flex flex-col min-w-0 border-r border-[var(--vera-border)]">
        {/* Top Map Header & Controls */}
        <div className="p-4 bg-[var(--vera-surface)] border-b border-[var(--vera-border)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-[var(--vera-primary-soft)] text-[var(--vera-primary)] border border-[var(--vera-primary-border)]">
                <MapIcon className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-black text-[var(--vera-text-primary)] uppercase tracking-tight">
                Tactical Response Map
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-[var(--vera-primary-soft)] text-[var(--vera-primary)] border border-[var(--vera-primary-border)]">
                Live Incidents: {filteredComplaints.length}
              </span>
            </div>
            <p className="text-xs text-[var(--vera-text-muted)] mt-0.5">
              Geographic distribution with real GPS telemetry and category-matched Primary &amp; Secondary response units
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <button
              onClick={() => loadComplaints()}
              disabled={loading}
              className="p-2 rounded-xl vera-button-secondary text-[var(--vera-text-secondary)] hover:text-[var(--vera-text-primary)] transition cursor-pointer"
              title="Refresh"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-[var(--vera-primary)] ${loading ? 'animate-spin' : ''}`} />
            </button>

            <button 
              onClick={() => { setCategoryFilter('ALL'); setRiskFilter('ALL'); }}
              className="px-3 py-1.5 rounded-xl vera-button-secondary text-xs font-semibold text-[var(--vera-text-secondary)] hover:text-[var(--vera-text-primary)] flex items-center gap-1.5 transition cursor-pointer"
              title="Reset Filters"
            >
              <Filter className="w-3.5 h-3.5 text-[var(--vera-primary)]" />
              <span>Reset</span>
            </button>

            {/* Category Filter Dropdown */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="vera-input text-xs rounded-xl px-3 py-1.5 focus:outline-none cursor-pointer font-medium"
            >
              <option value="ALL">All Categories ({complaints.length})</option>
              <option value="Road damage">Road damage (Civic)</option>
              <option value="Garbage/waste">Garbage/waste (Civic)</option>
              <option value="Streetlight problems">Streetlight problems (Civic)</option>
              <option value="Water leakage">Water leakage (Civic)</option>
              <option value="Noise complaints">Noise complaints (Civic)</option>
              <option value="Harassment">Harassment (Urgent)</option>
              <option value="Suspicious activity">Suspicious activity (Urgent)</option>
              <option value="Accident">Accident (Urgent)</option>
              <option value="Fire">Fire (Urgent)</option>
              <option value="Medical Emergency">Medical Emergency (Urgent)</option>
              <option value="Other civic issues">Other civic issues (Civic)</option>
            </select>

            {/* Risk Filter Dropdown */}
            <select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
              className="vera-input text-xs rounded-xl px-3 py-1.5 focus:outline-none cursor-pointer font-medium"
            >
              <option value="ALL">All Risk Levels</option>
              <option value="CRITICAL">Critical (80-100)</option>
              <option value="HIGH">High (60-79)</option>
              <option value="MEDIUM">Medium (30-59)</option>
              <option value="LOW">Low (0-29)</option>
            </select>
          </div>
        </div>

        {/* Legend Pills Strip with All Authorities */}
        <div className="px-4 py-2 bg-[var(--vera-surface-elevated)] border-b border-[var(--vera-border)] flex flex-wrap items-center gap-2 text-[11px] shrink-0">
          <span className="px-2.5 py-0.5 rounded-md bg-[#D45060]/15 border border-[#D45060]/30 text-[#D45060] font-bold flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#D45060]" /> Ground Zero
          </span>
          <span className="px-2.5 py-0.5 rounded-md bg-[var(--vera-primary-soft)] border border-[var(--vera-primary-border)] text-[var(--vera-text-primary)] font-bold flex items-center gap-1.5">
            <span>🏛️</span> Municipal Dept
          </span>
          <span className="px-2.5 py-0.5 rounded-md bg-blue-500/10 border border-blue-500/30 text-blue-500 font-bold flex items-center gap-1.5">
            <span>🏥</span> Hospital / Trauma
          </span>
          <span className="px-2.5 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 font-bold flex items-center gap-1.5">
            <span>🛡️</span> Police / Patrol
          </span>
          <span className="px-2.5 py-0.5 rounded-md bg-orange-500/10 border border-orange-500/30 text-orange-600 font-bold flex items-center gap-1.5">
            <span>🔥</span> Fire &amp; Rescue
          </span>
        </div>

        {/* Map Canvas (Clean Street OpenStreetMap / Satellite) */}
        <div className="flex-1 relative min-h-[360px] bg-[var(--vera-bg)] overflow-hidden">
          {/* Floating Tile Layer Switcher (Street OSM & Satellite) */}
          <div className="absolute top-3 right-3 z-[1000] flex items-center bg-[var(--vera-surface)]/95 backdrop-blur-md border border-[var(--vera-border)] rounded-xl p-1 shadow-2xl text-[11px] gap-1">
            <button
              onClick={() => setTileType('street')}
              className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                tileType === 'street'
                  ? 'vera-button-primary shadow-sm'
                  : 'text-[var(--vera-text-muted)] hover:text-[var(--vera-text-primary)]'
              }`}
            >
              Street (OSM)
            </button>
            <button
              onClick={() => setTileType('satellite')}
              className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                tileType === 'satellite'
                  ? 'vera-button-primary shadow-sm'
                  : 'text-[var(--vera-text-muted)] hover:text-[var(--vera-text-primary)]'
              }`}
            >
              Satellite
            </button>
          </div>

          <MapContainer
            center={[groundZeroLat, groundZeroLng]}
            zoom={13}
            scrollWheelZoom={true}
            className="w-full h-full"
            style={{ background: 'var(--vera-bg)' }}
          >
            <TileLayer
              key={tileType}
              attribution='&copy; OpenStreetMap &bull; CARTO &bull; ESRI'
              url={tileUrls[tileType]}
              maxZoom={19}
            />

            <MapRecenterControl center={[groundZeroLat, groundZeroLng]} />

            {/* ── 1. Ground Zero Center Marker & Callout ── */}
            <Marker
              position={[groundZeroLat, groundZeroLng]}
              icon={createGroundZeroCallout(activeIncident?.risk_score || 94, activeIncident?.risk_level || 'CRITICAL', currentCategory)}
            />

            {/* ── 2. 250m Risk Perimeter Shaded Circle ── */}
            <Circle
              center={[groundZeroLat, groundZeroLng]}
              radius={350}
              pathOptions={{
                color: '#D45060',
                fillColor: '#D45060',
                fillOpacity: 0.22,
                weight: 2,
                dashArray: '4, 4',
              }}
            />

            {/* 250m Perimeter Label */}
            <Marker
              position={[groundZeroLat - 0.003, groundZeroLng]}
              icon={createPerimeterLabelIcon('250m Risk Perimeter')}
            />

            {/* ── 3. Primary Authority Callout & Route Vector ── */}
            <Marker
              position={primaryPos}
              icon={createAuthorityCallout(primaryName, 'PRIMARY', primaryType, primaryDist, primaryEta)}
            />

            <Polyline
              positions={[[groundZeroLat, groundZeroLng], primaryPos]}
              pathOptions={{
                color: typePolylineColor(primaryType),
                weight: 3.5,
                opacity: 0.95,
                dashArray: '6, 6',
              }}
            />

            <Marker position={primaryMidpoint} icon={createDistancePillIcon(`${primaryDist} (${primaryEta})`, typePolylineColor(primaryType))} />

            {/* ── 4. Secondary Authority Callout & Route Vector ── */}
            <Marker
              position={secondaryPos}
              icon={createAuthorityCallout(secondaryName, 'SECONDARY', secondaryType, secondaryDist, secondaryEta)}
            />

            <Polyline
              positions={[[groundZeroLat, groundZeroLng], secondaryPos]}
              pathOptions={{
                color: typePolylineColor(secondaryType),
                weight: 3.5,
                opacity: 0.95,
                dashArray: '6, 6',
              }}
            />

            <Marker position={secondaryMidpoint} icon={createDistancePillIcon(`${secondaryDist} (${secondaryEta})`, typePolylineColor(secondaryType))} />

            {/* ── 5. Real Filtered Incidents on Map ── */}
            {filteredComplaints
              .filter(c => c.id !== activeIncident?.id && c.latitude && c.longitude)
              .map((c) => {
                const isCrit = (c.risk_score || 0) >= 80 || c.risk_level === 'CRITICAL';
                const isHi = (c.risk_score || 0) >= 60 && !isCrit;
                const isMed = (c.risk_score || 0) >= 40 && !isCrit && !isHi;
                const pinColor = isCrit ? '#D45060' : isHi ? '#F97316' : isMed ? '#EAB308' : '#10B981';
                const pinEmoji = c.category === 'Fire' ? '🔥' : c.category === 'Water leakage' ? '💧' : c.category === 'Garbage/waste' ? '🗑️' : c.category === 'Road damage' ? '🚧' : isCrit ? '!' : '🛡️';
                return (
                  <Marker
                    key={c.id}
                    position={[c.latitude, c.longitude]}
                    icon={createGenericPin(pinColor, pinEmoji)}
                    eventHandlers={{
                      click: () => setActiveIncident(c),
                    }}
                  />
                );
              })}
          </MapContainer>
        </div>

        {/* ── Bottom Strip: "Recent Incidents" (Filtered) ── */}
        <div className="p-4 bg-[var(--vera-surface)] border-t border-[var(--vera-border)] shrink-0">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--vera-text-muted)]">
              Filtered Incidents ({filteredComplaints.length})
            </h3>
            <button
              onClick={() => { setCategoryFilter('ALL'); setRiskFilter('ALL'); }}
              className="text-xs font-semibold text-[var(--vera-primary)] hover:underline transition"
            >
              Clear Filters &rarr;
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {filteredComplaints.slice(0, 5).map((inc) => {
              const isSelected = activeIncident?.id === inc.id;
              const isCritical = (inc.risk_score || 0) >= 80 || inc.risk_level === 'CRITICAL';
              const isHigh = (inc.risk_score || 0) >= 60 && !isCritical;
              const isMed = (inc.risk_score || 0) >= 40 && !isCritical && !isHigh;

              let iconEmoji = '🔴';
              let badgeStyle = 'vera-badge-critical';
              let badgeLabel = 'CRITICAL';

              if (isHigh) {
                iconEmoji = '🟠';
                badgeStyle = 'vera-badge-warning';
                badgeLabel = 'HIGH';
              } else if (isMed) {
                iconEmoji = '🟡';
                badgeStyle = 'vera-badge-warning';
                badgeLabel = 'MEDIUM';
              } else if (!isCritical) {
                iconEmoji = '🟢';
                badgeStyle = 'vera-badge-success';
                badgeLabel = 'LOW';
              }

              return (
                <div
                  key={inc.id}
                  onClick={() => setActiveIncident(inc)}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'bg-[var(--vera-primary-soft)] border-[var(--vera-primary)] shadow-md'
                      : 'vera-card border-[var(--vera-border)] hover:border-[var(--vera-primary-border)]'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-xs">{iconEmoji}</span>
                      <h4 className="text-xs font-bold text-[var(--vera-text-primary)] truncate">{inc.category}</h4>
                    </div>
                    <div className="text-[10px] font-mono text-[var(--vera-text-muted)]">#{inc.id.slice(0, 8)}</div>
                    <p className="text-[10px] text-[var(--vera-text-muted)] truncate mt-0.5">{inc.address || `${inc.latitude?.toFixed(3)}, ${inc.longitude?.toFixed(3)}`}</p>
                  </div>

                  <div className="flex items-center justify-between pt-2 mt-2 border-t border-[var(--vera-border)] text-[10px]">
                    <span className="font-bold text-[var(--vera-text-primary)] font-mono">{inc.risk_score}/100</span>
                    <span className={`vera-badge ${badgeStyle} text-[9px] font-black`}>
                      {badgeLabel}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Right Column: Incident Intelligence & Action Panel ── */}
      <div className="w-full lg:w-[380px] bg-[var(--vera-surface)] p-5 flex flex-col justify-between overflow-y-auto shrink-0 space-y-4">
        <div className="space-y-4">
          {/* Header Card */}
          <div className="pb-3 border-b border-[var(--vera-border)]">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono font-bold text-[#D45060] flex items-center gap-1">
                <span>🔴</span> INCIDENT #{activeIncident ? activeIncident.id.slice(0, 8) : 'VERA-10482'}
              </span>
              <div className="flex items-center gap-1.5">
                <span className={`vera-badge text-[9px] font-black uppercase ${
                  categoryConfig.type === 'Urgent' 
                    ? 'vera-badge-critical' 
                    : ''
                }`}>
                  {categoryConfig.type}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-[#D45060] text-white shadow-sm animate-pulse">
                  {activeIncident?.risk_level || 'CRITICAL'}
                </span>
              </div>
            </div>
            <h3 className="text-lg font-black text-[var(--vera-text-primary)] mt-1">
              {currentCategory}
            </h3>
            <div className="flex items-center gap-1.5 text-xs text-[var(--vera-text-muted)] mt-1">
              <MapPin className="w-3.5 h-3.5 text-[#D45060] shrink-0" />
              <span className="truncate">{activeIncident?.address || `${groundZeroLat.toFixed(4)}, ${groundZeroLng.toFixed(4)}`}</span>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-[var(--vera-text-muted)] mt-0.5 font-mono">
              <Clock className="w-3 h-3" />
              <span>Active Incident Telemetry</span>
            </div>
          </div>

          {/* 3 Metric Badges Row */}
          <div className="grid grid-cols-3 gap-2">
            <div className="p-2.5 rounded-xl vera-card-secondary text-center">
              <div className="text-[10px] uppercase font-bold text-[var(--vera-text-muted)]">Risk Score</div>
              <div className="text-sm font-black text-[#D45060] mt-0.5">
                {activeIncident?.risk_score || 94} <span className="text-[10px] text-[var(--vera-text-muted)]">/ 100</span>
              </div>
            </div>

            <div className="p-2.5 rounded-xl vera-card-secondary text-center">
              <div className="text-[10px] uppercase font-bold text-[var(--vera-text-muted)]">AI Confidence</div>
              <div className="text-sm font-black text-[var(--vera-primary)] mt-0.5">94%</div>
            </div>

            <div className="p-2.5 rounded-xl vera-card-secondary text-center">
              <div className="text-[10px] uppercase font-bold text-[var(--vera-text-muted)]">GPS Accuracy</div>
              <div className="text-sm font-black text-[var(--vera-text-primary)] mt-0.5">&plusmn;{activeIncident?.gps_accuracy || 12} m</div>
            </div>
          </div>

          {/* Tabs: [Intelligence & Plan] [Live Updates] [Timeline] */}
          <div className="flex items-center vera-card-secondary rounded-xl p-1 text-xs">
            <button
              onClick={() => setActiveTab('INTELLIGENCE')}
              className={`flex-1 py-1.5 rounded-lg font-bold transition ${
                activeTab === 'INTELLIGENCE'
                  ? 'vera-button-primary shadow'
                  : 'text-[var(--vera-text-muted)] hover:text-[var(--vera-text-primary)]'
              }`}
            >
              Intelligence &amp; Plan
            </button>
            <button
              onClick={() => setActiveTab('UPDATES')}
              className={`flex-1 py-1.5 rounded-lg font-bold transition ${
                activeTab === 'UPDATES'
                  ? 'vera-button-primary shadow'
                  : 'text-[var(--vera-text-muted)] hover:text-[var(--vera-text-primary)]'
              }`}
            >
              Live Updates
            </button>
            <button
              onClick={() => setActiveTab('TIMELINE')}
              className={`flex-1 py-1.5 rounded-lg font-bold transition ${
                activeTab === 'TIMELINE'
                  ? 'vera-button-primary shadow'
                  : 'text-[var(--vera-text-muted)] hover:text-[var(--vera-text-primary)]'
              }`}
            >
              Timeline
            </button>
          </div>

          {/* ── Sub-Tab Contents ── */}
          {activeTab === 'INTELLIGENCE' ? (
            <div className="space-y-4 text-xs">
              {/* Incident Intelligence 6-cell Matrix */}
              <div>
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-[var(--vera-text-muted)] mb-2 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-[var(--vera-primary)]" />
                  <span>INCIDENT INTELLIGENCE</span>
                </h4>
                <div className="grid grid-cols-3 gap-2 vera-card-secondary p-3 rounded-xl border border-[var(--vera-border)]">
                  <div>
                    <div className="text-[10px] text-[var(--vera-text-muted)]">Classification</div>
                    <div className="font-bold text-[var(--vera-text-primary)] mt-0.5">{categoryConfig.type}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-[var(--vera-text-muted)]">Severity</div>
                    <div className="font-bold text-[#D45060] mt-0.5">{activeIncident?.risk_level || 'CRITICAL'}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-[var(--vera-text-muted)]">Priority</div>
                    <div className="font-bold text-[#059669] mt-0.5">Tier 1 Auto-Route</div>
                  </div>
                  <div className="pt-2 border-t border-[var(--vera-border)]">
                    <div className="text-[10px] text-[var(--vera-text-muted)]">Primary Authority</div>
                    <div className="font-bold text-[var(--vera-primary)] mt-0.5 truncate">{primaryType.toUpperCase()}</div>
                  </div>
                  <div className="pt-2 border-t border-[var(--vera-border)]">
                    <div className="text-[10px] text-[var(--vera-text-muted)]">Location Lock</div>
                    <div className="font-bold text-[#059669] mt-0.5">Verified GPS</div>
                  </div>
                  <div className="pt-2 border-t border-[var(--vera-border)]">
                    <div className="text-[10px] text-[var(--vera-text-muted)]">Target ETA</div>
                    <div className="font-bold text-[var(--vera-primary)] mt-0.5">{primaryEta}</div>
                  </div>
                </div>
              </div>

              {/* Category-Matched Assigned Authorities Cards */}
              <div>
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-[var(--vera-text-muted)] mb-2 flex items-center gap-1.5">
                  <Hospital className="w-3.5 h-3.5 text-[var(--vera-primary)]" />
                  <span>ASSIGNED AUTHORITIES &amp; SERVICES</span>
                </h4>
                <div className="space-y-2">
                  {/* Primary Authority Card */}
                  <div className="p-3 rounded-xl vera-card-secondary border border-[var(--vera-border)] flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm border bg-[var(--vera-primary-soft)] text-[var(--vera-text-primary)] border-[var(--vera-primary-border)]">
                        {primaryType === 'municipal' ? '🏛️' : primaryType === 'hospital' ? '🏥' : primaryType === 'fire_station' ? '🔥' : '🛡️'}
                      </div>
                      <div className="max-w-[200px]">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-[var(--vera-text-primary)] text-xs truncate">{primaryName}</span>
                          <span className="px-1.5 py-0.2 rounded text-[8px] font-black uppercase bg-[var(--vera-primary-soft)] text-[var(--vera-primary)] border border-[var(--vera-primary-border)]">PRIMARY</span>
                        </div>
                        <div className="text-[10px] text-[var(--vera-text-muted)]">{primaryDist} &bull; {primaryEta} &bull; First responder active</div>
                      </div>
                    </div>
                    <button
                      onClick={() => activeIncident && setFullEmergencyModal(activeIncident)}
                      className="px-2.5 py-1 rounded-lg vera-button-secondary text-[10px] font-bold transition shrink-0 cursor-pointer"
                    >
                      View
                    </button>
                  </div>

                  {/* Secondary Authority Card */}
                  <div className="p-3 rounded-xl vera-card-secondary border border-[var(--vera-border)] flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm border bg-[var(--vera-primary-soft)] text-[var(--vera-text-primary)] border-[var(--vera-primary-border)]">
                        {secondaryType === 'municipal' ? '🏛️' : secondaryType === 'hospital' ? '🏥' : secondaryType === 'fire_station' ? '🔥' : '🛡️'}
                      </div>
                      <div className="max-w-[200px]">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-[var(--vera-text-primary)] text-xs truncate">{secondaryName}</span>
                          <span className="px-1.5 py-0.2 rounded text-[8px] font-black uppercase bg-[var(--vera-primary-soft)] text-[var(--vera-primary)] border border-[var(--vera-primary-border)]">SECONDARY</span>
                        </div>
                        <div className="text-[10px] text-[var(--vera-text-muted)]">{secondaryDist} &bull; {secondaryEta} &bull; Support unit standing by</div>
                      </div>
                    </div>
                    <button
                      onClick={() => activeIncident && setFullEmergencyModal(activeIncident)}
                      className="px-2.5 py-1 rounded-lg vera-button-secondary text-[10px] font-bold transition shrink-0 cursor-pointer"
                    >
                      View
                    </button>
                  </div>
                </div>
              </div>

              {/* Why VERA Escalated Checklist */}
              <div>
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-[var(--vera-text-muted)] mb-2 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#059669]" />
                  <span>WHY VERA ESCALATED</span>
                </h4>
                <div className="p-3 rounded-xl vera-card-secondary border border-[var(--vera-border)] space-y-1.5 text-xs text-[var(--vera-text-secondary)]">
                  <div className="flex items-center gap-2">
                    <span className="text-[#059669] font-bold">&check;</span>
                    <span>{currentCategory} ({categoryConfig.type}) risk computed at {activeIncident?.risk_score || 94}/100</span>
                  </div>
                  {categoryConfig.whyEscalated.map((reason, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="text-[#059669] font-bold">&check;</span>
                      <span>{reason}</span>
                    </div>
                  ))}
                  <div className="flex items-center gap-2">
                    <span className="text-[#059669] font-bold">&check;</span>
                    <span>Turn-by-turn routing coordinates deployed to active mobile responders</span>
                  </div>
                </div>
              </div>
            </div>
          ) : activeTab === 'UPDATES' ? (
            activeIncident ? (
              <LiveIncidentUpdates
                complaint={activeIncident}
                onUpdateAdded={(updated) => {
                  setActiveIncident(updated);
                  setComplaints(prev => prev.map(c => (c.id === updated.id ? updated : c)));
                }}
              />
            ) : null
          ) : (
            activeIncident ? <IncidentTimelineCard complaint={activeIncident} /> : null
          )}
        </div>

        {/* Full-width Confirm & Escalate Action Button */}
        <div className="pt-2">
          <button
            onClick={() => activeIncident && setFullEmergencyModal(activeIncident)}
            className="w-full py-3 rounded-xl vera-button-primary font-black text-xs uppercase tracking-wider shadow-lg transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>CONFIRM &amp; ESCALATE</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

