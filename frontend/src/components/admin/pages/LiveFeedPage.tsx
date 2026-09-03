import React, { useState, useEffect, useCallback } from 'react';
import { 
  Radio, 
  Search, 
  RefreshCw, 
  MapPin, 
  Building2, 
  Flame, 
  Video
} from 'lucide-react';
import { fetchComplaints } from '../../../services/api';
import { Complaint } from '../../../types';
import { supabase } from '../../../lib/supabase';

const RISK_COLORS: Record<string, string> = {
  CRITICAL: '#ef4444',
  HIGH: '#f97316',
  MEDIUM: '#f59e0b',
  LOW: '#10b981',
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
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel rounded-2xl p-5 border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <Radio className="w-5 h-5 text-teal-400 animate-pulse" />
            <h2 className="text-xl font-bold text-white">Live Incident Feed</h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-500/10 text-teal-300 border border-teal-500/30">
              REALTIME STREAM
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Unfiltered chronological intake from all civic and emergency input channels
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-xs text-slate-400">Total Streamed</span>
            <p className="text-lg font-bold text-white font-mono">{complaints.length}</p>
          </div>
          <button
            onClick={() => loadComplaints(false)}
            disabled={loading}
            className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="glass-panel rounded-2xl p-4 border border-slate-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search live stream by keyword, ID, address..."
            className="w-full bg-slate-900/90 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs sm:text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-teal-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-slate-900 border border-slate-800 text-slate-300 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-teal-500"
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
            className="bg-slate-900 border border-slate-800 text-slate-300 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-teal-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="Reported">Reported</option>
            <option value="Verified">Verified</option>
            <option value="In Progress">In Progress</option>
            <option value="Critical Incident">Critical Incident</option>
            <option value="Resolved">Resolved</option>
          </select>
        </div>
      </div>

      {/* Live Table */}
      <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-900/90 border-b border-slate-800 text-slate-400 uppercase font-semibold text-[10px] tracking-wider">
                <th className="p-4">Time</th>
                <th className="p-4">Incident ID</th>
                <th className="p-4">Category & Details</th>
                <th className="p-4">Location</th>
                <th className="p-4">Risk Evaluation</th>
                <th className="p-4">Status</th>
                <th className="p-4">Routing</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {complaints.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-10 text-center text-slate-500">
                    No stream records available matching criteria.
                  </td>
                </tr>
              ) : (
                complaints.map((c) => {
                  const isNew = newlyAddedId === c.id;
                  const isCritical = c.risk_score >= 60 || c.status === 'Critical Incident';
                  return (
                    <tr
                      key={c.id}
                      className={`transition duration-500 ${
                        isNew
                          ? 'bg-teal-500/20 border-l-4 border-teal-400'
                          : isCritical
                          ? 'bg-red-950/20 hover:bg-red-950/30'
                          : 'hover:bg-slate-800/40'
                      }`}
                    >
                      <td className="p-4 whitespace-nowrap font-mono text-slate-400 text-[11px]">
                        {new Date(c.created_at).toLocaleTimeString()}
                      </td>
                      <td className="p-4 whitespace-nowrap font-mono font-semibold text-teal-400">
                        {c.id.slice(0, 8)}
                      </td>
                      <td className="p-4 max-w-sm">
                        <div className="font-semibold text-slate-200 text-sm">{c.category}</div>
                        <p className="text-slate-400 line-clamp-2 text-xs mt-0.5">{c.description}</p>
                        {c.video_url && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-red-400 mt-1">
                            <Video className="w-3 h-3" /> Video Evidence Included
                          </span>
                        )}
                      </td>
                      <td className="p-4 max-w-xs text-slate-300">
                        <div className="flex items-start gap-1">
                          <MapPin className="w-3.5 h-3.5 text-teal-400 shrink-0 mt-0.5" />
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
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${
                          c.status === 'Critical Incident'
                            ? 'bg-red-600 text-white font-bold animate-pulse'
                            : c.status === 'Resolved'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            : 'bg-slate-800 text-slate-300 border border-slate-700'
                        }`}>
                          {c.status}
                        </span>
                      </td>
                      <td className="p-4 whitespace-nowrap text-slate-400 text-xs">
                        {c.routed_department ? (
                          <span className="inline-flex items-center gap-1 text-teal-300">
                            <Building2 className="w-3.5 h-3.5 text-teal-400" />
                            {c.routed_department}
                          </span>
                        ) : (
                          <span className="text-slate-600">Unassigned</span>
                        )}
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
