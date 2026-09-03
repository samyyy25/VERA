import React, { useEffect, useRef, useState } from 'react';
import { 
  Video, 
  X, 
  AlertTriangle, 
  ShieldCheck, 
  Loader2, 
  ArrowRight
} from 'lucide-react';


export type ResponderRole = 
  | 'Citizen / Reporter'
  | 'Municipal Responder'
  | 'Police Responder'
  | 'Hospital / Medical Responder'
  | 'Observer';

interface JitsiRoomModalProps {
  roomName: string;
  incidentTitle: string;
  defaultRole?: ResponderRole;
  defaultName?: string;
  onClose: () => void;
  onParticipantUpdate?: (participants: string[]) => void;
  onLogTimelineEvent?: (eventMessage: string, icon?: string) => void;
}

export const JitsiRoomModal: React.FC<JitsiRoomModalProps> = ({
  roomName,
  incidentTitle,
  defaultRole = 'Citizen / Reporter',
  defaultName = '',
  onClose,
  onParticipantUpdate,
  onLogTimelineEvent,
}) => {
  const [hasJoined, setHasJoined] = useState<boolean>(false);
  const [selectedRole, setSelectedRole] = useState<ResponderRole>(defaultRole);
  const [displayName, setDisplayName] = useState<string>(defaultName);

  const jitsiContainerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const jitsiApiRef = useRef<any>(null);

  // Live participants list tracked outside Jitsi (Section 44)
  const [participants, setParticipants] = useState<string[]>([]);
  const joinTimestampRef = useRef<number>(Date.now());

  // Extract clean room identifier from roomName or full URL
  const cleanRoomName = roomName.startsWith('http')
    ? roomName.split('/').pop() || roomName
    : roomName;

  const fullDisplayName = displayName.trim() 
    ? `${selectedRole.split(' / ')[0]} — ${displayName.trim()}`
    : selectedRole;

  const handleStartSession = () => {
    setHasJoined(true);
  };

  useEffect(() => {
    if (!hasJoined) return;

    let script: HTMLScriptElement | null = null;
    joinTimestampRef.current = Date.now();

    const initJitsi = () => {
      try {
        if (!(window as any).JitsiMeetExternalAPI) {
          setError('Jitsi Meet library could not be initialized.');
          setLoading(false);
          return;
        }

        if (jitsiContainerRef.current) {
          jitsiContainerRef.current.innerHTML = '';
          const domain = 'meet.jit.si';
          const options = {
            roomName: cleanRoomName,
            width: '100%',
            height: '100%',
            parentNode: jitsiContainerRef.current,
            userInfo: {
              displayName: fullDisplayName,
            },
            configOverwrite: {
              prejoinPageEnabled: false,
              startWithAudioMuted: false,
              startWithVideoMuted: false,
              disableDeepLinking: true,
            },
            interfaceConfigOverwrite: {
              TOOLBAR_BUTTONS: [
                'microphone',
                'camera',
                'closedcaptions',
                'desktop',
                'fullscreen',
                'fodeviceselection',
                'hangup',
                'chat',
                'tileview',
              ],
              SHOW_JITSI_WATERMARK: false,
              SHOW_WATERMARK_FOR_GUESTS: false,
            },
          };

          const api = new (window as any).JitsiMeetExternalAPI(domain, options);
          jitsiApiRef.current = api;

          // Local user joined
          api.addEventListener('videoConferenceJoined', () => {
            setLoading(false);
            setParticipants(prev => {
              const updated = Array.from(new Set([...prev, fullDisplayName]));
              if (onParticipantUpdate) onParticipantUpdate(updated);
              return updated;
            });
            if (onLogTimelineEvent) {
              onLogTimelineEvent(`${fullDisplayName} joined live emergency session`, '🎥');
            }
          });

          // Remote participant joined
          api.addEventListener('participantJoined', (event: any) => {
            const remoteName = event.displayName || `Responder (${event.id.slice(0, 4)})`;
            setParticipants(prev => {
              const updated = Array.from(new Set([...prev, remoteName]));
              if (onParticipantUpdate) onParticipantUpdate(updated);
              return updated;
            });
            if (onLogTimelineEvent) {
              onLogTimelineEvent(`${remoteName} joined live session`, '🟢');
            }
          });

          // Participant left
          api.addEventListener('participantLeft', (event: any) => {
            const remoteName = event.displayName;
            setParticipants(prev => {
              const updated = prev.filter(p => p !== remoteName);
              if (onParticipantUpdate) onParticipantUpdate(updated);
              return updated;
            });
            if (remoteName && onLogTimelineEvent) {
              onLogTimelineEvent(`${remoteName} left live session`, '⚪');
            }
          });

          // Local user left
          api.addEventListener('videoConferenceLeft', () => {
            const durationSecs = Math.round((Date.now() - joinTimestampRef.current) / 1000);
            const durationMins = Math.max(1, Math.round(durationSecs / 60));
            if (onLogTimelineEvent) {
              onLogTimelineEvent(`Live emergency session ended — duration ${durationMins}m`, '⏱️');
            }
            onClose();
          });

          // Timeout fallback in case connection is slow
          setTimeout(() => setLoading(false), 2500);
        }
      } catch (err: any) {
        setError(`Failed to embed video stream: ${err.message}`);
        setLoading(false);
      }
    };

    // Load Jitsi script if not already loaded
    if ((window as any).JitsiMeetExternalAPI) {
      initJitsi();
    } else {
      script = document.createElement('script');
      script.src = 'https://meet.jit.si/external_api.js';
      script.async = true;
      script.onload = initJitsi;
      script.onerror = () => {
        setError('Could not load Jitsi Meet library. Please check your internet connection.');
        setLoading(false);
      };
      document.body.appendChild(script);
    }

    return () => {
      if (jitsiApiRef.current) {
        try {
          jitsiApiRef.current.dispose();
        } catch {
          // ignore cleanup errors
        }
      }
      if (script && document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, [hasJoined, cleanRoomName, fullDisplayName, onClose, onParticipantUpdate, onLogTimelineEvent]);

  // ─── 1. PRE-JOIN ROLE SELECTION VIEW (Section 44) ───────────────────────────
  if (!hasJoined) {
    return (
      <div className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-3 sm:p-4">
        <div className="w-full max-w-lg bg-slate-900 border border-red-500/60 rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-fadeIn">
          
          {/* Header */}
          <div className="bg-slate-950 border-b border-red-500/30 px-5 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-600/20 text-red-400 border border-red-500/40 animate-pulse">
                <Video className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white tracking-wide">
                  JOIN EMERGENCY LIVE ROOM
                </h3>
                <p className="text-[11px] text-slate-400">
                  Multi-Department Coordination · Room: <span className="font-mono text-teal-400">{cleanRoomName}</span>
                </p>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Form Content */}
          <div className="p-6 space-y-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 block mb-1.5">
                Select Your Role Identity
              </label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value as ResponderRole)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-sm text-slate-100 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
              >
                <option value="Citizen / Reporter">Citizen / Reporter (Default)</option>
                <option value="Police Responder">Police Responder (Law Enforcement)</option>
                <option value="Hospital / Medical Responder">Hospital / Medical Responder (Trauma / EMS)</option>
                <option value="Municipal Responder">Municipal Responder (Civic & Roads)</option>
                <option value="Observer">Observer (Demo / Reviewer)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 block mb-1.5">
                Your Name / Callsign (Optional)
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder={
                  selectedRole.includes('Police') 
                    ? 'e.g. Officer Rana' 
                    : selectedRole.includes('Hospital') 
                    ? 'e.g. Dr. Mehta / City General' 
                    : 'e.g. John Doe'
                }
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
              />
            </div>

            {/* Preview Tile Badge */}
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-400">Visible video tile name:</span>
              <span className="font-bold text-teal-300 font-mono">{fullDisplayName}</span>
            </div>

            {/* Prototype Honest Note */}
            <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/30 text-[11px] text-amber-300 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>
                <strong>Demo Note:</strong> Role verification/auth for responders is self-declared for this prototype. Production integrates with verified municipal credentials.
              </span>
            </div>

            {/* Submit Join */}
            <button
              onClick={handleStartSession}
              className="w-full py-3.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-sm transition flex items-center justify-center gap-2 shadow-lg shadow-red-600/30"
            >
              <span>Enter Emergency Video Room</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── 2. ACTIVE JITSI VIDEO SESSION VIEW ────────────────────────────────────
  return (
    <div className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-2 sm:p-4">
      {/* Modal Container */}
      <div className="w-full max-w-5xl h-[88vh] bg-slate-900 border border-red-500/50 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        
        {/* Header Bar */}
        <div className="bg-slate-950 border-b border-red-500/30 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-600/20 text-red-400 border border-red-500/30 animate-pulse">
              <Video className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white tracking-wide">
                  LIVE EMERGENCY VIDEO SESSION
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-950 text-red-300 border border-red-500/40">
                  CRITICAL INCIDENT
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                {incidentTitle} · Room: <span className="font-mono text-teal-400">{cleanRoomName}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 🟢 Live Responders Participant Tracker Strip (Section 44) */}
        <div className="bg-emerald-950/40 border-b border-emerald-500/30 px-4 py-2 flex items-center justify-between text-xs text-emerald-300">
          <div className="flex items-center gap-2 overflow-x-auto py-0.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
            <span className="font-bold shrink-0">Live now ({participants.length || 1}):</span>
            <span className="text-slate-200 font-medium truncate">
              {participants.length > 0 ? participants.join(' · ') : fullDisplayName}
            </span>
          </div>
          <div className="hidden sm:flex items-center gap-1 text-[11px] text-slate-400 shrink-0">
            <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
            <span>Encrypted Room</span>
          </div>
        </div>

        {/* Jitsi Video Container */}
        <div className="relative flex-1 bg-black flex items-center justify-center">
          {loading && (
            <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center gap-3 z-10">
              <Loader2 className="w-8 h-8 text-teal-400 animate-spin" />
              <p className="text-xs text-slate-300">Connecting as {fullDisplayName}...</p>
            </div>
          )}

          {error ? (
            <div className="p-6 text-center max-w-md bg-slate-900 border border-red-500/30 rounded-xl">
              <AlertTriangle className="w-10 h-10 text-red-400 mx-auto mb-2" />
              <h4 className="text-sm font-bold text-white mb-1">Video Room Notice</h4>
              <p className="text-xs text-slate-300 mb-4">{error}</p>
              <a
                href={`https://meet.jit.si/${cleanRoomName}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold text-xs inline-block transition"
              >
                Open in Jitsi Web Browser →
              </a>
            </div>
          ) : (
            <div ref={jitsiContainerRef} className="w-full h-full" />
          )}
        </div>
      </div>
    </div>
  );
};
