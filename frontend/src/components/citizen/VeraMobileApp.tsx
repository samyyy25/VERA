import React, { useState, useEffect, useRef } from 'react';
import {
  Phone,
  Shield,
  MapPin,
  Camera,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  ChevronDown,
  Sparkles,
  FileText,
  User,
  Bell,
  HelpCircle,
  Info,
  Lock,
  LogOut,
  Mic,
  MicOff,
  ArrowLeft,
  Hospital,
  ShieldCheck,
  Flame,
  Check,
  Maximize2,
  Smartphone,
  Layers,
  Loader2,
  Trash2,
  Lightbulb,
  Droplets,
  Construction,
  MoreHorizontal
} from 'lucide-react';
import { submitComplaint } from '../../services/api';
import { Complaint, CreateComplaintInput } from '../../types';

export type MobileScreen =
  | 'splash'
  | 'home'
  | 'emergency_call'
  | 'live_location'
  | 'civic_report'
  | 'ai_analysis'
  | 'response_plan'
  | 'active_map'
  | 'incident_timeline'
  | 'my_reports'
  | 'profile';

interface Props {
  onNavigateToDashboard?: () => void;
  initialScreen?: MobileScreen;
}

export const VeraMobileApp: React.FC<Props> = ({
  onNavigateToDashboard,
  initialScreen = 'home',
}) => {
  const [currentScreen, setCurrentScreen] = useState<MobileScreen>(initialScreen);
  const [deviceFrame, setDeviceFrame] = useState<boolean>(true);

  // Form State
  const [category, setCategory] = useState<string>('Road Damage');
  const [description, setDescription] = useState<string>('');
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [locationName] = useState<string>('Hazratganj, Lucknow, UP');
  const [coords, setCoords] = useState<{ lat: number; lng: number }>({
    lat: 26.8467,
    lng: 80.9462,
  });
  const [gpsAccuracy, setGpsAccuracy] = useState<number>(12);

  // Active Incident / Demo Data state
  const [activeIncident, setActiveIncident] = useState<Partial<Complaint>>({
    id: 'VERA-10482',
    category: 'Accident',
    description: 'Car collided with motorcycle, severe head bleeding and person unconscious',
    risk_score: 94,
    risk_level: 'CRITICAL',
    status: 'Critical Incident',
    latitude: 26.8467,
    longitude: 80.9462,
    gps_accuracy: 12,
    created_at: new Date().toISOString(),
    incident_intelligence: {
      incident_type: 'Road Accident',
      severity: 'CRITICAL',
      risk_score: 94,
      confidence_score: 91,
      people_affected_estimate: '2+',
      possible_injury: true,
      location_confirmed: true,
      recommended_action: 'Immediate emergency escalation & trauma dispatch',
      decision_factors: [
        'Accident detected',
        'Possible injury mentioned',
        'Immediate danger indicated',
        'Location available',
      ],
    },
    response_plan: {
      incident_id: 'VERA-10482',
      priority: 'CRITICAL',
      primary_response: {
        id: 'unit_hosp_1',
        type: 'hospital',
        name: 'City Civil Hospital',
        distance_km: 1.8,
        estimated_eta_minutes: 7,
        is_estimate: true,
        phone: '0522-2621001',
        directions_url: 'https://maps.google.com',
        latitude: 26.851,
        longitude: 80.949,
        status: 'Alerted',
      },
      secondary_response: {
        id: 'unit_pol_1',
        type: 'police',
        name: 'Sector 4 Police Post',
        distance_km: 2.1,
        estimated_eta_minutes: 8,
        is_estimate: true,
        phone: '112',
        directions_url: 'https://maps.google.com',
        latitude: 26.841,
        longitude: 80.942,
        status: 'Alerted',
      },
      all_responders: [],
      recommended_action: 'Dispatch medical response and notify nearest police unit.',
      human_confirmation_required: true,
      confirmation_status: 'PENDING_CONFIRMATION',
      responder_status: {
        police: 'Alerted',
        hospital: 'Alerted',
        ambulance: 'En route',
        citizen: 'Safe / Awaiting assistance',
      },
      created_at: new Date().toISOString(),
    },
    operational_timeline: [
      { timestamp: '11:42:03', event: 'Voice report ingested (Hindi → English)', actor: 'VERA Speech AI' },
      { timestamp: '11:42:05', event: 'AI analysis completed (Risk: 94/100 | Confidence: 91%)', actor: 'VERA Risk Engine' },
      { timestamp: '11:42:06', event: 'Decision factors recorded (4 factors)', actor: 'Explainable AI' },
      { timestamp: '11:42:08', event: 'Duplicate check completed (Unique incident)', actor: 'Spatial Engine' },
      { timestamp: '11:42:10', event: 'Location verified (Accuracy: ±12 m)', actor: 'GPS Subsystem' },
      { timestamp: '11:42:12', event: 'Nearby services identified (Hospital + Police)', actor: 'Overpass OSM' },
      { timestamp: '11:42:14', event: 'Response plan generated (ETA: 7 min)', actor: 'VERA Orchestrator' },
      { timestamp: '11:42:16', event: 'Human review requested (Dispatcher notified)', actor: 'Control Room' },
    ],
  });

  // Toggles for Profile Settings
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [locationSharingEnabled, setLocationSharingEnabled] = useState(true);
  const [reportsFilter, setReportsFilter] = useState<'all' | 'active' | 'resolved'>('all');
  const [callDuration, setCallDuration] = useState(0);

  // File input ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get real location on mount if available
  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        pos => {
          setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setGpsAccuracy(Math.round(pos.coords.accuracy || 12));
        },
        () => {},
        { enableHighAccuracy: true, timeout: 5000 }
      );
    }
  }, []);

  // Emergency Call Timer
  useEffect(() => {
    let interval: any;
    if (currentScreen === 'emergency_call') {
      interval = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    } else {
      setCallDuration(0);
    }
    return () => clearInterval(interval);
  }, [currentScreen]);

  // Handle Speech-to-Text
  const toggleSpeechRecognition = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Speech recognition is not supported in this browser. Please type your message.');
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    try {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => setIsListening(true);
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setDescription(prev => (prev ? `${prev} ${transcript}` : transcript));
        setIsListening(false);
      };
      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);

      recognition.start();
    } catch {
      setIsListening(false);
    }
  };

  // Handle File Upload
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle Civic Submission
  const handleSubmitCivicReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      alert('Please describe the issue or speak using the microphone.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: CreateComplaintInput = {
        category,
        description,
        latitude: coords.lat,
        longitude: coords.lng,
        gps_accuracy: gpsAccuracy,
        device_session_id: `device_${Date.now()}`,
      };

      const res = await submitComplaint(payload);
      if (res?.complaint) {
        setActiveIncident(res.complaint);
        if (res.complaint.risk_level === 'CRITICAL' || (res.complaint.risk_score && res.complaint.risk_score >= 60)) {
          setCurrentScreen('ai_analysis');
        } else {
          setCurrentScreen('my_reports');
        }
      } else {
        setCurrentScreen('ai_analysis');
      }
    } catch {
      // Offline / fallback demo simulation
      setCurrentScreen('ai_analysis');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Trigger SOS Emergency Call
  const triggerEmergencySOS = () => {
    setCurrentScreen('emergency_call');
  };

  // 6 Civic Categories from UI Kit
  const civicCategories = [
    { id: 'Road Damage', label: 'Road Damage', icon: Construction },
    { id: 'Streetlight', label: 'Streetlight', icon: Lightbulb },
    { id: 'Garbage', label: 'Garbage', icon: Trash2 },
    { id: 'Water Leakage', label: 'Water Leakage', icon: Droplets },
    { id: 'Broken Infrastructure', label: 'Broken Infrastructure', icon: AlertTriangle },
    { id: 'Other', label: 'Other', icon: MoreHorizontal },
  ];

  // Demo Reports List from Template
  const sampleReports = [
    {
      id: 'VERA-10482',
      title: 'Road Accident',
      severity: 'Critical',
      time: '2 hours ago',
      color: 'bg-[#C62828] text-white',
      badge: 'Critical',
      icon: Flame,
    },
    {
      id: 'VERA-10481',
      title: 'Streetlight Issue',
      severity: 'Medium',
      time: '1 day ago',
      color: 'bg-amber-500 text-white',
      badge: 'Medium',
      icon: Lightbulb,
    },
    {
      id: 'VERA-10480',
      title: 'Garbage Collection',
      severity: 'Low',
      time: '2 days ago',
      color: 'bg-emerald-600 text-white',
      badge: 'Low',
      icon: Trash2,
    },
    {
      id: 'VERA-10479',
      title: 'Water Leakage',
      severity: 'High',
      time: '3 days ago',
      color: 'bg-[#C62828] text-white',
      badge: 'High',
      icon: Droplets,
    },
    {
      id: 'VERA-10478',
      title: 'Road Damage',
      severity: 'Medium',
      time: '4 days ago',
      color: 'bg-amber-500 text-white',
      badge: 'Medium',
      icon: Construction,
    },
  ];

  // Screen Navigator Bar (for prototyping / showcase)
  const screensList: { id: MobileScreen; label: string }[] = [
    { id: 'splash', label: '1. Splash' },
    { id: 'home', label: '2. Home' },
    { id: 'emergency_call', label: '3. Emergency Call' },
    { id: 'live_location', label: '4. Location Map' },
    { id: 'civic_report', label: '5. Report Issue' },
    { id: 'ai_analysis', label: '6. AI Analysis' },
    { id: 'response_plan', label: '7. Response Plan' },
    { id: 'active_map', label: '8. Incident Map' },
    { id: 'incident_timeline', label: '9. Timeline' },
    { id: 'my_reports', label: '10. My Reports' },
    { id: 'profile', label: '11. Profile' },
  ];

  // Bottom Navigation Component
  const renderBottomNav = (activeTab: 'home' | 'reports' | 'sos' | 'help' | 'profile') => (
    <div className="bg-white border-t border-slate-200 px-6 py-2.5 flex items-center justify-between relative shadow-[0_-4px_12px_rgba(0,0,0,0.04)] z-30">
      <button
        onClick={() => setCurrentScreen('home')}
        className={`flex flex-col items-center gap-1 ${
          activeTab === 'home' ? 'text-[#0F5C4A] font-bold' : 'text-[#71817C]'
        }`}
      >
        <Shield className="w-5 h-5" />
        <span className="text-[10px]">Home</span>
      </button>

      <button
        onClick={() => setCurrentScreen('my_reports')}
        className={`flex flex-col items-center gap-1 ${
          activeTab === 'reports' ? 'text-[#0F5C4A] font-bold' : 'text-[#71817C]'
        }`}
      >
        <FileText className="w-5 h-5" />
        <span className="text-[10px]">Reports</span>
      </button>

      {/* Floating Center SOS Button */}
      <div className="relative -top-5 flex flex-col items-center">
        <button
          onClick={triggerEmergencySOS}
          className="rounded-full bg-[#C62828] text-white flex items-center justify-center shadow-lg shadow-red-500/40 transform hover:scale-105 active:scale-95 transition"
          style={{ width: '52px', height: '52px' }}
        >
          <Phone className="w-6 h-6 fill-white" />
        </button>
        <span className="text-[9px] font-bold text-[#C62828] mt-1">SOS</span>
      </div>

      <button
        onClick={() => setCurrentScreen('live_location')}
        className={`flex flex-col items-center gap-1 ${
          activeTab === 'help' ? 'text-[#0F5C4A] font-bold' : 'text-[#71817C]'
        }`}
      >
        <HelpCircle className="w-5 h-5" />
        <span className="text-[10px]">Help</span>
      </button>

      <button
        onClick={() => setCurrentScreen('profile')}
        className={`flex flex-col items-center gap-1 ${
          activeTab === 'profile' ? 'text-[#0F5C4A] font-bold' : 'text-[#71817C]'
        }`}
      >
        <User className="w-5 h-5" />
        <span className="text-[10px]">Profile</span>
      </button>
    </div>
  );

  return (
    <div className="min-h-full w-full flex flex-col items-center justify-center p-2 sm:p-6 bg-[var(--vera-bg)]">
      {/* Interactive Showcase Toolbar */}
      <div className="w-full max-w-5xl mb-4 vera-card border border-[var(--vera-border)] rounded-2xl p-3 flex flex-wrap items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#800020] flex items-center justify-center text-[#FFF9F2] font-black text-xs shadow-md">
            🛡️
          </div>
          <div>
            <h3 className="text-xs font-bold text-[var(--vera-text-primary)] leading-tight">VERA Mobile App UI Kit</h3>
            <p className="text-[10px] text-[var(--vera-text-muted)]">Citizen Mobile Experience</p>
          </div>
        </div>

        {/* Quick Screen Selector Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-1 max-w-full">
          {screensList.map(s => (
            <button
              key={s.id}
              onClick={() => setCurrentScreen(s.id)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition whitespace-nowrap cursor-pointer ${
                currentScreen === s.id
                  ? 'bg-[#800020] text-[#FFF9F2] font-bold shadow-sm'
                  : 'bg-[var(--vera-surface-muted)] text-[var(--vera-text-secondary)] hover:bg-[var(--vera-surface)] hover:text-[var(--vera-text-primary)] border border-[var(--vera-border)]'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* View Toggle (Device Frame vs Full Width) */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setDeviceFrame(!deviceFrame)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl vera-button-secondary text-xs font-medium transition cursor-pointer"
          >
            {deviceFrame ? <Maximize2 className="w-3.5 h-3.5" /> : <Smartphone className="w-3.5 h-3.5" />}
            <span>{deviceFrame ? 'Full Width' : 'Phone Frame'}</span>
          </button>

          {onNavigateToDashboard && (
            <button
              onClick={onNavigateToDashboard}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl vera-button-primary text-xs font-bold transition shadow cursor-pointer"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Command Center</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Container / Mobile Frame */}
      <div
        className={`transition-all duration-300 ${
          deviceFrame
            ? 'w-full max-w-[390px] h-[820px] rounded-[48px] border-[10px] border-slate-800 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.7)] overflow-hidden relative flex flex-col'
            : 'w-full max-w-xl rounded-3xl border border-slate-700 overflow-hidden shadow-2xl flex flex-col'
        }`}
        style={{ backgroundColor: '#FDF8F0' }}
      >
        {/* Mobile Status Bar (9:41, WiFi, Battery) */}
        <div className="w-full px-6 pt-3 pb-1 flex items-center justify-between text-[#1E293B] text-xs font-bold z-40 select-none">
          <span>9:41</span>
          {deviceFrame && (
            <div className="w-24 h-4 bg-slate-800 rounded-full mx-auto -mt-1 flex items-center justify-center">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-900 border border-slate-700 mr-2" />
              <span className="w-2 h-2 rounded-full bg-slate-900" />
            </div>
          )}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-[10px]">5G</span>
            <span className="w-4 h-2.5 border border-[#1E293B] rounded-sm relative inline-block p-0.5">
              <span className="block h-full bg-[#1E293B] rounded-[1px] w-full" />
            </span>
          </div>
        </div>

        {/* ──────────────────────────────────────────────────────────
            SCREEN 1: SPLASH SCREEN
        ────────────────────────────────────────────────────────── */}
        {currentScreen === 'splash' && (
          <div
            className="flex-1 flex flex-col items-center justify-between p-8 text-center select-none"
            style={{ backgroundColor: '#FDF8F0' }}
          >
            <div className="my-auto flex flex-col items-center">
              {/* Logo Shield */}
              <div className="w-20 h-20 rounded-3xl bg-[#C62828] flex items-center justify-center shadow-xl shadow-red-500/30 mb-6">
                <Phone className="w-10 h-10 text-white fill-white" />
              </div>

              <h1 className="text-3xl font-black text-[#1E293B] tracking-tight">VERA</h1>
              <h2 className="text-base font-bold text-[#C62828] mt-1">Emergency & SOS Call</h2>
              <p className="text-xs text-[#71817C] mt-1">Voice Emergency Response Assistant</p>
            </div>

            {/* Bottom Wave & Tagline */}
            <div className="w-full flex flex-col items-center gap-4">
              <div className="w-full h-24 rounded-2xl bg-gradient-to-t from-[#0F5C4A]/20 to-transparent flex items-center justify-center p-4">
                <p className="text-xs font-semibold text-[#0F5C4A]">Your safety is our priority</p>
              </div>

              <button
                onClick={() => setCurrentScreen('home')}
                className="w-full py-3.5 rounded-2xl bg-[#0F5C4A] text-white font-bold text-sm shadow-md hover:bg-[#0A4033] transition"
              >
                Get Started
              </button>
            </div>
          </div>
        )}

        {/* ──────────────────────────────────────────────────────────
            SCREEN 2: HOME SCREEN
        ────────────────────────────────────────────────────────── */}
        {currentScreen === 'home' && (
          <div className="flex-1 flex flex-col justify-between overflow-y-auto">
            {/* Top Bar with Location */}
            <div className="p-5 pb-0">
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={() => setCurrentScreen('live_location')}
                  className="flex items-center gap-1.5 text-xs font-bold text-[#1E293B] bg-white px-3 py-1.5 rounded-full border border-slate-200 shadow-sm"
                >
                  <MapPin className="w-3.5 h-3.5 text-[#0F5C4A]" />
                  <span>{locationName}</span>
                  <ChevronDown className="w-3 h-3 text-[#71817C]" />
                </button>

                <button
                  onClick={() => setCurrentScreen('profile')}
                  className="w-9 h-9 rounded-full bg-white border border-slate-200 flex items-center justify-center text-[#1E293B] shadow-sm"
                >
                  <User className="w-4 h-4" />
                </button>
              </div>

              {/* Greeting */}
              <div>
                <h2 className="text-xl font-black text-[#1E293B]">Hello, User</h2>
                <p className="text-xs text-[#71817C]">How can we help you today?</p>
              </div>
            </div>

            {/* Hero Central SOS Circle */}
            <div className="flex flex-col items-center justify-center my-auto py-6">
              <div className="relative flex items-center justify-center">
                {/* Glowing Outer Rings */}
                <div className="absolute w-44 h-44 rounded-full bg-red-500/10 sos-pulse-ring pointer-events-none" />
                <div className="absolute w-36 h-36 rounded-full bg-red-500/20 pointer-events-none" />

                {/* Big Red SOS Button */}
                <button
                  onClick={triggerEmergencySOS}
                  className="w-28 h-28 rounded-full bg-[#C62828] text-white flex flex-col items-center justify-center shadow-xl shadow-red-600/40 transform hover:scale-105 active:scale-95 transition z-10"
                >
                  <Phone className="w-9 h-9 fill-white mb-1" />
                  <span className="text-sm font-black tracking-wider">SOS</span>
                </button>
              </div>

              <p className="text-xs font-bold text-[#C62828] mt-4 tracking-wide">
                Tap to Call Emergency
              </p>
              <span className="text-[10px] text-[#71817C] mt-0.5">or</span>
            </div>

            {/* Action Cards */}
            <div className="px-5 pb-4 space-y-3">
              {/* Report a Civic Issue (Dark Green Pill/Card) */}
              <button
                onClick={() => setCurrentScreen('civic_report')}
                className="w-full p-4 rounded-2xl bg-[#0F5C4A] text-white flex items-center justify-between shadow-md hover:bg-[#0A4033] transition"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                    <ShieldCheck className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-left">
                    <h4 className="text-xs font-bold text-white">Report a Civic Issue</h4>
                    <p className="text-[10px] text-white/80">Roads, Garbage, Streetlights etc.</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-white/70" />
              </button>

              {/* My Reports Card */}
              <button
                onClick={() => setCurrentScreen('my_reports')}
                className="w-full p-4 rounded-2xl cream-card flex items-center justify-between cream-card-interactive"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-[#0F5C4A]">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <h4 className="text-xs font-bold text-[#1E293B]">My Reports</h4>
                    <p className="text-[10px] text-[#71817C]">Track your complaints</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-[#71817C]" />
              </button>
            </div>

            {/* Bottom Nav */}
            {renderBottomNav('home')}
          </div>
        )}

        {/* ──────────────────────────────────────────────────────────
            SCREEN 3: EMERGENCY CALL SCREEN (Dark Green Background)
        ────────────────────────────────────────────────────────── */}
        {currentScreen === 'emergency_call' && (
          <div
            className="flex-1 flex flex-col justify-between p-6 text-white select-none relative overflow-hidden"
            style={{ backgroundColor: '#0F5C4A' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-white" />
                <span className="text-sm font-black tracking-wider text-white">VERA</span>
              </div>
              <span className="text-[11px] font-mono bg-white/10 px-2 py-0.5 rounded-full">
                00:{callDuration < 10 ? `0${callDuration}` : callDuration}
              </span>
            </div>

            {/* Central SOS Ring */}
            <div className="flex flex-col items-center my-auto">
              <div className="relative flex items-center justify-center mb-6">
                <div className="absolute w-44 h-44 rounded-full bg-red-500/20 sos-pulse-ring pointer-events-none" />
                <div className="w-28 h-28 rounded-full bg-[#C62828] text-white flex flex-col items-center justify-center shadow-2xl shadow-red-600/60">
                  <Phone className="w-9 h-9 fill-white mb-1" />
                  <span className="text-sm font-black">SOS</span>
                </div>
              </div>

              <h3 className="text-base font-bold text-white text-center">Calling Emergency Services...</h3>
              <p className="text-xs text-white/80 text-center mt-1 max-w-xs">
                Your location and details are being shared with nearest response teams.
              </p>
            </div>

            {/* Location Sharing Card & Actions */}
            <div className="space-y-3">
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3.5 border border-white/15 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-4 h-4 text-white" />
                </div>
                <div className="text-left flex-1">
                  <h5 className="text-xs font-bold text-white">Location Sharing</h5>
                  <p className="text-[10px] text-white/80 font-mono">
                    {coords.lat.toFixed(4)}° N, {coords.lng.toFixed(4)}° E • ±{gpsAccuracy}m
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setCurrentScreen('ai_analysis')}
                  className="py-3 rounded-2xl bg-white text-[#0F5C4A] font-bold text-xs shadow hover:bg-slate-100 transition"
                >
                  View AI Triage
                </button>
                <button
                  onClick={() => setCurrentScreen('home')}
                  className="py-3 rounded-2xl border border-white/40 text-white font-bold text-xs hover:bg-white/10 transition"
                >
                  Cancel Call
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ──────────────────────────────────────────────────────────
            SCREEN 4: LIVE LOCATION SCREEN
        ────────────────────────────────────────────────────────── */}
        {currentScreen === 'live_location' && (
          <div className="flex-1 flex flex-col justify-between overflow-hidden">
            {/* Header */}
            <div className="p-4 bg-white border-b border-slate-200 flex items-center justify-between">
              <button
                onClick={() => setCurrentScreen('home')}
                className="flex items-center gap-2 text-xs font-bold text-[#1E293B]"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Live Location</span>
              </button>
              <span className="text-[10px] font-bold text-[#0F5C4A] bg-[#0F5C4A]/10 px-2.5 py-0.5 rounded-full">
                GPS Active
              </span>
            </div>

            {/* Map Area with Concentric Radar Wave */}
            <div className="flex-1 relative bg-slate-100 flex items-center justify-center overflow-hidden">
              {/* Radar Circles */}
              <div className="absolute w-72 h-72 rounded-full border border-red-500/30 radar-wave-1 pointer-events-none" />
              <div className="absolute w-52 h-52 rounded-full border border-red-500/40 radar-wave-2 pointer-events-none" />
              <div className="absolute w-32 h-32 rounded-full border border-red-500/50 radar-wave-3 pointer-events-none" />

              {/* Center User Pin */}
              <div className="relative flex flex-col items-center z-10">
                <div className="w-10 h-10 rounded-full bg-[#C62828] text-white flex items-center justify-center shadow-xl border-2 border-white">
                  <User className="w-5 h-5" />
                </div>
                <div className="mt-2 px-3 py-1 rounded-full bg-white text-[#1E293B] text-[11px] font-bold shadow-md border border-slate-200">
                  Hazratganj, Lucknow
                </div>
              </div>
            </div>

            {/* Bottom Card */}
            <div className="p-5 bg-white border-t border-slate-200 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#0F5C4A]/10 flex items-center justify-center text-[#0F5C4A]">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#1E293B]">Your Location</h4>
                  <p className="text-[10px] text-[#71817C] font-mono">
                    {coords.lat.toFixed(4)}° N, {coords.lng.toFixed(4)}° E
                  </p>
                  <p className="text-[10px] text-[#0F5C4A] font-semibold">
                    Accuracy: ±{gpsAccuracy} m (High Precision)
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  alert(`Location shared: ${coords.lat}, ${coords.lng}`);
                  setCurrentScreen('home');
                }}
                className="w-full py-3 rounded-2xl bg-[#0F5C4A] text-white font-bold text-xs shadow-md hover:bg-[#0A4033] transition"
              >
                Share Location
              </button>
            </div>
          </div>
        )}

        {/* ──────────────────────────────────────────────────────────
            SCREEN 5: CIVIC ISSUE REPORT SCREEN (Exact 6 Category Grid)
        ────────────────────────────────────────────────────────── */}
        {currentScreen === 'civic_report' && (
          <div className="flex-1 flex flex-col justify-between overflow-y-auto">
            {/* Header */}
            <div className="p-4 bg-white border-b border-slate-200 flex items-center justify-between sticky top-0 z-20">
              <button
                onClick={() => setCurrentScreen('home')}
                className="flex items-center gap-2 text-xs font-bold text-[#1E293B]"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Report a Civic Issue</span>
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleSubmitCivicReport} className="p-5 space-y-4">
              {/* Category Grid (6 Tiles) */}
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-[#71817C] mb-2 block">
                  Select Issue Type
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  {civicCategories.map(cat => {
                    const Icon = cat.icon;
                    const isSelected = category === cat.id;
                    return (
                      <button
                        type="button"
                        key={cat.id}
                        onClick={() => setCategory(cat.id)}
                        className={`p-3 rounded-xl border flex flex-col items-center text-center gap-2 transition ${
                          isSelected
                            ? 'bg-[#0F5C4A] text-white border-[#0F5C4A] shadow-sm'
                            : 'bg-white text-[#1E293B] border-slate-200 hover:border-[#0F5C4A]/40'
                        }`}
                      >
                        <Icon className={`w-5 h-5 ${isSelected ? 'text-white' : 'text-[#0F5C4A]'}`} />
                        <span className="text-[10px] font-bold leading-tight">{cat.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Photo Upload Box */}
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-[#71817C] mb-1.5 block">
                  Add Photo (optional)
                </label>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handlePhotoUpload}
                  accept="image/*"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-24 rounded-2xl border-2 border-dashed border-slate-300 bg-white hover:bg-slate-50 flex flex-col items-center justify-center gap-1 text-[#71817C] transition"
                >
                  {photoPreview ? (
                    <img
                      src={photoPreview}
                      alt="Preview"
                      className="h-full w-full object-cover rounded-2xl"
                    />
                  ) : (
                    <>
                      <Camera className="w-5 h-5 text-[#0F5C4A]" />
                      <span className="text-[11px] font-semibold text-[#1E293B]">Tap to add photo</span>
                    </>
                  )}
                </button>
              </div>

              {/* Description & Speech-to-Text */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-[#71817C]">
                    Describe the issue...
                  </label>
                  <button
                    type="button"
                    onClick={toggleSpeechRecognition}
                    className={`flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full transition ${
                      isListening
                        ? 'bg-red-500 text-white animate-pulse'
                        : 'bg-[#0F5C4A]/10 text-[#0F5C4A]'
                    }`}
                  >
                    {isListening ? <MicOff className="w-3 h-3" /> : <Mic className="w-3 h-3" />}
                    <span>{isListening ? 'Listening...' : 'Voice input'}</span>
                  </button>
                </div>

                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="e.g. Large pothole near main road or two vehicles collided with injury..."
                  rows={3}
                  className="w-full p-3 rounded-2xl border border-slate-200 bg-white text-xs text-[#1E293B] focus:outline-none focus:border-[#0F5C4A] shadow-sm resize-none"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 rounded-2xl bg-[#0F5C4A] text-white font-bold text-xs shadow-md hover:bg-[#0A4033] transition flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Analyzing Urgency...</span>
                  </>
                ) : (
                  <span>Submit Report</span>
                )}
              </button>
            </form>
          </div>
        )}

        {/* ──────────────────────────────────────────────────────────
            SCREEN 6: AI ANALYSIS SCREEN (Incident Intelligence & Decision Factors)
        ────────────────────────────────────────────────────────── */}
        {currentScreen === 'ai_analysis' && (
          <div className="flex-1 flex flex-col justify-between overflow-y-auto">
            {/* Header */}
            <div className="p-4 bg-white border-b border-slate-200 flex items-center justify-between sticky top-0 z-20">
              <button
                onClick={() => setCurrentScreen('home')}
                className="flex items-center gap-2 text-xs font-bold text-[#1E293B]"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>VERA Analysis</span>
              </button>
              <span className="text-[10px] font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full">
                Score: 94 / 100
              </span>
            </div>

            <div className="p-5 space-y-4">
              {/* INCIDENT INTELLIGENCE CARD (Soft Pink/Red Top Badge) */}
              <div className="rounded-2xl border border-red-200 bg-white overflow-hidden shadow-sm">
                <div className="bg-red-50/80 px-4 py-2.5 border-b border-red-100 flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-[#C62828] text-white flex items-center justify-center text-[10px]">
                    🛡️
                  </div>
                  <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-[#C62828]">
                    INCIDENT INTELLIGENCE
                  </h4>
                </div>

                <div className="p-4 space-y-2.5 text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-[#71817C]">Type</span>
                    <span className="font-bold text-[#1E293B]">
                      {activeIncident.incident_intelligence?.incident_type || 'Road Accident'}
                    </span>
                  </div>

                  <div className="flex justify-between py-1 border-b border-slate-100 items-center">
                    <span className="text-[#71817C]">Severity</span>
                    <span className="px-2 py-0.5 rounded-full bg-[#C62828] text-white text-[10px] font-bold">
                      CRITICAL
                    </span>
                  </div>

                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-[#71817C]">Risk Score</span>
                    <span className="font-bold text-[#C62828]">94 / 100</span>
                  </div>

                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-[#71817C]">AI Confidence</span>
                    <span className="font-bold text-[#0F5C4A]">91%</span>
                  </div>

                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-[#71817C]">People Affected (est.)</span>
                    <span className="font-bold text-[#1E293B]">2+</span>
                  </div>

                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-[#71817C]">Possible Injury</span>
                    <span className="font-bold text-red-600">Yes</span>
                  </div>

                  <div className="flex justify-between py-1">
                    <span className="text-[#71817C]">Location Confirmed</span>
                    <span className="font-bold text-emerald-600">Yes</span>
                  </div>
                </div>
              </div>

              {/* WHY VERA ESCALATED CARD */}
              <div className="rounded-2xl border border-emerald-200 bg-white overflow-hidden shadow-sm">
                <div className="bg-emerald-50/80 px-4 py-2.5 border-b border-emerald-100 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#0F5C4A]" />
                  <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-[#0F5C4A]">
                    WHY VERA ESCALATED
                  </h4>
                </div>

                <div className="p-4 space-y-2 text-xs">
                  <div className="flex items-center gap-2 text-[#1E293B]">
                    <Check className="w-4 h-4 text-emerald-600 font-bold" />
                    <span>Accident detected</span>
                  </div>
                  <div className="flex items-center gap-2 text-[#1E293B]">
                    <Check className="w-4 h-4 text-emerald-600 font-bold" />
                    <span>Possible injury mentioned</span>
                  </div>
                  <div className="flex items-center gap-2 text-[#1E293B]">
                    <Check className="w-4 h-4 text-emerald-600 font-bold" />
                    <span>Immediate danger indicated</span>
                  </div>
                  <div className="flex items-center gap-2 text-[#1E293B]">
                    <Check className="w-4 h-4 text-emerald-600 font-bold" />
                    <span>Location available</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Navigation to Response Plan */}
            <div className="p-5 pt-0">
              <button
                onClick={() => setCurrentScreen('response_plan')}
                className="w-full py-3.5 rounded-2xl bg-[#0F5C4A] text-white font-bold text-xs shadow-md hover:bg-[#0A4033] transition flex items-center justify-center gap-2"
              >
                <span>View Response Plan</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ──────────────────────────────────────────────────────────
            SCREEN 7: RESPONSE PLAN SCREEN
        ────────────────────────────────────────────────────────── */}
        {currentScreen === 'response_plan' && (
          <div className="flex-1 flex flex-col justify-between overflow-y-auto">
            {/* Header */}
            <div className="p-4 bg-white border-b border-slate-200 flex items-center justify-between sticky top-0 z-20">
              <button
                onClick={() => setCurrentScreen('ai_analysis')}
                className="flex items-center gap-2 text-xs font-bold text-[#1E293B]"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Response Plan</span>
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Emergency Banner */}
              <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200">
                <div className="flex items-center gap-2 text-[#C62828] font-bold text-xs">
                  <Flame className="w-4 h-4" />
                  <span>CRITICAL INCIDENT</span>
                </div>
                <h3 className="text-base font-black text-[#1E293B] mt-0.5">Road Accident</h3>
              </div>

              {/* Primary Unit Card */}
              <div className="cream-card rounded-2xl p-4 space-y-2">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-[#0F5C4A] flex items-center justify-center flex-shrink-0">
                    <Hospital className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#71817C]">
                      Primary Unit
                    </span>
                    <h4 className="text-sm font-bold text-[#1E293B]">City Civil Hospital</h4>
                    <p className="text-xs font-semibold text-[#0F5C4A]">1.8 km • ~7 min</p>
                    <p className="text-[10px] text-emerald-700 flex items-center gap-1 mt-1">
                      <span>⚡ Emergency services available</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Secondary Unit Card */}
              <div className="cream-card rounded-2xl p-4 space-y-2">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center flex-shrink-0">
                    <Shield className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#71817C]">
                      Secondary Unit
                    </span>
                    <h4 className="text-sm font-bold text-[#1E293B]">Sector 4 Police Post</h4>
                    <p className="text-xs font-semibold text-blue-700">2.1 km • ~8 min</p>
                  </div>
                </div>
              </div>

              {/* Recommended Action Card */}
              <div className="p-3.5 rounded-2xl bg-slate-100 border border-slate-200">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#71817C] block mb-1">
                  Recommended Action
                </span>
                <p className="text-xs text-[#1E293B] leading-relaxed">
                  Dispatch medical response and notify nearest police unit.
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="p-5 pt-0 space-y-2.5">
              <button
                onClick={() => setCurrentScreen('active_map')}
                className="w-full py-3.5 rounded-2xl bg-[#0F5C4A] text-white font-bold text-xs shadow-md hover:bg-[#0A4033] transition"
              >
                Confirm & Escalate
              </button>

              <button
                onClick={() => setCurrentScreen('civic_report')}
                className="w-full py-2.5 rounded-2xl bg-white border border-slate-300 text-[#1E293B] font-bold text-xs hover:bg-slate-50 transition"
              >
                Modify Routing
              </button>
            </div>
          </div>
        )}

        {/* ──────────────────────────────────────────────────────────
            SCREEN 8: ACTIVE INCIDENT MAP SCREEN
        ────────────────────────────────────────────────────────── */}
        {currentScreen === 'active_map' && (
          <div className="flex-1 flex flex-col justify-between overflow-hidden">
            {/* Header */}
            <div className="p-4 bg-white border-b border-slate-200 flex items-center justify-between z-20">
              <button
                onClick={() => setCurrentScreen('response_plan')}
                className="flex items-center gap-2 text-xs font-bold text-[#1E293B]"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Incident #VERA-10482</span>
              </button>
              <span className="text-[10px] font-bold bg-[#C62828] text-white px-2.5 py-0.5 rounded-full">
                CRITICAL
              </span>
            </div>

            {/* Tactical Live Map View */}
            <div className="flex-1 relative bg-slate-200 flex items-center justify-center overflow-hidden">
              {/* Radar concentric rings */}
              <div className="absolute w-56 h-56 rounded-full bg-red-500/20 radar-wave-1 pointer-events-none" />

              {/* Incident Ground Zero */}
              <div className="relative z-10 flex flex-col items-center">
                <div className="w-9 h-9 rounded-full bg-[#C62828] text-white flex items-center justify-center shadow-lg border-2 border-white">
                  <Flame className="w-4 h-4" />
                </div>
              </div>

              {/* Hospital Pin */}
              <div className="absolute top-12 right-8 bg-white p-2 rounded-xl shadow-md border border-slate-200 flex items-center gap-1.5 text-[10px] font-bold">
                <Hospital className="w-3.5 h-3.5 text-[#0F5C4A]" />
                <div>
                  <p className="text-[#1E293B]">Hospital</p>
                  <p className="text-[#0F5C4A]">1.8 km • 7 min</p>
                </div>
              </div>

              {/* Police Pin */}
              <div className="absolute bottom-16 right-10 bg-white p-2 rounded-xl shadow-md border border-slate-200 flex items-center gap-1.5 text-[10px] font-bold">
                <Shield className="w-3.5 h-3.5 text-blue-700" />
                <div>
                  <p className="text-[#1E293B]">Police</p>
                  <p className="text-blue-700">2.1 km • 8 min</p>
                </div>
              </div>
            </div>

            {/* Response Status Bottom Sheet */}
            <div className="p-5 bg-white border-t border-slate-200 space-y-3">
              <h5 className="text-[11px] font-bold uppercase tracking-wider text-[#71817C]">
                Response Status
              </h5>

              <div className="space-y-1.5 text-xs text-[#1E293B]">
                <div className="flex items-center gap-2 text-emerald-700">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Incident created</span>
                </div>
                <div className="flex items-center gap-2 text-emerald-700">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Location shared</span>
                </div>
                <div className="flex items-center gap-2 text-emerald-700">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Hospital alerted</span>
                </div>
                <div className="flex items-center gap-2 text-emerald-700">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Police notified</span>
                </div>
                <div className="flex items-center justify-between text-[#0F5C4A] font-bold pt-1">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Response in progress
                  </span>
                  <span className="text-[11px] bg-emerald-100 px-2 py-0.5 rounded-full">
                    ETA: 7 min
                  </span>
                </div>
              </div>

              <button
                onClick={() => setCurrentScreen('incident_timeline')}
                className="w-full py-3 rounded-2xl bg-[#0F5C4A] text-white font-bold text-xs shadow-md hover:bg-[#0A4033] transition"
              >
                View Timeline
              </button>
            </div>
          </div>
        )}

        {/* ──────────────────────────────────────────────────────────
            SCREEN 9: INCIDENT TIMELINE SCREEN
        ────────────────────────────────────────────────────────── */}
        {currentScreen === 'incident_timeline' && (
          <div className="flex-1 flex flex-col justify-between overflow-y-auto">
            {/* Header */}
            <div className="p-4 bg-white border-b border-slate-200 flex items-center justify-between sticky top-0 z-20">
              <button
                onClick={() => setCurrentScreen('active_map')}
                className="flex items-center gap-2 text-xs font-bold text-[#1E293B]"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Incident Timeline</span>
              </button>
            </div>

            {/* Vertical Step Timeline */}
            <div className="p-5 flex-1 space-y-4">
              {activeIncident.operational_timeline?.map((item, idx) => (
                <div key={idx} className="flex items-start gap-3 relative">
                  {/* Vertical connecting line */}
                  {idx < (activeIncident.operational_timeline?.length || 0) - 1 && (
                    <div className="absolute left-2.5 top-4 bottom-[-16px] w-0.5 bg-[#0F5C4A]/30" />
                  )}

                  {/* Dot */}
                  <div className="w-5 h-5 rounded-full bg-[#0F5C4A] text-white flex items-center justify-center flex-shrink-0 z-10 text-[9px] shadow-sm">
                    ✓
                  </div>

                  <div className="text-left flex-1">
                    <span className="text-[10px] font-mono text-[#71817C]">{item.timestamp}</span>
                    <h5 className="text-xs font-bold text-[#1E293B] leading-snug">{item.event}</h5>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-5 pt-0">
              <button
                onClick={() => setCurrentScreen('home')}
                className="w-full py-3.5 rounded-2xl bg-[#0F5C4A] text-white font-bold text-xs shadow-md hover:bg-[#0A4033] transition"
              >
                Return to Home
              </button>
            </div>
          </div>
        )}

        {/* ──────────────────────────────────────────────────────────
            SCREEN 10: MY REPORTS SCREEN
        ────────────────────────────────────────────────────────── */}
        {currentScreen === 'my_reports' && (
          <div className="flex-1 flex flex-col justify-between overflow-y-auto">
            {/* Header */}
            <div className="p-4 bg-white border-b border-slate-200 flex items-center justify-between sticky top-0 z-20">
              <button
                onClick={() => setCurrentScreen('home')}
                className="flex items-center gap-2 text-xs font-bold text-[#1E293B]"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>My Reports</span>
              </button>
            </div>

            {/* Filter Tabs (All, Active, Resolved) */}
            <div className="p-4 pb-2">
              <div className="flex items-center gap-2 bg-slate-200/70 p-1 rounded-xl">
                {(['all', 'active', 'resolved'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setReportsFilter(tab)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold capitalize transition ${
                      reportsFilter === tab
                        ? 'bg-[#0F5C4A] text-white shadow-sm'
                        : 'text-[#71817C] hover:text-[#1E293B]'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {/* Reports List */}
            <div className="p-4 space-y-2.5 flex-1 overflow-y-auto">
              {sampleReports.map(rep => {
                const Icon = rep.icon;
                return (
                  <button
                    key={rep.id}
                    onClick={() => setCurrentScreen('ai_analysis')}
                    className="w-full p-3.5 rounded-2xl cream-card flex items-center justify-between cream-card-interactive"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-[#0F5C4A]">
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="text-left">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-[#1E293B]">{rep.title}</h4>
                          <span
                            className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${rep.color}`}
                          >
                            {rep.badge}
                          </span>
                        </div>
                        <p className="text-[10px] text-[#71817C] mt-0.5">
                          #{rep.id} • {rep.time}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[#71817C]" />
                  </button>
                );
              })}
            </div>

            {/* Bottom Nav */}
            {renderBottomNav('reports')}
          </div>
        )}

        {/* ──────────────────────────────────────────────────────────
            SCREEN 11: PROFILE SCREEN
        ────────────────────────────────────────────────────────── */}
        {currentScreen === 'profile' && (
          <div className="flex-1 flex flex-col justify-between overflow-y-auto">
            {/* Header */}
            <div className="p-4 bg-white border-b border-slate-200 flex items-center justify-between sticky top-0 z-20">
              <button
                onClick={() => setCurrentScreen('home')}
                className="flex items-center gap-2 text-xs font-bold text-[#1E293B]"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Profile</span>
              </button>
            </div>

            {/* User Profile Card */}
            <div className="p-5 space-y-4">
              <div className="cream-card rounded-2xl p-4 flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-full bg-[#0F5C4A] text-white flex items-center justify-center text-base font-bold shadow-md">
                  <User className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#1E293B]">User</h3>
                  <p className="text-xs text-[#71817C]">+91 98765 43210</p>
                  <p className="text-[10px] text-[#0F5C4A] font-semibold mt-0.5">📍 Lucknow, UP</p>
                </div>
              </div>

              {/* Settings List */}
              <div className="cream-card rounded-2xl overflow-hidden divide-y divide-slate-100">
                <div className="p-3.5 flex items-center justify-between hover:bg-slate-50 transition cursor-pointer">
                  <div className="flex items-center gap-3">
                    <span className="text-base">🌐</span>
                    <span className="text-xs font-semibold text-[#1E293B]">Language</span>
                  </div>
                  <span className="text-xs text-[#71817C] flex items-center gap-1">
                    English <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>

                <div className="p-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Bell className="w-4 h-4 text-[#71817C]" />
                    <span className="text-xs font-semibold text-[#1E293B]">Notifications</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={notificationsEnabled}
                    onChange={e => setNotificationsEnabled(e.target.checked)}
                    className="accent-[#0F5C4A] w-4 h-4 cursor-pointer"
                  />
                </div>

                <div className="p-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <MapPin className="w-4 h-4 text-[#71817C]" />
                    <span className="text-xs font-semibold text-[#1E293B]">Location Sharing</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={locationSharingEnabled}
                    onChange={e => setLocationSharingEnabled(e.target.checked)}
                    className="accent-[#0F5C4A] w-4 h-4 cursor-pointer"
                  />
                </div>

                <div className="p-3.5 flex items-center justify-between hover:bg-slate-50 transition cursor-pointer">
                  <div className="flex items-center gap-3">
                    <HelpCircle className="w-4 h-4 text-[#71817C]" />
                    <span className="text-xs font-semibold text-[#1E293B]">Help & Support</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-[#71817C]" />
                </div>

                <div className="p-3.5 flex items-center justify-between hover:bg-slate-50 transition cursor-pointer">
                  <div className="flex items-center gap-3">
                    <Info className="w-4 h-4 text-[#71817C]" />
                    <span className="text-xs font-semibold text-[#1E293B]">About VERA</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-[#71817C]" />
                </div>

                <div className="p-3.5 flex items-center justify-between hover:bg-slate-50 transition cursor-pointer">
                  <div className="flex items-center gap-3">
                    <Lock className="w-4 h-4 text-[#71817C]" />
                    <span className="text-xs font-semibold text-[#1E293B]">Privacy Policy</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-[#71817C]" />
                </div>

                <div
                  onClick={() => setCurrentScreen('splash')}
                  className="p-3.5 flex items-center justify-between hover:bg-red-50 transition cursor-pointer text-[#C62828]"
                >
                  <div className="flex items-center gap-3">
                    <LogOut className="w-4 h-4" />
                    <span className="text-xs font-bold">Logout</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Nav */}
            {renderBottomNav('profile')}
          </div>
        )}
      </div>
    </div>
  );
};
