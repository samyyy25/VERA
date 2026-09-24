import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Radio,
  Mic,
  MicOff,
  Languages,
  Copy,
  Loader2,
  Video,
  MessageSquare,
  Activity,
  CheckCircle2,
  MapPin,
  ChevronDown,
} from 'lucide-react';
import { Complaint, ResponsePlan } from '../../../types';
import {
  fetchComplaints,
  fetchResponsePlan,
  getTriageQuestion,
  generateResponderSummary,
  translateText,
  ChatMessage,
} from '../../../services/api';
import { IncidentIntelligenceCard } from '../../emergency/IncidentIntelligenceCard';
import { ResponsePlanCard } from '../../emergency/ResponsePlanCard';
import { TacticalMap } from '../../emergency/TacticalMap';
import { IncidentTimelineCard } from '../../emergency/IncidentTimelineCard';
import { JitsiRoomModal } from '../../emergency/JitsiRoomModal';
import { supabase } from '../../../lib/supabase';
import { useRole } from '../../../context/RoleContext';

interface ResponseOrchestratorPageProps {
  selectedIncidentId?: string | null;
  onSelectIncident?: (id: string) => void;
}

export const ResponseOrchestratorPage: React.FC<ResponseOrchestratorPageProps> = ({
  selectedIncidentId,
  onSelectIncident,
}) => {
  const { currentRole, currentUserProfile } = useRole();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [responsePlan, setResponsePlan] = useState<ResponsePlan | null>(null);

  // Active Tab: 'plan' | 'triage' | 'video'
  const [activeTab, setActiveTab] = useState<'plan' | 'triage' | 'video'>('plan');

  // AI Triage State
  const [conversationHistory, setConversationHistory] = useState<ChatMessage[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<string>('');
  const [userVoiceInput, setUserVoiceInput] = useState<string>('');
  const [isListening, setIsListening] = useState<boolean>(false);
  const [triageLoading, setTriageLoading] = useState<boolean>(false);

  // Translation State
  const [translatedText, setTranslatedText] = useState<string>('');
  const [isTranslating, setIsTranslating] = useState<boolean>(false);
  const [sourceLang, setSourceLang] = useState<string>('auto');

  // Summary State
  const [responderSummary, setResponderSummary] = useState<string>('');
  const [generatingSummary, setGeneratingSummary] = useState<boolean>(false);
  const [copiedSummary, setCopiedSummary] = useState<boolean>(false);

  // Jitsi Video Coordination Modal
  const [showJitsi, setShowJitsi] = useState<boolean>(false);

  const recognitionRef = useRef<any>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Load complaints
  const loadComplaints = useCallback(async (isPolling = false) => {
    if (!isPolling) setLoading(true);
    try {
      const res = await fetchComplaints();
      if (res.success && res.complaints && res.complaints.length > 0) {
        setComplaints(res.complaints);
        // If no incident selected or selected ID changed, pick the matching one or highest priority
        setSelectedComplaint((prev) => {
          if (selectedIncidentId) {
            const match = res.complaints.find((c) => c.id === selectedIncidentId);
            if (match) return match;
          }
          if (prev) {
            const updated = res.complaints.find((c) => c.id === prev.id);
            if (updated) return updated;
          }
          // Sort by risk_score descending to default to most critical
          const sorted = [...res.complaints].sort((a, b) => (b.risk_score || 0) - (a.risk_score || 0));
          return sorted[0];
        });
      }
    } catch (err) {
      console.warn('Failed to fetch complaints for orchestrator:', err);
    } finally {
      if (!isPolling) setLoading(false);
    }
  }, [selectedIncidentId]);

  useEffect(() => {
    loadComplaints();
    const interval = setInterval(() => loadComplaints(true), 6000);
    return () => clearInterval(interval);
  }, [loadComplaints]);

  // Realtime Supabase listener
  useEffect(() => {
    const client = supabase;
    if (!client) return;
    const channel = client
      .channel('public:orchestrator_complaints')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'complaints' }, () => {
        loadComplaints(true);
      })
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  }, [loadComplaints]);

  // Load Response Plan whenever active complaint changes
  useEffect(() => {
    if (!selectedComplaint) {
      setResponsePlan(null);
      return;
    }

    if (selectedComplaint.response_plan) {
      setResponsePlan(selectedComplaint.response_plan);
    } else {
      fetchResponsePlan(selectedComplaint.id)
        .then((res) => {
          if (res.plan) setResponsePlan(res.plan);
        })
        .catch((err) => console.warn('Could not fetch response plan:', err));
    }

    // Reset Triage history for new incident
    setConversationHistory([]);
    setCurrentQuestion('');
    setResponderSummary('');
  }, [selectedComplaint?.id]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversationHistory, currentQuestion]);

  const handleSelectComplaint = (comp: Complaint) => {
    setSelectedComplaint(comp);
    if (onSelectIncident) {
      onSelectIncident(comp.id);
    }
  };

  const handlePlanUpdated = (updatedComp: Complaint, updatedPlan: ResponsePlan) => {
    setSelectedComplaint(updatedComp);
    setResponsePlan(updatedPlan);
    setComplaints((prev) => prev.map((c) => (c.id === updatedComp.id ? updatedComp : c)));
  };

  // ─── Triage Actions ─────────────────────────────────────────────────────────
  const startTriage = async () => {
    setActiveTab('triage');
    if (!selectedComplaint) return;
    if (conversationHistory.length === 0 && !currentQuestion) {
      setTriageLoading(true);
      try {
        const res = await getTriageQuestion(selectedComplaint.category, selectedComplaint.description, []);
        setCurrentQuestion(res.data.message);
      } catch {
        setCurrentQuestion('Are you or anyone nearby in immediate danger right now?');
      } finally {
        setTriageLoading(false);
      }
    }
  };

  const submitTriageResponse = async () => {
    if (!userVoiceInput.trim() || !selectedComplaint) return;
    const answer = userVoiceInput.trim();
    setUserVoiceInput('');

    const newHistory: ChatMessage[] = [
      ...conversationHistory,
      ...(currentQuestion ? [{ role: 'assistant' as const, content: currentQuestion }] : []),
      { role: 'user' as const, content: answer },
    ];

    setConversationHistory(newHistory);
    setCurrentQuestion('');
    setTriageLoading(true);

    try {
      if (newHistory.filter((m) => m.role === 'user').length >= 3) {
        await handleGenerateSummary(newHistory);
      } else {
        const res = await getTriageQuestion(selectedComplaint.category, selectedComplaint.description, newHistory);
        setCurrentQuestion(res.data.message);
      }
    } catch {
      setCurrentQuestion('Thank you. Can you estimate the number of people impacted or at risk?');
    } finally {
      setTriageLoading(false);
    }
  };

  const handleGenerateSummary = async (history: ChatMessage[]) => {
    if (!selectedComplaint) return;
    setGeneratingSummary(true);
    try {
      const res = await generateResponderSummary(selectedComplaint.category, selectedComplaint.description, history);
      setResponderSummary(res.summary);
    } catch {
      setResponderSummary(`INCIDENT DISPATCH SUMMARY\nCategory: ${selectedComplaint.category}\nLocation: ${selectedComplaint.address || `${selectedComplaint.latitude}, ${selectedComplaint.longitude}`}\nStatus: High Urgency Dispatch Required.`);
    } finally {
      setGeneratingSummary(false);
    }
  };

  const startListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser.');
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = sourceLang === 'auto' ? 'en-US' : sourceLang;
    recognition.interimResults = true;
    recognition.continuous = false;

    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((result: any) => result[0].transcript)
        .join('');
      setUserVoiceInput(transcript);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  };

  const handleTranslate = async (text: string) => {
    if (!text) return;
    setIsTranslating(true);
    try {
      const res = await translateText(text, 'en', sourceLang === 'auto' ? undefined : sourceLang);
      setTranslatedText(res.data.translatedText);
    } catch {
      setTranslatedText(text);
    } finally {
      setIsTranslating(false);
    }
  };

  const copySummary = () => {
    navigator.clipboard.writeText(responderSummary);
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2500);
  };

  if (loading && complaints.length === 0) {
    return (
      <div className="p-12 text-center text-[var(--vera-text-muted)]">
        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-[var(--vera-primary)]" />
        <p className="text-sm font-semibold">Loading VERA Response Orchestrator...</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 text-[var(--vera-text-primary)]">
      {/* ── Top Header & Incident Selector Strip ── */}
      <div className="vera-card p-5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-[#800020] text-[#FFF9F2] border border-[#D45060]/50 shadow-lg shadow-[#800020]/25">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black uppercase tracking-tight text-[var(--vera-text-primary)]">
                  02 · VERA Response Orchestrator
                </h1>
                {selectedComplaint && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-black uppercase bg-[var(--vera-primary-soft)] text-[var(--vera-danger)] border border-[var(--vera-primary-border)]">
                    VR-{selectedComplaint.id.slice(0, 4)}
                  </span>
                )}
              </div>
              <p className="text-xs text-[var(--vera-text-muted)] mt-0.5">
                Multi-agency dispatch orchestration, AI response planning, tactical routing &amp; voice triage
              </p>
            </div>
          </div>
        </div>

        {/* Incident Selector Dropdown & Tab Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Incident Selector */}
          <div className="relative">
            <select
              value={selectedComplaint?.id || ''}
              onChange={(e) => {
                const found = complaints.find((c) => c.id === e.target.value);
                if (found) handleSelectComplaint(found);
              }}
              className="appearance-none vera-input font-semibold text-xs pl-3.5 pr-8 py-2.5 cursor-pointer"
            >
              {complaints.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.risk_level === 'CRITICAL' ? '🚨 ' : ''}
                  {c.category} (Score: {c.risk_score || 0}) — #{c.id.slice(0, 6)}
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-[var(--vera-text-muted)] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Tab Navigation */}
          <div className="vera-card-secondary p-1 flex items-center text-xs">
            <button
              onClick={() => setActiveTab('plan')}
              className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'plan'
                  ? 'bg-[#800020] text-[#FFF9F2] shadow-sm'
                  : 'text-[var(--vera-text-muted)] hover:text-[var(--vera-text-primary)]'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Response Plan</span>
            </button>
            <button
              onClick={startTriage}
              className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'triage'
                  ? 'bg-[#800020] text-[#FFF9F2] shadow-sm'
                  : 'text-[var(--vera-text-muted)] hover:text-[var(--vera-text-primary)]'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Voice Triage</span>
            </button>
            <button
              onClick={() => setShowJitsi(true)}
              className="px-3 py-1.5 rounded-lg font-bold text-[#FFF9F2] bg-[#D45060] hover:bg-[#B83244] border border-[#D45060]/50 transition cursor-pointer flex items-center gap-1.5 shadow-sm"
            >
              <Video className="w-3.5 h-3.5" />
              <span>Live Room</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Active Incident Summary Pill Banner ── */}
      {selectedComplaint && (
        <div className="vera-card-elevated p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[var(--vera-primary-soft)] border border-[var(--vera-primary-border)] text-[var(--brand-primary)] font-bold">
              {selectedComplaint.category}
            </div>
            <div>
              <div className="font-bold text-[var(--vera-text-primary)] line-clamp-1">{selectedComplaint.description}</div>
              <div className="text-[var(--vera-text-muted)] flex items-center gap-1 mt-0.5">
                <MapPin className="w-3 h-3 text-[#D45060] shrink-0" />
                <span className="truncate">{selectedComplaint.address || `${selectedComplaint.latitude.toFixed(4)}, ${selectedComplaint.longitude.toFixed(4)}`}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`px-2.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wider ${
                (selectedComplaint.risk_score || 0) >= 80
                  ? 'vera-badge-critical animate-pulse'
                  : (selectedComplaint.risk_score || 0) >= 60
                  ? 'vera-badge-warning'
                  : 'vera-badge-success'
              }`}
            >
              Risk: {selectedComplaint.risk_score || 0}/100 &bull; {selectedComplaint.risk_level}
            </span>
            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold uppercase vera-card-secondary text-[var(--vera-text-muted)]">
              Status: {selectedComplaint.status}
            </span>
          </div>
        </div>
      )}

      {/* ── Tab Views ── */}
      {selectedComplaint && activeTab === 'plan' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Incident Intelligence & Response Plan (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            <IncidentIntelligenceCard complaint={selectedComplaint} />
            <ResponsePlanCard
              complaint={selectedComplaint}
              plan={responsePlan}
              onPlanUpdated={handlePlanUpdated}
            />
          </div>

          {/* Right: Tactical Multi-Pin Map & Operational Timeline (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-[var(--vera-text-muted)] mb-2 flex items-center justify-between">
                <span>Tactical Multi-Pin Map</span>
                <span className="text-[10px] text-[var(--brand-primary)] font-bold">Real-Time Routing &amp; 250m Perimeter</span>
              </div>
              <TacticalMap complaint={selectedComplaint} plan={responsePlan} height="360px" />
            </div>

            <IncidentTimelineCard complaint={selectedComplaint} />
          </div>
        </div>
      )}

      {selectedComplaint && activeTab === 'triage' && (
        <div className="space-y-4">
          {/* 5-Step Pipeline Badges Matching Canva Template */}
          <div className="vera-card p-4 grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-xs">
            <div className="p-2.5 rounded-xl vera-card-secondary">
              <div className="text-[10px] font-bold text-[var(--vera-text-muted)]">Step 1</div>
              <div className="font-bold mt-0.5 text-[var(--vera-text-primary)]">1 &bull; Capture</div>
              <div className="text-[9px] text-[var(--vera-text-muted)]">Voice or text ingest</div>
            </div>
            <div className="p-2.5 rounded-xl vera-card-secondary">
              <div className="text-[10px] font-bold text-[var(--vera-text-muted)]">Step 2</div>
              <div className="font-bold mt-0.5 text-[var(--vera-text-primary)]">2 &bull; Detect</div>
              <div className="text-[9px] text-[var(--vera-text-muted)]">Language &amp; hazard cues</div>
            </div>
            <div className="p-2.5 rounded-xl vera-card-secondary">
              <div className="text-[10px] font-bold text-[var(--vera-text-muted)]">Step 3</div>
              <div className="font-bold mt-0.5 text-[var(--vera-text-primary)]">3 &bull; Clarify</div>
              <div className="text-[9px] text-[var(--vera-text-muted)]">Necessary Q&amp;A only</div>
            </div>
            <div className="p-2.5 rounded-xl vera-card-secondary">
              <div className="text-[10px] font-bold text-[var(--vera-text-muted)]">Step 4</div>
              <div className="font-bold mt-0.5 text-[var(--vera-text-primary)]">4 &bull; Summarize</div>
              <div className="text-[9px] text-[var(--vera-text-muted)]">Structured packet</div>
            </div>
            <div className="p-2.5 rounded-xl bg-[#800020] text-[#FFF9F2] border border-[#D45060]/50 shadow-md">
              <div className="text-[10px] font-bold text-[#F3E6D5]">Step 5</div>
              <div className="font-bold mt-0.5 text-[#FFF9F2]">5 &bull; Approve</div>
              <div className="text-[9px] text-[#F3E6D5]">Human authority action</div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Triage Q&A Conversation */}
            <div className="lg:col-span-7 vera-card p-5 flex flex-col h-[560px]">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-[var(--vera-border)]">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-[var(--brand-primary)]" />
                  <h3 className="text-sm font-black uppercase tracking-wider text-[var(--vera-text-primary)]">
                    AI Emergency Triage Channel
                  </h3>
                </div>
                <span className="text-xs text-[var(--vera-text-muted)]">Voice Triage Protocol Active</span>
              </div>

              {/* Chat Conversation */}
              <div className="flex-1 overflow-y-auto space-y-3 pr-2 mb-4">
                <div className="vera-card-secondary p-3.5 text-xs">
                  <div className="font-bold text-[var(--brand-primary)] mb-1">VERA DISPATCH INTAKE</div>
                  <p className="text-[var(--vera-text-primary)]">{selectedComplaint.description}</p>
                </div>

                {conversationHistory.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-xl text-xs leading-relaxed max-w-[85%] ${
                      msg.role === 'user'
                        ? 'ml-auto bg-[var(--vera-primary-soft)] border border-[var(--vera-primary-border)] text-[var(--vera-text-primary)]'
                        : 'vera-card-secondary text-[var(--vera-text-primary)]'
                    }`}
                  >
                    <div className="font-bold text-[10px] uppercase tracking-wider mb-1 text-[var(--vera-text-muted)]">
                      {msg.role === 'user' ? 'Victim / Citizen' : 'VERA Triage Assistant'}
                    </div>
                    {msg.content}
                  </div>
                ))}

                {triageLoading && (
                  <div className="flex items-center gap-2 text-xs text-[var(--vera-text-muted)] p-2">
                    <Loader2 className="w-4 h-4 animate-spin text-[var(--brand-primary)]" />
                    <span>Analyzing statement &amp; generating triage prompt...</span>
                  </div>
                )}

                {currentQuestion && !triageLoading && (
                  <div className="bg-[var(--vera-primary-soft)] border border-[var(--vera-primary-border)] rounded-xl p-3.5 text-xs animate-fade-in shadow-lg">
                    <div className="font-bold text-[var(--brand-primary)] mb-1 flex items-center gap-1.5">
                      <Radio className="w-3.5 h-3.5 animate-pulse text-[#D45060]" />
                      VERA AI TRIAGE PROMPT
                    </div>
                    <p className="text-sm text-[var(--vera-text-primary)] font-semibold">{currentQuestion}</p>
                  </div>
                )}

                <div ref={chatEndRef} />
              </div>

              {/* Input & Voice Controls */}
              <div className="pt-3 border-t border-[var(--vera-border)]">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={userVoiceInput}
                    onChange={(e) => setUserVoiceInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && submitTriageResponse()}
                    placeholder="Speak or type response for responders..."
                    className="flex-1 vera-input text-xs"
                  />

                  <button
                    onClick={isListening ? stopListening : startListening}
                    className={`p-2.5 rounded-xl border transition cursor-pointer flex items-center justify-center ${
                      isListening
                        ? 'bg-[#D45060] border-[#D45060] text-[#FFF9F2] animate-pulse'
                        : 'vera-card-secondary text-[var(--brand-primary)] hover:bg-[var(--vera-primary-soft)]'
                    }`}
                    title={isListening ? 'Stop recording' : 'Speak response'}
                  >
                    {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  </button>

                  <button
                    onClick={submitTriageResponse}
                    disabled={!userVoiceInput.trim()}
                    className="vera-button-primary text-xs uppercase tracking-wider disabled:opacity-50"
                  >
                    Send
                  </button>
                </div>
              </div>
            </div>

            {/* Right Column: Responder Summary & Translations */}
            <div className="lg:col-span-5 space-y-5">
              {/* Multilingual Translation */}
              <div className="vera-card p-4">
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-[var(--vera-border)]">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--vera-text-primary)]">
                    <Languages className="w-4 h-4 text-[var(--brand-primary)]" /> Multilingual Audio / Text Ingest
                  </div>
                  <select
                    value={sourceLang}
                    onChange={(e) => setSourceLang(e.target.value)}
                    className="vera-input py-1 px-2 text-[11px]"
                  >
                    <option value="auto">Auto Detect</option>
                    <option value="hi">हिन्दी (Hindi)</option>
                    <option value="as">অসমীয়া (Assamese)</option>
                    <option value="bn">বাংলা (Bengali)</option>
                    <option value="ta">தமிழ் (Tamil)</option>
                    <option value="te">తెలుగు (Telugu)</option>
                    <option value="en">English</option>
                  </select>
                </div>

                <div className="text-xs text-[var(--vera-text-muted)]">
                  <button
                    onClick={() => handleTranslate(userVoiceInput || selectedComplaint.description)}
                    disabled={isTranslating}
                    className="w-full py-2 vera-button-secondary text-xs font-bold mb-2 transition"
                  >
                    {isTranslating ? 'Translating to English...' : 'Translate to English Dispatch'}
                  </button>
                  {translatedText && (
                    <div className="vera-card-secondary p-3 leading-relaxed text-xs text-[var(--vera-text-primary)]">
                      {translatedText}
                    </div>
                  )}
                </div>
              </div>

              {/* Responder Summary Card */}
              <div className="vera-card p-5">
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-[var(--vera-border)]">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--vera-text-primary)]">
                    Live Dispatch Summary Packet
                  </h4>
                  {responderSummary && (
                    <button
                      onClick={copySummary}
                      className="text-xs text-[var(--brand-primary)] hover:underline flex items-center gap-1 font-semibold cursor-pointer"
                    >
                      {copiedSummary ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedSummary ? 'Copied' : 'Copy Packet'}
                    </button>
                  )}
                </div>

                {generatingSummary ? (
                  <div className="py-8 text-center text-xs text-[var(--vera-text-muted)]">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-[var(--brand-primary)]" />
                    Generating operational dispatch briefing...
                  </div>
                ) : responderSummary ? (
                  <div className="vera-card-secondary p-3.5 text-xs text-[var(--vera-text-primary)] leading-relaxed font-mono whitespace-pre-line">
                    {responderSummary}
                  </div>
                ) : (
                  <div className="py-6 text-center text-xs text-[var(--vera-text-muted)]">
                    Complete 3 triage prompts or tap below to generate an operational briefing packet.
                  </div>
                )}

                {!generatingSummary && (
                  <button
                    onClick={() => handleGenerateSummary(conversationHistory)}
                    className="w-full mt-3 py-2.5 vera-button-primary text-xs font-bold transition"
                  >
                    Generate Dispatch Briefing
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Embedded Jitsi Room Modal */}
      {showJitsi && selectedComplaint && (
        <JitsiRoomModal
          roomName={`vera-incident-${selectedComplaint.id.slice(0, 8)}`}
          incidentTitle={`${selectedComplaint.category} (Risk ${selectedComplaint.risk_score}/100)`}
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
          onClose={() => setShowJitsi(false)}
        />
      )}
    </div>
  );
};
