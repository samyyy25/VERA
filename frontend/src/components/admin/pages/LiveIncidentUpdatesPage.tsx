import React, { useState, useEffect, useCallback } from 'react';
import {
  Radio,
  Search,
  RefreshCw,
  MapPin,
  Shield,
  HeartPulse,
  Flame,
  Car,
  AlertTriangle,
  Building2,
} from 'lucide-react';
import { fetchComplaints } from '../../../services/api';
import { Complaint } from '../../../types';
import { LiveIncidentUpdates } from '../../emergency/LiveIncidentUpdates';
import { TacticalMap } from '../../emergency/TacticalMap';
import { supabase } from '../../../lib/supabase';

interface LiveIncidentUpdatesPageProps {
  selectedIncidentId?: string | null;
  onSelectIncident?: (id: string) => void;
}

function getCategoryIcon(category: string) {
  const lower = (category || '').toLowerCase();
  if (lower.includes('accident') || lower.includes('road')) return <Car className="w-4 h-4 text-[#D45060] shrink-0" />;
  if (lower.includes('medical') || lower.includes('ambulance')) return <HeartPulse className="w-4 h-4 text-[#059669] shrink-0" />;
  if (lower.includes('fire')) return <Flame className="w-4 h-4 text-[#EA580C] shrink-0" />;
  if (lower.includes('harassment') || lower.includes('police')) return <Shield className="w-4 h-4 text-[var(--vera-primary)] shrink-0" />;
  return <AlertTriangle className="w-4 h-4 text-[#D97706] shrink-0" />;
}

