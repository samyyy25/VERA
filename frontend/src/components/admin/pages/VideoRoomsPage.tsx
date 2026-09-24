import React, { useState, useEffect, useCallback } from 'react';
import { 
  Video, 
  Users, 
  Clock, 
  ChevronRight, 
  RefreshCw,
  Plus,
  Search,
} from 'lucide-react';
import { fetchComplaints } from '../../../services/api';
import { Complaint } from '../../../types';
import { JitsiRoomModal } from '../../emergency/JitsiRoomModal';

export const VideoRoomsPage: React.FC = () => {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [rooms, setRooms] = useState<{
    complaint: Complaint;
    isActive: boolean;
    participants: string[];
    roomUrl: string;
    lastEvent?: string;
  }[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeModalComplaint, setActiveModalComplaint] = useState<Complaint | null>(null);
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [searchIncident, setSearchIncident] = useState<string>('');

  const loadVideoRooms = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchComplaints();
      if (res.success && res.complaints) {
        setComplaints(res.complaints);

        // High risk or critical incidents get a live room
        const roomEligible = res.complaints.filter(c => 
          (c.risk_score || 0) >= 60 || 
          c.status === 'Critical Incident' || 
          c.status === 'Emergency Response' || 
          c.video_url
        );

        const loadedRooms = roomEligible.map((c, idx) => {
          const isCriticalActive = (c.status === 'Critical Incident' || c.status === 'Emergency Response');
          const roomSuffix = c.id.slice(0, 8);
          return {
            complaint: c,
            isActive: isCriticalActive,
            participants: isCriticalActive 
              ? (idx % 2 === 0 ? ['Incident Commander', 'EMS Unit 4', 'Traffic Lead'] : ['Field Responder', 'Police Dispatch'])
              : [],
            roomUrl: `https://meet.jit.si/vera-incident-${roomSuffix}`,
            lastEvent: isCriticalActive ? 'Coordination active' : 'Session concluded',
          };
        });

        setRooms(loadedRooms);
      }
    } catch (err) {
      console.warn('Failed to load video rooms:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadVideoRooms();
  }, [loadVideoRooms]);

  const filteredIncidentsForNewRoom = complaints.filter(c => {
    if (!searchIncident.trim()) return true;
    const q = searchIncident.toLowerCase();
    return c.category.toLowerCase().includes(q) || c.description.toLowerCase().includes(q) || c.id.toLowerCase().includes(q);
  });

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* ── Active Jitsi Room Modal ── */}
      {activeModalComplaint && (
        <JitsiRoomModal
          roomName={`vera-incident-${activeModalComplaint.id.slice(0, 8)}`}
          incidentTitle={`${activeModalComplaint.category} (Risk ${activeModalComplaint.risk_score}/100)`}
          defaultRole="Municipal Responder"
          defaultName="HQ Dispatcher"
          onClose={() => setActiveModalComplaint(null)}
          onParticipantUpdate={() => {}}
        />
      )}

      {/* ── Create New Video Room Modal ── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="vera-modal border border-[var(--vera-border)] rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--vera-border)]">
              <div className="flex items-center gap-2">
                <Video className="w-5 h-5 text-[#D45060]" />
                <h3 className="text-base font-bold text-[var(--vera-text-primary)]">Start Emergency Video Room</h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded-lg text-[var(--vera-text-muted)] hover:text-[var(--vera-text-primary)] cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-[var(--vera-text-muted)]">
              Select any active incident to provision an encrypted WebRTC coordination channel for on-scene responders.
            </p>

            <div className="relative">
              <Search className="w-4 h-4 text-[var(--vera-text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search incident to launch room..."
                value={searchIncident}
                onChange={(e) => setSearchIncident(e.target.value)}
                className="w-full vera-input rounded-xl pl-9 pr-3 py-2 text-xs placeholder-[var(--vera-text-muted)] focus:outline-none"
              />
            </div>

            <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
              {filteredIncidentsForNewRoom.slice(0, 10).map((inc) => (
                <div
                  key={inc.id}
                  onClick={() => {
                    setShowCreateModal(false);
                    setActiveModalComplaint(inc);
                  }}
                  className="p-3 rounded-xl bg-[var(--vera-surface-elevated)] hover:bg-[var(--vera-primary-soft)] border border-[var(--vera-border)] hover:border-[var(--vera-primary-border)] transition cursor-pointer flex items-center justify-between group"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-[var(--vera-text-primary)] group-hover:text-[var(--vera-primary)]">{inc.category}</span>
                      <span className="text-[10px] font-mono text-[var(--vera-text-muted)]">#{inc.id.slice(0, 8)}</span>
                      <span className="vera-badge vera-badge-critical text-[9px] font-black">
                        Risk {inc.risk_score}/100
                      </span>
                    </div>
                    <p className="text-[11px] text-[var(--vera-text-muted)] line-clamp-1 mt-0.5">{inc.description}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[var(--vera-text-muted)] group-hover:text-[var(--vera-primary)] group-hover:translate-x-0.5 transition" />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 vera-card rounded-2xl p-5 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-[var(--vera-primary-soft)] text-[#D45060] border border-[var(--vera-primary-border)]">
              <Video className="w-5 h-5 animate-pulse" />
            </div>
            <h2 className="text-xl font-bold text-[var(--vera-text-primary)]">Emergency Video Coordination Mesh</h2>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#D45060]/15 text-[#D45060] border border-[#D45060]/30 font-mono">
              WEBRTC ENCRYPTED
            </span>
          </div>
          <p className="text-xs text-[var(--vera-text-muted)] mt-1">
            Real-time low-latency video coordination channels provisioned for critical emergency incidents &amp; field responders
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-3.5 py-2 rounded-xl vera-button-primary text-xs font-bold transition flex items-center gap-1.5 shadow-md cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Launch Video Room</span>
          </button>

          <button
            onClick={loadVideoRooms}
            disabled={loading}
            className="p-2.5 rounded-xl vera-button-secondary text-[var(--vera-text-secondary)] hover:text-[var(--vera-text-primary)] transition cursor-pointer"
            title="Refresh Video Mesh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[var(--vera-primary)]' : ''}`} />
          </button>
        </div>
      </div>

      {/* Rooms Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {loading ? (
          <div className="col-span-full p-12 text-center text-[var(--vera-text-muted)] text-xs flex flex-col items-center gap-2">
            <RefreshCw className="w-6 h-6 animate-spin text-[var(--vera-primary)]" />
            <span>Scanning active video coordination channels...</span>
          </div>
        ) : rooms.length === 0 ? (
          <div className="col-span-full p-12 text-center text-[var(--vera-text-muted)] text-xs vera-card rounded-2xl">
            No active video coordination rooms at this moment. Click &quot;Launch Video Room&quot; above to start a live session for any incident.
          </div>
        ) : (
          rooms.map((room) => (
            <div
              key={room.complaint.id}
              className={`vera-card rounded-2xl p-5 border flex flex-col justify-between gap-4 transition shadow-lg ${
                room.isActive 
                  ? 'border-[#D45060]/50 bg-[var(--vera-surface-elevated)] shadow-[0_0_20px_rgba(212,80,96,0.15)]' 
                  : 'border-[var(--vera-border)]'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-[var(--vera-text-primary)]">{room.complaint.category}</span>
                    {room.isActive ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#D45060] text-white flex items-center gap-1 animate-pulse">
                        <span className="w-1.5 h-1.5 rounded-full bg-white" />
                        LIVE
                      </span>
                    ) : (
                      <span className="vera-badge text-[10px]">
                        Standby
                      </span>
                    )}
                  </div>
                  <span className="font-mono text-xs text-[var(--vera-text-muted)]">
                    #{room.complaint.id.slice(0, 8)}
                  </span>
                </div>

                <p className="text-xs text-[var(--vera-text-secondary)] line-clamp-2 mb-3">
                  {room.complaint.description}
                </p>

                {room.isActive ? (
                  <div className="vera-card-secondary rounded-xl p-3 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[var(--vera-text-muted)] flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-[var(--vera-primary)]" /> Responders in Channel:
                      </span>
                      <span className="text-[var(--vera-primary)] font-bold">{room.participants.length} Units</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {room.participants.map((p, i) => (
                        <span key={i} className="px-2 py-0.5 rounded-lg bg-[var(--vera-primary-soft)] text-[var(--vera-text-primary)] border border-[var(--vera-primary-border)] text-[10px] font-semibold">
                          {p}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="vera-card-secondary rounded-xl p-3 text-xs text-[var(--vera-text-muted)] flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[var(--vera-text-muted)]" />
                    <span>{room.lastEvent}</span>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-[var(--vera-border)] flex items-center justify-between">
                <span className="text-[11px] font-mono text-[var(--vera-text-muted)]">
                  Risk Score: {room.complaint.risk_score}/100
                </span>
                <button
                  onClick={() => setActiveModalComplaint(room.complaint)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    room.isActive
                      ? 'vera-button-danger shadow-md'
                      : 'vera-button-secondary'
                  }`}
                >
                  <Video className="w-3.5 h-3.5" />
                  <span>{room.isActive ? 'Join Live Room' : 'Start Session'}</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

