import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Map as MapIcon, 
  Filter, 
  RefreshCw, 
  ChevronRight
} from 'lucide-react';

import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import { fetchComplaints, fetchComplaintById } from '../../../services/api';
import { Complaint, IncidentEvent } from '../../../types';
import { supabase } from '../../../lib/supabase';
import 'leaflet/dist/leaflet.css';


const RISK_COLORS: Record<string, string> = {
  CRITICAL: '#ef4444',
  HIGH: '#f97316',
  MEDIUM: '#f59e0b',
  LOW: '#10b981',
};

function riskColor(level: string) {
  return RISK_COLORS[level] || RISK_COLORS.LOW;
}

// Helper to auto-recenter map when coordinates update
const RecenterMap: React.FC<{ center: [number, number] }> = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
};

export const MapViewPage: React.FC = () => {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [riskFilter, setRiskFilter] = useState<string>('ALL');

  // Selected complaint popover drawer
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [selectedEvents, setSelectedEvents] = useState<IncidentEvent[]>([]);
  const [detailLoading, setDetailLoading] = useState<boolean>(false);

  const loadComplaints = useCallback(async (isPolling = false) => {
    if (!isPolling) setLoading(true);
    try {
      const res = await fetchComplaints({
        category: categoryFilter,
        status: statusFilter,
        risk_level: riskFilter,
      });
      if (res.success) {
        setComplaints(res.complaints);
      }
    } catch (err) {
      console.warn('Failed to load complaints for map:', err);
    } finally {
      if (!isPolling) setLoading(false);
    }
  }, [categoryFilter, statusFilter, riskFilter]);

  useEffect(() => {
    loadComplaints();
    const interval = setInterval(() => loadComplaints(true), 6000);
    return () => clearInterval(interval);
  }, [loadComplaints]);

  // Realtime Supabase
  useEffect(() => {
    const client = supabase;
    if (!client) return;
    const channel = client
      .channel('public:map_complaints')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'complaints' }, () => {
        loadComplaints(true);
      })
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  }, [loadComplaints]);

  const handleSelectComplaint = async (id: string) => {
    setDetailLoading(true);
    try {
      const res = await fetchComplaintById(id);
      if (res.success) {
        setSelectedComplaint(res.complaint);
        setSelectedEvents(res.events);
      }
    } catch (err) {
      console.warn('Failed to load incident detail for map popover:', err);
    } finally {
      setDetailLoading(false);
    }
  };

  // FIX 48: Strict deduplication ensuring exactly one marker per unique complaint
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

  const center: [number, number] = uniqueMappableComplaints.length > 0
    ? [
        uniqueMappableComplaints.reduce((acc: number, c: Complaint) => acc + c.latitude, 0) / uniqueMappableComplaints.length,
        uniqueMappableComplaints.reduce((acc: number, c: Complaint) => acc + c.longitude, 0) / uniqueMappableComplaints.length,
      ]
    : [26.8467, 80.9462];


  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] p-6 space-y-4">
      {/* Page Header & Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel rounded-2xl p-4 border border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <MapIcon className="w-5 h-5 text-teal-400" />
            Full Command Map View
            <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-slate-900 text-teal-300 border border-slate-700">
              {uniqueMappableComplaints.length} Marker{uniqueMappableComplaints.length === 1 ? '' : 's'} (Exact 1:1 Live)
            </span>
          </h2>
          <p className="text-xs text-slate-400">
            Geographic distribution of all active & resolved incidents with live telemetry markers
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 bg-slate-900 border border-slate-800 px-2.5 py-1.5 rounded-xl">
            <Filter className="w-3.5 h-3.5 text-teal-400" />
            <span>Filters:</span>
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-slate-900 border border-slate-800 text-slate-300 text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:border-teal-500"
          >
            <option value="ALL">All Categories</option>
            <option value="Road damage">Road damage</option>
            <option value="Garbage/waste">Garbage/waste</option>
            <option value="Streetlight problems">Streetlight</option>
            <option value="Water leakage">Water leakage</option>
            <option value="Noise complaints">Noise</option>
            <option value="Harassment">Harassment</option>
            <option value="Suspicious activity">Suspicious activity</option>
            <option value="Accident">Accident</option>
            <option value="Fire">Fire</option>
            <option value="Medical Emergency">Medical</option>
            <option value="Other civic issues">Other</option>
          </select>

          <select
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value)}
            className="bg-slate-900 border border-slate-800 text-slate-300 text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:border-teal-500"
          >
            <option value="ALL">All Risk Levels</option>
            <option value="CRITICAL">Critical (80-100)</option>
            <option value="HIGH">High (60-79)</option>
            <option value="MEDIUM">Medium (30-59)</option>
            <option value="LOW">Low (0-29)</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-900 border border-slate-800 text-slate-300 text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:border-teal-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="Reported">Reported</option>
            <option value="Verified">Verified</option>
            <option value="In Progress">In Progress</option>
            <option value="Critical Incident">Critical Incident</option>
            <option value="Resolved">Resolved</option>
          </select>

          <button
            onClick={() => loadComplaints(false)}
            disabled={loading}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white transition"
            title="Refresh Map"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Map Container + Detail Popover Drawer */}
      <div className="relative flex-1 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl">
        <MapContainer
          center={center}
          zoom={12}
          style={{ height: '100%', width: '100%', background: '#080d1a' }}
        >
          <RecenterMap center={center} />
          {/* OpenStreetMap tiles — free, no API key required */}
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={19}
          />

          {/* FIX 48: Exactly one marker per real database record */}
          {uniqueMappableComplaints.map((c: Complaint) => {
            const isCritical = c.risk_score >= 60 || c.status === 'Critical Incident';

            return (
              <CircleMarker
                key={`mapview-marker-${c.id}`}
                center={[c.latitude, c.longitude]}
                radius={isCritical ? 12 : 8}
                pathOptions={{
                  color: riskColor(c.risk_level),
                  fillColor: riskColor(c.risk_level),
                  fillOpacity: isCritical ? 0.85 : 0.65,
                  weight: isCritical ? 3 : 2,
                }}
              >
                <Popup>
                  <div className="p-2 text-slate-900 min-w-[200px]">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="font-bold text-xs">{c.category}</span>
                      {/* FIX 49: Score AND level visible */}
                      <span
                        className="px-1.5 py-0.5 rounded text-[10px] font-bold text-white"
                        style={{ backgroundColor: riskColor(c.risk_level) }}
                      >
                        {c.risk_score}/100 · {c.risk_level}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 line-clamp-2 mb-2">
                      {c.description}
                    </p>
                    {c.address && (
                      <p className="text-[10px] text-slate-500 mb-2 truncate">
                        📍 {c.address}
                      </p>
                    )}
                    <button
                      onClick={() => handleSelectComplaint(c.id)}
                      className="w-full py-1 text-center text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white rounded transition flex items-center justify-center gap-1"
                    >
                      <span>View Incident Info</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}
        </MapContainer>


        {/* Floating Detail Popover Drawer */}
        {selectedComplaint && (
          <div className="absolute top-4 right-4 z-[1000] w-80 max-h-[calc(100%-2rem)] overflow-y-auto glass-panel-glow bg-slate-950/95 border border-slate-700 rounded-2xl p-4 shadow-2xl animate-fadeIn">
            <div className="flex items-start justify-between pb-2 border-b border-slate-800 mb-3">
              <div>
                <h4 className="text-sm font-bold text-white">{selectedComplaint.category}</h4>
                <p className="text-[10px] font-mono text-slate-400">ID: {selectedComplaint.id.slice(0, 8)}</p>
              </div>
              <button
                onClick={() => setSelectedComplaint(null)}
                className="text-slate-400 hover:text-white text-sm px-1.5 py-0.5 rounded bg-slate-800"
              >
                ✕
              </button>
            </div>

            {detailLoading ? (
              <div className="py-6 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-teal-400" />
                <span>Loading detail...</span>
              </div>
            ) : (
              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between bg-slate-900/80 p-2 rounded-xl border border-slate-800">
                  <span className="text-slate-400">Risk Assessment:</span>
                  <span
                    className="font-bold px-2 py-0.5 rounded text-[10px]"
                    style={{
                      background: riskColor(selectedComplaint.risk_level) + '22',
                      color: riskColor(selectedComplaint.risk_level),
                    }}
                  >
                    {selectedComplaint.risk_score}/100 ({selectedComplaint.risk_level})
                  </span>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500">Description</span>
                  <p className="text-slate-300 mt-0.5 bg-slate-900/50 p-2 rounded-lg border border-slate-800/80">
                    {selectedComplaint.description}
                  </p>
                </div>

                {selectedComplaint.address && (
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500">Location</span>
                    <p className="text-slate-300 mt-0.5 text-[11px]">
                      📍 {selectedComplaint.address}
                    </p>
                  </div>
                )}

                {selectedComplaint.photo_url && (
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500">Evidence Photo</span>
                    <img
                      src={selectedComplaint.photo_url}
                      alt="Incident photo"
                      className="w-full max-h-36 object-cover rounded-lg border border-slate-800 mt-1"
                    />
                  </div>
                )}

                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500">Recent Timeline</span>
                  <div className="space-y-1.5 mt-1 max-h-32 overflow-y-auto">
                    {selectedEvents.slice(0, 3).map((evt) => (
                      <div key={evt.id} className="p-1.5 rounded bg-slate-900/80 border border-slate-800 text-[10px]">
                        <span className="text-teal-400 font-semibold">{evt.new_status}</span>
                        <p className="text-slate-400 truncate">{evt.message}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
