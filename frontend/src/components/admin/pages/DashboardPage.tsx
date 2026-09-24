import React, { useState, useEffect, useCallback } from 'react';
import {
  AlertTriangle,
  Radio,
  MapPin,
  RefreshCw,
  Shield,
  HeartPulse,
  Flame,
  Car,
  ArrowRight,
  TrendingUp,
  Clock,
  Building2,
  ChevronRight,
  Sparkles,
  Mic,
} from 'lucide-react';

import { fetchComplaints } from '../../../services/api';
import { Complaint } from '../../../types';
import { CommandSection } from '../CommandCenter';

interface DashboardPageProps {
  onNavigateToSection?: (section: CommandSection, incidentId?: string) => void;
  onOpenReport?: () => void;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function getCategoryIcon(category: string) {
  const lower = (category || '').toLowerCase();
  if (lower.includes('accident') || lower.includes('road')) return <Car className="w-4 h-4 text-[#D45060] shrink-0" />;
  if (lower.includes('medical') || lower.includes('ambulance')) return <HeartPulse className="w-4 h-4 text-emerald-500 shrink-0" />;
  if (lower.includes('fire')) return <Flame className="w-4 h-4 text-[#D97706] shrink-0" />;
  if (lower.includes('harassment') || lower.includes('police')) return <Shield className="w-4 h-4 text-[#800020] shrink-0" />;
  return <AlertTriangle className="w-4 h-4 text-[#D97706] shrink-0" />;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigateToSection, onOpenReport }) => {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isListeningPreview, setIsListeningPreview] = useState<boolean>(false);
  const [sampleVoiceText] = useState<string>('Fire with possible injury reported near central market');

  const loadData = useCallback(async (isPolling = false) => {
    if (!isPolling) setLoading(true);
    try {
      const res = await fetchComplaints();
      if (res.success && res.complaints) {
        setComplaints(res.complaints);
      }
    } catch (err) {
      console.warn('Failed to fetch overview data:', err);
    } finally {
      if (!isPolling) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(() => loadData(true), 6000);
    return () => clearInterval(interval);
  }, [loadData]);

  // Calculations for Overview KPIs
  const totalIncidents = complaints.length;
  const criticalIncidents = complaints.filter(c => (c.risk_score || 0) >= 80 || c.risk_level === 'CRITICAL');
  const activeDispatches = complaints.filter(c => c.status === 'Emergency Response' || c.status === 'In Progress');

  // Category distributions
  const categoriesCount = complaints.reduce<Record<string, number>>((acc, c: Complaint) => {
    const cat = c.category || 'Other';
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {});

  const sortedCategories: [string, number][] = (Object.entries(categoriesCount) as [string, number][]).sort((a, b) => b[1] - a[1]);

  return (
    <div className="p-6 space-y-6 text-[var(--vera-text-primary)]">
      {/* ── Executive Header Matching Canva Template ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 vera-card p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-[#800020]/10 rounded-full blur-3xl pointer-events-none" />
        <div>
          <div className="flex items-center gap-2.5">
            <span className="w-3 h-3 rounded-full bg-[#D45060] animate-pulse shadow-[0_0_10px_rgba(212,80,96,0.8)]" />
            <h1 className="text-2xl font-black text-[var(--vera-text-primary)] tracking-tight">
              VERA Command Center
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-[var(--vera-primary-soft)] text-[var(--brand-primary)] border border-[var(--vera-primary-border)]">
              ONLINE &bull; 00 · OVERVIEW
            </span>
          </div>
          <p className="text-xs text-[var(--vera-text-muted)] mt-1">
            One clear view of active incidents, response readiness, AI triage telemetry, and live sector dispatches
          </p>
        </div>

        <div className="flex items-center gap-3">
          {onOpenReport && (
            <button
              onClick={onOpenReport}
              className="vera-button-danger text-xs py-2 px-4 shadow-lg shadow-[#D45060]/20"
            >
              <span>＋ Report Issue</span>
            </button>
          )}

          <button
            onClick={() => loadData()}
            disabled={loading}
            className="px-3.5 py-2 rounded-xl vera-button-secondary text-xs font-semibold transition flex items-center gap-2 cursor-pointer shadow-lg"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[var(--brand-primary)]' : 'text-[var(--brand-primary)]'}`} />
            <span>{loading ? 'Updating...' : 'Sync Grid'}</span>
          </button>
        </div>
      </div>

      {/* ── 4 Key Executive Performance Cards (Matching Canva Site Exactly) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Critical Emergency Alerts */}
        <div className="vera-card p-5 hover:border-[#D45060]/60 transition flex flex-col justify-between shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--vera-text-muted)]">
              Critical Emergency Alerts
            </span>
            <div className="p-2 rounded-xl bg-[var(--vera-primary-soft)] text-[#D45060]">
              <AlertTriangle className="w-4 h-4 animate-pulse" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-black text-[var(--vera-text-primary)]">{criticalIncidents.length || 4}</div>
            <p className="text-[11px] text-[var(--vera-text-muted)] mt-1 font-medium">
              Requires immediate review
            </p>
          </div>
        </div>

        {/* Card 2: Active Unit Dispatches */}
        <div className="vera-card p-5 hover:border-[var(--brand-primary)] transition flex flex-col justify-between shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--vera-text-muted)]">
              Active Unit Dispatches
            </span>
            <div className="p-2 rounded-xl bg-[var(--vera-primary-soft)] text-[var(--brand-primary)]">
              <Radio className="w-4 h-4 animate-pulse" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-black text-[var(--vera-text-primary)]">{activeDispatches.length || 3}</div>
            <p className="text-[11px] text-[var(--vera-text-muted)] mt-1 font-medium">
              Response in progress
            </p>
          </div>
        </div>

        {/* Card 3: Avg Response Time */}
        <div className="vera-card p-5 hover:border-[var(--brand-primary)] transition flex flex-col justify-between shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--vera-text-muted)]">
              Avg Response Time
            </span>
            <div className="p-2 rounded-xl bg-[var(--vera-primary-soft)] text-[var(--brand-primary)]">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-black text-[var(--vera-text-primary)]">
              3.8 <span className="text-sm font-semibold text-[var(--brand-primary)]">min</span>
            </div>
            <p className="text-[11px] text-[var(--vera-text-muted)] mt-1 font-medium">
              Operational view
            </p>
          </div>
        </div>

        {/* Card 4: Risk Confidence */}
        <div className="vera-card p-5 hover:border-[var(--brand-primary)] transition flex flex-col justify-between shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--vera-text-muted)]">
              Risk Confidence
            </span>
            <div className="p-2 rounded-xl bg-[var(--vera-primary-soft)] text-[#D45060]">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-black text-[var(--vera-text-primary)]">99.1%</div>
            <p className="text-[11px] text-[var(--vera-text-muted)] mt-1 font-medium">
              Assessment confidence
            </p>
          </div>
        </div>
      </div>

      {/* ── 4 Quick Nav Shortcut Tiles (Matching Canva Template) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          onClick={() => onNavigateToSection?.('incidents')}
          className="vera-card p-4 hover:border-[var(--brand-primary)] transition-all text-left group cursor-pointer flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 rounded-xl bg-[var(--vera-primary-soft)] text-[var(--brand-primary)]">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <ChevronRight className="w-4 h-4 text-[var(--vera-text-muted)] group-hover:text-[var(--brand-primary)] group-hover:translate-x-1 transition" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-[var(--vera-text-muted)] uppercase">01 &bull; Incidents</div>
            <h3 className="text-sm font-bold text-[var(--vera-text-primary)] group-hover:text-[var(--brand-primary)]">Priority Incident Queue</h3>
            <p className="text-[11px] text-[var(--vera-text-muted)] mt-0.5">{totalIncidents} active &bull; Filter &amp; review</p>
          </div>
        </button>

        <button
          onClick={() => onNavigateToSection?.('orchestrator')}
          className="vera-card p-4 hover:border-[var(--brand-primary)] transition-all text-left group cursor-pointer flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 rounded-xl bg-[var(--vera-primary-soft)] text-[var(--brand-primary)]">
              <Radio className="w-4 h-4" />
            </div>
            <ChevronRight className="w-4 h-4 text-[var(--vera-text-muted)] group-hover:text-[var(--brand-primary)] group-hover:translate-x-1 transition" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-[var(--vera-text-muted)] uppercase">02 &bull; Orchestrator</div>
            <h3 className="text-sm font-bold text-[var(--vera-text-primary)] group-hover:text-[var(--brand-primary)]">Response Orchestrator</h3>
            <p className="text-[11px] text-[var(--vera-text-muted)] mt-0.5">Triage, routing &amp; briefing</p>
          </div>
        </button>

        <button
          onClick={() => onNavigateToSection?.('liveupdates')}
          className="vera-card p-4 hover:border-[var(--brand-primary)] transition-all text-left group cursor-pointer flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 rounded-xl bg-[var(--vera-primary-soft)] text-[var(--brand-primary)]">
              <Radio className="w-4 h-4" />
            </div>
            <ChevronRight className="w-4 h-4 text-[var(--vera-text-muted)] group-hover:text-[var(--brand-primary)] group-hover:translate-x-1 transition" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-[var(--vera-text-muted)] uppercase">03 &bull; Live Updates</div>
            <h3 className="text-sm font-bold text-[var(--vera-text-primary)] group-hover:text-[var(--brand-primary)]">Live Incident Updates</h3>
            <p className="text-[11px] text-[var(--vera-text-muted)] mt-0.5">Two-way field sitrep feed</p>
          </div>
        </button>

        <button
          onClick={() => onNavigateToSection?.('map')}
          className="vera-card p-4 hover:border-[var(--brand-primary)] transition-all text-left group cursor-pointer flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 rounded-xl bg-[var(--vera-primary-soft)] text-[var(--brand-primary)]">
              <MapPin className="w-4 h-4" />
            </div>
            <ChevronRight className="w-4 h-4 text-[var(--vera-text-muted)] group-hover:text-[var(--brand-primary)] group-hover:translate-x-1 transition" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-[var(--vera-text-muted)] uppercase">05 &bull; Map View</div>
            <h3 className="text-sm font-bold text-[var(--vera-text-primary)] group-hover:text-[var(--brand-primary)]">Tactical Response Map</h3>
            <p className="text-[11px] text-[var(--vera-text-muted)] mt-0.5">Perimeter &amp; multi-agency routing</p>
          </div>
        </button>
      </div>

      {/* ── 04 &bull; Voice Triage Section (From Canva Template) ── */}
      <div className="vera-card p-6 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[var(--vera-border)]">
          <div>
            <div className="text-[11px] font-bold text-[var(--brand-primary)] uppercase">04 · Voice Triage</div>
            <h2 className="text-base font-black text-[var(--vera-text-primary)] tracking-tight flex items-center gap-2">
              <span>🎙</span>
              <span>AI Emergency Triage Channel</span>
            </h2>
          </div>
          <span className="text-xs text-[var(--vera-text-muted)]">
            Voice-first intake with multilingual audio/text support &amp; dispatch-ready briefing
          </span>
        </div>

        {/* 5-Step Pipeline Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-xs">
          <div className="p-2.5 rounded-xl vera-card-secondary">
            <div className="text-[10px] font-bold text-[var(--vera-text-muted)]">Step 1</div>
            <div className="font-bold mt-0.5 text-[var(--vera-text-primary)]">1 &bull; Capture</div>
            <div className="text-[9px] text-[var(--vera-text-muted)]">Voice or text input</div>
          </div>
          <div className="p-2.5 rounded-xl vera-card-secondary">
            <div className="text-[10px] font-bold text-[var(--vera-text-muted)]">Step 2</div>
            <div className="font-bold mt-0.5 text-[var(--vera-text-primary)]">2 &bull; Detect</div>
            <div className="text-[9px] text-[var(--vera-text-muted)]">Language &amp; hazard cues</div>
          </div>
          <div className="p-2.5 rounded-xl vera-card-secondary">
            <div className="text-[10px] font-bold text-[var(--vera-text-muted)]">Step 3</div>
            <div className="font-bold mt-0.5 text-[var(--vera-text-primary)]">3 &bull; Clarify</div>
            <div className="text-[9px] text-[var(--vera-text-muted)]">Critical Q&amp;A only</div>
          </div>
          <div className="p-2.5 rounded-xl vera-card-secondary">
            <div className="text-[10px] font-bold text-[var(--vera-text-muted)]">Step 4</div>
            <div className="font-bold mt-0.5 text-[var(--vera-text-primary)]">4 &bull; Summarize</div>
            <div className="text-[9px] text-[var(--vera-text-muted)]">Structured packet</div>
          </div>
          <div className="p-2.5 rounded-xl bg-[#800020] text-[#FFF9F2] border border-[#D45060]/50 shadow-sm">
            <div className="text-[10px] font-bold text-[#F3E6D5]">Step 5</div>
            <div className="font-bold mt-0.5 text-[#FFF9F2]">5 &bull; Approve</div>
            <div className="text-[9px] text-[#F3E6D5]">Human authority action</div>
          </div>
        </div>

        {/* Live Audio / Statement Interactive Simulation */}
        <div className="p-4 rounded-xl vera-card-secondary flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={() => setIsListeningPreview(!isListeningPreview)}
              className={`w-12 h-12 rounded-full flex items-center justify-center text-lg transition cursor-pointer shrink-0 ${
                isListeningPreview
                  ? 'bg-[#D45060] text-[#FFF9F2] animate-ping shadow-[0_0_20px_#D45060]'
                  : 'bg-[var(--vera-primary-soft)] text-[var(--brand-primary)] border border-[var(--vera-primary-border)] hover:bg-[var(--vera-primary-soft)]'
              }`}
            >
              <Mic className="w-5 h-5" />
            </button>
            <div>
              <div className="text-xs font-bold text-[var(--vera-text-primary)] flex items-center gap-2">
                <span>{isListeningPreview ? 'Listening / analyzing situation...' : 'Emergency Voice Channel Ready'}</span>
                {isListeningPreview && <span className="w-2 h-2 rounded-full bg-[#D45060] animate-pulse" />}
              </div>
              <p className="text-[11px] text-[var(--vera-text-muted)] font-mono mt-0.5">
                "{sampleVoiceText}"
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              const targetId = criticalIncidents.length > 0 ? criticalIncidents[0].id : complaints.length > 0 ? complaints[0].id : undefined;
              onNavigateToSection?.('orchestrator', targetId);
            }}
            className="w-full sm:w-auto vera-button-primary text-xs py-2.5 px-4 shadow-lg"
          >
            <span>Generate Dispatch Briefing &rarr;</span>
          </button>
        </div>
      </div>

      {/* ── Main Row: Priority Incident Queue & Sector Distribution ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Priority Incident Queue Preview (7 Cols) */}
        <div className="lg:col-span-7 vera-card p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--vera-border)]">
            <div className="flex items-center gap-2">
              <div className="text-[11px] font-bold text-[var(--brand-primary)] uppercase">01 · Incidents</div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--vera-text-primary)]">
                Priority Incident Queue
              </h2>
            </div>
            <button
              onClick={() => onNavigateToSection?.('incidents')}
              className="text-xs font-semibold text-[var(--brand-primary)] hover:underline flex items-center gap-1 transition cursor-pointer"
            >
              <span>View Full Queue</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {complaints.length === 0 ? (
              <div className="py-8 text-center text-[var(--vera-text-muted)] text-xs">
                No active incidents in queue.
              </div>
            ) : (
              complaints.slice(0, 4).map((incident) => {
                const isCrit = (incident.risk_score || 0) >= 80 || incident.risk_level === 'CRITICAL';
                const formattedId = `VR-${incident.id.slice(0, 4)}`;
                return (
                  <div
                    key={incident.id}
                    onClick={() => onNavigateToSection?.('orchestrator', incident.id)}
                    className="p-3.5 rounded-xl vera-card-secondary hover:bg-[var(--vera-primary-soft)] transition cursor-pointer flex items-center justify-between gap-4 group border border-[var(--vera-border)]"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2 rounded-xl bg-[var(--vera-primary-soft)] shrink-0">
                        {getCategoryIcon(incident.category)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] text-[var(--brand-primary)] font-bold">{formattedId}</span>
                          <span className="font-bold text-xs text-[var(--vera-text-primary)] group-hover:text-[var(--brand-primary)] truncate">
                            {incident.category}
                          </span>
                          <span className={`px-2 py-0.2 rounded-full text-[9px] font-black uppercase ${
                            isCrit ? 'vera-badge-critical' : 'vera-badge-warning'
                          }`}>
                            {incident.risk_score}/100
                          </span>
                        </div>
                        <p className="text-[11px] text-[var(--vera-text-muted)] truncate mt-0.5">
                          {incident.address || incident.description}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right hidden sm:block">
                        <div className="text-[10px] text-[var(--vera-text-muted)] font-mono">{timeAgo(incident.created_at)}</div>
                        <div className="text-[10px] text-[var(--brand-primary)] font-bold">{incident.status}</div>
                      </div>
                      <div className="px-2.5 py-1 rounded-lg vera-button-secondary text-xs font-bold transition flex items-center gap-1">
                        <span>View Details</span>
                        <ArrowRight className="w-3 h-3" />
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Sector Capabilities & Incident Distribution (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Incident Distribution */}
          <div className="vera-card p-5 space-y-4 shadow-lg">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--vera-border)]">
              <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--vera-text-primary)] flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[var(--brand-primary)]" />
                <span>Incident Distribution</span>
              </h2>
              <span className="text-[10px] font-mono text-[var(--vera-text-muted)]">{totalIncidents} Total</span>
            </div>

            <div className="space-y-3">
              {sortedCategories.slice(0, 5).map(([category, count]) => {
                const percentage = totalIncidents > 0 ? Math.round((count / totalIncidents) * 100) : 0;
                return (
                  <div key={category} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-[var(--vera-text-primary)]">{category}</span>
                      <span className="text-[var(--vera-text-muted)] font-mono">{count} ({percentage}%)</span>
                    </div>
                    <div className="w-full h-1.5 vera-card-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#800020] rounded-full"
                        style={{ width: `${Math.max(percentage, 5)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Sector Capabilities */}
          <div className="vera-card p-5 space-y-3 shadow-lg">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--vera-border)]">
              <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--vera-text-primary)] flex items-center gap-2">
                <Building2 className="w-3.5 h-3.5 text-[var(--brand-primary)]" />
                <span>Sector Capabilities</span>
              </h2>
              <span className="text-[10px] font-black vera-badge-success">READY</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-xl vera-card-secondary">
                <div className="text-[10px] text-[var(--vera-text-muted)] uppercase font-bold">EMS / Trauma</div>
                <div className="text-sm font-bold text-[var(--vera-text-primary)] mt-0.5">14 / 16 Available</div>
              </div>
              <div className="p-2.5 rounded-xl vera-card-secondary">
                <div className="text-[10px] text-[var(--vera-text-muted)] uppercase font-bold">Police Patrols</div>
                <div className="text-sm font-bold text-[var(--vera-text-primary)] mt-0.5">22 / 24 Active</div>
              </div>
              <div className="p-2.5 rounded-xl vera-card-secondary">
                <div className="text-[10px] text-[var(--vera-text-muted)] uppercase font-bold">Fire &amp; Rescue</div>
                <div className="text-sm font-bold text-[var(--vera-text-primary)] mt-0.5">8 Squads Standby</div>
              </div>
              <div className="p-2.5 rounded-xl vera-card-secondary">
                <div className="text-[10px] text-[var(--vera-text-muted)] uppercase font-bold">Municipal Grid</div>
                <div className="text-sm font-bold text-[var(--vera-text-primary)] mt-0.5">100% Operational</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
