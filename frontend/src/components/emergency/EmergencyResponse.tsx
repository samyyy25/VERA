import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Mic,
  MicOff,
  Languages,
  MapPin,
  Hospital,
  ShieldAlert,
  Radio,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ChevronRight,
  Copy,
  Loader2,
  Wifi,
  WifiOff,
  Navigation,
  PhoneCall,
  Video,
} from 'lucide-react';
import {
  getTriageQuestion,
  generateResponderSummary,
  translateText,
  fetchEmergencyPackage,
  ChatMessage,
  ResponderLocation,
} from '../../services/api';
import { Complaint } from '../../types';
import { JitsiRoomModal } from './JitsiRoomModal';


// Fix Leaflet default icon paths broken by bundlers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom marker icons
const createIcon = (color: string, emoji: string) =>
  L.divIcon({
    className: '',
    html: `<div style="background:${color};width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:18px;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.5)">${emoji}</div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -20],
  });

const incidentIcon = createIcon('#ef4444', '🚨');
const hospitalIcon = createIcon('#10b981', '🏥');
const policeIcon = createIcon('#3b82f6', '👮');

// Auto-center map on coordinates change
function MapController({ lat, lon }: { lat: number; lon: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lon], 15);
  }, [lat, lon, map]);
  return null;
}

interface EmergencyResponseProps {
  complaint: Complaint;
  onClose: () => void;
}

type TriagePhase = 'loading' | 'active' | 'complete';

export const EmergencyResponse: React.FC<EmergencyResponseProps> = ({ complaint, onClose }) => {
  // ─── State ───────────────────────────────────────────────────────────────────
  const [triagePhase, setTriagePhase] = useState<TriagePhase>('loading');
  const [conversationHistory, setConversationHistory] = useState<ChatMessage[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [userVoiceInput, setUserVoiceInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [aiSource, setAiSource] = useState<'omniroute' | 'rule_fallback' | null>(null);

  // Translation
  const [translatedText, setTranslatedText] = useState('');
  const [translationService, setTranslationService] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [sourceLang, setSourceLang] = useState('auto');

  // Map / POIs
  const [hospital, setHospital] = useState<ResponderLocation | null>(null);
  const [policeStation, setPoliceStation] = useState<ResponderLocation | null>(null);
  const [poiSource, setPoiSource] = useState<string>('');
  const [loadingPOI, setLoadingPOI] = useState(true);

  // Responder Summary
  const [responderSummary, setResponderSummary] = useState('');
  const [generatingSummary, setGeneratingSummary] = useState(false);
  const [summaryReady, setSummaryReady] = useState(false);

  // SMS
  const [smsPayload, setSmsPayload] = useState('');
  const [smsCopied, setSmsCopied] = useState(false);

  // Live Jitsi Video Room (Section 41)
  const [showJitsi, setShowJitsi] = useState<boolean>(false);

  // Timeline
  const [timeline, setTimeline] = useState<{ time: string; event: string; icon: string }[]>([]);


  const recognitionRef = useRef<any>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const addTimelineEvent = useCallback((event: string, icon: string) => {
    setTimeline(prev => [
      ...prev,
      { time: new Date().toLocaleTimeString(), event, icon },
    ]);
  }, []);

  // ─── Init: Load first triage question + POIs ──────────────────────────────
  useEffect(() => {
    addTimelineEvent('Emergency incident detected and escalated', '🚨');
    addTimelineEvent(`GPS acquired: ${complaint.latitude.toFixed(5)}, ${complaint.longitude.toFixed(5)}`, '📍');
    loadFirstQuestion();
    loadPOIs();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversationHistory, currentQuestion]);

  const loadFirstQuestion = async () => {
    setTriagePhase('loading');
    try {
      const res = await getTriageQuestion(complaint.category, complaint.description, []);
      setCurrentQuestion(res.data.message);
      setAiSource(res.data.source);
      setTriagePhase('active');
      addTimelineEvent('AI triage dispatcher activated', '🤖');
    } catch {
      setCurrentQuestion('Are you or anyone nearby in immediate danger right now?');
      setTriagePhase('active');
    }
  };

  const loadPOIs = async () => {
    setLoadingPOI(true);
    try {
      const pkg = await fetchEmergencyPackage(
        complaint.latitude,
        complaint.longitude,
        complaint.category,
        complaint.risk_score,
        complaint.description
      );
      if (pkg.data) {
        setHospital(pkg.data.hospital);
        setPoliceStation(pkg.data.policeStation);
        setPoiSource(pkg.data.source);
        addTimelineEvent(
          pkg.data.hospital
            ? `Nearest hospital found: ${pkg.data.hospital.name} (${(pkg.data.hospital.distance_meters / 1000).toFixed(1)} km)`
            : 'Hospital search: none found within 5 km',
          '🏥'
        );
        addTimelineEvent(
          pkg.data.policeStation
            ? `Nearest station found: ${pkg.data.policeStation.name} (${(pkg.data.policeStation.distance_meters / 1000).toFixed(1)} km)`
            : 'Police station search: none found within 5 km',
          '👮'
        );
      }
      if (pkg.smsPayload) setSmsPayload(pkg.smsPayload.rawPayload);
    } catch {
      addTimelineEvent('Overpass POI search: timeout (offline mode)', '⚠️');
    } finally {
      setLoadingPOI(false);
    }
  };

  // ─── Voice Recognition ────────────────────────────────────────────────────
  const startListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-IN';
    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((r: any) => r[0].transcript)
        .join('');
      setUserVoiceInput(transcript);
    };
    recognition.onend = () => setIsListening(false);
    recognition.start();
    recognitionRef.current = recognition;
    setIsListening(true);
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    setIsListening(false);
  };

  // ─── Translation ──────────────────────────────────────────────────────────
  const handleTranslate = async (text: string) => {
    if (!text.trim()) return;
    setIsTranslating(true);
    try {
      const res = await translateText(text, 'en', sourceLang);
      setTranslatedText(res.data.translatedText);
      setTranslationService(res.data.service);
      addTimelineEvent('Multilingual translation processed', '🌐');
    } catch {
      setTranslatedText(text);
    } finally {
      setIsTranslating(false);
    }
  };

  // ─── Submit User Response to Triage ──────────────────────────────────────
  const submitResponse = async () => {
    if (!userVoiceInput.trim()) return;

    const userMsg: ChatMessage = { role: 'user', content: userVoiceInput };
    const assistantMsg: ChatMessage = { role: 'assistant', content: currentQuestion };

    const newHistory = [...conversationHistory, assistantMsg, userMsg];
    setConversationHistory(newHistory);

    // Translate user's response
    await handleTranslate(userVoiceInput);
    addTimelineEvent(`Victim response received: "${userVoiceInput.substring(0, 40)}..."`, '🗣️');

    setUserVoiceInput('');
    setCurrentQuestion('');

    if (newHistory.filter(m => m.role === 'user').length >= 4) {
      // Enough data — generate final summary
      setTriagePhase('complete');
      handleGenerateSummary(newHistory);
    } else {
      // Next triage question
      setTriagePhase('loading');
      try {
        const res = await getTriageQuestion(complaint.category, complaint.description, newHistory);
        setCurrentQuestion(res.data.message);
        setAiSource(res.data.source);
        setTriagePhase('active');
      } catch {
        setTriagePhase('complete');
        handleGenerateSummary(newHistory);
      }
    }
  };

  const handleGenerateSummary = async (history: ChatMessage[]) => {
    setGeneratingSummary(true);
    addTimelineEvent('Generating Emergency Responder Summary…', '📋');
    try {
      const res = await generateResponderSummary(
        complaint.category,
        complaint.description,
        history,
        complaint.address || undefined
      );
      setResponderSummary(res.summary);
      setSummaryReady(true);
      addTimelineEvent('Emergency Responder Summary ready', '✅');
    } catch {
      setResponderSummary(
        `SITUATION: ${complaint.category.toUpperCase()} at ${complaint.address || 'GPS location'}.\nDETAILS: ${complaint.description}\nACTION: Immediate on-ground verification required.`
      );
      setSummaryReady(true);
    } finally {
      setGeneratingSummary(false);
    }
  };

  const copySMS = () => {
    navigator.clipboard.writeText(smsPayload);
    setSmsCopied(true);
    setTimeout(() => setSmsCopied(false), 2000);
  };

  // ─── UI Helpers ───────────────────────────────────────────────────────────
  const distKm = (m: number) => (m / 1000).toFixed(1);

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="vera-emergency-overlay">
      {/* Live Jitsi Room Modal (Section 41 & 44) */}
      {showJitsi && (
        <JitsiRoomModal
          roomName={`vera-incident-${complaint.id.slice(0, 8)}`}
          incidentTitle={`${complaint.category} (Risk ${complaint.risk_score}/100)`}
          defaultRole={
            complaint.category === 'Medical Emergency'
              ? 'Hospital / Medical Responder'
              : complaint.category === 'Accident' || complaint.category === 'Harassment'
              ? 'Police Responder'
              : 'Municipal Responder'
          }
          defaultName="On-Duty Dispatcher"
          onClose={() => {
            setShowJitsi(false);
          }}
          onParticipantUpdate={(parts) => {
            if (parts.length > 0) {
              addTimelineEvent(`Active in video room (${parts.length}): ${parts.join(', ')}`, '👥');
            }
          }}
          onLogTimelineEvent={(msg, icon) => {
            addTimelineEvent(msg, icon || '🎥');
          }}
        />
      )}


      {/* Header */}
      <div className="vera-emg-header">
        <div className="vera-emg-header-left">
          <span className="vera-pulse-dot" />
          <span className="vera-emg-badge">🚨 EMERGENCY RESPONSE ACTIVE</span>
          <span className="vera-emg-risk">Risk {complaint.risk_score}/100 · {complaint.risk_level}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => {
              setShowJitsi(true);
              addTimelineEvent('Emergency live video session initiated via Jitsi', '🎥');
            }}
            className="vera-emg-close"
            style={{ background: 'rgba(239, 68, 68, 0.4)', borderColor: '#ef4444', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            <Video size={14} /> Join Live Video Room
          </button>
          <button onClick={onClose} className="vera-emg-close">✕ Close</button>
        </div>
      </div>


      <div className="vera-emg-grid">

        {/* LEFT COLUMN: Map + POIs */}
        <div className="vera-emg-col-left">

          {/* Interactive Map */}
          <div className="vera-emg-card">
            <div className="vera-emg-card-title">
              <MapPin size={16} /> Live Incident Map
              <span className="vera-poi-badge">{poiSource === 'overpass_live' ? '🟢 OSM Live' : poiSource === 'cached' ? '🟡 Cached' : '🔴 Offline'}</span>
            </div>
            <div className="vera-map-container">
              <MapContainer
                center={[complaint.latitude, complaint.longitude]}
                zoom={14}
                style={{ height: '100%', width: '100%' }}
                zoomControl={true}
              >
                <MapController lat={complaint.latitude} lon={complaint.longitude} />
                {/* OpenStreetMap tiles — free, no API key required */}
                <TileLayer
                  url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  maxZoom={19}
                />

                {/* Incident Marker */}
                <Marker position={[complaint.latitude, complaint.longitude]} icon={incidentIcon}>
                  <Popup>
                    <strong>🚨 Incident Location</strong><br />
                    {complaint.category}<br />
                    Risk: {complaint.risk_score}/100
                  </Popup>
                </Marker>

                {/* GPS Accuracy Circle */}
                {complaint.gps_accuracy && (
                  <Circle
                    center={[complaint.latitude, complaint.longitude]}
                    radius={complaint.gps_accuracy}
                    pathOptions={{ color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.08, dashArray: '4' }}
                  />
                )}

                {/* Hospital Marker */}
                {hospital && (
                  <Marker position={[hospital.latitude, hospital.longitude]} icon={hospitalIcon}>
                    <Popup>
                      <strong>🏥 {hospital.name}</strong><br />
                      {distKm(hospital.distance_meters)} km away<br />
                      {hospital.phone && <><PhoneCall size={12} /> {hospital.phone}</>}<br />
                      <a href={hospital.directionsUrl} target="_blank" rel="noopener noreferrer">Get Directions →</a>
                    </Popup>
                  </Marker>
                )}

                {/* Police Station Marker */}
                {policeStation && (
                  <Marker position={[policeStation.latitude, policeStation.longitude]} icon={policeIcon}>
                    <Popup>
                      <strong>👮 {policeStation.name}</strong><br />
                      {distKm(policeStation.distance_meters)} km away<br />
                      {policeStation.phone && <><PhoneCall size={12} /> {policeStation.phone}</>}<br />
                      <a href={policeStation.directionsUrl} target="_blank" rel="noopener noreferrer">Get Directions →</a>
                    </Popup>
                  </Marker>
                )}
              </MapContainer>
            </div>
          </div>

          {/* Nearby Responders */}
          <div className="vera-emg-card">
            <div className="vera-emg-card-title">
              <Radio size={16} /> Nearest Emergency Services
            </div>
            {loadingPOI ? (
              <div className="vera-poi-loading"><Loader2 size={16} className="vera-spin" /> Searching OSM for nearest services…</div>
            ) : (
              <div className="vera-poi-grid">
                {/* Hospital */}
                <div className={`vera-poi-card ${hospital ? 'vera-poi-found' : 'vera-poi-missing'}`}>
                  <Hospital size={22} className="vera-poi-icon" />
                  <div>
                    <div className="vera-poi-label">Nearest Hospital</div>
                    {hospital ? (
                      <>
                        <div className="vera-poi-name">{hospital.name}</div>
                        <div className="vera-poi-dist">📏 {distKm(hospital.distance_meters)} km</div>
                        {hospital.phone && <div className="vera-poi-phone">📞 {hospital.phone}</div>}
                        <a href={hospital.directionsUrl} target="_blank" rel="noopener noreferrer" className="vera-poi-dir">
                          <Navigation size={12} /> Get Directions
                        </a>
                      </>
                    ) : (
                      <div className="vera-poi-none">None found within 5 km</div>
                    )}
                  </div>
                </div>

                {/* Police Station */}
                <div className={`vera-poi-card ${policeStation ? 'vera-poi-found' : 'vera-poi-missing'}`}>
                  <ShieldAlert size={22} className="vera-poi-icon" />
                  <div>
                    <div className="vera-poi-label">Nearest Police</div>
                    {policeStation ? (
                      <>
                        <div className="vera-poi-name">{policeStation.name}</div>
                        <div className="vera-poi-dist">📏 {distKm(policeStation.distance_meters)} km</div>
                        {policeStation.phone && <div className="vera-poi-phone">📞 {policeStation.phone}</div>}
                        <a href={policeStation.directionsUrl} target="_blank" rel="noopener noreferrer" className="vera-poi-dir">
                          <Navigation size={12} /> Get Directions
                        </a>
                      </>
                    ) : (
                      <div className="vera-poi-none">None found within 5 km</div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* SMS Fallback */}
          {smsPayload && (
            <div className="vera-emg-card vera-sms-card">
              <div className="vera-emg-card-title">
                <AlertTriangle size={14} /> SMS FALLBACK SIMULATION
              </div>
              <div className="vera-sms-payload">{smsPayload}</div>
              <div className="vera-sms-meta">
                {smsPayload.length} chars · Max 160 · SIMULATION ONLY — not transmitted
              </div>
              <button onClick={copySMS} className="vera-sms-copy">
                {smsCopied ? <><CheckCircle2 size={13} /> Copied!</> : <><Copy size={13} /> Copy SMS Payload</>}
              </button>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Voice Triage + Translation + Timeline */}
        <div className="vera-emg-col-right">

          {/* AI Triage Console */}
          <div className="vera-emg-card vera-triage-card">
            <div className="vera-emg-card-title">
              <Radio size={16} /> Emergency Voice Triage
              <span className={`vera-ai-badge ${aiSource === 'omniroute' ? 'vera-ai-live' : 'vera-ai-fallback'}`}>
                {aiSource === 'omniroute' ? <><Wifi size={11} /> AI Live</> : <><WifiOff size={11} /> Deterministic</>}
              </span>
            </div>

            {/* Chat History */}
            <div className="vera-chat-log">
              {/* Initial Complaint */}
              <div className="vera-chat-bubble vera-chat-system">
                <span className="vera-chat-label">📋 Incident Report</span>
                <p><strong>{complaint.category}</strong> — {complaint.description}</p>
              </div>

              {conversationHistory.map((msg, i) => (
                <div key={i} className={`vera-chat-bubble ${msg.role === 'assistant' ? 'vera-chat-vera' : 'vera-chat-user'}`}>
                  <span className="vera-chat-label">{msg.role === 'assistant' ? '🤖 VERA' : '🗣️ Victim'}</span>
                  <p>{msg.content}</p>
                </div>
              ))}

              {/* Current Question */}
              {triagePhase === 'loading' && (
                <div className="vera-chat-bubble vera-chat-vera vera-chat-loading">
                  <Loader2 size={14} className="vera-spin" /> VERA is processing…
                </div>
              )}
              {triagePhase === 'active' && currentQuestion && (
                <div className="vera-chat-bubble vera-chat-vera vera-chat-current">
                  <span className="vera-chat-label">🤖 VERA</span>
                  <p>{currentQuestion}</p>
                  <ChevronRight size={14} className="vera-chat-arrow" />
                </div>
              )}

              <div ref={chatEndRef} />
            </div>

            {/* Voice Input Area */}
            {triagePhase !== 'complete' && (
              <div className="vera-voice-area">
                <textarea
                  className="vera-voice-input"
                  placeholder={isListening ? '🎙️ Listening… speak now' : 'Type or use microphone to respond…'}
                  value={userVoiceInput}
                  onChange={e => setUserVoiceInput(e.target.value)}
                  rows={2}
                />
                <div className="vera-voice-controls">
                  <button
                    className={`vera-mic-btn ${isListening ? 'vera-mic-active' : ''}`}
                    onClick={isListening ? stopListening : startListening}
                    title={isListening ? 'Stop recording' : 'Start voice input'}
                  >
                    {isListening ? <MicOff size={18} /> : <Mic size={18} />}
                  </button>
                  <button
                    className="vera-submit-btn"
                    disabled={!userVoiceInput.trim() || triagePhase === 'loading'}
                    onClick={submitResponse}
                  >
                    Submit Response <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}

            {triagePhase === 'complete' && !summaryReady && (
              <div className="vera-triage-complete">
                <Loader2 size={16} className="vera-spin" /> Generating Responder Summary…
              </div>
            )}
            {triagePhase === 'complete' && summaryReady && (
              <div className="vera-triage-done">
                <CheckCircle2 size={16} /> Triage Complete — Summary Ready
              </div>
            )}
          </div>

          {/* Translation Panel */}
          <div className="vera-emg-card">
            <div className="vera-emg-card-title">
              <Languages size={16} /> Multilingual Translation
              {translationService && (
                <span className="vera-poi-badge">via {translationService}</span>
              )}
            </div>
            <div className="vera-translate-controls">
              <select
                className="vera-lang-select"
                value={sourceLang}
                onChange={e => setSourceLang(e.target.value)}
              >
                <option value="auto">Auto-detect language</option>
                <option value="hi">Hindi (हिन्दी)</option>
                <option value="bn">Bengali (বাংলা)</option>
                <option value="ta">Tamil (தமிழ்)</option>
                <option value="te">Telugu (తెలుగు)</option>
                <option value="mr">Marathi (मराठी)</option>
                <option value="ur">Urdu (اردو)</option>
                <option value="gu">Gujarati (ગુજરાતી)</option>
                <option value="kn">Kannada (ಕನ್ನಡ)</option>
                <option value="pa">Punjabi (ਪੰਜਾਬੀ)</option>
                <option value="ar">Arabic (العربية)</option>
                <option value="fr">French (Français)</option>
                <option value="es">Spanish (Español)</option>
                <option value="zh">Chinese (中文)</option>
              </select>
              <button
                className="vera-translate-btn"
                disabled={!userVoiceInput.trim() && !translatedText}
                onClick={() => handleTranslate(userVoiceInput || complaint.description)}
              >
                {isTranslating ? <Loader2 size={14} className="vera-spin" /> : <Languages size={14} />}
                {isTranslating ? 'Translating…' : 'Translate'}
              </button>
            </div>
            <div className="vera-translate-panels">
              <div className="vera-translate-box">
                <div className="vera-translate-box-label">Original</div>
                <div className="vera-translate-text vera-translate-original">
                  {userVoiceInput || complaint.description}
                </div>
              </div>
              <div className="vera-translate-box">
                <div className="vera-translate-box-label">English (Responders)</div>
                <div className="vera-translate-text vera-translate-result">
                  {translatedText || <span className="vera-translate-placeholder">Translation will appear here…</span>}
                </div>
              </div>
            </div>
          </div>

          {/* Responder Summary */}
          {summaryReady && (
            <div className="vera-emg-card vera-summary-card">
              <div className="vera-emg-card-title">
                <CheckCircle2 size={16} /> Emergency Responder Summary
                <span className="vera-summary-badge">READY</span>
              </div>
              <pre className="vera-summary-text">{responderSummary}</pre>
              <button
                className="vera-sms-copy"
                onClick={() => navigator.clipboard.writeText(responderSummary)}
              >
                <Copy size={13} /> Copy Summary
              </button>
            </div>
          )}

          {generatingSummary && (
            <div className="vera-emg-card">
              <div className="vera-emg-card-title">
                <Loader2 size={14} className="vera-spin" /> Generating Responder Summary…
              </div>
            </div>
          )}

          {/* Incident Timeline */}
          <div className="vera-emg-card">
            <div className="vera-emg-card-title">
              <Clock size={16} /> Incident Timeline
            </div>
            <div className="vera-timeline">
              {timeline.map((entry, i) => (
                <div key={i} className="vera-timeline-entry">
                  <span className="vera-timeline-icon">{entry.icon}</span>
                  <div>
                    <div className="vera-timeline-event">{entry.event}</div>
                    <div className="vera-timeline-time">{entry.time}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
