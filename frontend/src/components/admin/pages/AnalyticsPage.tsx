import React, { useState, useEffect, useCallback } from 'react';
import { 
  BarChart2, 
  TrendingUp, 
  PieChart as PieIcon, 
  RefreshCw, 
  Layers
} from 'lucide-react';

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { fetchComplaints, fetchRecentEvents } from '../../../services/api';
import { Complaint, IncidentEvent } from '../../../types';

const RISK_COLORS = {
  CRITICAL: '#ef4444',
  HIGH: '#f97316',
  MEDIUM: '#f59e0b',
  LOW: '#10b981',
};

export const AnalyticsPage: React.FC = () => {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [events, setEvents] = useState<IncidentEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [compRes, evtRes] = await Promise.all([
        fetchComplaints(),
        fetchRecentEvents(100),
      ]);
      if (compRes.success) setComplaints(compRes.complaints);
      if (evtRes.success) setEvents(evtRes.events);
    } catch (err) {
      console.warn('Failed to load analytics data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Metrics Computation ──

  // 1. Incidents Over Time (Group by date)
  const dateCounts: Record<string, number> = {};
  complaints.forEach((c) => {
    const d = new Date(c.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' });
    dateCounts[d] = (dateCounts[d] || 0) + 1;
  });
  // Sort or preserve chronological
  const timelineData = Object.keys(dateCounts).map((date) => ({
    date,
    incidents: dateCounts[date],
  }));

  // 2. Category Breakdown
  const categoryCounts: Record<string, number> = {};
  complaints.forEach((c) => {
    categoryCounts[c.category] = (categoryCounts[c.category] || 0) + 1;
  });
  const categoryData = Object.keys(categoryCounts)
    .map((cat) => ({
      category: cat,
      count: categoryCounts[cat],
    }))
    .sort((a, b) => b.count - a.count);

  // 3. Risk Level Distribution
  const riskCounts: Record<string, number> = {
    LOW: 0,
    MEDIUM: 0,
    HIGH: 0,
    CRITICAL: 0,
  };
  complaints.forEach((c) => {
    if (riskCounts[c.risk_level] !== undefined) {
      riskCounts[c.risk_level]++;
    } else {
      riskCounts[c.risk_level] = 1;
    }
  });
  const riskDistributionData = [
    { name: 'Low (0-29)', value: riskCounts.LOW, color: RISK_COLORS.LOW },
    { name: 'Medium (30-59)', value: riskCounts.MEDIUM, color: RISK_COLORS.MEDIUM },
    { name: 'High (60-79)', value: riskCounts.HIGH, color: RISK_COLORS.HIGH },
    { name: 'Critical (80-100)', value: riskCounts.CRITICAL, color: RISK_COLORS.CRITICAL },
  ].filter((d) => d.value > 0);

  // 4. Average Time to Resolution (from actual status events where new_status === 'Resolved')
  const resolutionDurations: number[] = [];
  const resolvedComplaints = complaints.filter((c) => c.status === 'Resolved');

  resolvedComplaints.forEach((c) => {
    const resolvedEvt = events.find((e) => e.complaint_id === c.id && e.new_status === 'Resolved');
    if (resolvedEvt) {
      const start = new Date(c.created_at).getTime();
      const end = new Date(resolvedEvt.created_at).getTime();
      const diffMinutes = Math.max(0, Math.round((end - start) / (1000 * 60)));
      resolutionDurations.push(diffMinutes);
    }
  });

  const avgResolutionMinutes = resolutionDurations.length > 0
    ? Math.round(resolutionDurations.reduce((a, b) => a + b, 0) / resolutionDurations.length)
    : null;

  const totalAnalyzed = complaints.length;
  const avgRiskScore = totalAnalyzed > 0
    ? Math.round(complaints.reduce((acc, c) => acc + c.risk_score, 0) / totalAnalyzed)
    : 0;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel rounded-2xl p-5 border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-teal-400" />
            <h2 className="text-xl font-bold text-white">Aggregated Civic Intelligence & Analytics</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Grounded real-data metrics computed directly from database telemetry and verified incident logs
          </p>
        </div>

        <button
          onClick={loadData}
          disabled={loading}
          className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white transition self-start sm:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-panel rounded-2xl p-4 border border-slate-800">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Evaluated</p>
          <p className="text-2xl font-extrabold text-white mt-1 font-mono">{totalAnalyzed}</p>
          <span className="text-[10px] text-teal-400 mt-1 block">Deterministic pipeline</span>
        </div>

        <div className="glass-panel rounded-2xl p-4 border border-slate-800">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Average Risk Score</p>
          <p className="text-2xl font-extrabold text-amber-400 mt-1 font-mono">{avgRiskScore} / 100</p>
          <span className="text-[10px] text-slate-500 mt-1 block">Weighted danger score</span>
        </div>

        <div className="glass-panel rounded-2xl p-4 border border-slate-800">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Resolved Incidents</p>
          <p className="text-2xl font-extrabold text-emerald-400 mt-1 font-mono">{resolvedComplaints.length}</p>
          <span className="text-[10px] text-slate-500 mt-1 block">Closed lifecycle</span>
        </div>

        <div className="glass-panel rounded-2xl p-4 border border-slate-800">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Avg Resolution Time</p>
          <p className="text-2xl font-extrabold text-teal-300 mt-1 font-mono">
            {avgResolutionMinutes !== null ? `${avgResolutionMinutes}m` : 'N/A'}
          </p>
          <span className="text-[10px] text-slate-500 mt-1 block">From incident_events</span>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Incidents Over Time */}
        <div className="glass-panel rounded-2xl p-5 border border-slate-800 flex flex-col">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-teal-400" />
            <h3 className="text-sm font-bold text-white">Incident Inflow Over Time</h3>
          </div>
          <div className="h-64 w-full">
            {timelineData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-500">
                No historical incident records available.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={timelineData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="date" stroke="#64748b" textAnchor="end" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#64748b" allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0b132b', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
                    labelStyle={{ color: '#94a3b8' }}
                  />
                  <Line type="monotone" dataKey="incidents" stroke="#14b8a6" strokeWidth={2} dot={{ fill: '#14b8a6', r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Risk Level Distribution */}
        <div className="glass-panel rounded-2xl p-5 border border-slate-800 flex flex-col">
          <div className="flex items-center gap-2 mb-4">
            <PieIcon className="w-4 h-4 text-teal-400" />
            <h3 className="text-sm font-bold text-white">Risk Level Distribution</h3>
          </div>
          <div className="h-64 w-full">
            {riskDistributionData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-500">
                No risk data to display.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={riskDistributionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {riskDistributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0b132b', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Category Breakdown Bar Chart */}
        <div className="glass-panel rounded-2xl p-5 border border-slate-800 flex flex-col lg:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <Layers className="w-4 h-4 text-teal-400" />
            <h3 className="text-sm font-bold text-white">Category Distribution</h3>
          </div>
          <div className="h-64 w-full">
            {categoryData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-500">
                No category records available.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="category" stroke="#64748b" tick={{ fontSize: 10 }} interval={0} />
                  <YAxis stroke="#64748b" allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0b132b', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
                  />
                  <Bar dataKey="count" fill="#0d9488" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
