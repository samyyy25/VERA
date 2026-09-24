import React, { useState, useEffect, useCallback } from 'react';
import { 
  FileText, 
  Download, 
  Search, 
  RefreshCw, 
  Calendar
} from 'lucide-react';
import { fetchComplaints } from '../../../services/api';
import { Complaint } from '../../../types';

export const ReportsPage: React.FC = () => {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [riskFilter, setRiskFilter] = useState<string>('ALL');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchComplaints({
        category: categoryFilter,
        status: statusFilter,
        risk_level: riskFilter,
        search: search.trim() || undefined,
      });
      if (res.success) {
        setComplaints(res.complaints);
      }
    } catch (err) {
      console.warn('Failed to load complaints for reports:', err);
    } finally {
      setLoading(false);
    }
  }, [categoryFilter, statusFilter, riskFilter, search]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Date filtering in memory
  const filteredComplaints = complaints.filter((c) => {
    if (!startDate && !endDate) return true;
    const itemDate = new Date(c.created_at).getTime();
    if (startDate) {
      const start = new Date(startDate).getTime();
      if (itemDate < start) return false;
    }
    if (endDate) {
      const end = new Date(endDate).getTime() + 86400000; // include end day
      if (itemDate > end) return false;
    }
    return true;
  });

  const exportCSV = () => {
    if (filteredComplaints.length === 0) return;

    const headers = [
      'Incident ID',
      'Category',
      'Status',
      'Risk Score',
      'Risk Level',
      'Description',
      'Address',
      'Latitude',
      'Longitude',
      'Routed Department',
      'Reported At',
      'Has Photo',
      'Has Video',
    ];

    const rows = filteredComplaints.map((c) => [
      `"${c.id}"`,
      `"${c.category.replace(/"/g, '""')}"`,
      `"${c.status}"`,
      c.risk_score,
      `"${c.risk_level}"`,
      `"${(c.description || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`,
      `"${(c.address || '').replace(/"/g, '""')}"`,
      c.latitude,
      c.longitude,
      `"${(c.routed_department || '').replace(/"/g, '""')}"`,
      `"${c.created_at}"`,
      c.photo_url ? 'YES' : 'NO',
      c.video_url ? 'YES' : 'NO',
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `vera-incidents-report-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 space-y-6 text-[var(--vera-text-primary)]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 vera-card p-5 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-[var(--brand-primary)]" />
            <h2 className="text-xl font-bold text-[var(--vera-text-primary)]">Incident Audit & Compliance Reports</h2>
          </div>
          <p className="text-xs text-[var(--vera-text-muted)] mt-1">
            Export comprehensive municipal incident logs and verification records with exact location and audit metadata
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={exportCSV}
            disabled={filteredComplaints.length === 0}
            className="flex items-center gap-2 px-4 py-2 vera-button-primary disabled:opacity-50 text-xs font-bold shadow-lg transition"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV ({filteredComplaints.length})</span>
          </button>
          <button
            onClick={loadData}
            disabled={loading}
            className="p-2.5 rounded-xl vera-button-secondary transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[var(--brand-primary)]' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="vera-card p-4 flex flex-col md:flex-row flex-wrap items-stretch md:items-center justify-between gap-3 shadow-lg">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-[var(--vera-text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search report records..."
            className="w-full vera-input pl-10 pr-4 py-2 text-xs sm:text-sm"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="vera-input text-xs py-2 px-3"
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
            <option value="Medical Emergency">Medical Emergency</option>
            <option value="Other civic issues">Other civic</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="vera-input text-xs py-2 px-3"
          >
            <option value="ALL">All Statuses</option>
            <option value="Reported">Reported</option>
            <option value="Verified">Verified</option>
            <option value="In Progress">In Progress</option>
            <option value="Critical Incident">Critical Incident</option>
            <option value="Resolved">Resolved</option>
          </select>

          <select
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value)}
            className="vera-input text-xs py-2 px-3"
          >
            <option value="ALL">All Risk Levels</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>

          <div className="flex items-center gap-1.5 vera-card-secondary px-3 py-1.5 text-xs">
            <Calendar className="w-3.5 h-3.5 text-[var(--brand-primary)]" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-transparent text-[var(--vera-text-primary)] text-xs focus:outline-none"
              title="Start Date"
            />
            <span className="text-[var(--vera-text-muted)]">-</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-transparent text-[var(--vera-text-primary)] text-xs focus:outline-none"
              title="End Date"
            />
          </div>
        </div>
      </div>

      {/* Reports Table */}
      <div className="vera-card overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="vera-table">
            <thead>
              <tr>
                <th>Report Date</th>
                <th>Incident ID</th>
                <th>Category</th>
                <th>Risk</th>
                <th>Status</th>
                <th>Location</th>
                <th>Assigned Department</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--vera-border)]">
              {filteredComplaints.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-10 text-center text-[var(--vera-text-muted)]">
                    No complaints matching the selected filters.
                  </td>
                </tr>
              ) : (
                filteredComplaints.map((c) => (
                  <tr key={c.id} className="hover:bg-[var(--vera-surface-secondary)] transition">
                    <td className="p-4 whitespace-nowrap text-[var(--vera-text-muted)] text-[11px] font-mono">
                      {new Date(c.created_at).toLocaleDateString()} {new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="p-4 whitespace-nowrap font-mono font-bold text-[var(--brand-primary)]">
                      {c.id.slice(0, 8)}
                    </td>
                    <td className="p-4 font-semibold text-[var(--vera-text-primary)]">
                      {c.category}
                    </td>
                    <td className="p-4 whitespace-nowrap font-mono">
                      <span
                        className="px-2 py-0.5 rounded text-[10px] font-bold inline-flex items-center gap-1"
                        style={{
                          backgroundColor: (c.risk_level === 'CRITICAL' ? '#D45060' : c.risk_level === 'HIGH' ? '#D97706' : c.risk_level === 'MEDIUM' ? '#800020' : '#10B981') + '22',
                          color: c.risk_level === 'CRITICAL' ? '#D45060' : c.risk_level === 'HIGH' ? '#D97706' : c.risk_level === 'MEDIUM' ? '#800020' : '#10B981',
                          border: `1px solid ${(c.risk_level === 'CRITICAL' ? '#D45060' : c.risk_level === 'HIGH' ? '#D97706' : c.risk_level === 'MEDIUM' ? '#800020' : '#10B981')}44`,
                        }}
                      >
                        {c.risk_score}/100 · {c.risk_level}
                      </span>
                    </td>
                    <td className="p-4 whitespace-nowrap">
                      <span className="text-[var(--vera-text-secondary)]">{c.status}</span>
                    </td>
                    <td className="p-4 max-w-xs text-[var(--vera-text-muted)] truncate">
                      {c.address || `${c.latitude.toFixed(4)}, ${c.longitude.toFixed(4)}`}
                    </td>
                    <td className="p-4 whitespace-nowrap text-[var(--vera-text-secondary)] text-xs">
                      {c.routed_department || 'General Helpdesk'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
