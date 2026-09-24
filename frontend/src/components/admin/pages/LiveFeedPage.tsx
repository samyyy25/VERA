import React, { useState, useEffect, useCallback } from 'react';
import { 
  Radio, 
  Search, 
  RefreshCw, 
  MapPin, 
  Flame, 
  Video,
  ChevronRight,
  MessageSquare,
} from 'lucide-react';
import { fetchComplaints } from '../../../services/api';
import { Complaint } from '../../../types';
import { supabase } from '../../../lib/supabase';
import { EmergencyResponse } from '../../emergency/EmergencyResponse';

const RISK_COLORS: Record<string, string> = {
  CRITICAL: '#D45060',
  HIGH: '#E11D48',
  MEDIUM: '#D97706',
  LOW: '#059669',
};

function riskColor(level: string) {
  return RISK_COLORS[level] || RISK_COLORS.LOW;
}

export const LiveFeedPage: React.FC = () => {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [newlyAddedId, setNewlyAddedId] = useState<string | null>(null);
  const [selectedIncidentDetail, setSelectedIncidentDetail] = useState<Complaint | null>(null);

  const loadComplaints = useCallback(async (isPolling = false) => {
    if (!isPolling) setLoading(true);
    try {
      const res = await fetchComplaints({
        category: categoryFilter,
        status: statusFilter,
        search: search.trim() || undefined,
      });
      if (res.success) {
        setComplaints(prev => {
          if (isPolling && res.complaints.length > 0 && prev.length > 0) {
            if (res.complaints[0].id !== prev[0].id) {
              setNewlyAddedId(res.complaints[0].id);
              setTimeout(() => setNewlyAddedId(null), 3000);
            }
          }
          return res.complaints;
        });
      }
    } catch (err) {
      console.warn('Failed to load live feed:', err);
    } finally {
      if (!isPolling) setLoading(false);
    }
  }, [categoryFilter, statusFilter, search]);

  useEffect(() => {
    loadComplaints();
    const interval = setInterval(() => loadComplaints(true), 3500);
    return () => clearInterval(interval);
  }, [loadComplaints]);

  // Supabase Realtime subscription
  useEffect(() => {
    const client = supabase;
    if (!client) return;
    const channel = client
      .channel('public:livefeed_complaints')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'complaints' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setNewlyAddedId((payload.new as Complaint).id);
          setTimeout(() => setNewlyAddedId(null), 4000);
        }
        loadComplaints(true);
      })
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  }, [loadComplaints]);

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* ── Detail Modal ── */}
      {selectedIncidentDetail && (
        <EmergencyResponse
          complaint={selectedIncidentDetail}
          onClose={() => setSelectedIncidentDetail(null)}
          onComplaintUpdated={(updated) => {
            setComplaints(prev => prev.map(c => (c.id === updated.id ? updated : c)));
            setSelectedIncidentDetail(updated);
          }}
        />
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 vera-card rounded-2xl p-5 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-[var(--vera-primary-soft)] text-[#D45060] border border-[var(--vera-primary-border)]">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <h2 className="text-xl font-bold text-[var(--vera-text-primary)]">Live Incident Feed &amp; Stream</h2>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[var(--vera-primary-soft)] text-[var(--vera-primary)] border border-[var(--vera-primary-border)]">
              REALTIME STREAM
            </span>
          </div>
          <p className="text-xs text-[var(--vera-text-muted)] mt-1">
            Unfiltered chronological intake from all civic and emergency input channels with live updates
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-xs text-[var(--vera-text-muted)]">Total Streamed</span>
            <p className="text-lg font-bold text-[var(--vera-text-primary)] font-mono">{complaints.length}</p>
          </div>
          <button
            onClick={() => loadComplaints(false)}
            disabled={loading}
            className="p-2.5 rounded-xl vera-button-secondary text-[var(--vera-text-secondary)] hover:text-[var(--vera-text-primary)] transition cursor-pointer"
            title="Refresh Feed"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[var(--vera-primary)]' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="vera-card rounded-2xl p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-lg">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[var(--vera-text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search live stream by keyword, ID, address..."
            className="w-full vera-input rounded-xl pl-10 pr-4 py-2 text-xs sm:text-sm placeholder-[var(--vera-text-muted)] focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="vera-input text-xs rounded-xl px-3 py-2 focus:outline-none cursor-pointer"
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
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="vera-input text-xs rounded-xl px-3 py-2 focus:outline-none cursor-pointer"
          >
            <option value="ALL">All Statuses</option>
            <option value="Reported">Reported</option>
            <option value="Verified">Verified</option>
            <option value="In Progress">In Progress</option>
            <option value="Emergency Response">Emergency Response</option>
            <option value="Critical Incident">Critical Incident</option>
            <option value="Resolved">Resolved</option>
          </select>
        </div>
      </div>

      {/* Live Table */}
      <div className="vera-card rounded-2xl overflow-hidden shadow-xl border border-[var(--vera-border)]">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs vera-table">
            <thead>
              <tr className="border-b border-[var(--vera-border)] uppercase font-semibold text-[10px] tracking-wider text-[var(--vera-text-muted)]">
                <th className="p-4">Time</th>
                <th className="p-4">Incident ID</th>
                <th className="p-4">Category &amp; Details</th>
                <th className="p-4">Location</th>
                <th className="p-4">Risk Evaluation</th>
                <th className="p-4">Status &amp; Updates</th>
                <th className="p-4 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--vera-border)]">
              {complaints.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-10 text-center text-[var(--vera-text-muted)]">
                    No stream records available matching criteria.
                  </td>
                </tr>
              ) : (
                complaints.map((c) => {
                  const isNew = newlyAddedId === c.id;
                  const isCritical = (c.risk_score || 0) >= 60 || c.status === 'Critical Incident' || c.status === 'Emergency Response';
                  return (
                    <tr
                      key={c.id}
                      onClick={() => setSelectedIncidentDetail(c)}
                      className={`transition duration-200 cursor-pointer group ${
                        isNew
                          ? 'bg-[var(--vera-primary-soft)] border-l-4 border-[var(--vera-primary)]'
                          : isCritical
                          ? 'hover:bg-[var(--vera-primary-soft)]'
                          : 'hover:bg-[var(--vera-surface-muted)]'
                      }`}
                    >
                      <td className="p-4 whitespace-nowrap font-mono text-[var(--vera-text-muted)] text-[11px]">
                        {new Date(c.created_at).toLocaleTimeString()}
                      </td>
                      <td className="p-4 whitespace-nowrap font-mono font-semibold text-[var(--vera-primary)]">
                        {c.id.slice(0, 8)}
                      </td>
                      <td className="p-4 max-w-sm">
                        <div className="font-semibold text-[var(--vera-text-primary)] text-sm group-hover:text-[var(--vera-primary)]">{c.category}</div>
                        <p className="text-[var(--vera-text-secondary)] line-clamp-2 text-xs mt-0.5">{c.description}</p>
                        {c.video_url && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-[#D45060] mt-1 font-bold">
                            <Video className="w-3 h-3" /> Video Evidence Included
                          </span>
                        )}
                      </td>
                      <td className="p-4 max-w-xs text-[var(--vera-text-secondary)]">
                        <div className="flex items-start gap-1">
                          <MapPin className="w-3.5 h-3.5 text-[#D45060] shrink-0 mt-0.5" />
                          <span className="line-clamp-2 text-xs">
                            {c.address || `${c.latitude.toFixed(4)}, ${c.longitude.toFixed(4)}`}
                          </span>
                        </div>
                      </td>
                      <td className="p-4 whitespace-nowrap">
                        <span
                          className="px-2.5 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1.5"
                          style={{
                            backgroundColor: riskColor(c.risk_level) + '22',
                            color: riskColor(c.risk_level),
                            border: `1px solid ${riskColor(c.risk_level)}44`,
                          }}
                        >
                          {isCritical && <Flame className="w-3.5 h-3.5 animate-pulse" />}
                          {c.risk_score}/100 · {c.risk_level}
                        </span>
                      </td>
                      <td className="p-4 whitespace-nowrap">
                        <div className="flex flex-col gap-1">
                          <span className={`px-2.5 py-0.5 rounded-lg text-xs font-medium w-fit ${
                            c.status === 'Critical Incident' || c.status === 'Emergency Response'
                              ? 'vera-badge vera-badge-critical font-bold animate-pulse'
                              : c.status === 'Resolved'
                              ? 'vera-badge vera-badge-success'
                              : 'vera-badge'
                          }`}>
                            {c.status}
                          </span>
                          {c.updates && c.updates.length > 0 && (
                            <span className="text-[10px] text-[var(--vera-primary)] font-bold flex items-center gap-1">
                              <MessageSquare className="w-2.5 h-2.5" />
                              {c.updates.length} live update{c.updates.length > 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-4 whitespace-nowrap text-right">
                        <button
                          onClick={() => setSelectedIncidentDetail(c)}
                          className="p-1.5 rounded-lg vera-button-secondary transition cursor-pointer"
                        >
                          <ChevronRight className="w-4 h-4 text-[var(--vera-text-muted)] group-hover:text-[var(--vera-text-primary)]" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

