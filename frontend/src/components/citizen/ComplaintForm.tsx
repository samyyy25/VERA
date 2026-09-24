import React, { useState, useEffect } from 'react';
import { 
  Radio, 
  MapPin, 
  Mic, 
  MicOff, 
  Upload, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  ShieldAlert,
  Flame,
  Car,
  HeartPulse,
  Trash2,
  Lightbulb,
  Droplets,
  Volume2,
  Eye,
  Send,
  Video,
  Share2,
  Building2,
  X
} from 'lucide-react';
import { useGeolocation } from '../../hooks/useGeolocation';
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition';
import { submitComplaint } from '../../services/api';
import { Complaint } from '../../types';
import { shareIncident } from '../../utils/shareCardGenerator';
import { compressImage } from '../../utils/imageCompressor';

interface ComplaintFormProps {
  onSuccess?: (complaint: Complaint) => void;
  onNavigateToDashboard?: () => void;
}

const CATEGORIES = [
  { id: 'Road damage', label: 'Road Damage', dept: 'Municipal Corporation — Roads Dept', icon: Car, emergency: false },
  { id: 'Garbage/waste', label: 'Garbage / Waste', dept: 'Municipal Corporation — Sanitation Dept', icon: Trash2, emergency: false },
  { id: 'Streetlight problems', label: 'Streetlight', dept: 'Municipal Corporation — Electrical Dept', icon: Lightbulb, emergency: false },
  { id: 'Water leakage', label: 'Water Leakage', dept: 'Municipal Corporation — Water & Sewerage Dept', icon: Droplets, emergency: false },
  { id: 'Noise complaints', label: 'Noise Issue', dept: 'Local Police — Non-Emergency Civic Cell', icon: Volume2, emergency: false },
  { id: 'Harassment', label: 'Harassment', dept: 'Police Department — Emergency Control Room', icon: ShieldAlert, emergency: true },
  { id: 'Suspicious activity', label: 'Suspicious Activity', dept: 'Police Department — Patrol Unit', icon: Eye, emergency: true },
  { id: 'Accident', label: 'Accident / Collision', dept: 'Police Dept + Nearest Hospital Emergency', icon: Car, emergency: true },
  { id: 'Fire', label: 'Fire Outbreak', dept: 'Fire & Rescue Services', icon: Flame, emergency: true },
  { id: 'Medical Emergency', label: 'Medical Emergency', dept: 'Nearest Hospital Emergency & Ambulance', icon: HeartPulse, emergency: true },
  { id: 'Other civic issues', label: 'Other Issue', dept: 'General Municipal Helpdesk', icon: Radio, emergency: false },
];

