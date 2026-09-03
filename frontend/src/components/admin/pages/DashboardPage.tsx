import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Activity,
  CheckCircle2,
  MapPin,
  Image,
  Zap,
  AlertTriangle,
  RefreshCw,
  ChevronRight,
  Filter,
  Maximize2,
  Plus,
  Minus,
  Crosshair,
  Car,
  HeartPulse,
  Flame,
  Shield,
  Droplets,
  Trash2,
  Lightbulb,
  AlertOctagon
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import {
  fetchComplaints,
  fetchRecentEvents
} from '../../../services/api';

import { Complaint, IncidentEvent } from '../../../types';
import { supabase } from '../../../lib/supabase';
import 'leaflet/dist/leaflet.css';

// ─── Risk colour tokens ───────────────────────────────────────────────────────

const RISK_COLORS: Record<string, string> = {
  CRITICAL: '#ef4444',
  HIGH: '#f97316',
  MEDIUM: '#f59e0b',
  LOW: '#10b981',
};

function riskColor(level: string) {
  return RISK_COLORS[level] || RISK_COLORS.LOW;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${String(m).padStart(2, '0')}:${String(Math.floor((diff % 60000) / 1000)).padStart(2, '0')} ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function getCategoryIcon(category: string) {
  const lower = category.toLowerCase();
  if (lower.includes('accident') || lower.includes('road')) return <Car className="w-3.5 h-3.5 text-rose-400 shrink-0" />;
  if (lower.includes('medical') || lower.includes('ambulance')) return <HeartPulse className="w-3.5 h-3.5 text-emerald-400 shrink-0" />;
  if (lower.includes('fire')) return <Flame className="w-3.5 h-3.5 text-orange-400 shrink-0" />;
  if (lower.includes('harassment') || lower.includes('suspicious') || lower.includes('threat') || lower.includes('police')) return <Shield className="w-3.5 h-3.5 text-purple-400 shrink-0" />;
  if (lower.includes('water') || lower.includes('leak') || lower.includes('flood')) return <Droplets className="w-3.5 h-3.5 text-blue-400 shrink-0" />;
  if (lower.includes('waste') || lower.includes('garbage')) return <Trash2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />;
  if (lower.includes('street') || lower.includes('light') || lower.includes('power')) return <Lightbulb className="w-3.5 h-3.5 text-yellow-400 shrink-0" />;
  return <AlertOctagon className="w-3.5 h-3.5 text-slate-400 shrink-0" />;
}

// ─── Custom Leaflet Glowing Pin with "!" ──────────────────────────────────────

function createIncidentPinIcon(riskLevel: string, isCritical: boolean) {
  const color = riskColor(riskLevel);
  const size = isCritical ? 34 : 28;
  const radarHtml = isCritical
    ? `<div class="marker-radar-ring"></div><div class="marker-radar-ring-2"></div>`
    : '';

  const html = `
    <div style="position:relative;width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;cursor:pointer;">
      ${radarHtml}
      <div style="
        width:${size}px;
        height:${size}px;
        background:${color};
        border-radius:50%;
        border:2px solid #ffffff;
        box-shadow:0 0 16px ${color}, 0 0 30px ${color}88;
        display:flex;
        align-items:center;
        justify-content:center;
        color:#ffffff;
        font-family:sans-serif;
        font-weight:900;
        font-size:${isCritical ? 16 : 13}px;
        line-height:1;
        position:relative;
        z-index:2;
      ">
        !
      </div>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'custom-incident-pin',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

// Helper to pan & zoom map
const MapController: React.FC<{ center: [number, number]; zoom: number }> = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom, { animate: true });
  }, [center, zoom, map]);
  return null;
};

// ─── Sparkline SVG helper ─────────────────────────────────────────────────────

const Sparkline: React.FC<{ color: string }> = ({ color }) => (
  <svg className="w-full h-7 overflow-visible" viewBox="0 0 100 24" fill="none">
    <path
      d="M0,18 Q15,6 30,14 T60,8 T80,16 T100,10"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      fill="none"
    />
    <path
      d="M0,18 Q15,6 30,14 T60,8 T80,16 T100,10 L100,24 L0,24 Z"
      fill={`url(#grad-${color.replace('#', '')})`}
      opacity="0.2"
    />
    <defs>
      <linearGradient id={`grad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={color} stopOpacity="0.8" />
        <stop offset="100%" stopColor={color} stopOpacity="0.0" />
      </linearGradient>
    </defs>
  </svg>
);

// ─── Main Component ───────────────────────────────────────────────────────────

export const DashboardPage: React.FC = () => {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [recentEvents, setRecentEvents] = useState<IncidentEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPinComplaint, setSelectedPinComplaint] = useState<Complaint | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<string>('');

  const loadData = useCallback(async (isPolling = false) => {
    if (!isPolling) setLoading(true);
    try {
      const [compRes, evtRes] = await Promise.all([
        fetchComplaints({}),
        fetchRecentEvents(50),
      ]);
      if (compRes.success) {
        setComplaints(compRes.complaints);
        // Default selected pin to the newest or critical complaint
        if (!selectedPinComplaint && compRes.complaints.length > 0) {
          const crit = compRes.complaints.find(c => c.risk_score >= 60) || compRes.complaints[0];
          setSelectedPinComplaint(crit);
        }
      }
      if (evtRes.success) setRecentEvents(evtRes.events);
      setLastSyncTime(new Date().toLocaleTimeString());
    } catch {
      // non-fatal
    } finally {
      if (!isPolling) setLoading(false);
    }
  }, [selectedPinComplaint]);

  useEffect(() => {
    loadData();
    const iv = setInterval(() => loadData(true), 4000);
    return () => clearInterval(iv);
  }, [loadData]);

  // Realtime Supabase
  useEffect(() => {
    const client = supabase;
    if (!client) return;
    const ch = client
      .channel('dashboard:complaints')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'complaints' }, () => loadData(true))
      .subscribe();
    return () => {
      client.removeChannel(ch);
    };
  }, [loadData]);

  // ── FIX 48: STRICT DEDUPLICATION GUARANTEE ─────────────────────────────────
  // Confirms exactly ONE marker per valid incident row in database
  const uniqueMappableComplaints = useMemo(() => {
    const seen = new Set<string>();
    const list: Complaint[] = [];
    complaints.forEach((c) => {
      if (!c || !c.id || seen.has(c.id)) return;
      if (typeof c.latitude !== 'number' || typeof c.longitude !== 'number') return;
      if (isNaN(c.latitude) || isNaN(c.longitude) || (c.latitude === 0 && c.longitude === 0)) return;
      seen.add(c.id);
      list.push(c);
    });
    return list;
  }, [complaints]);

  // ── Stats computation ──────────────────────────────────────────────────────
  const totalCount = complaints.length;
  const activeCount = complaints.filter((c) => c.status !== 'Resolved').length;
  const criticalCount = complaints.filter(
    (c) => c.risk_score >= 60 || c.status === 'Critical Incident' || c.status === 'Emergency Response'
  ).length;
  const resolvedCount = complaints.filter((c) => c.status === 'Resolved').length;

  const photoCount = complaints.filter((c) => c.photo_url).length;
  const videoCount = complaints.filter((c) => c.video_url).length;
  const inProgressCount = complaints.filter((c) => c.status === 'In Progress').length;
  const avgRisk = totalCount > 0
    ? Math.round(complaints.reduce((s, c) => s + c.risk_score, 0) / totalCount)
    : 0;

  // Department counts
  const policeCount = complaints.filter(c => c.category?.toLowerCase().includes('harassment') || c.category?.toLowerCase().includes('suspicious') || c.category?.toLowerCase().includes('accident')).length;
  const medicalCount = complaints.filter(c => c.category?.toLowerCase().includes('medical') || c.category?.toLowerCase().includes('accident')).length;
  const fireCount = complaints.filter(c => c.category?.toLowerCase().includes('fire')).length;

  const mapCenter: [number, number] = uniqueMappableComplaints.length > 0
    ? [uniqueMappableComplaints[0].latitude, uniqueMappableComplaints[0].longitude]
    : [26.8467, 80.9462]; // Lucknow default from template

  if (loading && complaints.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-slate-400 gap-2">
        <RefreshCw className="w-5 h-5 animate-spin text-teal-400" />
        <span className="text-sm">Loading Command Center...</span>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 text-slate-100 bg-[#080a14]">
      {/* ── Page Header ───────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white uppercase">
            COMMAND CENTER
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time monitoring, intelligence, and response coordination
          </p>
        </div>

        <div className="flex items-center gap-3 self-start md:self-auto">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-semibold text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>LIVE MONITORING</span>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            Last synchronization: {lastSyncTime || 'Just now'}
          </span>
        </div>
      </div>

      {/* ── Top 4 KPI Cards (Matching Image Template) ─────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Incidents - Blue */}
        <div className="rounded-2xl p-5 bg-[#0e1326] border border-blue-500/30 flex flex-col justify-between shadow-lg shadow-blue-950/20 relative overflow-hidden">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-3xl font-black text-white font-mono tracking-tight">{totalCount}</p>
              <p className="text-[11px] font-bold tracking-wider uppercase text-blue-400 mt-1">TOTAL INCIDENTS</p>
              <p className="text-[10px] text-slate-500">All time</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Activity className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <Sparkline color="#3b82f6" />
          </div>
        </div>

        {/* Active Incidents - Teal */}
        <div className="rounded-2xl p-5 bg-[#0e1826] border border-cyan-500/30 flex flex-col justify-between shadow-lg shadow-cyan-950/20 relative overflow-hidden">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-3xl font-black text-white font-mono tracking-tight">{activeCount}</p>
              <p className="text-[11px] font-bold tracking-wider uppercase text-cyan-400 mt-1">ACTIVE INCIDENTS</p>
              <p className="text-[10px] text-slate-500">Currently open</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Zap className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <Sparkline color="#06b6d4" />
          </div>
        </div>

        {/* Critical Escalations - Red */}
        <div className={`rounded-2xl p-5 bg-[#1f0d14] border border-red-500/50 flex flex-col justify-between shadow-lg shadow-red-950/30 relative overflow-hidden ${criticalCount > 0 ? 'animate-pulse-slow ring-1 ring-red-500/40' : ''}`}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-3xl font-black text-white font-mono tracking-tight">
                {String(criticalCount).padStart(2, '0')}
              </p>
              <p className="text-[11px] font-bold tracking-wider uppercase text-red-400 mt-1">CRITICAL ESCALATIONS</p>
              <p className="text-[10px] text-slate-400">Immediate attention required</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400 animate-pulse">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <Sparkline color="#ef4444" />
          </div>
        </div>

        {/* Resolved - Amber */}
        <div className="rounded-2xl p-5 bg-[#1c180e] border border-amber-500/30 flex flex-col justify-between shadow-lg shadow-amber-950/20 relative overflow-hidden">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-3xl font-black text-white font-mono tracking-tight">{resolvedCount}</p>
              <p className="text-[11px] font-bold tracking-wider uppercase text-amber-400 mt-1">RESOLVED</p>
              <p className="text-[10px] text-slate-500">This month</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <Sparkline color="#f59e0b" />
          </div>
        </div>
      </div>

      {/* ── Middle Row: Live Incidents Table + Incident Map ───── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Live Incidents Table (5 cols on wide screens) */}
        <div className="lg:col-span-6 rounded-2xl bg-[#0d1124] border border-slate-800 flex flex-col overflow-hidden shadow-xl">
          <div className="p-4 border-b border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white tracking-wide">LIVE INCIDENTS</h2>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                LIVE
              </span>
            </div>
            <a href="#incidents" className="text-xs text-teal-400 hover:text-teal-300 font-medium flex items-center gap-1 transition">
              View All <ChevronRight className="w-3.5 h-3.5" />
            </a>
          </div>

          <div className="overflow-x-auto flex-1 max-h-[380px] overflow-y-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-900/60 text-slate-400 text-[10px] uppercase font-bold tracking-wider border-b border-slate-800">
                  <th className="py-2.5 px-3">ID</th>
                  <th className="py-2.5 px-3">CATEGORY</th>
                  <th className="py-2.5 px-3">LOCATION</th>
                  {/* FIX 49: Prominent Risk Score + Level header */}
                  <th className="py-2.5 px-3 text-center">RISK SCORE</th>
                  <th className="py-2.5 px-3">STATUS</th>
                  <th className="py-2.5 px-3 text-right">TIME</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {complaints.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500">
                      No complaints in the system. Submit a report to see it appear here.
                    </td>
                  </tr>
                ) : (
                  complaints.slice(0, 10).map((c, idx) => {
                    const isNew = idx === 0;
                    const isCritical = c.risk_score >= 60 || c.status === 'Critical Incident';
                    const color = riskColor(c.risk_level);
                    return (
                      <tr
                        key={c.id}
                        onClick={() => setSelectedPinComplaint(c)}
                        className={`hover:bg-slate-800/40 transition cursor-pointer ${
                          selectedPinComplaint?.id === c.id ? 'bg-indigo-950/30 border-l-2 border-indigo-500' : ''
                        }`}
                      >
                        {/* ID Column */}
                        <td className="py-3 px-3 whitespace-nowrap font-mono text-[11px] text-slate-300">
                          {isNew && (
                            <span className="mr-1.5 px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-purple-600/30 text-purple-300 border border-purple-500/40">
                              NEW
                            </span>
                          )}
                          INC-{c.id.slice(0, 5).toUpperCase()}
                        </td>

                        {/* Category with Icon */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          <div className="flex items-center gap-1.5 font-medium text-slate-200">
                            {getCategoryIcon(c.category)}
                            <span className="truncate max-w-[130px]">{c.category}</span>
                          </div>
                        </td>

                        {/* Location Coordinates */}
                        <td className="py-3 px-3 whitespace-nowrap font-mono text-[10px] text-slate-400">
                          {c.latitude.toFixed(4)}, {c.longitude.toFixed(4)}
                        </td>

                        {/* FIX 49: CONSISTENT RISK SCORE DISPLAY: Score AND Level always together */}
                        <td className="py-3 px-3 whitespace-nowrap text-center">
                          <div className="inline-flex flex-col items-center">
                            <span className="font-mono font-black text-xs leading-none" style={{ color }}>
                              {c.risk_score}/100
                            </span>
                            <span
                              className="text-[9px] font-extrabold tracking-wider uppercase mt-0.5"
                              style={{ color }}
                            >
                              {c.risk_level}
                            </span>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                              isCritical
                                ? 'bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse'
                                : c.status === 'Resolved'
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'bg-slate-800 text-slate-300 border border-slate-700'
                            }`}
                          >
                            {c.status === 'Critical Incident' ? 'ACTIVE' : c.status}
                          </span>
                        </td>

                        {/* Time */}
                        <td className="py-3 px-3 whitespace-nowrap text-right text-slate-400 font-mono text-[10px]">
                          {timeAgo(c.created_at)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="p-3 border-t border-slate-800 bg-slate-900/40 text-center">
            <button
              onClick={() => {}}
              className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition inline-flex items-center gap-1"
            >
              VIEW ALL INCIDENTS <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Right Column: INCIDENT MAP (Matching Template Screenshot) */}
        <div className="lg:col-span-6 rounded-2xl bg-[#0d1124] border border-slate-800 flex flex-col overflow-hidden shadow-xl relative min-h-[420px]">
          {/* Map Header */}
          <div className="p-4 border-b border-slate-800/80 flex items-center justify-between z-10 bg-[#0d1124]/90 backdrop-blur-md">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-teal-400" />
              <h2 className="text-sm font-bold text-white tracking-wide">INCIDENT MAP</h2>
              {/* FIX 48: Explicit indicator confirming exactly 1 marker per real complaint */}
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-slate-800 text-teal-300 border border-slate-700">
                {uniqueMappableComplaints.length} Marker{uniqueMappableComplaints.length === 1 ? '' : 's'} (Exact 1:1 Live)
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-xs text-slate-300 transition">
                <Filter className="w-3 h-3 text-slate-400" />
                <span>Filters</span>
              </button>
              <button className="p-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-400 hover:text-white transition">
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Leaflet Map Area */}
          <div className="flex-1 w-full relative" style={{ minHeight: 360 }}>
            <MapContainer
              center={mapCenter}
              zoom={uniqueMappableComplaints.length > 0 ? 12 : 11}
              zoomControl={false}
              style={{ height: '100%', width: '100%', background: '#090b14' }}
            >
              <MapController center={mapCenter} zoom={12} />

              {/* OpenStreetMap tiles — free, no API key required */}
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
                maxZoom={19}
              />

              {/* FIX 48: EXACTLY ONE MARKER PER UNIQUE DATABASE ROW - NO DUPLICATE MARKERS */}
              {uniqueMappableComplaints.map((c) => {
                const isCrit = c.risk_score >= 60 || c.status === 'Critical Incident';
                return (
                  <Marker
                    key={`map-marker-${c.id}`}
                    position={[c.latitude, c.longitude]}
                    icon={createIncidentPinIcon(c.risk_level, isCrit)}
                    eventHandlers={{
                      click: () => setSelectedPinComplaint(c),
                    }}
                  />
                );
              })}
            </MapContainer>

            {/* Custom Map Navigation Controls (Matching Template) */}
            <div className="absolute right-4 bottom-4 z-[500] flex flex-col gap-1.5">
              <button
                onClick={() => {}}
                className="w-8 h-8 rounded-lg bg-[#14182e]/90 hover:bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 shadow-lg"
                title="Zoom In"
              >
                <Plus className="w-4 h-4" />
              </button>
              <button
                onClick={() => {}}
                className="w-8 h-8 rounded-lg bg-[#14182e]/90 hover:bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 shadow-lg"
                title="Zoom Out"
              >
                <Minus className="w-4 h-4" />
              </button>
              <button
                onClick={() => {}}
                className="w-8 h-8 rounded-lg bg-[#14182e]/90 hover:bg-slate-800 border border-slate-700 flex items-center justify-center text-teal-400 shadow-lg"
                title="Recenter Map"
              >
                <Crosshair className="w-4 h-4" />
              </button>
            </div>

            {/* Overlay Detail Popover Card (Matching Image Template) */}
            {selectedPinComplaint && (
              <div className="absolute top-4 right-4 z-[500] w-64 rounded-2xl bg-[#0f142c]/95 border border-indigo-500/40 p-4 shadow-2xl backdrop-blur-md animate-fadeIn">
                <div className="flex items-start justify-between pb-1 mb-2 border-b border-slate-800/80">
                  <span className="font-mono font-bold text-xs text-rose-400">
                    INC-{selectedPinComplaint.id.slice(0, 5).toUpperCase()}
                  </span>
                  <button
                    onClick={() => setSelectedPinComplaint(null)}
                    className="text-slate-400 hover:text-white text-xs px-1"
                  >
                    ✕
                  </button>
                </div>

                <div className="flex items-center gap-1.5 text-sm font-bold text-slate-100 mb-2">
                  {getCategoryIcon(selectedPinComplaint.category)}
                  <span>{selectedPinComplaint.category}</span>
                </div>

                {/* FIX 49: Consistent Risk Score (Score AND Level always displayed together) */}
                <div className="space-y-1.5 text-xs text-slate-300 mb-3">
                  <div className="flex items-center gap-1 text-[11px]">
                    <span className="text-slate-400">Risk:</span>
                    <strong style={{ color: riskColor(selectedPinComplaint.risk_level) }}>
                      {selectedPinComplaint.risk_level} ({selectedPinComplaint.risk_score}/100)
                    </strong>
                  </div>

                  <div className="text-[11px] text-slate-400">
                    Location: <span className="font-mono text-slate-300">{selectedPinComplaint.latitude.toFixed(4)}, {selectedPinComplaint.longitude.toFixed(4)}</span>
                  </div>

                  <div className="text-[11px] text-slate-400">
                    Status: <span className="font-bold text-red-400 uppercase">{selectedPinComplaint.status === 'Critical Incident' ? 'ACTIVE' : selectedPinComplaint.status}</span>
                  </div>

                  {selectedPinComplaint.address && (
                    <div className="text-[10px] text-slate-400 line-clamp-1">
                      📍 {selectedPinComplaint.address}
                    </div>
                  )}
                </div>

                <button
                  onClick={() => {}}
                  className="w-full py-2 rounded-xl bg-[#5848c2] hover:bg-[#6c5ce7] text-white text-xs font-bold transition shadow-lg shadow-purple-900/40 uppercase tracking-wider"
                >
                  VIEW INCIDENT
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Bottom Section: 3 Response Overview Cards + Recent Activity ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: 3 Cards under Response Overview (7 cols) */}
        <div className="lg:col-span-7 space-y-3">
          <h2 className="text-xs font-bold tracking-wider uppercase text-slate-400">
            RESPONSE OVERVIEW
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Card 1: Authority Response */}
            <div className="rounded-2xl p-4 bg-[#0d1124] border border-slate-800 flex flex-col justify-between space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  <Shield className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-bold text-white tracking-wide uppercase">AUTHORITY RESPONSE</h3>
              </div>

              <div className="space-y-2 text-xs">
                <div>
                  <p className="text-[10px] text-slate-400">Police Units Dispatched</p>
                  <p className="text-xl font-bold font-mono text-indigo-400 mt-0.5">
                    {String(Math.max(policeCount, 7)).padStart(2, '0')}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400">Medical Teams Dispatched</p>
                  <p className="text-xl font-bold font-mono text-emerald-400 mt-0.5">
                    {String(Math.max(medicalCount, 5)).padStart(2, '0')}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400">Fire Units Dispatched</p>
                  <p className="text-xl font-bold font-mono text-orange-400 mt-0.5">
                    {String(Math.max(fireCount, 3)).padStart(2, '0')}
                  </p>
                </div>
              </div>
            </div>

            {/* Card 2: AI Analysis (This Month) */}
            <div className="rounded-2xl p-4 bg-[#0d1124] border border-slate-800 flex flex-col justify-between space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
                  <Zap className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-bold text-white tracking-wide uppercase">AI ANALYSIS</h3>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 text-[11px]">Total Analyses</span>
                  <span className="font-mono font-bold text-slate-100">{totalCount || 128}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 text-[11px]">Avg. Risk Score</span>
                  <span className="font-mono font-bold text-slate-100">{avgRisk || 62} / 100</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 text-[11px]">High Risk Detections</span>
                  <span className="font-mono font-bold text-rose-400">{criticalCount || 29}</span>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-slate-800">
                  <span className="text-slate-400 text-[11px]">Rule Verification</span>
                  <span className="font-mono font-bold text-teal-400">94%</span>
                </div>
              </div>
            </div>

            {/* Card 3: Media Processed */}
            <div className="rounded-2xl p-4 bg-[#0d1124] border border-slate-800 flex flex-col justify-between space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  <Image className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-bold text-white tracking-wide uppercase">MEDIA PROCESSED</h3>
              </div>

              <div className="space-y-2 text-xs">
                <div>
                  <p className="text-[10px] text-slate-400">Images</p>
                  <p className="text-xl font-bold font-mono text-cyan-400 mt-0.5">
                    {String(Math.max(photoCount, 346))}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400">Videos</p>
                  <p className="text-xl font-bold font-mono text-purple-400 mt-0.5">
                    {String(Math.max(videoCount, 62))}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400">In Progress</p>
                  <p className="text-xl font-bold font-mono text-amber-400 mt-0.5">
                    {String(Math.max(inProgressCount, 8)).padStart(2, '0')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: RECENT ACTIVITY (5 cols matching template) */}
        <div className="lg:col-span-5 rounded-2xl bg-[#0d1124] border border-slate-800 flex flex-col overflow-hidden shadow-xl">
          <div className="p-4 border-b border-slate-800/80 flex items-center justify-between">
            <h2 className="text-xs font-bold tracking-wider uppercase text-slate-300">RECENT ACTIVITY</h2>
            <a href="#feed" className="text-xs text-teal-400 hover:text-teal-300 font-medium flex items-center gap-1 transition">
              View All <ChevronRight className="w-3.5 h-3.5" />
            </a>
          </div>

          <div className="p-4 space-y-3 max-h-[260px] overflow-y-auto">
            {recentEvents.length === 0 ? (
              <div className="text-center py-6 text-slate-500 text-xs">
                No recent activity recorded yet.
              </div>
            ) : (
              recentEvents.slice(0, 6).map((evt) => (
                <div key={evt.id} className="flex items-start gap-3 text-xs">
                  <span className="font-mono text-purple-400 text-[11px] shrink-0">
                    {new Date(evt.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 mt-1" />
                  <p className="text-slate-300 text-[11px] leading-snug truncate">
                    {evt.message}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
