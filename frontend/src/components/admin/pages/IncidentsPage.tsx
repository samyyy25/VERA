import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  AlertTriangle,
  Search,
  RefreshCw,
  MapPin,
  Clock,
  Shield,
  Car,
  HeartPulse,
  Flame,
  Droplets,
  Trash2,
  Lightbulb,
  AlertOctagon,
  ChevronRight,
  Video,
  SlidersHorizontal,
  Layers,
  ArrowUpDown,
} from 'lucide-react';
import { fetchComplaints } from '../../../services/api';
import { Complaint } from '../../../types';
import { JitsiRoomModal } from '../../emergency/JitsiRoomModal';
import { supabase } from '../../../lib/supabase';
import { CommandSection } from '../CommandCenter';
import { useRole } from '../../../context/RoleContext';

interface IncidentsPageProps {
  onNavigateToSection?: (section: CommandSection, incidentId?: string) => void;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function getCategoryIcon(category: string) {
  const lower = (category || '').toLowerCase();
  if (lower.includes('accident') || lower.includes('road')) return <Car className="w-4 h-4 text-[#D45060] shrink-0" />;
  if (lower.includes('medical') || lower.includes('ambulance')) return <HeartPulse className="w-4 h-4 text-emerald-500 shrink-0" />;
  if (lower.includes('fire')) return <Flame className="w-4 h-4 text-[#D97706] shrink-0" />;
  if (lower.includes('harassment') || lower.includes('suspicious') || lower.includes('threat') || lower.includes('police'))
    return <Shield className="w-4 h-4 text-[#800020] shrink-0" />;
  if (lower.includes('water') || lower.includes('leak') || lower.includes('flood'))
    return <Droplets className="w-4 h-4 text-blue-500 shrink-0" />;
  if (lower.includes('waste') || lower.includes('garbage')) return <Trash2 className="w-4 h-4 text-[#D97706] shrink-0" />;
  if (lower.includes('street') || lower.includes('light') || lower.includes('power'))
    return <Lightbulb className="w-4 h-4 text-amber-500 shrink-0" />;
  return <AlertOctagon className="w-4 h-4 text-[var(--brand-primary)] shrink-0" />;
}

function getRiskBadge(score: number, level?: string) {
  if (score >= 80 || level === 'CRITICAL') {
    return (
      <span className="px-2.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wider vera-badge-critical flex items-center gap-1.5 shadow-[0_0_12px_rgba(212,80,96,0.3)] animate-pulse">
        <span className="w-1.5 h-1.5 rounded-full bg-[#D45060]" />
        CRITICAL &bull; {score}/100
      </span>
    );
  }
  if (score >= 60 || level === 'HIGH') {
    return (
      <span className="px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider vera-badge-warning flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-[#D97706]" />
        HIGH &bull; {score}/100
      </span>
    );
  }
  if (score >= 40 || level === 'MEDIUM') {
    return (
      <span className="px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider vera-badge flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-[var(--brand-primary)]" />
        MED &bull; {score}/100
      </span>
    );
  }
  return (
    <span className="px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider vera-badge-success flex items-center gap-1.5">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
      LOW &bull; {score}/100
    </span>
  );
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'Critical Incident':
    case 'Emergency Response':
      return (
        <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider vera-badge-critical">
          DISPATCH ACTIVE
        </span>
      );
    case 'In Progress':
      return (
        <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-[var(--vera-primary-soft)] text-[var(--brand-primary)] border border-[var(--vera-primary-border)]">
          IN PROGRESS
        </span>
      );
    case 'Verified':
      return (
        <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-[var(--vera-primary-soft)] text-[var(--brand-primary)] border border-[var(--vera-primary-border)]">
          VERIFIED
        </span>
      );
    case 'Resolved':
      return (
        <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider vera-badge-success">
          RESOLVED
        </span>
      );
    default:
      return (
        <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider vera-card-secondary text-[var(--vera-text-muted)]">
          REPORTED
        </span>
      );
  }
}

