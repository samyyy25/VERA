import React, { useState, useEffect, useRef } from 'react';
import { Complaint, IncidentUpdate, UpdateAuthorType, UpdateCategory, UserRole } from '../../types';
import {
  fetchIncidentUpdates,
  postIncidentUpdate,
  togglePinUpdate,
} from '../../services/api';
import { useRole } from '../../context/RoleContext';
import {
  Radio,
  Send,
  Pin,
  ShieldCheck,
  Image as ImageIcon,
  Sparkles,
  User,
  Building2,
  Clock,
  RefreshCw,
  X,
  Shield,
  HeartPulse,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface LiveIncidentUpdatesProps {
  complaint: Complaint;
  onUpdateAdded?: (updatedComplaint: Complaint) => void;
  className?: string;
  isCompact?: boolean;
}

export const LiveIncidentUpdates: React.FC<LiveIncidentUpdatesProps> = ({
  complaint,
  onUpdateAdded,
  className = '',
}) => {
  const { currentRole, currentUserProfile, setRole } = useRole();
  const [updates, setUpdates] = useState<IncidentUpdate[]>(complaint.updates || []);
  const [authorName, setAuthorName] = useState(currentUserProfile.name);
  const [authorRole, setAuthorRole] = useState(currentUserProfile.title);
  const [message, setMessage] = useState('');
  const [updateType, setUpdateType] = useState<UpdateCategory>('situation_update');
  const [photoUrl, setPhotoUrl] = useState('');
  const [showPhotoInput, setShowPhotoInput] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<
    'ALL' | 'POLICE' | 'HOSPITAL' | 'MUNICIPAL' | 'CITIZEN' | 'SYSTEM'
  >('ALL');
  const [selectedImageModal, setSelectedImageModal] = useState<string | null>(null);

  const updatesEndRef = useRef<HTMLDivElement>(null);

  // Sync when prop updates change
  useEffect(() => {
    if (complaint.updates) {
      setUpdates(complaint.updates);
    }
  }, [complaint.updates]);

  // Keep author fields in sync when global role changes
  useEffect(() => {
    setAuthorName(currentUserProfile.name);
    setAuthorRole(currentUserProfile.title);
    if (currentRole === 'citizen') {
      setUpdateType('situation_update');
      setIsPinned(false);
    } else if (currentRole === 'police') {
      setUpdateType('dispatch_update');
    } else if (currentRole === 'hospital') {
      setUpdateType('responder_update');
    } else if (currentRole === 'municipal') {
      setUpdateType('status_update');
    }
  }, [currentRole, currentUserProfile]);

  const refreshUpdates = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetchIncidentUpdates(complaint.id);
      if (res.success && res.updates) {
        setUpdates(res.updates);
        if (onUpdateAdded) {
          onUpdateAdded({ ...complaint, updates: res.updates });
        }
      }
    } catch (err) {
      console.error('Failed to refresh updates:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handlePostUpdate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!message.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const authorType: UpdateAuthorType = currentRole;
      const res = await postIncidentUpdate(complaint.id, {
        author_type: authorType,
        author_name: authorName.trim() || currentUserProfile.name,
        author_role: authorRole.trim() || currentUserProfile.title,
        message: message.trim(),
        update_type: updateType,
        photo_url: photoUrl.trim() || null,
        is_pinned: isPinned && currentRole !== 'citizen',
        is_verified_authority: currentRole !== 'citizen',
      });

      if (res.success && res.update) {
        const nextUpdates = [...updates, res.update];
        setUpdates(nextUpdates);
        setMessage('');
        setPhotoUrl('');
        setShowPhotoInput(false);
        setIsPinned(false);

        if (onUpdateAdded) {
          onUpdateAdded({ ...complaint, updates: nextUpdates });
        }

        setTimeout(() => {
          updatesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    } catch (err) {
      console.error('Failed to post update:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTogglePin = async (updateId: string) => {
    try {
      const res = await togglePinUpdate(complaint.id, updateId);
      if (res.success && res.update) {
        const nextUpdates = updates.map((u) => (u.id === updateId ? res.update! : u));
        setUpdates(nextUpdates);
        if (onUpdateAdded) {
          onUpdateAdded({ ...complaint, updates: nextUpdates });
        }
      }
    } catch (err) {
      console.error('Failed to toggle pin:', err);
    }
  };

  // Real-time Supabase subscription
  useEffect(() => {
    const client = supabase;
    if (!client) return;

    const channel = client
      .channel(`incident_updates_${complaint.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'incident_updates',
          filter: `incident_id=eq.${complaint.id}`,
        },
        () => {
          refreshUpdates();
        }
      )
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  }, [complaint.id]);

  // Role-specific quick chips
  const quickChipsByRole: Record<UserRole, string[]> = {
    citizen: [
      'Traffic is completely blocked near the accident.',
      'Two vehicles involved with minor smoke.',
      'Ambulance has arrived on scene.',
      'Victim safely on roadside awaiting assistance.',
      'Water is overflowing onto main pedestrian footpath.',
    ],
    police: [
      'Patrol Unit 08 has reached the location.',
      'Perimeter secured; traffic diversion in effect.',
      'Accident clearance initiated; lane 1 reopened.',
      'Patrol requesting additional municipal tow unit.',
    ],
    hospital: [
      '2 ALS Ambulances dispatched; ETA 6 minutes.',
      'ER Trauma bay prepped for incoming casualties.',
      'Patient received at emergency triage; vitals stable.',
      'Critical care resuscitation team deployed.',
    ],
    municipal: [
      'Heavy crane & road clearance crew dispatched.',
      'Water main pipeline supply isolated at valve #4.',
      'Sanitation team deployed for hazardous spill clean-up.',
      'Civic infrastructure repairs completed & verified.',
    ],
  };

  const filteredUpdates = updates.filter((u) => {
    if (activeFilter === 'ALL') return true;
    if (activeFilter === 'POLICE') return u.author_type === 'police';
    if (activeFilter === 'HOSPITAL') return u.author_type === 'hospital';
    if (activeFilter === 'MUNICIPAL') return u.author_type === 'municipal' || u.author_type === 'authority';
    if (activeFilter === 'CITIZEN') return u.author_type === 'citizen';
    if (activeFilter === 'SYSTEM') return u.author_type === 'system';
    return true;
  });

  // Sort pinned updates first, then chronological
  const sortedUpdates = [...filteredUpdates].sort((a, b) => {
    if (a.is_pinned && !b.is_pinned) return -1;
    if (!a.is_pinned && b.is_pinned) return 1;
    return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
  });

  const getRoleBadge = (update: IncidentUpdate) => {
    const type = update.author_type;
    if (type === 'police') {
      return {
        icon: <Shield className="w-3.5 h-3.5" />,
        label: 'POLICE',
        badge: 'bg-blue-950/80 text-blue-300 border-blue-500/40',
        bubble: 'bg-[#0d1620] border-blue-900/40',
      };
    }
    if (type === 'hospital') {
      return {
        icon: <HeartPulse className="w-3.5 h-3.5" />,
        label: 'HOSPITAL / EMS',
        badge: 'bg-rose-950/80 text-rose-300 border-rose-500/40',
        bubble: 'bg-[#1a1114] border-rose-900/40',
      };
    }
    if (type === 'municipal' || type === 'authority') {
      return {
        icon: <Building2 className="w-3.5 h-3.5" />,
        label: 'MUNICIPAL DEPT',
        badge: 'bg-purple-950/80 text-purple-300 border-purple-500/40',
        bubble: 'bg-[#15101a] border-purple-900/40',
      };
    }
    if (type === 'system') {
      return {
        icon: <Sparkles className="w-3.5 h-3.5" />,
        label: 'VERA AI SYSTEM',
        badge: 'bg-[#800020]/25 text-[#D45060] border-[#800020]/50 font-bold',
        bubble: 'bg-[var(--vera-surface-elevated)] border-[var(--vera-border)]',
      };
    }
    return {
      icon: <User className="w-3.5 h-3.5" />,
      label: 'CITIZEN',
      badge: 'bg-[var(--vera-surface-muted)] text-[var(--vera-text-primary)] border-[var(--vera-border)]',
      bubble: 'bg-[var(--vera-surface)] border-[var(--vera-border)]',
    };
  };

  return (
    <div
      className={`flex flex-col vera-card rounded-2xl overflow-hidden shadow-2xl ${className}`}
    >
      {/* Top Header */}
      <div className="p-4 border-b border-[var(--vera-border)] bg-[var(--vera-surface-elevated)] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative p-2 rounded-xl bg-[#800020]/20 border border-[#800020]/40 text-[#D45060]">
            <Radio className="w-5 h-5 animate-pulse text-[#D45060]" />
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#D45060] animate-ping" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black tracking-wider uppercase text-[var(--vera-text-primary)]">
                Live Incident Updates
              </h3>
              <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-[#800020]/20 text-[#D45060] border border-[#800020]/40">
                Multi-Agency Shared Feed
              </span>
            </div>
            <p className="text-[11px] text-[var(--vera-text-muted)]">
              Real-time collaboration across Citizen, Police, Hospital EMS, and Municipal Authorities
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={refreshUpdates}
            disabled={isRefreshing}
            className="p-2 rounded-xl bg-[var(--vera-surface)] hover:bg-[var(--vera-surface-muted)] text-[var(--vera-text-muted)] hover:text-[var(--vera-text-primary)] border border-[var(--vera-border)] transition cursor-pointer"
            title="Refresh Feed"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#D45060]' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="px-4 py-2 border-b border-[var(--vera-border)] bg-[var(--vera-surface-muted)] flex items-center gap-2 overflow-x-auto text-xs scrollbar-none">
        <span className="text-[10px] font-bold uppercase text-[var(--vera-text-muted)] mr-1">Filter:</span>
        <button
          onClick={() => setActiveFilter('ALL')}
          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
            activeFilter === 'ALL'
              ? 'bg-[#800020] text-[#FFF9F2] border border-[#D45060]/40'
              : 'text-[var(--vera-text-muted)] hover:text-[var(--vera-text-primary)]'
          }`}
        >
          All ({updates.length})
        </button>
        <button
          onClick={() => setActiveFilter('POLICE')}
          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
            activeFilter === 'POLICE'
              ? 'bg-blue-950 text-blue-300 border border-blue-500/40'
              : 'text-[var(--vera-text-muted)] hover:text-[var(--vera-text-primary)]'
          }`}
        >
          👮 Police ({updates.filter((u) => u.author_type === 'police').length})
        </button>
        <button
          onClick={() => setActiveFilter('HOSPITAL')}
          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
            activeFilter === 'HOSPITAL'
              ? 'bg-rose-950 text-rose-300 border border-rose-500/40'
              : 'text-[var(--vera-text-muted)] hover:text-[var(--vera-text-primary)]'
          }`}
        >
          🏥 Hospital ({updates.filter((u) => u.author_type === 'hospital').length})
        </button>
        <button
          onClick={() => setActiveFilter('MUNICIPAL')}
          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
            activeFilter === 'MUNICIPAL'
              ? 'bg-purple-950 text-purple-300 border border-purple-500/40'
              : 'text-[var(--vera-text-muted)] hover:text-[var(--vera-text-primary)]'
          }`}
        >
          🏛️ Municipal ({updates.filter((u) => u.author_type === 'municipal' || u.author_type === 'authority').length})
        </button>
        <button
          onClick={() => setActiveFilter('CITIZEN')}
          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
            activeFilter === 'CITIZEN'
              ? 'bg-[#800020]/30 text-[var(--vera-text-primary)] border border-[#800020]'
              : 'text-[var(--vera-text-muted)] hover:text-[var(--vera-text-primary)]'
          }`}
        >
          👤 Citizens ({updates.filter((u) => u.author_type === 'citizen').length})
        </button>
      </div>

      {/* Message Feed Stream */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3 max-h-[440px] bg-[var(--vera-surface)]">
        {sortedUpdates.length === 0 ? (
          <div className="text-center py-12 text-[var(--vera-text-muted)]">
            <Radio className="w-8 h-8 mx-auto mb-2 text-[#D45060]/40" />
            <p className="text-xs font-semibold text-[var(--vera-text-primary)]">No sitreps or comments posted yet.</p>
            <p className="text-[11px] text-[var(--vera-text-muted)] mt-1">
              Any post from Citizen, Police, Hospital, or Municipal Authority will appear here in real time.
            </p>
          </div>
        ) : (
          sortedUpdates.map((update) => {
            const roleMeta = getRoleBadge(update);
            return (
              <div
                key={update.id}
                className={`p-3.5 rounded-xl border transition-all ${roleMeta.bubble} ${
                  update.is_pinned ? 'ring-1 ring-[#D45060]/50' : ''
                }`}
              >
                {/* Author Metadata Header */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black border ${roleMeta.badge}`}
                    >
                      {roleMeta.icon}
                      {roleMeta.label}
                    </span>

                    <span className="text-xs font-bold text-[var(--vera-text-primary)]">{update.author_name}</span>

                    {update.is_verified_authority && (
                      <span
                        className="inline-flex items-center gap-0.5 text-[10px] text-emerald-500 font-bold"
                        title="Verified Authority Officer"
                      >
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                        Verified
                      </span>
                    )}

                    {update.author_role && (
                      <span className="text-[10px] text-[var(--vera-text-muted)]">
                        • {update.author_role}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-[10px] text-[var(--vera-text-muted)]">
                    <Clock className="w-3 h-3 text-[var(--vera-text-muted)]" />
                    <span>{new Date(update.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>

                    {currentRole !== 'citizen' && (
                      <button
                        onClick={() => handleTogglePin(update.id)}
                        className={`p-1 rounded hover:bg-[var(--vera-surface-muted)] transition cursor-pointer ${
                          update.is_pinned ? 'text-amber-400' : 'text-[var(--vera-text-muted)] hover:text-[var(--vera-text-primary)]'
                        }`}
                        title={update.is_pinned ? 'Unpin Update' : 'Pin to Top'}
                      >
                        <Pin className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Message Body */}
                <p className="text-xs text-[var(--vera-text-primary)] leading-relaxed whitespace-pre-line pl-0.5">
                  {update.message}
                </p>

                {/* Photo Evidence Thumbnail */}
                {update.photo_url && (
                  <div className="mt-2.5">
                    <img
                      src={update.photo_url}
                      alt="Incident Evidence"
                      onClick={() => setSelectedImageModal(update.photo_url || null)}
                      className="max-h-40 rounded-lg border border-[var(--vera-border)] cursor-pointer hover:opacity-90 transition object-cover"
                    />
                  </div>
                )}
              </div>
            );
          })
        )}
        <div ref={updatesEndRef} />
      </div>

      {/* Composer Section */}
      <div className="p-4 border-t border-[var(--vera-border)] bg-[var(--vera-surface-elevated)] space-y-3">
        {/* Role Selector Header */}
        <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--vera-text-muted)]">
              Active Role:
            </span>
            <div className="flex items-center gap-1 bg-[var(--vera-surface)] p-1 rounded-xl border border-[var(--vera-border)]">
              {(['citizen', 'police', 'hospital', 'municipal'] as UserRole[]).map((r) => {
                const isActive = currentRole === r;
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    className={`px-2 py-0.5 rounded-lg text-[11px] font-bold capitalize transition cursor-pointer ${
                      isActive
                        ? r === 'police'
                          ? 'bg-blue-600 text-white'
                          : r === 'hospital'
                          ? 'bg-rose-600 text-white'
                          : r === 'municipal'
                          ? 'bg-purple-600 text-white'
                          : 'bg-[#800020] text-[#FFF9F2] font-black'
                        : 'text-[var(--vera-text-muted)] hover:text-[var(--vera-text-primary)]'
                    }`}
                  >
                    {r === 'citizen' && '👤 Citizen'}
                    {r === 'police' && '👮 Police'}
                    {r === 'hospital' && '🏥 Hospital'}
                    {r === 'municipal' && '🏛️ Municipal'}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="text-[11px] text-[var(--vera-text-muted)]">
            Posting as: <strong className="text-[var(--vera-text-primary)]">{currentUserProfile.name}</strong> ({currentUserProfile.title})
          </div>
        </div>

        {/* Quick Suggestion Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] scrollbar-thin">
          <span className="text-[var(--vera-text-muted)] whitespace-nowrap font-medium text-[10px]">Quick chips:</span>
          {quickChipsByRole[currentRole].map((chip, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setMessage(chip)}
              className="px-2.5 py-0.5 rounded-full bg-[var(--vera-surface)] hover:bg-[var(--vera-surface-muted)] text-[var(--vera-text-secondary)] hover:text-[var(--vera-text-primary)] border border-[var(--vera-border)] whitespace-nowrap transition cursor-pointer text-[11px]"
            >
              "{chip}"
            </button>
          ))}
        </div>

        {/* Photo URL Input Bar */}
        {showPhotoInput && (
          <div className="flex items-center gap-2 bg-[var(--vera-surface)] border border-[var(--vera-border)] rounded-xl p-2 animate-in fade-in duration-150">
            <ImageIcon className="w-4 h-4 text-[#D45060]" />
            <input
              type="url"
              value={photoUrl}
              onChange={(e) => setPhotoUrl(e.target.value)}
              placeholder="Paste photo evidence URL (https://...)..."
              className="flex-1 bg-transparent text-xs text-[var(--vera-text-primary)] placeholder-[var(--vera-text-muted)] focus:outline-none"
            />
            <button
              type="button"
              onClick={() => {
                setShowPhotoInput(false);
                setPhotoUrl('');
              }}
              className="text-[var(--vera-text-muted)] hover:text-[var(--vera-text-primary)] p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Message Input & Send Form */}
        <form onSubmit={handlePostUpdate} className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowPhotoInput(!showPhotoInput)}
            className={`p-2.5 rounded-xl border transition cursor-pointer ${
              showPhotoInput || photoUrl
                ? 'bg-[#800020]/25 border-[#800020] text-[#D45060]'
                : 'bg-[var(--vera-surface)] border-[var(--vera-border)] text-[var(--vera-text-muted)] hover:text-[var(--vera-text-primary)]'
            }`}
            title="Attach Photo Evidence"
          >
            <ImageIcon className="w-4 h-4" />
          </button>

          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={`Type ${currentRole} sitrep, comment, or status update...`}
            className="flex-1 vera-input rounded-xl px-3.5 py-2.5 text-xs focus:outline-none"
          />

          <button
            type="submit"
            disabled={!message.trim() || isSubmitting}
            className="px-4 py-2.5 vera-button-primary font-bold text-xs rounded-xl flex items-center gap-1.5 transition cursor-pointer disabled:opacity-40 shadow-md shadow-[#800020]/20"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Post</span>
          </button>
        </form>
      </div>

      {/* Image Zoom Modal */}
      {selectedImageModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4"
          onClick={() => setSelectedImageModal(null)}
        >
          <div className="relative max-w-3xl w-full vera-card rounded-2xl overflow-hidden p-2 shadow-2xl">
            <button
              onClick={() => setSelectedImageModal(null)}
              className="absolute top-4 right-4 p-2 bg-black/60 rounded-full text-white hover:bg-black/80 transition"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={selectedImageModal}
              alt="Evidence Full View"
              className="w-full max-h-[80vh] object-contain rounded-xl"
            />
          </div>
        </div>
      )}
    </div>
  );
};
