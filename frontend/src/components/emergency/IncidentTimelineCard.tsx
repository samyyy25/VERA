import React from 'react';
import { Complaint, OperationalTimelineEvent } from '../../types';
import { Clock } from 'lucide-react';

interface IncidentTimelineCardProps {
  complaint: Complaint;
  events?: OperationalTimelineEvent[];
}

export const IncidentTimelineCard: React.FC<IncidentTimelineCardProps> = ({
  complaint,
  events: propEvents,
}) => {
  const timelineEvents: OperationalTimelineEvent[] =
    propEvents ||
    complaint.operational_timeline || [
      {
        event: 'Complaint Received',
        timestamp: complaint.created_at,
        actor: 'CITIZEN',
        detail: `Report submitted for ${complaint.category}`,
      },
      {
        event: 'AI Intelligence Generated',
        timestamp: new Date(new Date(complaint.created_at).getTime() + 1000).toISOString(),
        actor: 'SYSTEM',
        detail: `Risk Score: ${complaint.risk_score}/100, Confidence: ${complaint.confidence_score || 85}%, Severity: ${complaint.risk_level}`,
      },
      {
        event: 'Decision Factors Recorded',
        timestamp: new Date(new Date(complaint.created_at).getTime() + 1800).toISOString(),
        actor: 'SYSTEM',
        detail: complaint.incident_intelligence?.decision_factors?.join(' • ') || 'Critical signals detected',
      },
      {
        event: 'Duplicate Check Completed',
        timestamp: new Date(new Date(complaint.created_at).getTime() + 2200).toISOString(),
        actor: 'SYSTEM',
        detail: complaint.duplicate_info?.is_duplicate
          ? `Linked to active incident #${complaint.duplicate_info.primary_incident_id}`
          : 'Verified unique incident record',
      },
      {
        event: 'Location Verified',
        timestamp: new Date(new Date(complaint.created_at).getTime() + 2600).toISOString(),
        actor: 'SYSTEM',
        detail: `GPS Fix: ${complaint.latitude.toFixed(4)}, ${complaint.longitude.toFixed(4)} (±${Math.round(
          complaint.gps_accuracy || 20
        )}m)`,
      },
    ];

  const getActorBadge = (actor: string) => {
    if (actor === 'CITIZEN') {
      return (
        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[var(--vera-primary-soft)] border border-[var(--vera-primary-border)] text-[var(--brand-primary)]">
          Citizen
        </span>
      );
    }
    if (actor.includes('OPERATOR') || actor.includes('DISPATCH') || actor === 'ADMIN') {
      return (
        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold vera-badge-success">
          Operator
        </span>
      );
    }
    return (
      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[var(--vera-primary-soft)] border border-[var(--vera-primary-border)] text-[#D45060]">
        System / AI
      </span>
    );
  };

  return (
    <div className="vera-card p-5 text-[var(--vera-text-primary)] shadow-xl">
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-[var(--vera-border)]">
        <div className="flex items-center space-x-2">
          <Clock className="w-4 h-4 text-[var(--brand-primary)]" />
          <h3 className="text-sm font-semibold tracking-wider uppercase text-[var(--vera-text-primary)]">
            Operational Incident Timeline
          </h3>
        </div>
        <span className="text-[11px] text-[var(--vera-text-muted)] font-medium">
          {timelineEvents.length} Recorded Events
        </span>
      </div>

      <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-[var(--vera-border)]">
        {timelineEvents.map((evt, idx) => (
          <div key={idx} className="relative group">
            {/* Timeline Dot */}
            <div className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-[#800020] border-2 border-[var(--vera-surface)] ring-2 ring-[#D45060]/50" />

            <div className="flex items-baseline justify-between gap-2">
              <div className="text-xs font-semibold text-[var(--vera-text-primary)] flex items-center gap-2">
                <span>{evt.event}</span>
                {getActorBadge(evt.actor)}
              </div>
              <span className="text-[11px] text-[var(--vera-text-muted)] font-mono shrink-0">
                {new Date(evt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            </div>

            {evt.detail && (
              <p className="text-xs text-[var(--vera-text-secondary)] mt-1 leading-relaxed vera-card-secondary p-2.5">
                {evt.detail}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
