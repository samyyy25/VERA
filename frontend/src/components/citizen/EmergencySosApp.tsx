import React, { useState, useEffect } from 'react';
import {
  Phone,
  MapPin,
  Menu,
  Shield,
  Plus,
  ArrowLeft,
  MessageSquare,
  Car,
  HeartPulse,
  User,
  Edit3,
  Calendar,
  Activity,
  Droplet,
  Maximize2,
  Smartphone,
  Layers,
  Search,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { submitComplaint, reverseGeocodeCoords } from '../../services/api';
import { Complaint, CreateComplaintInput } from '../../types';
import { LiveIncidentUpdates } from '../emergency/LiveIncidentUpdates';
import { LiveLocationMap } from '../emergency/LiveLocationMap';

export type AppScreen = 'home_main' | 'home_simple' | 'dispatch_map' | 'contacts' | 'medical_profile';

interface Props {
  onNavigateToDashboard?: () => void;
}

export const EmergencySosApp: React.FC<Props> = ({ onNavigateToDashboard }) => {
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('home_main');
  const [deviceFrame, setDeviceFrame] = useState<boolean>(true);
  const [sosHolding, setSosHolding] = useState<boolean>(false);
  const [holdProgress, setHoldProgress] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [showLiveUpdates, setShowLiveUpdates] = useState<boolean>(false);

  // Real device coordinates (fallback to Lucknow only if browser denies permission)
  const [coords, setCoords] = useState<{ lat: number; lng: number }>({
    lat: 26.8467,
    lng: 80.9462,
  });
  const [addressName, setAddressName] = useState<string>('Detecting your GPS location...');

  // Active Dispatched Incident State
  const [activeIncident, setActiveIncident] = useState<Partial<Complaint> | null>(null);

  // Capture User Live Location immediately on mount
  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setCoords({ lat, lng });
          try {
            const geo = await reverseGeocodeCoords(lat, lng);
            if (geo?.address) {
              setAddressName(geo.address);
            } else {
              setAddressName(`${lat.toFixed(4)}° N, ${lng.toFixed(4)}° E`);
            }
          } catch {
            setAddressName(`${lat.toFixed(4)}° N, ${lng.toFixed(4)}° E`);
          }
        },
        () => {
          setAddressName('Hazratganj, Lucknow, UP');
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    }
  }, []);

  // Hold SOS Button Logic (Hold for 1.5s to trigger)
  useEffect(() => {
    let interval: any;
    if (sosHolding) {
      interval = setInterval(() => {
        setHoldProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            triggerSOS('Critical Emergency SOS Button Pressed');
            return 100;
          }
          return prev + 10;
        });
      }, 120);
    } else {
      setHoldProgress(0);
    }
    return () => clearInterval(interval);
  }, [sosHolding]);

  const triggerSOS = async (reason: string) => {
    setIsSubmitting(true);
    try {
      const payload: CreateComplaintInput = {
        category: 'Accident',
        description: `EMERGENCY SOS: ${reason}. Rapid medical and police assistance required immediately.`,
        latitude: coords.lat,
        longitude: coords.lng,
        gps_accuracy: 10,
        device_session_id: `sos_device_${Date.now()}`,
      };

      const res = await submitComplaint(payload);
      if (res?.complaint) {
        setActiveIncident(res.complaint);
      }
    } catch {
      // Demo fallback
    } finally {
      setIsSubmitting(false);
      setSosHolding(false);
      setHoldProgress(0);
      setCurrentScreen('dispatch_map');
    }
  };

  // Contacts List from Template
  const contactsList = [
    { id: '1', name: 'Jarvis Pepperspray', phone: '456-678-1234', status: 'Need Help', statusColor: 'bg-[#FF5A5F]/15 text-[#FF5A5F]' },
    { id: '2', name: 'Fletch Skinner', phone: '321-654-9876', status: 'Safe', statusColor: 'bg-emerald-100 text-emerald-700' },
    { id: '3', name: 'Dr. Sarah Connor', phone: '987-654-3210', status: 'Safe', statusColor: 'bg-emerald-100 text-emerald-700' },
  ];

  // Floating Bottom Navigation Bar matching the template
  const renderBottomNav = (activeTab: 'home' | 'location' | 'sos' | 'contacts' | 'profile') => (
    <div className="bg-white/95 backdrop-blur-md border-t border-slate-100 px-6 py-3 flex items-center justify-between relative shadow-[0_-8px_20px_rgba(0,0,0,0.03)] z-30">
      <button
        onClick={() => setCurrentScreen('home_main')}
        className={`flex flex-col items-center transition ${activeTab === 'home' ? 'text-[#FF5A5F]' : 'text-slate-400 hover:text-slate-600'}`}
      >
        <div className={`p-1.5 rounded-full ${activeTab === 'home' ? 'bg-[#FF5A5F]/10' : ''}`}>
          <Shield className="w-5 h-5" />
        </div>
      </button>

      <button
        onClick={() => setCurrentScreen('dispatch_map')}
        className={`flex flex-col items-center transition ${activeTab === 'location' ? 'text-[#FF5A5F]' : 'text-slate-400 hover:text-slate-600'}`}
      >
        <div className={`p-1.5 rounded-full ${activeTab === 'location' ? 'bg-[#FF5A5F]/10' : ''}`}>
          <MapPin className="w-5 h-5" />
        </div>
      </button>

      {/* Floating Center SOS Pill */}
      <button
        onClick={() => setCurrentScreen('home_simple')}
        className="w-12 h-12 rounded-full bg-gradient-to-br from-[#FF5A5F] to-[#FA4D56] text-white flex items-center justify-center shadow-lg shadow-red-500/30 transform hover:scale-105 active:scale-95 transition -mt-5"
      >
        <Phone className="w-5 h-5 fill-white" />
      </button>

      <button
        onClick={() => setCurrentScreen('contacts')}
        className={`flex flex-col items-center transition ${activeTab === 'contacts' ? 'text-[#FF5A5F]' : 'text-slate-400 hover:text-slate-600'}`}
      >
        <div className={`p-1.5 rounded-full ${activeTab === 'contacts' ? 'bg-[#FF5A5F]/10' : ''}`}>
          <MessageSquare className="w-5 h-5" />
        </div>
      </button>

      <button
        onClick={() => setCurrentScreen('medical_profile')}
        className={`flex flex-col items-center transition ${activeTab === 'profile' ? 'text-[#FF5A5F]' : 'text-slate-400 hover:text-slate-600'}`}
      >
        <div className={`p-1.5 rounded-full ${activeTab === 'profile' ? 'bg-[#FF5A5F]/10' : ''}`}>
          <User className="w-5 h-5" />
        </div>
      </button>
    </div>
  );

  return (
    <div className="min-h-full w-full flex flex-col items-center justify-center p-2 sm:p-6 bg-[var(--vera-bg)]">
      {/* Top Prototype Controls */}
      <div className="w-full max-w-4xl mb-4 vera-card border border-[var(--vera-border)] rounded-2xl p-3 flex flex-wrap items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#800020] flex items-center justify-center text-[#FFF9F2] shadow-md shadow-[#800020]/20">
            <Phone className="w-4 h-4 fill-current" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-[var(--vera-text-primary)]">Emergency & SOS Call App UI</h3>
            <p className="text-[10px] text-[var(--vera-text-muted)]">Citizen Mobile Companion • VERA Integrated</p>
          </div>
        </div>

        {/* Screen Switcher */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
          <button
            onClick={() => setCurrentScreen('home_main')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
              currentScreen === 'home_main' ? 'bg-[#800020] text-[#FFF9F2] shadow-sm' : 'bg-[var(--vera-surface-muted)] text-[var(--vera-text-secondary)] hover:bg-[var(--vera-surface)] hover:text-[var(--vera-text-primary)] border border-[var(--vera-border)]'
            }`}
          >
            1. SOS Home
          </button>
          <button
            onClick={() => setCurrentScreen('home_simple')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
              currentScreen === 'home_simple' ? 'bg-[#800020] text-[#FFF9F2] shadow-sm' : 'bg-[var(--vera-surface-muted)] text-[var(--vera-text-secondary)] hover:bg-[var(--vera-surface)] hover:text-[var(--vera-text-primary)] border border-[var(--vera-border)]'
            }`}
          >
            2. Quick SOS
          </button>
          <button
            onClick={() => setCurrentScreen('dispatch_map')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
              currentScreen === 'dispatch_map' ? 'bg-[#800020] text-[#FFF9F2] shadow-sm' : 'bg-[var(--vera-surface-muted)] text-[var(--vera-text-secondary)] hover:bg-[var(--vera-surface)] hover:text-[var(--vera-text-primary)] border border-[var(--vera-border)]'
            }`}
          >
            3. Response Map
          </button>
          <button
            onClick={() => setCurrentScreen('contacts')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
              currentScreen === 'contacts' ? 'bg-[#800020] text-[#FFF9F2] shadow-sm' : 'bg-[var(--vera-surface-muted)] text-[var(--vera-text-secondary)] hover:bg-[var(--vera-surface)] hover:text-[var(--vera-text-primary)] border border-[var(--vera-border)]'
            }`}
          >
            4. Contacts
          </button>
          <button
            onClick={() => setCurrentScreen('medical_profile')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
              currentScreen === 'medical_profile' ? 'bg-[#800020] text-[#FFF9F2] shadow-sm' : 'bg-[var(--vera-surface-muted)] text-[var(--vera-text-secondary)] hover:bg-[var(--vera-surface)] hover:text-[var(--vera-text-primary)] border border-[var(--vera-border)]'
            }`}
          >
            5. Medical Profile
          </button>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setDeviceFrame(!deviceFrame)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl vera-button-secondary text-xs font-semibold transition cursor-pointer"
          >
            {deviceFrame ? <Maximize2 className="w-3.5 h-3.5" /> : <Smartphone className="w-3.5 h-3.5" />}
            <span>{deviceFrame ? 'Full Width' : 'Phone Frame'}</span>
          </button>

          {onNavigateToDashboard && (
            <button
              onClick={onNavigateToDashboard}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl vera-button-primary text-xs font-bold transition shadow-sm cursor-pointer"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Command Center</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Phone Device Mockup Container */}
      <div
        className={`transition-all duration-300 bg-white ${
          deviceFrame
            ? 'w-full max-w-[390px] h-[820px] rounded-[48px] border-[10px] border-slate-900 shadow-[0_30px_70px_-15px_rgba(0,0,0,0.18)] overflow-hidden relative flex flex-col'
            : 'w-full max-w-xl rounded-3xl border border-slate-200 overflow-hidden shadow-xl flex flex-col'
        }`}
      >
        {/* iOS Top Status Bar */}
        <div className="w-full px-6 pt-3 pb-1 flex items-center justify-between text-slate-800 text-xs font-bold z-40 select-none">
          <span>9:41</span>
          {deviceFrame && (
            <div className="w-24 h-4 bg-slate-900 rounded-full mx-auto -mt-1 flex items-center justify-center">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-800 mr-2" />
              <span className="w-2 h-2 rounded-full bg-slate-800" />
            </div>
          )}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-[10px] font-semibold">5G</span>
            <span className="w-4 h-2.5 border border-slate-800 rounded-sm relative inline-block p-0.5">
              <span className="block h-full bg-slate-800 rounded-[1px] w-full" />
            </span>
          </div>
        </div>

        {/* ──────────────────────────────────────────────────────────
            SCREEN 1: MAIN SOS HERO SCREEN ("Emergency Help Needed?")
        ────────────────────────────────────────────────────────── */}
        {currentScreen === 'home_main' && (
          <div className="flex-1 flex flex-col justify-between overflow-y-auto bg-white">
            {/* Top Navigation Bar from template */}
            <div className="p-5 pb-0">
              <div className="flex items-center justify-between mb-3">
                <button className="p-2 rounded-xl text-slate-700 hover:bg-slate-100">
                  <Menu className="w-5 h-5" />
                </button>
                <span className="text-sm font-bold text-slate-800">Home</span>
                <div
                  onClick={() => setCurrentScreen('medical_profile')}
                  className="w-9 h-9 rounded-full bg-slate-200 overflow-hidden cursor-pointer border border-slate-200"
                >
                  <img
                    src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80"
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>

              {/* Greeting & Define Location */}
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Hello, Barry</h4>
                  <p className="text-[10px] text-[#FF5A5F] font-semibold cursor-pointer">Complete Your Profile</p>
                </div>
                <div className="text-right">
                  <h4 className="text-xs font-bold text-slate-800">Define Location</h4>
                  <p className="text-[10px] text-[#FF5A5F] font-semibold truncate max-w-[120px]">{addressName}</p>
                </div>
              </div>
            </div>

            {/* Headline */}
            <div className="text-center px-6 mt-4">
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">Emergency Help Needed?</h2>
              <p className="text-xs text-slate-400 mt-1 font-medium">Just hold the button to call</p>
            </div>

            {/* Huge Signature Soft Radial Concentric Ring SOS Button */}
            <div className="flex flex-col items-center justify-center my-4 py-2">
              <div className="relative flex items-center justify-center">
                {/* 3 Concentric Halo Rings */}
                <div
                  className="w-64 h-64 rounded-full bg-[#FF5A5F]/5 absolute pointer-events-none transition-transform duration-300"
                  style={{ transform: sosHolding ? 'scale(1.15)' : 'scale(1)' }}
                />
                <div
                  className="w-52 h-52 rounded-full bg-[#FF5A5F]/10 absolute pointer-events-none transition-transform duration-300"
                  style={{ transform: sosHolding ? 'scale(1.1)' : 'scale(1)' }}
                />
                <div
                  className="w-40 h-40 rounded-full bg-[#FF5A5F]/20 absolute pointer-events-none transition-transform duration-300"
                  style={{ transform: sosHolding ? 'scale(1.05)' : 'scale(1)' }}
                />

                {/* Main Coral Red Central SOS Button */}
                <button
                  onMouseDown={() => setSosHolding(true)}
                  onMouseUp={() => setSosHolding(false)}
                  onTouchStart={() => setSosHolding(true)}
                  onTouchEnd={() => setSosHolding(false)}
                  onClick={() => triggerSOS('One-tap Emergency Call Triggered')}
                  className="w-28 h-28 rounded-full bg-gradient-to-tr from-[#FF5A5F] via-[#FA4D56] to-[#FF7579] text-white flex flex-col items-center justify-center shadow-[0_15px_35px_rgba(255,90,95,0.4)] z-10 transform active:scale-95 transition-all select-none"
                >
                  <Phone className="w-10 h-10 fill-white" />
                  {sosHolding && (
                    <span className="text-[10px] font-bold mt-1 text-white/90">
                      {holdProgress}%
                    </span>
                  )}
                </button>
              </div>

              {isSubmitting && (
                <div className="mt-2 flex items-center gap-1.5 text-xs text-[#FF5A5F] font-bold animate-pulse">
                  <Activity className="w-3.5 h-3.5" />
                  <span>Connecting to Emergency Dispatch...</span>
                </div>
              )}
            </div>

            {/* "Not Sure What To Do" / Topic Cards Section */}
            <div className="px-5 pb-3">
              <div className="mb-2.5">
                <h4 className="text-xs font-extrabold text-slate-800">Not Sure What To Do</h4>
                <p className="text-[10px] text-slate-400 font-medium">Choose chat topic</p>
              </div>

              {/* Horizontal Scroll Cards */}
              <div className="flex items-center gap-3 overflow-x-auto pb-1 no-scrollbar">
                {/* Topic Card 1 */}
                <button
                  onClick={() => triggerSOS('Road Accident')}
                  className="min-w-[110px] p-3.5 rounded-2xl bg-white border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.04)] hover:shadow-md hover:border-[#FF5A5F]/30 transition text-left flex flex-col justify-between h-28"
                >
                  <div className="w-8 h-8 rounded-xl bg-red-50 text-[#FF5A5F] flex items-center justify-center">
                    <Car className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="text-[11px] font-bold text-slate-800 leading-snug">I have an accident</h5>
                  </div>
                </button>

                {/* Topic Card 2 */}
                <button
                  onClick={() => triggerSOS('Physical Injury')}
                  className="min-w-[110px] p-3.5 rounded-2xl bg-white border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.04)] hover:shadow-md hover:border-[#FF5A5F]/30 transition text-left flex flex-col justify-between h-28"
                >
                  <div className="w-8 h-8 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center">
                    <HeartPulse className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="text-[11px] font-bold text-slate-800 leading-snug">I have an injury</h5>
                  </div>
                </button>

                {/* Topic Card 3 */}
                <button
                  onClick={() => triggerSOS('Feeling Unsafe / Threat')}
                  className="min-w-[110px] p-3.5 rounded-2xl bg-white border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.04)] hover:shadow-md hover:border-[#FF5A5F]/30 transition text-left flex flex-col justify-between h-28"
                >
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center">
                    <Shield className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="text-[11px] font-bold text-slate-800 leading-snug">I am feeling unsafe</h5>
                  </div>
                </button>
              </div>
            </div>

            {/* Bottom Nav */}
            {renderBottomNav('home')}
          </div>
        )}

        {/* ──────────────────────────────────────────────────────────
            SCREEN 2: SIMPLE SOS SCREEN ("Are you in an emergency?")
        ────────────────────────────────────────────────────────── */}
        {currentScreen === 'home_simple' && (
          <div className="flex-1 flex flex-col justify-between overflow-y-auto bg-white">
            {/* Header */}
            <div className="p-5 pb-0 flex items-center justify-between">
              <button onClick={() => setCurrentScreen('home_main')} className="p-2 rounded-xl text-slate-700 hover:bg-slate-100">
                <Menu className="w-5 h-5" />
              </button>
              <span className="text-sm font-bold text-slate-800">Home</span>
              <div
                onClick={() => setCurrentScreen('medical_profile')}
                className="w-9 h-9 rounded-full bg-slate-200 overflow-hidden cursor-pointer border border-slate-200"
              >
                <img
                  src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80"
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            {/* Headline */}
            <div className="text-center px-6 mt-6">
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">Are you in an emergency?</h2>
              <p className="text-xs text-slate-400 mt-2 font-medium max-w-[260px] mx-auto">
                Press the button below and help will reach you shortly.
              </p>
            </div>

            {/* Big SOS Circle with "SOS" text */}
            <div className="flex flex-col items-center justify-center my-auto py-6">
              <div className="relative flex items-center justify-center">
                <div className="w-64 h-64 rounded-full bg-[#FF5A5F]/10 absolute pointer-events-none" />
                <div className="w-52 h-52 rounded-full bg-[#FF5A5F]/15 absolute pointer-events-none" />

                <button
                  onClick={() => triggerSOS('Immediate SOS Button Press')}
                  className="w-36 h-36 rounded-full bg-gradient-to-tr from-[#FF5A5F] to-[#FA4D56] text-white flex items-center justify-center shadow-[0_20px_45px_rgba(255,90,95,0.45)] z-10 transform hover:scale-105 active:scale-95 transition"
                >
                  <span className="text-3xl font-black tracking-wider text-white">SOS</span>
                </button>
              </div>
            </div>

            {/* Quick Contact Bar at bottom */}
            <div className="px-6 pb-4">
              <div className="p-3.5 rounded-2xl bg-white border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.04)] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-100 border border-slate-200">
                    <img
                      src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80"
                      alt="Guardian"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-slate-800">Your Guardian</h5>
                    <p className="text-[10px] text-slate-400">213-432-9012 • Auto-notified</p>
                  </div>
                </div>
                <button
                  onClick={() => setCurrentScreen('contacts')}
                  className="px-3 py-1.5 rounded-full bg-red-50 text-[#FF5A5F] text-[11px] font-bold"
                >
                  Alerted
                </button>
              </div>
            </div>

            {/* Bottom Nav */}
            {renderBottomNav('sos')}
          </div>
        )}

        {/* ──────────────────────────────────────────────────────────
            SCREEN 3: LIVE RESPONSE MAP ("Ambulance and response teams away")
        ────────────────────────────────────────────────────────── */}
        {currentScreen === 'dispatch_map' && (
          <div className="flex-1 flex flex-col justify-between overflow-hidden bg-white">
            {/* Header */}
            <div className="p-4 bg-white/95 backdrop-blur-md border-b border-slate-100 flex items-center justify-between z-20">
              <button
                onClick={() => setCurrentScreen('home_main')}
                className="p-2 rounded-xl text-slate-700 hover:bg-slate-100 flex items-center gap-1 text-xs font-bold"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
              <span className="text-xs font-extrabold text-slate-800">Emergency Place</span>
              <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden border border-slate-200">
                <img
                  src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80"
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            {/* Text Banner from template */}
            <div className="px-5 py-2.5 bg-white border-b border-slate-50">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-black text-slate-900 leading-tight">
                  Ambulance and response teams away
                </h3>
                {activeIncident?.id && (
                  <span className="text-[10px] font-bold text-[#FF5A5F] bg-red-50 px-2 py-0.5 rounded-full">
                    #{activeIncident.id}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                Emergency trauma squad is en route to your verified GPS coordinates with priority traffic clearance.
              </p>
            </div>

            {/* Live Tactical Location Map */}
            <div className="flex-1 relative bg-slate-100 flex flex-col overflow-hidden">
              <LiveLocationMap
                userLat={coords.lat}
                userLng={coords.lng}
                incidentTitle={activeIncident?.category || 'Active Emergency Scene'}
                incidentCategory={activeIncident?.category || 'Road Accident'}
                riskScore={activeIncident?.risk_score || 94}
                riskRadiusMeters={250}
                height="320px"
                theme="light"
                showControls={false}
              />
            </div>

            {/* Bottom Floating Responder Card matching template */}
            <div className="p-4 bg-white border-t border-slate-100 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 flex-shrink-0">
                  <img
                    src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=120&auto=format&fit=crop&q=80"
                    alt="Responder"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 text-left">
                  <h4 className="text-xs font-extrabold text-slate-900">Ingredia Nutrisha</h4>
                  <p className="text-[10px] text-slate-400">214-432 West St rose houses Colorado, USA</p>
                  <p className="text-[10px] font-bold text-[#FF5A5F] mt-0.5 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>ETA ~6 Minutes • Ambulance Unit #4</span>
                  </p>
                </div>
              </div>

              {/* Action Buttons: Solid Coral CALL & Outline MESSAGE */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <button
                  onClick={() => alert('Calling Assigned Emergency Responder (112 / +1-214-432)...')}
                  className="py-3 rounded-2xl bg-gradient-to-r from-[#FF5A5F] to-[#FA4D56] text-white font-extrabold text-xs shadow-md shadow-red-500/25 hover:opacity-95 transition flex items-center justify-center gap-1.5"
                >
                  <Phone className="w-3.5 h-3.5 fill-white" />
                  <span>CALL</span>
                </button>

                <button
                  onClick={() => setShowLiveUpdates(true)}
                  className="py-3 rounded-2xl bg-white border border-[#FF5A5F]/40 text-[#FF5A5F] font-extrabold text-xs hover:bg-red-50/50 transition flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>LIVE UPDATES</span>
                </button>
              </div>
            </div>

            {/* Bottom Nav */}
            {renderBottomNav('location')}
          </div>
        )}

        {/* ──────────────────────────────────────────────────────────
            SCREEN 4: EMERGENCY CONTACTS SCREEN
        ────────────────────────────────────────────────────────── */}
        {currentScreen === 'contacts' && (
          <div className="flex-1 flex flex-col justify-between overflow-y-auto bg-white">
            {/* Header */}
            <div className="p-4 bg-white border-b border-slate-100 flex items-center justify-between sticky top-0 z-20">
              <button
                onClick={() => setCurrentScreen('home_main')}
                className="p-2 rounded-xl text-slate-700 hover:bg-slate-100 flex items-center gap-1 text-xs font-bold"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
              <span className="text-xs font-extrabold text-slate-800">Emergency Contacts</span>
              <button className="p-1.5 rounded-full text-slate-600 hover:bg-slate-100">
                <Search className="w-4 h-4" />
              </button>
            </div>

            {/* Contact List */}
            <div className="p-5 space-y-3 flex-1 overflow-y-auto">
              <div className="flex items-center justify-between mb-1">
                <h4 className="text-xs font-extrabold text-slate-800">Safety Circle</h4>
                <span className="text-[10px] text-slate-400">3 of 4 added</span>
              </div>

              {contactsList.map(c => (
                <div
                  key={c.id}
                  className="p-3.5 rounded-2xl bg-white border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex items-center justify-between hover:border-slate-200 transition"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 font-bold text-xs border border-slate-200">
                      {c.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <h5 className="text-xs font-bold text-slate-800">{c.name}</h5>
                      <p className="text-[10px] text-slate-400 font-mono">{c.phone}</p>
                    </div>
                  </div>

                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${c.statusColor}`}>
                    {c.status}
                  </span>
                </div>
              ))}

              {/* Add New Contact Card */}
              <button
                onClick={() => alert('Add emergency contact dialog opened')}
                className="w-full p-4 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 hover:bg-slate-50 flex items-center justify-center gap-2 text-slate-600 transition"
              >
                <div className="w-6 h-6 rounded-full bg-[#FF5A5F] text-white flex items-center justify-center">
                  <Plus className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <h5 className="text-xs font-bold text-slate-800">Add New</h5>
                  <p className="text-[9px] text-slate-400">Max 4 Contacts</p>
                </div>
              </button>
            </div>

            {/* Bottom Nav */}
            {renderBottomNav('contacts')}
          </div>
        )}

        {/* ──────────────────────────────────────────────────────────
            SCREEN 5: EMERGENCY MEDICAL PROFILE SCREEN ("Emergency Help")
        ────────────────────────────────────────────────────────── */}
        {currentScreen === 'medical_profile' && (
          <div className="flex-1 flex flex-col justify-between overflow-y-auto bg-[#F8F9FB]">
            {/* Header */}
            <div className="p-4 bg-white border-b border-slate-100 flex items-center justify-between sticky top-0 z-20">
              <button
                onClick={() => setCurrentScreen('home_main')}
                className="p-2 rounded-xl text-slate-700 hover:bg-slate-100 flex items-center gap-1 text-xs font-bold"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
              <span className="text-xs font-extrabold text-slate-800">Emergency Help</span>
              <button className="w-8 h-8 rounded-full bg-red-50 text-[#FF5A5F] flex items-center justify-center">
                <Edit3 className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* User Profile Summary */}
              <div className="bg-white rounded-3xl p-4 shadow-[0_4px_25px_rgba(0,0,0,0.03)] border border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200">
                    <img
                      src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80"
                      alt="Barry"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900">Ursula Gunrmeister</h3>
                    <p className="text-[10px] text-slate-400">01 April, 1994 • Female</p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="px-2.5 py-1 rounded-full bg-red-50 text-[#FF5A5F] text-[10px] font-extrabold">
                    80%
                  </span>
                  <p className="text-[9px] text-slate-400 mt-0.5">Profile Data</p>
                </div>
              </div>

              {/* Metrics Grid from template (Age, Height, Blood Type) */}
              <div className="grid grid-cols-3 gap-2.5">
                <div className="bg-white p-3.5 rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-slate-100 text-center">
                  <Calendar className="w-4 h-4 text-slate-400 mx-auto mb-1" />
                  <span className="text-[9px] font-bold text-slate-400 uppercase">Age</span>
                  <h4 className="text-sm font-extrabold text-slate-900 mt-0.5">27 <span className="text-[10px] font-normal">years</span></h4>
                </div>

                <div className="bg-white p-3.5 rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-slate-100 text-center">
                  <Activity className="w-4 h-4 text-[#FF5A5F] mx-auto mb-1" />
                  <span className="text-[9px] font-bold text-slate-400 uppercase">Height</span>
                  <h4 className="text-sm font-extrabold text-slate-900 mt-0.5">182 <span className="text-[10px] font-normal">cm</span></h4>
                </div>

                <div className="bg-white p-3.5 rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-slate-100 text-center">
                  <Droplet className="w-4 h-4 text-red-500 mx-auto mb-1" />
                  <span className="text-[9px] font-bold text-slate-400 uppercase">Blood Type</span>
                  <h4 className="text-sm font-extrabold text-red-600 mt-0.5">O Rh-</h4>
                </div>
              </div>

              {/* Allergies & Reactions Card from template */}
              <div className="bg-white rounded-3xl p-4 shadow-[0_4px_25px_rgba(0,0,0,0.03)] border border-slate-100">
                <h4 className="text-xs font-extrabold text-slate-900 mb-2.5">Allergies & Reactions</h4>
                <div className="flex flex-wrap gap-2">
                  <span className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5">
                    🍇 <span>Grape</span>
                  </span>
                  <span className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5">
                    🍏 <span>Apple</span>
                  </span>
                  <span className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5">
                    🍓 <span>Strawberry</span>
                  </span>
                </div>
              </div>

              {/* Emergency Medical ID Alert */}
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                <div className="text-left">
                  <h5 className="text-xs font-bold text-emerald-900">Hospital Medical Passport Active</h5>
                  <p className="text-[10px] text-emerald-700 leading-tight">
                    Instant access granted to emergency trauma surgeons upon dispatch.
                  </p>
                </div>
              </div>
            </div>

            {/* Bottom Nav */}
            {renderBottomNav('profile')}
          </div>
        )}
      </div>

      {/* ─── Live Incident Updates Overlay for Citizens ─── */}
      {showLiveUpdates && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="relative w-full max-w-xl max-h-[90vh] flex flex-col rounded-2xl overflow-hidden shadow-2xl bg-slate-900 border border-slate-700">
            <div className="p-3.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  Citizen Live Incident Channel
                </h4>
              </div>
              <button
                onClick={() => setShowLiveUpdates(false)}
                className="text-xs px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-medium"
              >
                Close
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-2">
              <LiveIncidentUpdates
                complaint={
                  (activeIncident as Complaint) || {
                    id: '22222222-2222-4222-8222-222222222222',
                    category: 'Accident',
                    description: 'Emergency SOS Road Accident incident in progress.',
                    latitude: coords.lat,
                    longitude: coords.lng,
                    risk_score: 94,
                    risk_level: 'CRITICAL',
                    status: 'Emergency Response',
                    device_session_id: 'sos_citizen_session',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                  }
                }
                onUpdateAdded={(updated) => {
                  setActiveIncident(updated);
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
