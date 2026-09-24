import React, { useState, useEffect, useRef } from 'react';
import { Complaint, ResponsePlan } from '../../types';
import {
  Mic,
  MicOff,
  Languages,
  Radio,
  Copy,
  Loader2,
  Video,
  X,
  MessageSquare,
  Activity,
  CheckCircle2,
} from 'lucide-react';
import {
  getTriageQuestion,
  generateResponderSummary,
  translateText,
  ChatMessage,
  fetchResponsePlan,
} from '../../services/api';
import { IncidentIntelligenceCard } from './IncidentIntelligenceCard';
import { ResponsePlanCard } from './ResponsePlanCard';
import { TacticalMap } from './TacticalMap';
import { IncidentTimelineCard } from './IncidentTimelineCard';
import { LiveIncidentUpdates } from './LiveIncidentUpdates';
import { JitsiRoomModal } from './JitsiRoomModal';

interface EmergencyResponseProps {
  complaint: Complaint;
  onClose: () => void;
  onComplaintUpdated?: (complaint: Complaint) => void;
}

export const EmergencyResponse: React.FC<EmergencyResponseProps> = ({
  complaint: initialComplaint,
  onClose,
  onComplaintUpdated,
}) => {
  const [complaint, setComplaint] = useState<Complaint>(initialComplaint);
  const [responsePlan, setResponsePlan] = useState<ResponsePlan | null>(
    initialComplaint.response_plan || null
  );

  // Active View Tab: 'orchestrator' | 'updates' | 'triage'
  const [activeTab, setActiveTab] = useState<'orchestrator' | 'updates' | 'triage'>('orchestrator');

  // AI Triage State
  const [conversationHistory, setConversationHistory] = useState<ChatMessage[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [userVoiceInput, setUserVoiceInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [triageLoading, setTriageLoading] = useState(false);

  // Translation State
  const [translatedText, setTranslatedText] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [sourceLang, setSourceLang] = useState('auto');

  // Summary State
  const [responderSummary, setResponderSummary] = useState('');
  const [generatingSummary, setGeneratingSummary] = useState(false);
  const [copiedSummary, setCopiedSummary] = useState(false);

  // Jitsi Video Modal
  const [showJitsi, setShowJitsi] = useState(false);

  const recognitionRef = useRef<any>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // ─── Fetch or Generate Response Plan on Mount ──────────────────────────────
  useEffect(() => {
    if (!responsePlan) {
      fetchResponsePlan(complaint.id)
        .then(res => {
          if (res.plan) {
            setResponsePlan(res.plan);
          }
        })
        .catch(err => console.warn('Could not load existing response plan:', err));
    }
  }, [complaint.id]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversationHistory, currentQuestion]);

  // ─── Triage Questions ───────────────────────────────────────────────────────
  const startTriage = async () => {
    setActiveTab('triage');
    if (conversationHistory.length === 0 && !currentQuestion) {
      setTriageLoading(true);
      try {
        const res = await getTriageQuestion(complaint.category, complaint.description, []);
        setCurrentQuestion(res.data.message);
      } catch {
        setCurrentQuestion('Are you or anyone nearby in immediate danger right now?');
      } finally {
        setTriageLoading(false);
      }
    }
  };

  const submitTriageResponse = async () => {
    if (!userVoiceInput.trim()) return;

    const userMsg: ChatMessage = { role: 'user', content: userVoiceInput };
    const assistantMsg: ChatMessage = { role: 'assistant', content: currentQuestion };
    const newHistory = [...conversationHistory, assistantMsg, userMsg];

    setConversationHistory(newHistory);
    setUserVoiceInput('');
    setCurrentQuestion('');

    if (newHistory.filter(m => m.role === 'user').length >= 3) {
      handleGenerateSummary(newHistory);
    } else {
      setTriageLoading(true);
      try {
        const res = await getTriageQuestion(complaint.category, complaint.description, newHistory);
        setCurrentQuestion(res.data.message);
      } catch {
        setCurrentQuestion('Is anyone injured or in need of an ambulance?');
      } finally {
        setTriageLoading(false);
      }
    }
  };

  const handleGenerateSummary = async (history: ChatMessage[]) => {
    setGeneratingSummary(true);
    try {
      const res = await generateResponderSummary(
        complaint.category,
        complaint.description,
        history,
        complaint.address || undefined
      );
      setResponderSummary(res.summary);
    } catch {
      setResponderSummary(
        `INCIDENT SUMMARY: ${complaint.category} reported at ${complaint.address || 'GPS Coordinates'}. Urgency: ${
          complaint.risk_score
        }/100. Emergency units dispatched.`
      );
    } finally {
      setGeneratingSummary(false);
    }
  };

  // ─── Voice Input Handler ───────────────────────────────────────────────────
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

  // ─── Translation Handler ───────────────────────────────────────────────────
  const handleTranslate = async (text: string) => {
    if (!text.trim()) return;
    setIsTranslating(true);
    try {
      const res = await translateText(text, 'en', sourceLang);
      setTranslatedText(res.data.translatedText);
    } catch {
      setTranslatedText(text);
    } finally {
      setIsTranslating(false);
    }
  };

  const copySummary = () => {
    if (!responderSummary) return;
    navigator.clipboard.writeText(responderSummary);
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2500);
  };

  const handlePlanUpdated = (updatedComp: Complaint, updatedPlan: ResponsePlan) => {
    setComplaint(updatedComp);
    setResponsePlan(updatedPlan);
    if (onComplaintUpdated) {
      onComplaintUpdated(updatedComp);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#090e13]/95 backdrop-blur-md p-3 sm:p-6 text-[#edf5f2] flex flex-col">
      {/* Top Banner Navigation Matching Canva Template */}
      <div className="max-w-7xl w-full mx-auto flex items-center justify-between pb-4 mb-4 border-b border-[#172329]">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-[#152a27] text-[#2bb59a] border border-[#0f5c4a] animate-pulse">
            <Radio className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-[#edf5f2] tracking-tight">
                VERA Response Orchestrator
              </h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-[#101a20] text-[#91a39e] border border-[#172329]">
                02 · VR-{complaint.id.slice(0, 4)}
              </span>
            </div>
            <p className="text-xs text-[#91a39e]">Hazard assessment, AI voice triage, and multi-agency response coordination</p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* View Mode Toggle */}
          <div className="bg-[#101a20] border border-[#172329] rounded-xl p-1 flex items-center text-xs">
            <button
              onClick={() => setActiveTab('orchestrator')}
              className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'orchestrator'
                  ? 'bg-[#0f5c4a] text-white shadow-sm'
                  : 'text-[#91a39e] hover:text-[#edf5f2]'
              }`}
            >
              <Activity className="w-3.5 h-3.5" /> Response Plan
            </button>
            <button
              onClick={() => setActiveTab('updates')}
              className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'updates'
                  ? 'bg-[#0f5c4a] text-white shadow-sm'
                  : 'text-[#91a39e] hover:text-[#edf5f2]'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Live Updates</span>
              {complaint.updates && complaint.updates.length > 0 && (
                <span className="px-1.5 py-0.2 text-[9px] rounded-full bg-[#152a27] text-[#6ee7b7] border border-[#0f5c4a]">
                  {complaint.updates.length}
                </span>
              )}
            </button>
            <button
              onClick={startTriage}
              className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'triage'
                  ? 'bg-[#0f5c4a] text-white shadow-sm'
                  : 'text-[#91a39e] hover:text-[#edf5f2]'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" /> Voice Triage
            </button>
          </div>

          {/* Jitsi Video Coordination Room */}
          <button
            onClick={() => setShowJitsi(true)}
            className="px-3 py-2 rounded-xl bg-[#3b2024] hover:bg-[#532326] border border-[#ef6464]/40 text-[#ffaaa8] font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-md"
          >
            <Video className="w-4 h-4 text-[#ffaaa8]" />
            <span className="hidden sm:inline">Live Room</span>
          </button>

          {/* Close Modal */}
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-[#101a20] hover:bg-[#172329] border border-[#172329] text-[#91a39e] hover:text-[#edf5f2] transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl w-full mx-auto flex-1">
        {activeTab === 'orchestrator' ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Incident Intelligence & Response Plan (7 cols) */}
            <div className="lg:col-span-7 space-y-6">
              <IncidentIntelligenceCard complaint={complaint} />
              <ResponsePlanCard
                complaint={complaint}
                plan={responsePlan}
                onPlanUpdated={handlePlanUpdated}
              />
            </div>

            {/* Right Column: Tactical Live Map & Operational Timeline (5 cols) */}
            <div className="lg:col-span-5 space-y-6">
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-[#91a39e] mb-2 flex items-center justify-between">
                  <span>Tactical Multi-Pin Map</span>
                  <span className="text-[10px] text-[#2bb59a] font-normal">Real-Time Routing &amp; ETAs</span>
                </div>
                <TacticalMap complaint={complaint} plan={responsePlan} height="360px" />
              </div>

              <IncidentTimelineCard complaint={complaint} />
            </div>
          </div>
        ) : activeTab === 'updates' ? (
          /* Live Incident Updates Feed & Activity Hub */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Full Interactive Live Feed (7 cols) */}
            <div className="lg:col-span-7 space-y-4">
              <LiveIncidentUpdates
                complaint={complaint}
                onUpdateAdded={(updated) => {
                  setComplaint(updated);
                  if (onComplaintUpdated) onComplaintUpdated(updated);
                }}
              />
            </div>

            {/* Right: Tactical Context & Summary (5 cols) */}
            <div className="lg:col-span-5 space-y-5">
              <IncidentIntelligenceCard complaint={complaint} />
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-[#91a39e] mb-2 flex items-center justify-between">
                  <span>Incident Scene Location</span>
                  <span className="text-[10px] text-[#2bb59a] font-mono">
                    {complaint.latitude?.toFixed(4)}, {complaint.longitude?.toFixed(4)}
                  </span>
                </div>
                <TacticalMap complaint={complaint} plan={responsePlan} height="300px" />
              </div>
            </div>
          </div>
        ) : (
          /* Voice Triage & AI Dispatcher View */
          <div className="space-y-4">
            {/* 5-Step Pipeline Badges Matching Canva Template */}
            <div className="bg-[#101a20] rounded-2xl p-4 border border-[#172329] grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-xs">
              <div className="p-2.5 rounded-xl bg-[#0d151a] border border-[#20312f] text-[#6ee7b7]">
                <div className="text-[10px] font-bold text-[#91a39e]">Step 1</div>
                <div className="font-bold mt-0.5">1 &bull; Capture</div>
                <div className="text-[9px] text-[#7f938d]">Voice or text ingest</div>
              </div>
              <div className="p-2.5 rounded-xl bg-[#0d151a] border border-[#20312f] text-[#6ee7b7]">
                <div className="text-[10px] font-bold text-[#91a39e]">Step 2</div>
                <div className="font-bold mt-0.5">2 &bull; Detect</div>
                <div className="text-[9px] text-[#7f938d]">Language &amp; hazard cues</div>
              </div>
              <div className="p-2.5 rounded-xl bg-[#0d151a] border border-[#20312f] text-[#6ee7b7]">
                <div className="text-[10px] font-bold text-[#91a39e]">Step 3</div>
                <div className="font-bold mt-0.5">3 &bull; Clarify</div>
                <div className="text-[9px] text-[#7f938d]">Necessary Q&amp;A only</div>
              </div>
              <div className="p-2.5 rounded-xl bg-[#0d151a] border border-[#20312f] text-[#6ee7b7]">
                <div className="text-[10px] font-bold text-[#91a39e]">Step 4</div>
                <div className="font-bold mt-0.5">4 &bull; Summarize</div>
                <div className="text-[9px] text-[#7f938d]">Structured packet</div>
              </div>
              <div className="p-2.5 rounded-xl bg-[#0d151a] border border-[#0f5c4a] text-[#2bb59a]">
                <div className="text-[10px] font-bold text-[#91a39e]">Step 5</div>
                <div className="font-bold mt-0.5">5 &bull; Approve</div>
                <div className="text-[9px] text-[#7f938d]">Human authority action</div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Triage Q&A Conversation */}
              <div className="lg:col-span-7 bg-[#101a20] border border-[#172329] rounded-2xl p-5 flex flex-col h-[560px]">
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#172329]">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-[#2bb59a]" />
                    <h3 className="text-sm font-black uppercase tracking-wider text-[#edf5f2]">
                      AI Emergency Triage Channel
                    </h3>
                  </div>
                  <span className="text-xs text-[#91a39e]">Voice Triage Protocol Active</span>
                </div>

                {/* Chat Conversation */}
                <div className="flex-1 overflow-y-auto space-y-3 pr-2 mb-4">
                  <div className="bg-[#0d151a] border border-[#172329] rounded-xl p-3.5 text-xs text-[#edf5f2]">
                    <div className="font-bold text-[#2bb59a] mb-1">VERA DISPATCH INTAKE</div>
                    {complaint.description}
                  </div>

                  {conversationHistory.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-xl text-xs leading-relaxed max-w-[85%] ${
                        msg.role === 'user'
                          ? 'ml-auto bg-[#152a27] border border-[#0f5c4a] text-[#eaf8f4]'
                          : 'bg-[#0d151a] border border-[#172329] text-[#edf5f2]'
                      }`}
                    >
                      <div className="font-bold text-[10px] uppercase tracking-wider mb-1 text-[#91a39e]">
                        {msg.role === 'user' ? 'Victim / Citizen' : 'VERA Triage Assistant'}
                      </div>
                      {msg.content}
                    </div>
                  ))}

                  {triageLoading && (
                    <div className="flex items-center gap-2 text-xs text-[#91a39e] p-2">
                      <Loader2 className="w-4 h-4 animate-spin text-[#2bb59a]" />
                      <span>Analyzing statement &amp; generating triage prompt...</span>
                    </div>
                  )}

                  {currentQuestion && !triageLoading && (
                    <div className="bg-[#152a27] border border-[#0f5c4a] rounded-xl p-3.5 text-xs text-[#edf5f2] animate-fade-in shadow-lg">
                      <div className="font-bold text-[#2bb59a] mb-1 flex items-center gap-1.5">
                        <Radio className="w-3.5 h-3.5 animate-pulse text-[#2bb59a]" />
                        VERA AI TRIAGE PROMPT
                      </div>
                      <p className="text-sm text-[#edf5f2] font-medium">{currentQuestion}</p>
                    </div>
                  )}

                  <div ref={chatEndRef} />
                </div>

                {/* Input & Voice Controls */}
                <div className="pt-3 border-t border-[#172329]">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={userVoiceInput}
                      onChange={e => setUserVoiceInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && submitTriageResponse()}
                      placeholder="Speak or type response for responders..."
                      className="flex-1 bg-[#0d151a] border border-[#172329] rounded-xl px-3.5 py-2.5 text-xs text-[#edf5f2] placeholder-[#7f938d] focus:outline-none focus:border-[#2bb59a]"
                    />

                    <button
                      onClick={isListening ? stopListening : startListening}
                      className={`p-2.5 rounded-xl border transition cursor-pointer flex items-center justify-center ${
                        isListening
                          ? 'bg-[#ef6464] border-[#ef6464] text-white animate-pulse'
                          : 'bg-[#152a27] border-[#0f5c4a] text-[#2bb59a] hover:bg-[#1a3834]'
                      }`}
                      title={isListening ? 'Stop recording' : 'Speak response'}
                    >
                      {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                    </button>

                    <button
                      onClick={submitTriageResponse}
                      disabled={!userVoiceInput.trim()}
                      className="px-4 py-2.5 bg-[#0f5c4a] hover:bg-[#14745e] disabled:opacity-50 text-white text-xs font-bold rounded-xl uppercase tracking-wider transition cursor-pointer"
                    >
                      Send
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Column: Responder Summary & Translations */}
              <div className="lg:col-span-5 space-y-5">
                {/* Multilingual Translation */}
                <div className="bg-[#101a20] border border-[#172329] rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#172329]">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#edf5f2]">
                      <Languages className="w-4 h-4 text-[#2bb59a]" /> Multilingual Audio / Text Ingest
                    </div>
                    <select
                      value={sourceLang}
                      onChange={e => setSourceLang(e.target.value)}
                      className="bg-[#0d151a] border border-[#172329] rounded-lg px-2 py-1 text-[11px] text-[#edf5f2] focus:outline-none"
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

                  <div className="text-xs text-[#91a39e]">
                    <button
                      onClick={() => handleTranslate(userVoiceInput || complaint.description)}
                      disabled={isTranslating}
                      className="w-full py-2 bg-[#152a27] hover:bg-[#1a3834] border border-[#0f5c4a] rounded-xl text-[#2bb59a] text-xs font-bold mb-2 transition cursor-pointer"
                    >
                      {isTranslating ? 'Translating to English...' : 'Translate to English Dispatch'}
                    </button>
                    {translatedText && (
                      <div className="bg-[#0d151a] p-3 rounded-xl border border-[#172329] text-[#edf5f2] leading-relaxed text-xs">
                        {translatedText}
                      </div>
                    )}
                  </div>
                </div>

                {/* Responder Summary Card */}
                <div className="bg-[#101a20] border border-[#172329] rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#172329]">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#edf5f2]">
                      Live Dispatch Summary Packet
                    </h4>
                    {responderSummary && (
                      <button
                        onClick={copySummary}
                        className="text-xs text-[#2bb59a] hover:text-[#6ee7b7] flex items-center gap-1 font-semibold cursor-pointer"
                      >
                        {copiedSummary ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        {copiedSummary ? 'Copied' : 'Copy Packet'}
                      </button>
                    )}
                  </div>

                  {generatingSummary ? (
                    <div className="py-8 text-center text-xs text-[#91a39e]">
                      <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-[#2bb59a]" />
                      Generating operational dispatch briefing...
                    </div>
                  ) : responderSummary ? (
                    <div className="bg-[#0d151a] p-3.5 rounded-xl border border-[#172329] text-xs text-[#edf5f2] leading-relaxed font-mono whitespace-pre-line">
                      {responderSummary}
                    </div>
                  ) : (
                    <div className="py-6 text-center text-xs text-[#7f938d]">
                      Complete 3 triage prompts or tap below to generate an operational briefing packet.
                    </div>
                  )}

                  {!generatingSummary && (
                    <button
                      onClick={() => handleGenerateSummary(conversationHistory)}
                      className="w-full mt-3 py-2 bg-[#152a27] hover:bg-[#1a3834] border border-[#0f5c4a] rounded-xl text-xs font-bold text-[#2bb59a] transition cursor-pointer"
                    >
                      Generate Dispatch Briefing
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Embedded Jitsi Live Room Modal */}
      {showJitsi && (
        <JitsiRoomModal
          roomName={`vera-incident-${complaint.id.slice(0, 8)}`}
          incidentTitle={`${complaint.category} (${complaint.risk_level})`}
          onClose={() => setShowJitsi(false)}
        />
      )}
    </div>
  );
};
