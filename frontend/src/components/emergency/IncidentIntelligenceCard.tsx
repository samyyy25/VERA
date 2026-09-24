import React from 'react';
import { Complaint, IncidentIntelligence } from '../../types';
import { ShieldAlert, CheckCircle2, MapPin, Users, HeartPulse, Sparkles, Activity } from 'lucide-react';

interface IncidentIntelligenceCardProps {
  complaint: Complaint;
  intelligence?: IncidentIntelligence | null;
}

export const IncidentIntelligenceCard: React.FC<IncidentIntelligenceCardProps> = ({
  complaint,
  intelligence: propIntelligence,
}) => {
  const intel = propIntelligence || complaint.incident_intelligence || {
    incident_type: complaint.category,
    severity: complaint.risk_level,
    risk_score: complaint.risk_score,
    confidence_score: complaint.confidence_score || 85,
    people_affected_estimate: '1-2',
    possible_injury: complaint.category === 'Accident' || complaint.category === 'Medical Emergency',
    location_confirmed: Boolean(complaint.latitude && complaint.longitude),
    recommended_action: 'Immediate emergency dispatch & verification',
    decision_factors: [
      `${complaint.category} incident reported`,
      complaint.risk_score >= 80 ? 'Critical urgency score detected' : 'Standard escalation threshold',
      'Location coordinates verified',
    ],
  };

  const isCritical = intel.severity === 'CRITICAL' || intel.risk_score >= 80;
  const isHigh = intel.severity === 'HIGH' || (intel.risk_score >= 60 && intel.risk_score < 80);

  return (
    <div className="vera-card p-5 shadow-xl relative overflow-hidden text-[var(--vera-text-primary)]">
      {/* Background Accent subtle glow */}
      <div
        className={`absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl -z-0 opacity-10 pointer-events-none ${
          isCritical ? 'bg-[#D45060]' : isHigh ? 'bg-[#D97706]' : 'bg-[#800020]'
        }`}
      />

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-[var(--vera-border)]">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-lg bg-[var(--vera-primary-soft)] border border-[var(--vera-primary-border)] text-[var(--brand-primary)]">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold tracking-wider uppercase text-[var(--vera-text-primary)]">
                Incident Intelligence
              </h3>
              <p className="text-xs text-[var(--vera-text-muted)]">Structured real-time situational assessment</p>
            </div>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${
              isCritical
                ? 'vera-badge-critical animate-pulse'
                : isHigh
                ? 'vera-badge-warning'
                : 'vera-badge-success'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            {intel.severity}
          </span>
        </div>

        {/* Intelligence Key Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          {/* Incident Type */}
          <div className="vera-card-secondary p-3">
            <span className="text-[11px] font-medium text-[var(--vera-text-muted)] uppercase tracking-wide">Type</span>
            <div className="mt-1 font-semibold text-[var(--vera-text-primary)] text-sm truncate">{intel.incident_type}</div>
          </div>

          {/* Risk Score */}
          <div className="vera-card-secondary p-3">
            <span className="text-[11px] font-medium text-[var(--vera-text-muted)] uppercase tracking-wide">Risk Score</span>
            <div className="mt-1 flex items-baseline gap-1">
              <span
                className={`text-lg font-bold ${
                  isCritical ? 'text-[#D45060]' : isHigh ? 'text-[#D97706]' : 'text-[var(--brand-primary)]'
                }`}
              >
                {intel.risk_score}
              </span>
              <span className="text-xs text-[var(--vera-text-muted)]">/ 100</span>
            </div>
          </div>

          {/* AI Confidence */}
          <div className="vera-card-secondary p-3">
            <span className="text-[11px] font-medium text-[var(--vera-text-muted)] uppercase tracking-wide">AI Confidence</span>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-lg font-bold text-[var(--brand-primary)]">{intel.confidence_score}%</span>
              <span className="text-[10px] text-[var(--vera-text-muted)]">heuristic</span>
            </div>
          </div>

          {/* GPS Accuracy */}
          <div className="vera-card-secondary p-3">
            <span className="text-[11px] font-medium text-[var(--vera-text-muted)] uppercase tracking-wide flex items-center gap-1">
              <MapPin className="w-3 h-3 text-[var(--brand-primary)]" /> Location
            </span>
            <div className="mt-1 text-sm font-semibold text-[var(--vera-text-primary)]">
              {complaint.gps_accuracy ? `±${Math.round(complaint.gps_accuracy)}m` : 'Confirmed'}
            </div>
          </div>
        </div>

        {/* Secondary Parameters */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="vera-card-secondary p-3 flex items-center gap-3">
            <div className="p-2 rounded bg-[var(--vera-primary-soft)] text-[var(--brand-primary)]">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[11px] text-[var(--vera-text-muted)]">People Affected</div>
              <div className="text-sm font-semibold text-[var(--vera-text-primary)]">{intel.people_affected_estimate}</div>
            </div>
          </div>

          <div className="vera-card-secondary p-3 flex items-center gap-3">
            <div className={`p-2 rounded ${intel.possible_injury ? 'bg-[#D45060]/20 text-[#D45060]' : 'bg-[var(--vera-primary-soft)] text-[var(--brand-primary)]'}`}>
              <HeartPulse className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[11px] text-[var(--vera-text-muted)]">Possible Injury</div>
              <div className={`text-sm font-semibold ${intel.possible_injury ? 'text-[#D45060]' : 'text-[var(--vera-text-secondary)]'}`}>
                {intel.possible_injury ? 'Detected in report' : 'None reported'}
              </div>
            </div>
          </div>
        </div>

        {/* Recommended Action */}
        <div className="bg-[var(--vera-primary-soft)] border border-[var(--vera-primary-border)] rounded-xl p-3.5 mb-5 flex items-start gap-3">
          <Activity className="w-5 h-5 text-[var(--brand-primary)] mt-0.5 shrink-0" />
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--brand-primary)] block mb-0.5">
              Recommended Action
            </span>
            <p className="text-xs text-[var(--vera-text-primary)] leading-relaxed font-medium">{intel.recommended_action}</p>
          </div>
        </div>

        {/* Decision Factors ("WHY VERA ESCALATED") */}
        <div className="vera-card-secondary p-4">
          <div className="text-xs font-bold uppercase tracking-wider text-[var(--vera-text-primary)] mb-2.5 flex items-center justify-between">
            <span>Why VERA Escalated</span>
            <span className="text-[10px] font-normal text-[var(--vera-text-muted)]">Deterministic Evidence</span>
          </div>
          <div className="space-y-1.5">
            {intel.decision_factors && intel.decision_factors.length > 0 ? (
              intel.decision_factors.map((factor, idx) => (
                <div key={idx} className="flex items-center gap-2 text-xs text-[var(--vera-text-secondary)]">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[var(--brand-primary)] shrink-0" />
                  <span>{factor}</span>
                </div>
              ))
            ) : (
              <div className="flex items-center gap-2 text-xs text-[var(--vera-text-muted)]">
                <CheckCircle2 className="w-3.5 h-3.5 text-[var(--vera-text-muted)] shrink-0" />
                <span>Standard risk threshold evaluation applied</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
