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

  // Handle Photo Upload
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMediaError(null);

    // Size limit for photos: 15MB
    if (file.size > 15 * 1024 * 1024) {
      setMediaError('Photo exceeds 15MB limit. Please upload a smaller image.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setPhotoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
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
      <div className="glass-panel-glow rounded-2xl p-6 sm:p-8 border border-teal-500/40 flex flex-col items-center text-center animate-fadeIn">
        <div className="w-16 h-16 rounded-full bg-teal-500/20 text-teal-400 flex items-center justify-center mb-4 border border-teal-500/30">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-bold text-white mb-1">Complaint Logged Successfully</h3>
        <p className="text-slate-300 text-sm max-w-md mb-5">
          Your report has been received and automatically dispatched via VERA.
        </p>

        {/* Complaint Summary Card */}
        <div className="w-full max-w-lg bg-slate-900/90 rounded-xl p-4 border border-slate-800 text-left mb-5 space-y-2.5">
          <div className="flex justify-between items-center text-xs pb-2 border-b border-slate-800">
            <span className="text-slate-400">Incident ID:</span>
            <span className="font-mono text-teal-400 font-semibold">{submissionSuccess.id.substring(0, 13)}...</span>
          </div>

          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-400">Category:</span>
            <span className="font-medium text-slate-200">{submissionSuccess.category}</span>
          </div>

          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-400">Authority Routing:</span>
            <span className="font-semibold text-teal-300 flex items-center gap-1">
              <Building2 className="w-3 h-3" />
              {submissionSuccess.routed_department || selectedCatObj.dept}
            </span>
          </div>

          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-400">Status:</span>
            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              {submissionSuccess.status}
            </span>
          </div>

          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-400">Risk Assessment:</span>
            <span className={`font-semibold ${submissionSuccess.risk_score >= 60 ? 'text-red-400 font-bold' : 'text-slate-200'}`}>
              {submissionSuccess.risk_score} / 100 ({submissionSuccess.risk_level})
            </span>
          </div>

          {submissionSuccess.address && (
            <div className="text-xs pt-2 border-t border-slate-800 text-slate-300 flex items-start gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-teal-400 shrink-0 mt-0.5" />
              <span className="line-clamp-2">{submissionSuccess.address}</span>
            </div>
          )}

          {/* Attached Media Previews on Confirmation */}
          {(submissionSuccess.photo_url || submissionSuccess.video_url) && (
            <div className="pt-2 border-t border-slate-800 space-y-2">
              <span className="text-[11px] text-slate-400 block font-semibold uppercase">Attached Media</span>
              <div className="flex flex-wrap gap-2">
                {submissionSuccess.photo_url && (
                  <img
                    src={submissionSuccess.photo_url}
                    alt="Uploaded incident photo"
                    className="w-24 h-20 rounded-lg object-cover border border-slate-700"
                  />
                )}
                {submissionSuccess.video_url && (
                  <video
                    src={submissionSuccess.video_url}
                    controls
                    className="w-48 h-28 rounded-lg object-cover border border-slate-700 bg-black"
                  />
                )}
              </div>
            </div>
          )}
        </div>

        {/* Share Button & Notice (Section 42) */}
        <div className="w-full max-w-lg mb-5 flex flex-col gap-2">
          <button
            type="button"
            onClick={handleShare}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold text-xs border border-slate-700 flex items-center justify-center gap-2 transition"
          >
            <Share2 className="w-4 h-4 text-teal-400" />
            <span>Share Incident (One-Tap Web Share)</span>
          </button>
          {shareFeedback && (
            <span className="text-xs text-teal-400 font-medium">{shareFeedback}</span>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          {onNavigateToDashboard && (
            <button
              type="button"
              onClick={onNavigateToDashboard}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-sm transition shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2"
            >
              <span>View in Command Center</span>
            </button>
          )}
          <button
            onClick={handleResetForm}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-slate-950 font-semibold text-sm transition shadow-lg shadow-teal-500/20"
          >
            Submit Another Report
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="glass-panel rounded-2xl p-5 sm:p-7 border border-slate-800 space-y-6">
      <div>
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
            <Radio className="w-5 h-5 text-teal-400" />
            Report Issue or Emergency
          </h3>
          <span className="text-[11px] font-mono text-slate-400">Citizen Portal</span>
        </div>
        <p className="text-xs text-slate-400">
          Select category and describe the situation. Emergency incidents will be automatically analyzed by the backend risk engine and routed to responsible authorities.
        </p>
      </div>

      {/* 1. Category Selection */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
            1. Issue Category
          </label>
          <span className="text-[11px] text-teal-300 font-medium flex items-center gap-1">
            <Building2 className="w-3 h-3" />
            Routed to: {selectedCatObj.dept}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {CATEGORIES.map(cat => {
            const Icon = cat.icon;
            const isSelected = category === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategory(cat.id)}
                className={`flex items-center gap-2 p-2.5 rounded-xl text-left text-xs transition border ${
                  isSelected
                    ? cat.emergency
                      ? 'bg-red-500/20 text-red-300 border-red-500/50 shadow-sm shadow-red-500/20'
                      : 'bg-teal-500/20 text-teal-300 border-teal-500/50 shadow-sm shadow-teal-500/20'
                    : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isSelected ? (cat.emergency ? 'text-red-400' : 'text-teal-400') : 'text-slate-500'}`} />
                <span className="truncate font-medium">{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Description & Voice Input */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
            2. Incident Description
          </label>
          {speechSupported && (
            <button
              type="button"
              onClick={isListening ? stopListening : startListening}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition ${
                isListening
                  ? 'bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse'
                  : 'bg-slate-800 hover:bg-slate-700 text-teal-400 border border-slate-700'
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
            className="w-full bg-slate-900/90 border border-slate-700 rounded-xl p-3.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition"
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
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
            3. Verified Location (GPS)
          </label>
          <button
            type="button"
            onClick={requestLocation}
            disabled={geoLoading}
            className="inline-flex items-center gap-1 text-[11px] text-teal-400 hover:text-teal-300"
          >
            <RefreshCw className={`w-3 h-3 ${geoLoading ? 'animate-spin' : ''}`} />
            Refresh GPS
          </button>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col gap-2">
          {geoLoading ? (
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <RefreshCw className="w-4 h-4 animate-spin text-teal-400" />
              <span>Acquiring high-accuracy GPS coordinates...</span>
            </div>
          ) : latitude && longitude ? (
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-mono text-teal-300">
                  <MapPin className="w-4 h-4 text-teal-400 shrink-0" />
                  <span>{latitude.toFixed(5)}, {longitude.toFixed(5)}</span>
                </div>
                {accuracy && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-teal-500/10 text-teal-300 border border-teal-500/30">
                    GPS accuracy: approximately ±{accuracy} m
                  </span>
                )}
              </div>
              {address && (
                <p className="text-xs text-slate-300 font-medium line-clamp-2 pl-6">
                  {address}
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs text-amber-400">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{geoError || 'GPS permission not granted.'}</span>
              </div>
              <button
                type="button"
                onClick={() => setUseManualCoords(!useManualCoords)}
                className="text-xs text-teal-400 hover:underline"
              >
                {useManualCoords ? 'Hide manual coordinates' : 'Enter coordinates manually'}
              </button>
            </div>
          )}

          {/* Manual coordinate entry fallback */}
          {useManualCoords && (
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800">
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Latitude</label>
                <input
                  type="number"
                  step="any"
                  value={manualLat}
                  onChange={(e) => setManualLat(e.target.value)}
                  placeholder="e.g. 26.8467"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-white"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Longitude</label>
                <input
                  type="number"
                  step="any"
                  value={manualLon}
                  onChange={(e) => setManualLon(e.target.value)}
                  placeholder="e.g. 80.9462"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-white"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 4. Photo & Video Uploads (Section 39) */}
      <div className="space-y-3">
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 block">
          4. Attach Evidence (Photo & Video)
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Photo Attachment */}
          <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                <Upload className="w-3.5 h-3.5 text-teal-400" />
                Photo (PNG, JPG)
              </span>
              <label className="cursor-pointer px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-teal-300 text-xs font-medium transition border border-slate-700">
                {photoPreview ? 'Change' : 'Upload'}
                <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
              </label>
            </div>

            {photoPreview && (
              <div className="relative w-full h-24 rounded-lg overflow-hidden border border-teal-500/40">
                <img src={photoPreview} alt="Upload preview" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => setPhotoPreview(null)}
                  className="absolute top-1 right-1 bg-red-600/90 hover:bg-red-600 text-white rounded p-1 text-xs"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>

          {/* Video Attachment (Section 39: mp4, mov, webm up to 50MB) */}
          <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                <Video className="w-3.5 h-3.5 text-red-400" />
                Video (MP4, MOV, WEBM)
              </span>
              <label className="cursor-pointer px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-red-300 text-xs font-medium transition border border-slate-700">
                {videoPreview ? 'Change' : 'Upload (Max 50MB)'}
                <input type="file" accept="video/mp4,video/quicktime,video/webm" onChange={handleVideoUpload} className="hidden" />
              </label>
            </div>

            {/* Video Progress Bar */}
            {videoUploadProgress !== null && (
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span className="truncate">{videoFileName}</span>
                  <span>{videoUploadProgress}%</span>
                </div>
                <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden">
                  <div className="h-full bg-teal-500 transition-all duration-200" style={{ width: `${videoUploadProgress}%` }} />
                </div>
              </div>
            )}

            {/* Native HTML5 Video Preview */}
            {videoPreview && (
              <div className="relative w-full rounded-lg overflow-hidden border border-red-500/40 bg-black">
                <video src={videoPreview} controls className="w-full h-28 object-contain" />
                <button
                  type="button"
                  onClick={handleRemoveVideo}
                  className="absolute top-1 right-1 bg-red-600/90 hover:bg-red-600 text-white rounded p-1 text-xs z-10"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        </div>

        {mediaError && (
          <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-400 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{mediaError}</span>
          </div>
        )}
      </div>

      {submitError && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-400 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{submitError}</span>
        </div>
      )}

      {/* Submit Action */}
      <button
        type="submit"
        disabled={isSubmitting || geoLoading || (videoUploadProgress !== null && videoUploadProgress < 100)}
        className="w-full py-3.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-slate-950 font-bold text-sm transition flex items-center justify-center gap-2 shadow-lg shadow-teal-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
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