export const IncidentsPage: React.FC<IncidentsPageProps> = ({ onNavigateToSection }) => {
  const { currentRole, currentUserProfile } = useRole();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [riskFilter, setRiskFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'TABLE' | 'CARDS'>('TABLE');
  const [sortBy, setSortBy] = useState<'PRIORITY' | 'NEWEST' | 'OLDEST'>('PRIORITY');

  // Video Room Modal
  const [activeVideoModal, setActiveVideoModal] = useState<Complaint | null>(null);

  const loadData = useCallback(async (isPolling = false) => {
    if (!isPolling) setLoading(true);
    try {
      const res = await fetchComplaints();
      if (res.success && res.complaints) {
        setComplaints(res.complaints);
      }
    } catch (err) {
      console.error('Failed to load incident queue:', err);
    } finally {
      if (!isPolling) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(() => loadData(true), 6000);
    return () => clearInterval(interval);
  }, [loadData]);

  // Realtime Supabase listener
  useEffect(() => {
    const client = supabase;
    if (!client) return;
    const channel = client
      .channel('public:incidents_queue')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'complaints' }, () => {
        loadData(true);
      })
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  }, [loadData]);

  // Filtered & Sorted Queue
  const filteredQueue = useMemo(() => {
    return complaints
      .filter((item) => {
        // Risk Filter
        if (riskFilter !== 'ALL') {
          if (riskFilter === 'CRITICAL' && (item.risk_score || 0) < 80 && item.risk_level !== 'CRITICAL') return false;
          if (riskFilter === 'HIGH' && ((item.risk_score || 0) < 60 || (item.risk_score || 0) >= 80)) return false;
          if (riskFilter === 'MEDIUM' && ((item.risk_score || 0) < 40 || (item.risk_score || 0) >= 60)) return false;
          if (riskFilter === 'LOW' && (item.risk_score || 0) >= 40) return false;
        }

        // Category Filter
        if (categoryFilter !== 'ALL') {
          if (!item.category.toLowerCase().includes(categoryFilter.toLowerCase())) return false;
        }

        // Status Filter
        if (statusFilter !== 'ALL') {
          if (statusFilter === 'ACTIVE') {
            if (item.status === 'Resolved') return false;
          } else if (item.status !== statusFilter) {
            return false;
          }
        }

        // Search text
        if (search.trim()) {
          const q = search.toLowerCase();
          const matchDesc = item.description.toLowerCase().includes(q);
          const matchCat = item.category.toLowerCase().includes(q);
          const matchAddr = (item.address || '').toLowerCase().includes(q);
          const matchId = item.id.toLowerCase().includes(q);
          if (!matchDesc && !matchCat && !matchAddr && !matchId) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'PRIORITY') {
          const scoreDiff = (b.risk_score || 0) - (a.risk_score || 0);
          if (scoreDiff !== 0) return scoreDiff;
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        }
        if (sortBy === 'NEWEST') {
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        }
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      });
  }, [complaints, riskFilter, categoryFilter, statusFilter, search, sortBy]);

  const criticalTotal = complaints.filter(c => c.risk_level === 'CRITICAL' || (c.risk_score || 0) >= 80).length;
  const highTotal = complaints.filter(c => c.risk_level === 'HIGH' || ((c.risk_score || 0) >= 60 && (c.risk_score || 0) < 80)).length;
  const activeTotal = complaints.filter(c => c.status !== 'Resolved').length;

  return (
    <div className="p-4 sm:p-6 space-y-6 text-[var(--vera-text-primary)]">
      {/* ── Video Room Modal ── */}
      {activeVideoModal && (
        <JitsiRoomModal
          roomName={`vera-incident-${activeVideoModal.id.slice(0, 8)}`}
          incidentTitle={`${activeVideoModal.category} (Risk ${activeVideoModal.risk_score}/100)`}
          defaultRole={
            currentRole === 'police'
              ? 'Police Responder'
              : currentRole === 'hospital'
              ? 'Hospital / Medical Responder'
              : currentRole === 'municipal'
              ? 'Municipal Responder'
              : 'Citizen / Reporter'
          }
          defaultName={currentUserProfile.name}
          onClose={() => setActiveVideoModal(null)}
          onParticipantUpdate={() => {}}
        />
      )}

      {/* ── Top Header & Stats Banner ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 vera-card p-5 shadow-xl">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[var(--vera-primary-soft)] border border-[var(--vera-primary-border)] text-[#D45060]">
              <AlertTriangle className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black uppercase tracking-tight text-[var(--vera-text-primary)]">
                  01 · Priority Incident Queue
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-[var(--vera-primary-soft)] text-[var(--brand-primary)] border border-[var(--vera-primary-border)]">
                  {filteredQueue.length} INCIDENTS
                </span>
              </div>
              <p className="text-xs text-[var(--vera-text-muted)] mt-0.5">
                Full triage queue with AI risk ranking, dispatch actions, and live responder updates
              </p>
            </div>
          </div>
        </div>

        {/* Quick Triage Counters */}
        <div className="flex items-center gap-3">
          <div className="px-3.5 py-2 rounded-xl bg-[var(--vera-primary-soft)] border border-[#D45060]/40 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#D45060] animate-ping" />
            <div>
              <div className="text-[10px] uppercase font-bold text-[#D45060]">Critical</div>
              <div className="text-sm font-black text-[var(--vera-text-primary)]">{criticalTotal}</div>
            </div>
          </div>

          <div className="px-3.5 py-2 rounded-xl vera-card-secondary flex items-center gap-2">
            <div>
              <div className="text-[10px] uppercase font-bold text-[var(--vera-warning)]">High Risk</div>
              <div className="text-sm font-black text-[var(--vera-text-primary)]">{highTotal}</div>
            </div>
          </div>

          <div className="px-3.5 py-2 rounded-xl bg-[var(--vera-primary-soft)] border border-[var(--vera-primary-border)] flex items-center gap-2">
            <div>
              <div className="text-[10px] uppercase font-bold text-[var(--brand-primary)]">Active Total</div>
              <div className="text-sm font-black text-[var(--vera-text-primary)]">{activeTotal}</div>
            </div>
          </div>

          <button
            onClick={() => loadData()}
            disabled={loading}
            className="p-2.5 rounded-xl vera-card-secondary text-[var(--vera-text-muted)] hover:text-[var(--vera-text-primary)] transition cursor-pointer"
            title="Refresh Queue"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[var(--brand-primary)]' : ''}`} />
          </button>
        </div>
      </div>

      {/* ── Filters and Controls Bar ── */}
      <div className="vera-card p-4 space-y-3 shadow-lg">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Search Bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--vera-text-muted)]" />
            <input
              type="text"
              placeholder="Search by category, description, address or ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 vera-input text-xs"
            />
          </div>

          {/* Controls: View Mode & Sort */}
          <div className="flex items-center gap-2">
            <div className="flex items-center vera-card-secondary p-1 text-xs">
              <button
                onClick={() => setViewMode('TABLE')}
                className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                  viewMode === 'TABLE' ? 'bg-[#800020] text-[#FFF9F2] shadow-sm' : 'text-[var(--vera-text-muted)] hover:text-[var(--vera-text-primary)]'
                }`}
              >
                Table View
              </button>
              <button
                onClick={() => setViewMode('CARDS')}
                className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                  viewMode === 'CARDS' ? 'bg-[#800020] text-[#FFF9F2] shadow-sm' : 'text-[var(--vera-text-muted)] hover:text-[var(--vera-text-primary)]'
                }`}
              >
                Cards View
              </button>
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-1.5 vera-card-secondary px-3 py-1.5 text-xs text-[var(--vera-text-muted)]">
              <ArrowUpDown className="w-3.5 h-3.5 text-[var(--brand-primary)]" />
              <span className="font-medium">Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-transparent text-[var(--vera-text-primary)] font-semibold focus:outline-none cursor-pointer"
              >
                <option value="PRIORITY">Risk Score (High &rarr; Low)</option>
                <option value="NEWEST">Newest First</option>
                <option value="OLDEST">Oldest First</option>
              </select>
            </div>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[var(--vera-border)] text-xs">
          {/* Risk Level Filter */}
          <span className="text-[11px] font-bold uppercase text-[var(--vera-text-muted)] flex items-center gap-1">
            <SlidersHorizontal className="w-3 text-[var(--brand-primary)]" /> Risk:
          </span>
          {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((lvl) => (
            <button
              key={lvl}
              onClick={() => setRiskFilter(lvl)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
                riskFilter === lvl
                  ? 'bg-[#800020] text-[#FFF9F2]'
                  : 'vera-card-secondary text-[var(--vera-text-muted)] hover:text-[var(--vera-text-primary)]'
              }`}
            >
              {lvl}
            </button>
          ))}

          <span className="text-[var(--vera-border)]">|</span>

          {/* Category Filter */}
          <span className="text-[11px] font-bold uppercase text-[var(--vera-text-muted)] flex items-center gap-1">
            <Layers className="w-3 text-[var(--brand-primary)]" /> Category:
          </span>
          {['ALL', 'Accident', 'Medical', 'Fire', 'Harassment', 'Water', 'Waste', 'Streetlight'].map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
                categoryFilter === cat
                  ? 'bg-[#800020] text-[#FFF9F2]'
                  : 'vera-card-secondary text-[var(--vera-text-muted)] hover:text-[var(--vera-text-primary)]'
              }`}
            >
              {cat}
            </button>
          ))}

          <span className="text-[var(--vera-border)]">|</span>

          {/* Status Filter */}
          <span className="text-[11px] font-bold uppercase text-[var(--vera-text-muted)]">Status:</span>
          {['ALL', 'ACTIVE', 'Reported', 'Verified', 'In Progress', 'Resolved'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
                statusFilter === st
                  ? 'bg-[#800020] text-[#FFF9F2]'
                  : 'vera-card-secondary text-[var(--vera-text-muted)] hover:text-[var(--vera-text-primary)]'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* ── Table View ── */}
      {viewMode === 'TABLE' ? (
        <div className="vera-card overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="vera-table">
              <thead>
                <tr>
                  <th>Priority / Risk</th>
                  <th>Incident Category</th>
                  <th>Description & Location</th>
                  <th>Status</th>
                  <th>Timeline</th>
                  <th className="text-right">Dispatch &amp; Orchestration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--vera-border)]">
                {filteredQueue.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-[var(--vera-text-muted)]">
                      <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      No incidents match the active filters.
                    </td>
                  </tr>
                ) : (
                  filteredQueue.map((incident) => {
                    const isCritical = (incident.risk_score || 0) >= 80 || incident.risk_level === 'CRITICAL';
                    return (
                      <tr
                        key={incident.id}
                        onClick={() => onNavigateToSection?.('orchestrator', incident.id)}
                        className="hover:bg-[var(--vera-surface-secondary)] transition cursor-pointer group"
                      >
                        {/* Risk Column */}
                        <td className="py-4 px-4 whitespace-nowrap">
                          {getRiskBadge(incident.risk_score || 0, incident.risk_level)}
                        </td>

                        {/* Category Column */}
                        <td className="py-4 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="p-2 rounded-xl vera-card-secondary">
                              {getCategoryIcon(incident.category)}
                            </div>
                            <div>
                              <div className="font-bold text-[var(--vera-text-primary)] tracking-wide">
                                {incident.category}
                              </div>
                              <div className="text-[10px] font-mono text-[var(--vera-text-muted)] uppercase">
                                #{incident.id.slice(0, 8)}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Description & Address */}
                        <td className="py-4 px-6 max-w-md">
                          <p className="font-medium text-[var(--vera-text-primary)] line-clamp-1 group-hover:text-[var(--brand-primary)] transition">
                            {incident.description}
                          </p>
                          <div className="flex items-center gap-1 text-[11px] text-[var(--vera-text-muted)] mt-0.5">
                            <MapPin className="w-3 h-3 text-[#D45060] shrink-0" />
                            <span className="truncate">{incident.address || `${incident.latitude.toFixed(4)}, ${incident.longitude.toFixed(4)}`}</span>
                          </div>
                        </td>

                        {/* Status Column */}
                        <td className="py-4 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            {getStatusBadge(incident.status)}
                          </div>
                        </td>

                        {/* Timeline Column */}
                        <td className="py-4 px-4 whitespace-nowrap text-[var(--vera-text-muted)] font-mono text-[11px]">
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3 h-3 text-[var(--vera-text-muted)]" />
                            <span>{timeAgo(incident.created_at)}</span>
                          </div>
                          {incident.updates && incident.updates.length > 0 && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onNavigateToSection?.('liveupdates', incident.id);
                              }}
                              className="text-[10px] text-[var(--brand-primary)] hover:underline mt-0.5 font-sans font-bold flex items-center gap-1 cursor-pointer"
                            >
                              {incident.updates.length} live update{incident.updates.length > 1 ? 's' : ''} &rarr;
                            </button>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-4 px-4 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                            {isCritical && (
                              <button
                                onClick={() => setActiveVideoModal(incident)}
                                className="p-2 rounded-xl bg-[#D45060] hover:bg-[#B83244] text-[#FFF9F2] text-xs flex items-center gap-1 transition cursor-pointer shadow-sm"
                                title="Open Video Coordination Room"
                              >
                                <Video className="w-3.5 h-3.5" />
                              </button>
                            )}

                            <button
                              onClick={() => onNavigateToSection?.('orchestrator', incident.id)}
                              className="vera-button-primary text-xs py-1.5 px-3.5"
                            >
                              <span>Orchestrate</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* ── Cards Grid View ── */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredQueue.length === 0 ? (
            <div className="col-span-full py-12 text-center text-[var(--vera-text-muted)] vera-card">
              <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-50" />
              No incidents match the active filters.
            </div>
          ) : (
            filteredQueue.map((incident) => {
              const isCritical = (incident.risk_score || 0) >= 80 || incident.risk_level === 'CRITICAL';
              return (
                <div
                  key={incident.id}
                  onClick={() => onNavigateToSection?.('orchestrator', incident.id)}
                  className={`vera-card p-5 transition-all cursor-pointer flex flex-col justify-between hover:scale-[1.01] shadow-lg ${
                    isCritical
                      ? 'border-[#D45060]/50 shadow-[0_0_20px_rgba(212,80,96,0.15)]'
                      : ''
                  }`}
                >
                  <div className="space-y-3">
                    {/* Header: Category + Risk */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-xl vera-card-secondary">
                          {getCategoryIcon(incident.category)}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-[var(--vera-text-primary)] tracking-wide">
                            {incident.category}
                          </div>
                          <div className="text-[10px] font-mono text-[var(--vera-text-muted)]">
                            #{incident.id.slice(0, 8)}
                          </div>
                        </div>
                      </div>
                      {getRiskBadge(incident.risk_score || 0, incident.risk_level)}
                    </div>

                    {/* Description */}
                    <p className="text-xs text-[var(--vera-text-primary)] font-medium line-clamp-2 leading-relaxed">
                      {incident.description}
                    </p>

                    {/* Location */}
                    <div className="flex items-center gap-1.5 text-xs text-[var(--vera-text-muted)]">
                      <MapPin className="w-3.5 h-3.5 text-[#D45060] shrink-0" />
                      <span className="truncate">{incident.address || `${incident.latitude.toFixed(4)}, ${incident.longitude.toFixed(4)}`}</span>
                    </div>

                    {/* Badges and Updates */}
                    <div className="flex items-center justify-between pt-2 border-t border-[var(--vera-border)] text-xs">
                      {getStatusBadge(incident.status)}
                      <div className="flex items-center gap-1 text-[11px] text-[var(--vera-text-muted)] font-mono">
                        <Clock className="w-3 h-3 text-[var(--vera-text-muted)]" />
                        <span>{timeAgo(incident.created_at)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="mt-4 pt-3 border-t border-[var(--vera-border)] flex items-center justify-between gap-2" onClick={(e) => e.stopPropagation()}>
                    {isCritical ? (
                      <button
                        onClick={() => setActiveVideoModal(incident)}
                        className="px-2.5 py-1.5 rounded-xl bg-[#D45060] text-[#FFF9F2] text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                      >
                        <Video className="w-3.5 h-3.5" />
                        <span>Live Room</span>
                      </button>
                    ) : (
                      incident.updates && incident.updates.length > 0 ? (
                        <button
                          onClick={() => onNavigateToSection?.('liveupdates', incident.id)}
                          className="text-[11px] font-bold text-[var(--brand-primary)] hover:underline"
                        >
                          {incident.updates.length} updates &rarr;
                        </button>
                      ) : <div />
                    )}

                    <button
                      onClick={() => onNavigateToSection?.('orchestrator', incident.id)}
                      className="vera-button-primary text-xs py-1.5 px-3.5 ml-auto"
                    >
                      <span>Orchestrate</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