export const ComplaintForm: React.FC<ComplaintFormProps> = ({ onSuccess, onNavigateToDashboard }) => {
  const [category, setCategory] = useState<string>('Road damage');
  const [description, setDescription] = useState<string>('');
  
  // Media uploads
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoCompressing, setPhotoCompressing] = useState<boolean>(false);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [videoFileName, setVideoFileName] = useState<string | null>(null);
  const [videoUploadProgress, setVideoUploadProgress] = useState<number | null>(null);
  const [mediaError, setMediaError] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submissionSuccess, setSubmissionSuccess] = useState<Complaint | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);

  // Manual coordinate fallback if GPS permission is denied
  const [manualLat, setManualLat] = useState<string>('');
  const [manualLon, setManualLon] = useState<string>('');
  const [useManualCoords, setUseManualCoords] = useState<boolean>(false);

  const { latitude, longitude, accuracy, address, loading: geoLoading, error: geoError, permissionDenied, requestLocation } = useGeolocation();
  const { isListening, transcript, isSupported: speechSupported, startListening, stopListening, resetTranscript } = useSpeechRecognition();

  // Selected category department mapping
  const selectedCatObj = CATEGORIES.find(c => c.id === category) || CATEGORIES[0];

  // Citizen Portal Mode: Civic vs Emergency
  const [portalMode, setPortalMode] = useState<'civic' | 'emergency'>('civic');
  const [autoSwitched, setAutoSwitched] = useState<boolean>(false);

  // Auto-detect emergency danger keywords in Civic mode
  useEffect(() => {
    if (portalMode === 'civic') {
      const urgentWords = /\b(accident|crash|collision|bleed\w*|blood|unconscious|passed out|explosion|blast|fire|trapped|victim|dying|stab\w*|gunshot|heart attack|casualt\w*)\b/i;
      if (urgentWords.test(description)) {
        setPortalMode('emergency');
        setAutoSwitched(true);
        if (/\b(fire|flame|blaz\w*)\b/i.test(description)) {
          setCategory('Fire');
        } else if (/\b(unconscious|heart|chest pain|stroke|ambulance)\b/i.test(description)) {
          setCategory('Medical Emergency');
        } else {
          setCategory('Accident');
        }
      }
    }
  }, [description, portalMode]);

  // Persist or retrieve anonymous device session ID
  const [sessionId, setSessionId] = useState<string>('');
  useEffect(() => {
    let currentSession = localStorage.getItem('vera_device_session_id');
    if (!currentSession) {
      currentSession = 'sess_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now().toString(36);
      localStorage.setItem('vera_device_session_id', currentSession);
    }
    setSessionId(currentSession);
  }, []);

  // Sync speech transcript into description
  useEffect(() => {
    if (transcript) {
      setDescription(prev => {
        const trimmed = prev.trim();
        if (!trimmed) return transcript;
        if (prev.endsWith(transcript)) return prev;
        return `${trimmed} ${transcript}`;
      });
    }
  }, [transcript]);

  // Handle Photo Upload with client-side optimization
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMediaError(null);

    // Size limit for original photos: 25MB
    if (file.size > 25 * 1024 * 1024) {
      setMediaError('Photo exceeds 25MB limit. Please upload a smaller image.');
      return;
    }

    try {
      setPhotoCompressing(true);
      const compressed = await compressImage(file);
      setPhotoPreview(compressed);
    } catch (err) {
      console.warn('Image compression fallback to standard reader:', err);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } finally {
      setPhotoCompressing(false);
    }
  };

  // Handle Video Upload (mp4, mov, webm up to 50MB) - Section 39
  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMediaError(null);

    const validExtensions = ['mp4', 'mov', 'webm'];
    const ext = file.name.split('.').pop()?.toLowerCase();

    if (!ext || !validExtensions.includes(ext)) {
      setMediaError(`Invalid video format (.${ext}). Accepted formats: MP4, MOV, WEBM.`);
      return;
    }

    const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB
    if (file.size > MAX_VIDEO_SIZE) {
      setMediaError(`Video file (${(file.size / (1024 * 1024)).toFixed(1)}MB) exceeds the 50MB limit. Please trim or choose a smaller file.`);
      return;
    }

    setVideoFileName(file.name);
    setVideoUploadProgress(10);

    // Simulate non-blocking upload progress and generate preview
    const reader = new FileReader();
    
    // Simulate upload progress steps
    const interval = setInterval(() => {
      setVideoUploadProgress(prev => {
        if (prev === null || prev >= 90) {
          clearInterval(interval);
          return prev;
        }
        return prev + 25;
      });
    }, 150);

    reader.onloadend = () => {
      clearInterval(interval);
      setVideoUploadProgress(100);
      setVideoPreview(reader.result as string);
      setTimeout(() => setVideoUploadProgress(null), 800);
    };

    reader.onerror = () => {
      clearInterval(interval);
      setVideoUploadProgress(null);
      setMediaError('Failed to read video file. You can still submit your report without it.');
    };

    reader.readAsDataURL(file);
  };

  const handleRemoveVideo = () => {
    setVideoPreview(null);
    setVideoFileName(null);
    setVideoUploadProgress(null);
  };

  const handleShare = async () => {
    if (!submissionSuccess) return;
    setShareFeedback('Generating share card...');
    const res = await shareIncident(submissionSuccess);
    if (res.method === 'download_fallback') {
      setShareFeedback('Card downloaded & summary copied to clipboard!');
    } else if (res.shared) {
      setShareFeedback('Share dialog opened.');
    } else {
      setShareFeedback(null);
    }
    setTimeout(() => setShareFeedback(null), 4000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (videoUploadProgress !== null && videoUploadProgress < 100) {
      setSubmitError('Please wait for video upload to finish before submitting.');
      return;
    }

    let finalLat = latitude;
    let finalLon = longitude;
    let finalAccuracy = accuracy;

    if (useManualCoords || permissionDenied) {
      const parsedLat = parseFloat(manualLat);
      const parsedLon = parseFloat(manualLon);
      if (isNaN(parsedLat) || isNaN(parsedLon)) {
        setSubmitError('Please provide valid latitude and longitude coordinates, or grant GPS permission.');
        return;
      }
      finalLat = parsedLat;
      finalLon = parsedLon;
      finalAccuracy = null;
    }

    if (finalLat === null || finalLon === null) {
      setSubmitError('Location is required. Please enable GPS permissions or enter coordinates manually.');
      return;
    }

    if (!description || description.trim().length < 3) {
      setSubmitError('Please enter a description of the issue (at least 3 characters).');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await submitComplaint({
        category,
        description: description.trim(),
        latitude: finalLat,
        longitude: finalLon,
        gps_accuracy: finalAccuracy,
        address: address || undefined,
        photo_url: photoPreview || undefined,
        video_url: videoPreview || undefined,
        voice_transcript: transcript || undefined,
        device_session_id: sessionId || 'anonymous_device',
      });

      if (response.success && response.complaint) {
        setSubmissionSuccess(response.complaint);
        if (onSuccess) {
          onSuccess(response.complaint);
        }
      }
    } catch (err: any) {
      setSubmitError(err.response?.data?.message || err.message || 'Failed to submit complaint. Please check connection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetForm = () => {
    setDescription('');
    setPhotoPreview(null);
    setVideoPreview(null);
    setVideoFileName(null);
    setVideoUploadProgress(null);
    setSubmissionSuccess(null);
    setSubmitError(null);
    setMediaError(null);
    resetTranscript();
  };

  if (submissionSuccess) {
    return (
      <div className="vera-card-elevated rounded-2xl p-6 sm:p-8 border border-[var(--vera-border-strong)] flex flex-col items-center text-center animate-fadeIn">
        <div className="w-16 h-16 rounded-full bg-[#800020]/15 text-[#800020] dark:text-[#D45060] flex items-center justify-center mb-4 border border-[#800020]/30">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-bold text-[var(--vera-text-primary)] mb-1">Complaint Logged Successfully</h3>
        <p className="text-[var(--vera-text-secondary)] text-sm max-w-md mb-5">
          Your report has been received and automatically dispatched via VERA.
        </p>

        {/* Complaint Summary Card */}
        <div className="w-full max-w-lg vera-card rounded-xl p-4 border border-[var(--vera-border)] text-left mb-5 space-y-2.5">
          <div className="flex justify-between items-center text-xs pb-2 border-b border-[var(--vera-border)]">
            <span className="text-[var(--vera-text-muted)]">Incident ID:</span>
            <span className="font-mono text-[#800020] dark:text-[#D45060] font-semibold">{submissionSuccess.id.substring(0, 13)}...</span>
          </div>

          <div className="flex justify-between items-center text-xs">
            <span className="text-[var(--vera-text-muted)]">Category:</span>
            <span className="font-medium text-[var(--vera-text-primary)]">{submissionSuccess.category}</span>
          </div>

          <div className="flex justify-between items-center text-xs">
            <span className="text-[var(--vera-text-muted)]">Authority Routing:</span>
            <span className="font-semibold text-[#800020] dark:text-[#D45060] flex items-center gap-1">
              <Building2 className="w-3 h-3" />
              {submissionSuccess.routed_department || selectedCatObj.dept}
            </span>
          </div>

          <div className="flex justify-between items-center text-xs">
            <span className="text-[var(--vera-text-muted)]">Status:</span>
            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              {submissionSuccess.status}
            </span>
          </div>

          <div className="flex justify-between items-center text-xs">
            <span className="text-[var(--vera-text-muted)]">Risk Assessment:</span>
            <span className={`font-semibold ${submissionSuccess.risk_score >= 60 ? 'text-[#D45060] font-bold' : 'text-[var(--vera-text-primary)]'}`}>
              {submissionSuccess.risk_score} / 100 ({submissionSuccess.risk_level})
            </span>
          </div>

          {submissionSuccess.address && (
            <div className="text-xs pt-2 border-t border-[var(--vera-border)] text-[var(--vera-text-secondary)] flex items-start gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#D45060] shrink-0 mt-0.5" />
              <span className="line-clamp-2">{submissionSuccess.address}</span>
            </div>
          )}

          {/* Attached Media Previews on Confirmation */}
          {(submissionSuccess.photo_url || submissionSuccess.video_url) && (
            <div className="pt-2 border-t border-[var(--vera-border)] space-y-2">
              <span className="text-[11px] text-[var(--vera-text-muted)] block font-semibold uppercase">Attached Media</span>
              <div className="flex flex-wrap gap-2">
                {submissionSuccess.photo_url && (
                  <img
                    src={submissionSuccess.photo_url}
                    alt="Uploaded incident photo"
                    className="w-24 h-20 rounded-lg object-cover border border-[var(--vera-border)]"
                  />
                )}
                {submissionSuccess.video_url && (
                  <video
                    src={submissionSuccess.video_url}
                    controls
                    className="w-48 h-28 rounded-lg object-cover border border-[var(--vera-border)] bg-black"
                  />
                )}
              </div>
            </div>
          )}
        </div>

        {/* Share Button & Notice */}
        <div className="w-full max-w-lg mb-5 flex flex-col gap-2">
          <button
            type="button"
            onClick={handleShare}
            className="w-full py-2.5 px-4 rounded-xl vera-button-secondary font-semibold text-xs flex items-center justify-center gap-2 transition"
          >
            <Share2 className="w-4 h-4 text-[#D45060]" />
            <span>Share Incident (One-Tap Web Share)</span>
          </button>
          {shareFeedback && (
            <span className="text-xs text-[#800020] dark:text-[#D45060] font-medium">{shareFeedback}</span>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          {onNavigateToDashboard && (
            <button
              type="button"
              onClick={onNavigateToDashboard}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl vera-button-primary font-bold text-sm transition flex items-center justify-center gap-2"
            >
              <span>View in Command Center</span>
            </button>
          )}
          <button
            onClick={handleResetForm}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl vera-button-secondary font-semibold text-sm transition"
          >
            Submit Another Report
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="vera-card rounded-2xl p-5 sm:p-7 border border-[var(--vera-border)] space-y-6">
      {/* Citizen Portal Mode Selector */}
      <div className="bg-[var(--vera-surface-muted)] border border-[var(--vera-border)] rounded-xl p-1.5 flex items-center gap-2">
        <button
          type="button"
          onClick={() => {
            setPortalMode('civic');
            setAutoSwitched(false);
            if (CATEGORIES.find(c => c.id === category)?.emergency) {
              setCategory('Road damage');
            }
          }}
          className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold uppercase tracking-wider transition flex items-center justify-center gap-2 cursor-pointer ${
            portalMode === 'civic'
              ? 'bg-[#800020] text-[#FFF9F2] shadow-md'
              : 'text-[var(--vera-text-muted)] hover:text-[var(--vera-text-primary)]'
          }`}
        >
          <Building2 className="w-4 h-4" />
          Report Civic Issue
        </button>
        <button
          type="button"
          onClick={() => {
            setPortalMode('emergency');
            if (!CATEGORIES.find(c => c.id === category)?.emergency) {
              setCategory('Accident');
            }
          }}
          className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold uppercase tracking-wider transition flex items-center justify-center gap-2 cursor-pointer ${
            portalMode === 'emergency'
              ? 'bg-[#D45060] text-white shadow-md'
              : 'text-[var(--vera-text-muted)] hover:text-[var(--vera-text-primary)]'
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          Emergency Priority
        </button>
      </div>

      {/* Auto-Switched Emergency Banner */}
      {autoSwitched && portalMode === 'emergency' && (
        <div className="p-3 bg-red-950/40 border border-red-500/50 rounded-xl text-xs text-red-300 dark:text-red-200 flex items-center justify-between gap-2 animate-fade-in">
          <div className="flex items-center gap-2 font-medium">
            <ShieldAlert className="w-4 h-4 text-[#D45060] shrink-0 animate-pulse" />
            <span>Acute danger language detected &mdash; Automatically switched to Priority Emergency Mode.</span>
          </div>
          <button
            type="button"
            onClick={() => setAutoSwitched(false)}
            className="text-[#D45060] hover:underline text-[10px] uppercase font-bold cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-base sm:text-lg font-bold text-[var(--vera-text-primary)] flex items-center gap-2">
            <Radio className={`w-5 h-5 ${portalMode === 'emergency' ? 'text-[#D45060] animate-pulse' : 'text-[#800020] dark:text-[#D45060]'}`} />
            {portalMode === 'emergency' ? 'Emergency Incident Response' : 'Report Civic Issue'}
          </h3>
          <span className="text-[11px] font-mono text-[var(--vera-text-muted)]">Citizen Portal</span>
        </div>
        <p className="text-xs text-[var(--vera-text-secondary)]">
          {portalMode === 'emergency'
            ? 'Emergency reports are prioritized with live AI risk scoring, hospital/police dispatch recommendations, and instant escalation.'
            : 'Select issue category and submit details. Reports are automatically routed to the responsible municipal department with trackable SLA.'}
        </p>
      </div>

      {/* 1. Category Selection */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold uppercase tracking-wider text-[var(--vera-text-secondary)]">
            1. Issue Category
          </label>
          <span className="text-[11px] text-[#800020] dark:text-[#D45060] font-medium flex items-center gap-1">
            <Building2 className="w-3 h-3" />
            Routed to: {selectedCatObj.dept}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {CATEGORIES.filter(cat => (portalMode === 'emergency' ? cat.emergency : true)).map(cat => {
            const Icon = cat.icon;
            const isSelected = category === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategory(cat.id)}
                className={`flex items-center gap-2 p-2.5 rounded-xl text-left text-xs transition border cursor-pointer ${
                  isSelected
                    ? cat.emergency
                      ? 'bg-[#D45060] text-white border-[#D45060] shadow-sm font-bold'
                      : 'bg-[#800020] text-[#FFF9F2] border-[#800020] shadow-sm font-bold'
                    : 'bg-[var(--vera-surface)] text-[var(--vera-text-secondary)] border-[var(--vera-border)] hover:text-[var(--vera-text-primary)] hover:bg-[var(--vera-surface-muted)]'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isSelected ? 'text-white' : 'text-[var(--vera-text-muted)]'}`} />
                <span className="truncate font-medium">{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Description & Voice Input */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold uppercase tracking-wider text-[var(--vera-text-secondary)]">
            2. Incident Description
          </label>
          {speechSupported && (
            <button
              type="button"
              onClick={isListening ? stopListening : startListening}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                isListening
                  ? 'bg-red-500/20 text-[#D45060] border border-red-500/40 animate-pulse'
                  : 'bg-[var(--vera-surface-muted)] hover:bg-[var(--vera-surface)] text-[#800020] dark:text-[#D45060] border border-[var(--vera-border)]'
              }`}
            >
              {isListening ? (
                <>
                  <MicOff className="w-3.5 h-3.5" />
                  <span>Stop Listening</span>
                </>
              ) : (
                <>
                  <Mic className="w-3.5 h-3.5" />
                  <span>Voice Input (Speech-to-Text)</span>
                </>
              )}
            </button>
          )}
        </div>

        <div className="relative">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            placeholder="Describe what happened, injuries, hazards, or location landmarks..."
            className="w-full vera-input rounded-xl p-3.5 text-sm focus:outline-none transition"
          />
          {isListening && (
            <div className="absolute bottom-3 right-3 flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-red-950/80 border border-red-500/30 text-[10px] text-red-300">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
              Recording live audio...
            </div>
          )}
        </div>
      </div>

      {/* 3. Geolocation & Accuracy Banner */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold uppercase tracking-wider text-[var(--vera-text-secondary)]">
            3. Verified Location (GPS)
          </label>
          <button
            type="button"
            onClick={requestLocation}
            disabled={geoLoading}
            className="inline-flex items-center gap-1 text-[11px] text-[#800020] dark:text-[#D45060] hover:underline cursor-pointer"
          >
            <RefreshCw className={`w-3 h-3 ${geoLoading ? 'animate-spin' : ''}`} />
            Refresh GPS
          </button>
        </div>

        <div className="p-3.5 rounded-xl bg-[var(--vera-surface)] border border-[var(--vera-border)] flex flex-col gap-2">
          {geoLoading ? (
            <div className="flex items-center gap-2 text-xs text-[var(--vera-text-muted)]">
              <RefreshCw className="w-4 h-4 animate-spin text-[#800020] dark:text-[#D45060]" />
              <span>Acquiring high-accuracy GPS coordinates...</span>
            </div>
          ) : latitude && longitude ? (
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-mono text-[var(--vera-text-primary)]">
                  <MapPin className="w-4 h-4 text-[#D45060] shrink-0" />
                  <span>{latitude.toFixed(5)}, {longitude.toFixed(5)}</span>
                </div>
                {accuracy && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#800020]/15 text-[#800020] dark:text-[#F3E6D5] border border-[#800020]/30">
                    GPS accuracy: approximately ±{accuracy} m
                  </span>
                )}
              </div>
              {address && (
                <p className="text-xs text-[var(--vera-text-secondary)] font-medium line-clamp-2 pl-6">
                  {address}
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs text-amber-500">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{geoError || 'GPS permission not granted.'}</span>
              </div>
              <button
                type="button"
                onClick={() => setUseManualCoords(!useManualCoords)}
                className="text-xs text-[#800020] dark:text-[#D45060] hover:underline cursor-pointer"
              >
                {useManualCoords ? 'Hide manual coordinates' : 'Enter coordinates manually'}
              </button>
            </div>
          )}

          {/* Manual coordinate entry fallback */}
          {useManualCoords && (
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[var(--vera-border)]">
              <div>
                <label className="text-[10px] text-[var(--vera-text-muted)] block mb-1">Latitude</label>
                <input
                  type="number"
                  step="any"
                  value={manualLat}
                  onChange={(e) => setManualLat(e.target.value)}
                  placeholder="e.g. 26.8467"
                  className="w-full vera-input rounded-lg p-2 text-xs"
                />
              </div>
              <div>
                <label className="text-[10px] text-[var(--vera-text-muted)] block mb-1">Longitude</label>
                <input
                  type="number"
                  step="any"
                  value={manualLon}
                  onChange={(e) => setManualLon(e.target.value)}
                  placeholder="e.g. 80.9462"
                  className="w-full vera-input rounded-lg p-2 text-xs"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 4. Photo & Video Uploads */}
      <div className="space-y-3">
        <label className="text-xs font-semibold uppercase tracking-wider text-[var(--vera-text-secondary)] block">
          4. Attach Evidence (Photo & Video)
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Photo Attachment */}
          <div className="p-3 bg-[var(--vera-surface-muted)] rounded-xl border border-[var(--vera-border)] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[var(--vera-text-secondary)] flex items-center gap-1.5">
                <Upload className="w-3.5 h-3.5 text-[#800020] dark:text-[#D45060]" />
                Photo (PNG, JPG)
              </span>
              <label className="cursor-pointer px-2.5 py-1 rounded-lg vera-button-secondary text-xs font-medium transition">
                {photoCompressing ? 'Optimizing...' : photoPreview ? 'Change' : 'Upload'}
                <input type="file" accept="image/*" onChange={handlePhotoUpload} disabled={photoCompressing} className="hidden" />
              </label>
            </div>

            {photoPreview && (
              <div className="relative w-full h-24 rounded-lg overflow-hidden border border-[var(--vera-border)]">
                <img src={photoPreview} alt="Upload preview" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => setPhotoPreview(null)}
                  className="absolute top-1 right-1 bg-red-600/90 hover:bg-red-600 text-white rounded p-1 text-xs cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>

          {/* Video Attachment */}
          <div className="p-3 bg-[var(--vera-surface-muted)] rounded-xl border border-[var(--vera-border)] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[var(--vera-text-secondary)] flex items-center gap-1.5">
                <Video className="w-3.5 h-3.5 text-[#D45060]" />
                Video (MP4, MOV, WEBM)
              </span>
              <label className="cursor-pointer px-2.5 py-1 rounded-lg vera-button-secondary text-xs font-medium transition">
                {videoPreview ? 'Change' : 'Upload (Max 50MB)'}
                <input type="file" accept="video/mp4,video/quicktime,video/webm" onChange={handleVideoUpload} className="hidden" />
              </label>
            </div>

            {/* Video Progress Bar */}
            {videoUploadProgress !== null && (
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] text-[var(--vera-text-muted)]">
                  <span className="truncate">{videoFileName}</span>
                  <span>{videoUploadProgress}%</span>
                </div>
                <div className="w-full bg-[var(--vera-surface)] rounded-full h-1.5 overflow-hidden">
                  <div className="h-full bg-[#800020] dark:bg-[#D45060] transition-all duration-200" style={{ width: `${videoUploadProgress}%` }} />
                </div>
              </div>
            )}

            {/* Native HTML5 Video Preview */}
            {videoPreview && (
              <div className="relative w-full rounded-lg overflow-hidden border border-[var(--vera-border)] bg-black">
                <video src={videoPreview} controls className="w-full h-28 object-contain" />
                <button
                  type="button"
                  onClick={handleRemoveVideo}
                  className="absolute top-1 right-1 bg-red-600/90 hover:bg-red-600 text-white rounded p-1 text-xs z-10 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        </div>

        {mediaError && (
          <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-500 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{mediaError}</span>
          </div>
        )}
      </div>

      {submitError && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-500 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{submitError}</span>
        </div>
      )}

      {/* Submit Action */}
      <button
        type="submit"
        disabled={isSubmitting || geoLoading || photoCompressing || (videoUploadProgress !== null && videoUploadProgress < 100)}
        className="w-full py-3.5 rounded-xl vera-button-primary font-bold text-sm transition flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
      >
        {isSubmitting ? (
          <>
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>Submitting Complaint...</span>
          </>
        ) : (
          <>
            <Send className="w-4 h-4" />
            <span>Submit Complaint to VERA</span>
          </>
        )}
      </button>
    </form>
  );
};