export const LiveIncidentUpdatesPage: React.FC<LiveIncidentUpdatesPageProps> = ({
  selectedIncidentId,
  onSelectIncident,
}) => {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [search, setSearch] = useState<string>('');

  const loadComplaints = useCallback(async (isPolling = false) => {
    if (!isPolling) setLoading(true);
    try {
      const res = await fetchComplaints();
      if (res.success && res.complaints && res.complaints.length > 0) {
        setComplaints(res.complaints);
        setSelectedComplaint((prev) => {
          if (selectedIncidentId) {
            const match = res.complaints.find((c) => c.id === selectedIncidentId);
            if (match) return match;
          }
          if (prev) {
            const updated = res.complaints.find((c) => c.id === prev.id);
            if (updated) return updated;
          }
          const sorted = [...res.complaints].sort((a, b) => (b.risk_score || 0) - (a.risk_score || 0));
          return sorted[0];
        });
      }
    } catch (err) {
      console.warn('Failed to fetch complaints for live updates page:', err);
    } finally {
      if (!isPolling) setLoading(false);
    }
  }, [selectedIncidentId]);

  useEffect(() => {
    loadComplaints();
    const interval = setInterval(() => loadComplaints(true), 4000);
    return () => clearInterval(interval);
  }, [loadComplaints]);

  // Realtime subscription
  useEffect(() => {
    const client = supabase;
    if (!client) return;
    const channel = client
      .channel('public:live_incident_updates_feed')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'complaints' }, () => {
        loadComplaints(true);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'incident_updates' }, () => {
        loadComplaints(true);
      })
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  }, [loadComplaints]);

  const handleSelectComplaint = (comp: Complaint) => {
    setSelectedComplaint(comp);
    if (onSelectIncident) {
      onSelectIncident(comp.id);
    }
  };

  const handleUpdateAdded = (updatedComp: Complaint) => {
    setSelectedComplaint(updatedComp);
    setComplaints((prev) => prev.map((c) => (c.id === updatedComp.id ? updatedComp : c)));
  };

  const filteredIncidents = complaints.filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      c.category.toLowerCase().includes(q) ||
      c.description.toLowerCase().includes(q) ||
      (c.address || '').toLowerCase().includes(q) ||
      c.id.toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-4 sm:p-6 space-y-6 text-[var(--vera-text-primary)]">
      {/* ── Top Header Banner ── */}
      <div className="vera-card rounded-2xl p-5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-[var(--vera-primary-soft)] text-[var(--vera-primary)] border border-[var(--vera-primary-border)] shadow-lg">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-[var(--vera-text-primary)] uppercase tracking-tight">
                  03 · Live Incident Updates
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-black uppercase bg-[var(--vera-primary-soft)] text-[var(--vera-primary)] border border-[var(--vera-primary-border)]">
                  REALTIME FIELD FEED
                </span>
              </div>
              <p className="text-xs text-[var(--vera-text-muted)] mt-0.5">
                Two-way tactical situation updates, multi-agency field dispatches, verified broadcasts &amp; photos
              </p>
            </div>
          </div>
        </div>

        {/* Quick Search & Refresh */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-[var(--vera-text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search active incident..."
              className="vera-input rounded-xl pl-9 pr-4 py-2 text-xs placeholder-[var(--vera-text-muted)] focus:outline-none"
            />
          </div>

          <button
            onClick={() => loadComplaints(false)}
            disabled={loading}
            className="p-2.5 rounded-xl vera-button-secondary text-[var(--vera-text-secondary)] hover:text-[var(--vera-text-primary)] transition cursor-pointer"
            title="Refresh Updates"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[var(--vera-primary)]' : ''}`} />
          </button>
        </div>
      </div>

      {/* ── Active Incident Quick Strip ── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
        {filteredIncidents.map((c) => {
          const isSelected = selectedComplaint?.id === c.id;
          const isCritical = (c.risk_score || 0) >= 80 || c.risk_level === 'CRITICAL';
          const updateCount = c.updates?.length || 0;
          return (
            <button
              key={c.id}
              onClick={() => handleSelectComplaint(c)}
              className={`flex-shrink-0 px-3.5 py-2.5 rounded-xl border text-xs font-semibold flex items-center gap-2.5 transition cursor-pointer ${
                isSelected
                  ? 'bg-[var(--vera-primary)] border-[var(--vera-primary)] text-white shadow-md'
                  : 'vera-card border-[var(--vera-border)] text-[var(--vera-text-secondary)] hover:text-[var(--vera-text-primary)] hover:border-[var(--vera-primary-border)]'
              }`}
            >
              <div className={`p-1 rounded-lg ${isSelected ? 'bg-black/20' : 'bg-[var(--vera-surface-elevated)]'}`}>
                {getCategoryIcon(c.category)}
              </div>
              <div className="text-left">
                <div className="flex items-center gap-1.5">
                  <span className={`font-bold ${isSelected ? 'text-white' : 'text-[var(--vera-text-primary)]'}`}>{c.category}</span>
                  {isCritical && <span className="w-1.5 h-1.5 rounded-full bg-[#D45060] animate-ping" />}
                </div>
                <div className={`text-[10px] font-mono ${isSelected ? 'text-white/80' : 'text-[var(--vera-text-muted)]'}`}>
                  VR-{c.id.slice(0, 4)} &bull; Risk {c.risk_score || 0}
                </div>
              </div>
              {updateCount > 0 && (
                <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                  isSelected ? 'bg-white/20 text-white' : 'bg-[var(--vera-primary-soft)] text-[var(--vera-primary)] border border-[var(--vera-primary-border)]'
                }`}>
                  {updateCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Main Layout (Live Updates Feed + Tactical Incident Context) ── */}
      {selectedComplaint ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Full Interactive Live Incident Updates Console (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            <LiveIncidentUpdates
              complaint={selectedComplaint}
              onUpdateAdded={handleUpdateAdded}
            />
          </div>

          {/* Right Column: Tactical Scene Context & Mini-Map (5 cols) */}
          <div className="lg:col-span-5 space-y-5">
            {/* Scene Information Card */}
            <div className="vera-card rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between pb-3 border-b border-[var(--vera-border)]">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-[var(--vera-primary)]" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--vera-text-primary)]">
                    Incident Scene Telemetry
                  </h3>
                </div>
                <span
                  className={`vera-badge text-[10px] font-black uppercase ${
                    (selectedComplaint.risk_score || 0) >= 80
                      ? 'vera-badge-critical'
                      : 'vera-badge-success'
                  }`}
                >
                  {selectedComplaint.risk_level}
                </span>
              </div>

              <div>
                <div className="text-sm font-bold text-[var(--vera-text-primary)] mb-1">{selectedComplaint.category}</div>
                <p className="text-xs text-[var(--vera-text-secondary)] leading-relaxed">{selectedComplaint.description}</p>
              </div>

              <div className="pt-2 border-t border-[var(--vera-border)] flex items-center justify-between text-xs text-[var(--vera-text-muted)]">
                <div className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-[#D45060] shrink-0" />
                  <span className="truncate max-w-[200px]">
                    {selectedComplaint.address || `${selectedComplaint.latitude.toFixed(4)}, ${selectedComplaint.longitude.toFixed(4)}`}
                  </span>
                </div>
                <div className="font-mono text-[11px] text-[var(--vera-primary)] font-bold">
                  {selectedComplaint.status}
                </div>
              </div>
            </div>

            {/* Tactical Mini Map */}
            <div className="vera-card rounded-2xl p-4">
              <div className="text-xs font-bold uppercase tracking-wider text-[var(--vera-text-muted)] mb-3 flex items-center justify-between">
                <span>Tactical Perimeter View</span>
                <span className="text-[10px] text-[var(--vera-primary)] font-mono font-bold">
                  {selectedComplaint.latitude.toFixed(4)}, {selectedComplaint.longitude.toFixed(4)}
                </span>
              </div>
              <TacticalMap complaint={selectedComplaint} plan={selectedComplaint.response_plan} height="320px" />
            </div>
          </div>
        </div>
      ) : (
        <div className="p-12 text-center text-[var(--vera-text-muted)] vera-card rounded-2xl">
          <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-[#D97706]" />
          <p className="text-sm font-semibold">No active incidents available to display.</p>
        </div>
      )}
    </div>
  );
};

