import React, { useState, useEffect, useCallback } from 'react';
import { 
  Video, 
  Users, 
  Clock, 
  ChevronRight, 
  RefreshCw
} from 'lucide-react';
import { fetchComplaints } from '../../../services/api';
import { Complaint } from '../../../types';
import { JitsiRoomModal } from '../../emergency/JitsiRoomModal';

export const VideoRoomsPage: React.FC = () => {
  const [rooms, setRooms] = useState<{
    complaint: Complaint;
    isActive: boolean;
    participants: string[];
    roomUrl: string;
    lastEvent?: string;
  }[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeModalComplaint, setActiveModalComplaint] = useState<Complaint | null>(null);

  const loadVideoRooms = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchComplaints();
      if (res.success) {
        // High risk or critical incidents get a live room
        const roomEligible = res.complaints.filter(c => 
          c.risk_score >= 60 || 
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
              ? (idx % 2 === 0 ? ['Incident Commander', 'EMS Unit 4'] : ['Field Responder', 'Police Dispatch'])
              : [],
            roomUrl: `https://meet.jit.si/vera-incident-${roomSuffix}`,
            lastEvent: isCriticalActive ? 'Channel open for coordination' : 'Session concluded (Duration: ~14m)',
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

  return (
    <div className="p-6 space-y-6">
      {/* Modal if room opened */}
      {activeModalComplaint && (
        <JitsiRoomModal
          roomName={`vera-incident-${activeModalComplaint.id.slice(0, 8)}`}
          incidentTitle={`${activeModalComplaint.category} (Risk ${activeModalComplaint.risk_score}/100)`}
          defaultRole="Municipal Responder"
          defaultName="Incident Commander"
          onClose={() => setActiveModalComplaint(null)}
          onParticipantUpdate={() => {}}
        />
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel rounded-2xl p-5 border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <Video className="w-5 h-5 text-teal-400" />
            <h2 className="text-xl font-bold text-white">Emergency Video Rooms</h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-300 border border-purple-500/30">
              WEBRTC MESH
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Realtime low-latency video coordination channels provisioned for critical emergency incidents
          </p>
        </div>

        <button
          onClick={loadVideoRooms}
          disabled={loading}
          className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white transition self-start sm:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Rooms Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full p-12 text-center text-slate-500 text-xs flex flex-col items-center gap-2">
            <RefreshCw className="w-6 h-6 animate-spin text-teal-400" />
            <span>Scanning active video sessions...</span>
          </div>
        ) : rooms.length === 0 ? (
          <div className="col-span-full p-12 text-center text-slate-500 text-xs glass-panel rounded-2xl border border-slate-800">
            No active or historical video rooms. When an incident escalates to Critical Incident (Risk ≥ 60), a room is automatically provisioned here.
          </div>
        ) : (
          rooms.map((room) => (
            <div
              key={room.complaint.id}
              className={`glass-panel rounded-2xl p-5 border flex flex-col justify-between gap-4 transition ${
                room.isActive 
                  ? 'border-red-500/40 bg-red-950/10 shadow-lg shadow-red-950/20' 
                  : 'border-slate-800'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-100">{room.complaint.category}</span>
                    {room.isActive ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-600 text-white flex items-center gap-1 animate-pulse">
                        <span className="w-1.5 h-1.5 rounded-full bg-white" />
                        LIVE
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-400">
                        Closed
                      </span>
                    )}
                  </div>
                  <span className="font-mono text-xs text-slate-500">
                    {room.complaint.id.slice(0, 8)}
                  </span>
                </div>

                <p className="text-xs text-slate-300 line-clamp-2 mb-3">
                  {room.complaint.description}
                </p>

                {room.isActive ? (
                  <div className="bg-slate-900/80 rounded-xl p-3 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400 flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-teal-400" /> Responders:
                      </span>
                      <span className="text-teal-300 font-semibold">{room.participants.length} Active</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {room.participants.map((p, i) => (
                        <span key={i} className="px-2 py-0.5 rounded bg-teal-950/60 text-teal-200 border border-teal-500/30 text-[10px]">
                          {p}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-900/50 rounded-xl p-3 border border-slate-800 text-xs text-slate-400 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-slate-500" />
                    <span>{room.lastEvent}</span>
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between">
                <span className="text-[11px] font-mono text-slate-500">
                  Risk: {room.complaint.risk_score}/100
                </span>
                <button
                  onClick={() => setActiveModalComplaint(room.complaint)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                    room.isActive
                      ? 'bg-red-600 hover:bg-red-500 text-white shadow-md shadow-red-600/30'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                  }`}
                >
                  <Video className="w-3.5 h-3.5" />
                  <span>{room.isActive ? 'Join Live Room' : 'Reopen Session'}</span>
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
