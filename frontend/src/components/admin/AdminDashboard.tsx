import React, { useState, useEffect, useCallback } from 'react';
import { 
  Activity, 
  Search, 
  MapPin, 
  Clock, 
  ShieldAlert, 
  CheckCircle2, 
  RefreshCw, 
  ChevronRight, 
  Radio, 
  X,
  AlertOctagon,
  Flame,
  Zap,
  Video,
  Share2,
  Building2
} from 'lucide-react';
import { fetchComplaints, fetchComplaintById, updateComplaintStatus } from '../../services/api';
import { Complaint, IncidentEvent, ComplaintStatus } from '../../types';
import { supabase } from '../../lib/supabase';
import { EmergencyResponse } from '../emergency/EmergencyResponse';
import { JitsiRoomModal } from '../emergency/JitsiRoomModal';
import { shareIncident } from '../../utils/shareCardGenerator';

export const AdminDashboard: React.FC = () => {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [riskFilter, setRiskFilter] = useState<string>('ALL');

  // Selected complaint detail drawer
  const [selectedComplaintId, setSelectedComplaintId] = useState<string | null>(null);
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [selectedEvents, setSelectedEvents] = useState<IncidentEvent[]>([]);
  const [detailLoading, setDetailLoading] = useState<boolean>(false);
  const [updatingStatus, setUpdatingStatus] = useState<boolean>(false);

  // New incident notification indicator
  const [newIncidentAlert, setNewIncidentAlert] = useState<boolean>(false);

  // Level 2 Emergency Response overlay
  const [emergencyComplaint, setEmergencyComplaint] = useState<Complaint | null>(null);

  // Live Jitsi Video Room state (Section 41 & 44)
  const [liveVideoComplaint, setLiveVideoComplaint] = useState<Complaint | null>(null);
  const [activeRoomParticipants, setActiveRoomParticipants] = useState<Record<string, string[]>>({});
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);



  const loadComplaints = useCallback(async (isPolling = false) => {
    if (!isPolling) setLoading(true);
    try {
      const response = await fetchComplaints({
        category: categoryFilter,
        status: statusFilter,
        risk_level: riskFilter,
        search: search.trim() || undefined,
      });
      if (response.success) {
        setComplaints(prev => {
          if (isPolling && response.complaints.length > prev.length) {
            setNewIncidentAlert(true);
            setTimeout(() => setNewIncidentAlert(false), 4000);
          }
          return response.complaints;
        });
      }
    } catch (err) {
      console.warn('Failed to fetch complaints:', err);
    } finally {
      if (!isPolling) setLoading(false);
    }
  }, [categoryFilter, statusFilter, riskFilter, search]);

  useEffect(() => {
    loadComplaints();
    const interval = setInterval(() => loadComplaints(true), 4000);
    return () => clearInterval(interval);
  }, [loadComplaints]);

  // Supabase Realtime subscription if configured
  useEffect(() => {
    if (!supabase) return;
    const client = supabase;
    const channel = client
      .channel('public:complaints')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'complaints' }, () => {
        loadComplaints(true);
      })
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  }, [loadComplaints]);

  // Load single complaint detail & timeline
  const handleSelectComplaint = async (id: string) => {
    setSelectedComplaintId(id);
    setDetailLoading(true);
    try {
      const res = await fetchComplaintById(id);
      if (res.success) {
        setSelectedComplaint(res.complaint);
        setSelectedEvents(res.events);
      }
    } catch (err) {
      console.warn('Failed to load complaint details:', err);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: ComplaintStatus) => {
    if (!selectedComplaint) return;
    setUpdatingStatus(true);
    try {
      const res = await updateComplaintStatus(selectedComplaint.id, newStatus, undefined, 'ADMIN');
      if (res.success && res.complaint) {
        setSelectedComplaint(res.complaint);
        const detailRes = await fetchComplaintById(selectedComplaint.id);
        if (detailRes.success) {
          setSelectedEvents(detailRes.events);
        }
        loadComplaints(true);
      }
    } catch (err) {
      console.error('Failed to update status:', err);
    } finally {
      setUpdatingStatus(false);
    }
  };

  // KPIs
  const totalCount = complaints.length;
  const activeCount = complaints.filter(c => c.status !== 'Resolved').length;
  const criticalComplaints = complaints.filter(c => c.risk_score >= 60 || c.status === 'Critical Incident');
  const criticalCount = criticalComplaints.length;
  const resolvedCount = complaints.filter(c => c.status === 'Resolved').length;

  const getRiskBadge = (level: string, score: number) => {
    if (level === 'CRITICAL' || score >= 80) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse">
          <ShieldAlert className="w-3 h-3" />
          CRITICAL ({score}/100)
        </span>
      );
    }
    if (level === 'HIGH' || score >= 60) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-orange-500/20 text-orange-400 border border-orange-500/40">
          <AlertOctagon className="w-3 h-3" />
          HIGH ({score}/100)
        </span>
      );
    }
    if (level === 'MEDIUM' || score >= 30) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/20 text-amber-400 border border-amber-500/30">
          MEDIUM ({score}/100)
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
        LOW ({score}/100)
      </span>
    );
  };

  const getStatusBadge = (status: ComplaintStatus) => {
    switch (status) {
      case 'Reported':
        return <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-sky-500/10 text-sky-400 border border-sky-500/20">Reported</span>;
      case 'Verified':
        return <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20">Verified</span>;
      case 'In Progress':
        return <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">In Progress</span>;
      case 'Critical Incident':
      case 'Emergency Response':
        return (
          <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-red-600 text-white shadow-md shadow-red-600/30 border border-red-400 flex items-center gap-1 animate-pulse">
            <Flame className="w-3 h-3" />
            {status}
          </span>
        );
      case 'Resolved':
        return <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Resolved</span>;
      default:
        return <span className="px-2 py-0.5 rounded-md text-xs bg-slate-800 text-slate-400">{status}</span>;
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Level 2 Emergency Response Overlay */}
      {emergencyComplaint && (
        <EmergencyResponse
          complaint={emergencyComplaint}
          onClose={() => setEmergencyComplaint(null)}
        />
      )}

      {/* Live Jitsi Emergency Video Room (Section 41 & 44) */}
      {liveVideoComplaint && (
        <JitsiRoomModal
          roomName={`vera-incident-${liveVideoComplaint.id.slice(0, 8)}`}
          incidentTitle={`${liveVideoComplaint.category} (Risk ${liveVideoComplaint.risk_score}/100)`}
          defaultRole="Municipal Responder"
          defaultName="Incident Commander"
          onClose={() => setLiveVideoComplaint(null)}
          onParticipantUpdate={(parts) => {
            setActiveRoomParticipants(prev => ({
              ...prev,
              [liveVideoComplaint.id]: parts,
            }));
          }}
          onLogTimelineEvent={(msg, icon) => {
            setSelectedEvents(prev => [
              {
                id: `evt_local_${Date.now()}`,
                complaint_id: liveVideoComplaint.id,
                new_status: liveVideoComplaint.status,
                message: `${icon || '🎥'} ${msg}`,
                created_at: new Date().toISOString(),
                changed_by: 'LIVE_ROOM_DISPATCH',
              },
              ...prev,
            ]);
          }}
        />
      )}


      {/* Realtime Notification Banner */}
      {newIncidentAlert && (
        <div className="glass-panel-glow bg-teal-950/80 border-teal-500/50 p-3 rounded-xl flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2 text-xs font-semibold text-teal-300">
            <span className="w-2 h-2 rounded-full bg-teal-400 animate-ping" />
            <span>New Incident Report Received in Realtime</span>
          </div>
          <span className="text-[10px] text-teal-400 font-mono">Live Sync</span>
        </div>
      )}

      {/* 🚨 CRITICAL INCIDENT PROMINENT COMMAND BANNER */}
      {criticalCount > 0 && (
        <div className="glass-emergency rounded-2xl p-4 sm:p-5 border border-red-500/60 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-pulse-fast">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-red-600 text-white shadow-lg shadow-red-600/40 flex items-center justify-center">
              <ShieldAlert className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-white tracking-wide">
                  🚨 {criticalCount} CRITICAL EMERGENCY INCIDENT{criticalCount > 1 ? 'S' : ''} ACTIVE
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-950 text-red-300 border border-red-500/50">
                  IMMEDIATE ACTION REQUIRED
                </span>
              </div>
              <p className="text-xs text-red-200/90 mt-0.5">
                VERA deterministic risk engine has automatically escalated severe danger reports (Score $\ge 60/100$).
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 self-end md:self-auto">
            <button
              onClick={() => {
                if (criticalComplaints[0]) handleSelectComplaint(criticalComplaints[0].id);
              }}
              className="px-3.5 py-2 rounded-xl bg-red-950/80 hover:bg-red-900 text-red-200 border border-red-500/40 font-bold text-xs shadow-lg transition flex items-center gap-1.5"
            >
              <span>Review Details</span>
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                if (criticalComplaints[0]) setLiveVideoComplaint(criticalComplaints[0]);
              }}
              className="px-3.5 py-2 rounded-xl bg-red-700 hover:bg-red-600 text-white font-bold text-xs shadow-lg transition flex items-center gap-1.5"
            >
              <Video className="w-3.5 h-3.5" />
              <span>Join Live Room</span>
            </button>
            <button
              onClick={() => {
                if (criticalComplaints[0]) setEmergencyComplaint(criticalComplaints[0]);
              }}
              className="px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-lg shadow-red-600/30 transition flex items-center gap-1.5"
            >
              <Radio className="w-3.5 h-3.5" />
              <span>Launch Emergency Response</span>
            </button>
          </div>
        </div>
      )}


      {/* KPI Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="glass-panel rounded-2xl p-4 sm:p-5 border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Total Reports</p>
            <h4 className="text-2xl font-extrabold text-white mt-1">{totalCount}</h4>
          </div>
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-300">
            <Activity className="w-5 h-5" />
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-4 sm:p-5 border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Active Issues</p>
            <h4 className="text-2xl font-extrabold text-amber-400 mt-1">{activeCount}</h4>
          </div>
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-4 sm:p-5 border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Critical Escalations</p>
            <h4 className="text-2xl font-extrabold text-red-400 mt-1">{criticalCount}</h4>
          </div>
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">
            <ShieldAlert className="w-5 h-5" />
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-4 sm:p-5 border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Resolved</p>
            <h4 className="text-2xl font-extrabold text-emerald-400 mt-1">{resolvedCount}</h4>
          </div>
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="glass-panel rounded-2xl p-4 border border-slate-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search complaints by keyword, address, ID..."
            className="w-full bg-slate-900/90 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs sm:text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-teal-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
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
            <option value="Emergency Response">Emergency Response</option>
            <option value="Resolved">Resolved</option>
          </select>

          {/* Category Filter */}
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
            <option value="Medical Emergency">Medical Emergency</option>
            <option value="Other civic issues">Other</option>
          </select>

          {/* Risk Level Filter */}
          <select
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value)}
            className="bg-slate-900 border border-slate-800 text-slate-300 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-teal-500"
          >
            <option value="ALL">All Risk Levels</option>
            <option value="LOW">Low Risk (0-29)</option>
            <option value="MEDIUM">Medium Risk (30-59)</option>
            <option value="HIGH">High Risk (60-79)</option>
            <option value="CRITICAL">Critical Risk (80-100)</option>
          </select>

          <button
            onClick={() => loadComplaints(false)}
            disabled={loading}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white transition"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Complaints Feed List */}
      <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Radio className="w-4 h-4 text-teal-400" />
            Live Incident & Complaint Feed
          </h3>
          <span className="text-xs text-slate-400 font-mono">
            {complaints.length} records found
          </span>
        </div>

        {loading && complaints.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs flex flex-col items-center gap-2">
            <RefreshCw className="w-6 h-6 animate-spin text-teal-400" />
            <span>Loading complaints from VERA engine...</span>
          </div>
        ) : complaints.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            No complaints found matching current criteria. Submit a report from the citizen tab to see it appear here in realtime.
          </div>
        ) : (
          <div className="divide-y divide-slate-800/60">
            {complaints.map(comp => {
              const isSelected = selectedComplaintId === comp.id;
              const isCritical = comp.risk_score >= 60 || comp.status === 'Critical Incident';
              return (
                <div
                  key={comp.id}
                  onClick={() => handleSelectComplaint(comp.id)}
                  className={`p-4 transition cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isSelected ? 'bg-slate-800/70 border-l-4 border-teal-500' : 'hover:bg-slate-900/50'
                  } ${isCritical ? 'bg-red-950/20 border-l-4 border-red-500' : ''}`}
                >
                  <div className="flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-sm text-slate-100">{comp.category}</span>
                      {getStatusBadge(comp.status)}
                      {getRiskBadge(comp.risk_level, comp.risk_score)}
                      {activeRoomParticipants[comp.id] && activeRoomParticipants[comp.id].length > 0 && (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-600 text-white shadow-md shadow-red-600/40 border border-red-400 flex items-center gap-1 animate-pulse">
                          <Video className="w-3 h-3" />
                          🔴 LIVE — {activeRoomParticipants[comp.id].length} responders coordinating
                        </span>
                      )}
                      <span className="text-[10px] font-mono text-slate-500">
                        {new Date(comp.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                    </div>


                    <p className="text-xs text-slate-300 line-clamp-1">{comp.description}</p>

                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
                      {comp.routed_department && (
                        <span className="text-teal-300 font-medium flex items-center gap-1">
                          <Building2 className="w-3 h-3" />
                          Routed: {comp.routed_department}
                        </span>
                      )}
                      {comp.video_url && (
                        <span className="text-red-400 font-medium flex items-center gap-1">
                          <Video className="w-3 h-3" />
                          Video Attached
                        </span>
                      )}
                      {comp.address && (
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-teal-400 shrink-0" />
                          <span className="truncate max-w-xs">{comp.address}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">

                    <span className="text-xs text-teal-400 flex items-center gap-1">
                      View Details
                      <ChevronRight className="w-4 h-4" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Complaint Detail & Timeline Modal / Drawer */}
      {selectedComplaint && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel-glow bg-[#0b132b] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-slate-700 p-6 flex flex-col gap-5 animate-fadeIn">
            {/* Header */}
            <div className="flex items-start justify-between pb-3 border-b border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-white">{selectedComplaint.category}</h3>
                  {getStatusBadge(selectedComplaint.status)}
                  {getRiskBadge(selectedComplaint.risk_level, selectedComplaint.risk_score)}
                </div>
                <p className="text-xs font-mono text-slate-400 mt-0.5">Incident Tracking ID: {selectedComplaint.id}</p>
              </div>
              <button
                onClick={() => setSelectedComplaint(null)}
                className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {detailLoading ? (
              <div className="py-12 flex flex-col items-center justify-center text-xs text-slate-400 gap-2">
                <RefreshCw className="w-6 h-6 animate-spin text-teal-400" />
                <span>Fetching incident audit details...</span>
              </div>
            ) : (
              <>
                {/* 🛡️ Deterministic Risk Engine Assessment Card */}
                <div className={`p-4 rounded-xl border ${
                  selectedComplaint.risk_score >= 60 
                    ? 'bg-red-950/30 border-red-500/50' 
                    : 'bg-slate-900/80 border-slate-800'
                } space-y-2`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Zap className={`w-4 h-4 ${selectedComplaint.risk_score >= 60 ? 'text-red-400' : 'text-teal-400'}`} />
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                        Deterministic Risk Engine Assessment
                      </h4>
                    </div>
                    <span className="text-xs font-bold font-mono text-white">
                      Score: {selectedComplaint.risk_score}/100 ({selectedComplaint.risk_level})
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                    <div
                      className={`h-full transition-all duration-500 ${
                        selectedComplaint.risk_score >= 80
                          ? 'bg-red-500'
                          : selectedComplaint.risk_score >= 60
                          ? 'bg-orange-500'
                          : selectedComplaint.risk_score >= 30
                          ? 'bg-amber-500'
                          : 'bg-teal-500'
                      }`}
                      style={{ width: `${selectedComplaint.risk_score}%` }}
                    />
                  </div>

                  <p className="text-[11px] text-slate-300">
                    {selectedComplaint.risk_score >= 60
                      ? '⚠️ Server automatically triggered Critical Emergency Escalation based on weighted danger keywords and severity rules.'
                      : 'Standard civic priority. No immediate life-safety keywords detected.'}
                  </p>
                </div>

                {/* Authority Routing Card (Section 40) */}
                <div className="p-3.5 rounded-xl bg-teal-950/20 border border-teal-500/30 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-teal-300 flex items-center gap-1.5 uppercase tracking-wider">
                      <Building2 className="w-4 h-4 text-teal-400" />
                      Authority Dispatch Routing
                    </span>
                    <span className="font-semibold text-teal-200">
                      {selectedComplaint.routed_department || 'General Municipal Helpdesk'}
                    </span>
                  </div>
                  <p className="text-[11px] text-teal-400/80 leading-relaxed">
                    Notification sent to department inbox (demo routing — production would integrate with real municipal/police dispatch systems).
                  </p>
                </div>

                {/* Live Room Participant Tracker (Section 44) */}
                {activeRoomParticipants[selectedComplaint.id] && activeRoomParticipants[selectedComplaint.id].length > 0 && (
                  <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/50 flex flex-col gap-1.5 animate-fadeIn">
                    <div className="flex items-center justify-between text-xs text-emerald-300">
                      <span className="font-bold flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                        🟢 Live Responders Connected ({activeRoomParticipants[selectedComplaint.id].length})
                      </span>
                      <span className="text-[10px] font-mono text-emerald-400">Jitsi WebRTC Sync</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {activeRoomParticipants[selectedComplaint.id].map((p, idx) => (
                        <span key={idx} className="px-2 py-0.5 rounded-md bg-emerald-900/60 text-emerald-200 border border-emerald-500/40 text-[11px] font-medium">
                          {p}
                        </span>
                      ))}
                    </div>
                  </div>
                )}


                {/* Description & Media */}
                <div className="space-y-3">

                  <div>
                    <h4 className="text-xs font-semibold uppercase text-slate-400 tracking-wider mb-1">Incident Description</h4>
                    <p className="text-sm text-slate-200 bg-slate-900/80 p-3 rounded-xl border border-slate-800 leading-relaxed">
                      {selectedComplaint.description}
                    </p>
                  </div>

                  {selectedComplaint.voice_transcript && (
                    <div>
                      <h4 className="text-xs font-semibold uppercase text-teal-400 tracking-wider mb-1">Voice Transcript</h4>
                      <p className="text-xs text-slate-300 italic bg-teal-950/20 p-2.5 rounded-xl border border-teal-500/20">
                        "{selectedComplaint.voice_transcript}"
                      </p>
                    </div>
                  )}

                  {/* Media Grid: Photo & Video */}
                  {(selectedComplaint.photo_url || selectedComplaint.video_url) && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-semibold uppercase text-slate-400 tracking-wider">Attached Evidence</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {selectedComplaint.photo_url && (
                          <div className="space-y-1">
                            <span className="text-[10px] text-slate-400 uppercase">Photo</span>
                            <img src={selectedComplaint.photo_url} alt="Attached incident photo" className="w-full max-h-48 rounded-xl border border-slate-800 object-cover" />
                          </div>
                        )}
                        {selectedComplaint.video_url && (
                          <div className="space-y-1">
                            <span className="text-[10px] text-slate-400 uppercase">Video (Section 39)</span>
                            <video src={selectedComplaint.video_url} controls className="w-full max-h-48 rounded-xl border border-slate-800 bg-black" />
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Location Info */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-teal-400 shrink-0" />
                      <span className="font-mono text-slate-300">{selectedComplaint.latitude.toFixed(5)}, {selectedComplaint.longitude.toFixed(5)}</span>
                    </div>
                    {selectedComplaint.gps_accuracy && (
                      <div className="text-slate-400 text-[11px]">
                        Accuracy: ±{selectedComplaint.gps_accuracy} meters
                      </div>
                    )}
                    {selectedComplaint.address && (
                      <div className="col-span-full text-slate-300 text-xs mt-1">
                        {selectedComplaint.address}
                      </div>
                    )}
                  </div>
                </div>

                {/* Status Workflow Action Buttons */}
                <div>
                  <h4 className="text-xs font-semibold uppercase text-slate-400 tracking-wider mb-2">Workflow Status Transition</h4>
                  <div className="flex flex-wrap gap-2">
                    {(['Reported', 'Verified', 'In Progress', 'Critical Incident', 'Emergency Response', 'Resolved'] as ComplaintStatus[]).map((st) => (
                      <button
                        key={st}
                        disabled={updatingStatus || selectedComplaint.status === st}
                        onClick={() => handleStatusChange(st)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                          selectedComplaint.status === st
                            ? st === 'Critical Incident' || st === 'Emergency Response'
                              ? 'bg-red-600 text-white font-bold shadow-md shadow-red-600/30'
                              : 'bg-teal-600 text-white shadow-md'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 disabled:opacity-40'
                        }`}
                      >
                        Set as {st}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Action Buttons: Emergency Response, Live Video, and Share */}
                <div className="flex flex-col gap-2 pt-2 border-t border-slate-800">
                  {selectedComplaint.risk_score >= 60 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <button
                        onClick={() => setLiveVideoComplaint(selectedComplaint)}
                        className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-red-700 hover:bg-red-600 text-white font-bold text-xs shadow-lg transition"
                      >
                        <Video className="w-4 h-4" />
                        <span>🎥 Join Live Video Room</span>
                      </button>
                      <button
                        onClick={() => setEmergencyComplaint(selectedComplaint)}
                        className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-lg shadow-red-600/30 transition"
                      >
                        <Radio className="w-4 h-4" />
                        <span>🚨 Emergency Response Console</span>
                      </button>
                    </div>
                  )}

                  <button
                    onClick={async () => {
                      setShareFeedback('Generating share card...');
                      const res = await shareIncident(selectedComplaint);
                      if (res.method === 'download_fallback') {
                        setShareFeedback('Card downloaded & text copied!');
                      } else if (res.shared) {
                        setShareFeedback('Share dialog opened.');
                      } else {
                        setShareFeedback(null);
                      }
                      setTimeout(() => setShareFeedback(null), 3500);
                    }}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs transition"
                  >
                    <Share2 className="w-4 h-4 text-teal-400" />
                    <span>Share Incident Card (One-Tap Web Share)</span>
                  </button>
                  {shareFeedback && (
                    <p className="text-center text-xs text-teal-400">{shareFeedback}</p>
                  )}
                </div>


                {/* Incident Timeline Events */}
                <div>
                  <h4 className="text-xs font-semibold uppercase text-slate-400 tracking-wider mb-2">Incident Audit Timeline</h4>
                  <div className="space-y-2 max-h-44 overflow-y-auto">
                    {selectedEvents.map((evt) => (
                      <div key={evt.id} className="text-xs p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 flex items-start gap-2.5">
                        <Clock className="w-3.5 h-3.5 text-teal-400 shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <div className="flex justify-between items-center text-[10px] text-slate-400 mb-0.5">
                            <span className="font-medium text-slate-300">{evt.new_status}</span>
                            <span className="font-mono">{new Date(evt.created_at).toLocaleTimeString()}</span>
                          </div>
                          <p className="text-slate-300 text-[11px]">{evt.message}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
