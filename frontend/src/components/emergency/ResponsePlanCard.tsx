import React, { useState } from 'react';
import { ResponsePlan, Complaint } from '../../types';
import {
  Hospital,
  ShieldAlert,
  Clock,
  Navigation,
  PhoneCall,
  CheckCircle2,
  AlertOctagon,
  Check,
  Loader2,
  Shield,
  HeartPulse,
  Building2,
  Lock,
  Sparkles,
} from 'lucide-react';
import { confirmResponsePlan, modifyResponsePlan, postIncidentUpdate } from '../../services/api';
import { useRole } from '../../context/RoleContext';

interface ResponsePlanCardProps {
  complaint: Complaint;
  plan?: ResponsePlan | null;
  onPlanUpdated?: (updatedComplaint: Complaint, updatedPlan: ResponsePlan) => void;
}

export const ResponsePlanCard: React.FC<ResponsePlanCardProps> = ({
  complaint,
  plan: propPlan,
  onPlanUpdated,
}) => {
  const { currentRole, currentUserProfile, canApprovePolice, canApproveHospital, canApproveMunicipal } = useRole();
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [showDowngradeModal, setShowDowngradeModal] = useState(false);
  const [downgradeReason, setDowngradeReason] = useState('');

  // Local approval state to track individual authority approvals
  const [localApprovals, setLocalApprovals] = useState<{
    police?: { approved: boolean; by: string; time: string };
    hospital?: { approved: boolean; by: string; time: string };
    municipal?: { approved: boolean; by: string; time: string };
  }>({});

  const currentPlan = propPlan || complaint.response_plan;

  if (!currentPlan) {
    return (
      <div className="vera-card p-6 text-center text-[var(--vera-text-muted)]">
        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-[var(--brand-primary)]" />
        <p className="text-sm font-medium">Calculating optimal multi-agency response plan...</p>
      </div>
    );
  }

  const isConfirmed = currentPlan.confirmation_status === 'CONFIRMED';
  const isDowngraded = currentPlan.confirmation_status === 'DOWNGRADED';

  // Handle specific agency approval
  const handleAgencyApproval = async (agency: 'police' | 'hospital' | 'municipal') => {
    try {
      setLoadingAction(agency);
      const timeStr = new Date().toLocaleTimeString();
      const approverName = currentUserProfile.name;
      const approverTitle = currentUserProfile.title;

      // Update local state
      setLocalApprovals((prev) => ({
        ...prev,
        [agency]: { approved: true, by: `${approverName} (${approverTitle})`, time: timeStr },
      }));

      // Post a verified incident update to the live feed for all roles to see
      let updateMsg = '';
      let updateType: any = 'dispatch_update';
      if (agency === 'police') {
        updateMsg = `🚨 POLICE DISPATCH APPROVED by ${approverName} (${approverTitle}). Patrol units assigned and en route.`;
      } else if (agency === 'hospital') {
        updateMsg = `🏥 MEDICAL RESPONSE CONFIRMED by ${approverName} (${approverTitle}). Emergency ambulance dispatched; ER triage prepped.`;
      } else if (agency === 'municipal') {
        updateMsg = `🏛️ MUNICIPAL WORK ORDER AUTHORIZED by ${approverName} (${approverTitle}). Department field crew dispatched.`;
      }

      await postIncidentUpdate(complaint.id, {
        author_type: agency,
        author_name: approverName,
        author_role: approverTitle,
        message: updateMsg,
        update_type: updateType,
        is_pinned: true,
        is_verified_authority: true,
      });

      // Confirm response plan on backend
      const res = await confirmResponsePlan(
        complaint.id,
        `${approverName} [${agency.toUpperCase()}]`,
        `${agency.toUpperCase()} Department authorized dispatch.`
      );

      if (res.success && onPlanUpdated) {
        onPlanUpdated(res.complaint, res.plan);
      }
    } catch (err) {
      console.error(`Failed to approve ${agency} dispatch:`, err);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleDowngrade = async () => {
    try {
      setLoadingAction('downgrade');
      const res = await modifyResponsePlan(complaint.id, 'DOWNGRADE', {
        reason: downgradeReason || `${currentUserProfile.name} verified report as non-acute/false-alarm.`,
      });
      if (res.success && onPlanUpdated) {
        onPlanUpdated(res.complaint, { ...currentPlan, confirmation_status: 'DOWNGRADED' });
      }
      setShowDowngradeModal(false);
    } catch (err) {
      console.error('Failed to downgrade incident:', err);
    } finally {
      setLoadingAction(null);
    }
  };

  const isPoliceApproved = localApprovals.police?.approved || isConfirmed;
  const isHospitalApproved = localApprovals.hospital?.approved || isConfirmed;
  const isMunicipalApproved = localApprovals.municipal?.approved || isConfirmed;

  return (
    <div className="vera-card p-5 text-[var(--vera-text-primary)] shadow-xl relative overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 mb-4 border-b border-[var(--vera-border)]">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-xl bg-[var(--vera-primary-soft)] border border-[var(--vera-primary-border)] text-[var(--brand-primary)]">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-black tracking-wider uppercase text-[var(--vera-text-primary)]">
              VERA Response Orchestrator
            </h3>
            <p className="text-[11px] text-[var(--vera-text-muted)]">Multi-Agency Decoupled Approval Engine</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#800020] text-[#FFF9F2] border border-[#D45060]/50 shadow-sm">
            {currentPlan.priority} PRIORITY
          </span>
          {isConfirmed ? (
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider vera-badge-success flex items-center gap-1">
              <Check className="w-3 h-3" /> Dispatches Active
            </span>
          ) : isDowngraded ? (
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider vera-card-secondary text-[var(--vera-text-muted)]">
              Downgraded
            </span>
          ) : (
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider vera-badge-warning animate-pulse">
              Awaiting Agency Authorization
            </span>
          )}
        </div>
      </div>

      {/* Response Units Cards (Primary & Secondary) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-5">
        {/* Primary Response Unit */}
        {currentPlan.primary_response && (
          <div className="vera-card-secondary p-4 relative">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-[var(--vera-primary-soft)] text-[var(--brand-primary)]">
                  <Hospital className="w-4 h-4" />
                </div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--brand-primary)]">
                  Primary Response
                </span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--vera-primary-soft)] border border-[var(--vera-primary-border)] text-[var(--brand-primary)] font-semibold">
                {currentPlan.primary_response.status}
              </span>
            </div>

            <h4 className="font-bold text-[var(--vera-text-primary)] text-sm mb-1 truncate">
              {currentPlan.primary_response.name}
            </h4>

            <div className="flex items-center gap-3 text-xs text-[var(--vera-text-muted)] my-2">
              <span className="flex items-center gap-1 text-[var(--vera-text-primary)]">
                <Navigation className="w-3.5 h-3.5 text-[var(--brand-primary)]" />
                {currentPlan.primary_response.distance_km} km
              </span>
              <span className="flex items-center gap-1 text-[var(--brand-primary)] font-semibold bg-[var(--vera-primary-soft)] px-2 py-0.5 rounded-lg border border-[var(--vera-primary-border)]">
                <Clock className="w-3.5 h-3.5" /> ~{currentPlan.primary_response.estimated_eta_minutes} min ETA
              </span>
            </div>

            <div className="flex items-center justify-between pt-2 mt-2 border-t border-[var(--vera-border)] text-xs">
              <a
                href={currentPlan.primary_response.directions_url}
                target="_blank"
                rel="noreferrer"
                className="text-[var(--brand-primary)] hover:underline flex items-center gap-1 font-semibold"
              >
                View Route
              </a>
              {currentPlan.primary_response.phone && (
                <a
                  href={`tel:${currentPlan.primary_response.phone}`}
                  className="text-[var(--vera-text-muted)] hover:text-[var(--vera-text-primary)] flex items-center gap-1 font-medium"
                >
                  <PhoneCall className="w-3.5 h-3.5 text-[var(--brand-primary)]" />
                  {currentPlan.primary_response.phone}
                </a>
              )}
            </div>
          </div>
        )}

        {/* Secondary Response Unit */}
        {currentPlan.secondary_response && (
          <div className="vera-card-secondary p-4 relative">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-[var(--vera-primary-soft)] text-[#D45060]">
                  <ShieldAlert className="w-4 h-4" />
                </div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#D45060]">
                  Secondary Response
                </span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--vera-primary-soft)] border border-[var(--vera-primary-border)] text-[#D45060] font-semibold">
                {currentPlan.secondary_response.status}
              </span>
            </div>

            <h4 className="font-bold text-[var(--vera-text-primary)] text-sm mb-1 truncate">
              {currentPlan.secondary_response.name}
            </h4>

            <div className="flex items-center gap-3 text-xs text-[var(--vera-text-muted)] my-2">
              <span className="flex items-center gap-1 text-[var(--vera-text-primary)]">
                <Navigation className="w-3.5 h-3.5 text-[#D45060]" />
                {currentPlan.secondary_response.distance_km} km
              </span>
              <span className="flex items-center gap-1 text-[#D45060] font-semibold bg-[var(--vera-primary-soft)] px-2 py-0.5 rounded-lg border border-[var(--vera-primary-border)]">
                <Clock className="w-3.5 h-3.5" /> ~{currentPlan.secondary_response.estimated_eta_minutes} min ETA
              </span>
            </div>

            <div className="flex items-center justify-between pt-2 mt-2 border-t border-[var(--vera-border)] text-xs">
              <a
                href={currentPlan.secondary_response.directions_url}
                target="_blank"
                rel="noreferrer"
                className="text-[#D45060] hover:underline flex items-center gap-1 font-semibold"
              >
                View Route
              </a>
              {currentPlan.secondary_response.phone && (
                <a
                  href={`tel:${currentPlan.secondary_response.phone}`}
                  className="text-[var(--vera-text-muted)] hover:text-[var(--vera-text-primary)] flex items-center gap-1 font-medium"
                >
                  <PhoneCall className="w-3.5 h-3.5 text-[#D45060]" />
                  {currentPlan.secondary_response.phone}
                </a>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Recommended Action Summary */}
      <div className="vera-card-secondary p-3 mb-5">
        <span className="text-[10px] font-bold text-[var(--brand-primary)] uppercase tracking-wider block mb-1">
          Operational Directive
        </span>
        <p className="text-xs text-[var(--vera-text-primary)] leading-relaxed font-medium">{currentPlan.recommended_action}</p>
      </div>

      {/* DECOUPLED MULTI-AGENCY APPROVAL MATRIX */}
      <div className="space-y-3 mb-5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--brand-primary)] flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#D45060]" />
            Decoupled Multi-Agency Approvals
          </span>
          <span className="text-[10px] text-[var(--vera-text-muted)]">
            Logged in as: <strong className="text-[var(--vera-text-primary)]">{currentUserProfile.name}</strong> ({currentRole.toUpperCase()})
          </span>
        </div>

        {/* 1. Police Patrol & Tactical Escalation Approval */}
        <div className="vera-card-secondary p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-[var(--vera-primary-soft)] text-[var(--brand-primary)] border border-[var(--vera-primary-border)] mt-0.5">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[var(--vera-text-primary)]">👮 Police Patrol &amp; Traffic Escalation</span>
                {isPoliceApproved ? (
                  <span className="px-2 py-0.2 rounded text-[9px] font-bold vera-badge-success flex items-center gap-1">
                    <Check className="w-2.5 h-2.5" /> Approved
                  </span>
                ) : (
                  <span className="px-2 py-0.2 rounded text-[9px] font-medium bg-[var(--vera-surface-muted)] text-[var(--vera-text-muted)] border border-[var(--vera-border)]">
                    Pending Police Action
                  </span>
                )}
              </div>
              <p className="text-[11px] text-[var(--vera-text-muted)] mt-0.5">
                {localApprovals.police?.by
                  ? `Authorized by ${localApprovals.police.by} at ${localApprovals.police.time}`
                  : 'Requires Police Commander authorization for tactical unit dispatch & traffic diversion.'}
              </p>
            </div>
          </div>

          <div>
            {isPoliceApproved ? (
              <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-semibold px-3 py-1.5 rounded-lg vera-card-secondary">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                Dispatched
              </span>
            ) : canApprovePolice() ? (
              <button
                onClick={() => handleAgencyApproval('police')}
                disabled={loadingAction !== null}
                className="vera-button-primary text-xs py-1.5 px-3.5 shadow-md disabled:opacity-50"
              >
                {loadingAction === 'police' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                Approve Police Dispatch
              </button>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] text-[var(--vera-text-muted)] px-2.5 py-1 rounded vera-card-secondary border border-[var(--vera-border)]">
                <Lock className="w-3 h-3 text-[var(--vera-text-muted)]" />
                Police Role Required
              </span>
            )}
          </div>
        </div>

        {/* 2. Hospital Medical / Trauma ER Confirmation */}
        <div className="vera-card-secondary p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-[var(--vera-primary-soft)] text-[#D45060] border border-[var(--vera-primary-border)] mt-0.5">
              <HeartPulse className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[var(--vera-text-primary)]">🏥 Medical Trauma &amp; EMS Confirmation</span>
                {isHospitalApproved ? (
                  <span className="px-2 py-0.2 rounded text-[9px] font-bold vera-badge-success flex items-center gap-1">
                    <Check className="w-2.5 h-2.5" /> Confirmed
                  </span>
                ) : (
                  <span className="px-2 py-0.2 rounded text-[9px] font-medium bg-[var(--vera-surface-muted)] text-[var(--vera-text-muted)] border border-[var(--vera-border)]">
                    Pending Hospital Action
                  </span>
                )}
              </div>
              <p className="text-[11px] text-[var(--vera-text-muted)] mt-0.5">
                {localApprovals.hospital?.by
                  ? `Confirmed by ${localApprovals.hospital.by} at ${localApprovals.hospital.time}`
                  : 'Authorizes Advanced Life Support (ALS) ambulance rollout & preps emergency ER trauma bay.'}
              </p>
            </div>
          </div>

          <div>
            {isHospitalApproved ? (
              <span className="inline-flex items-center gap-1 text-xs text-rose-600 dark:text-rose-400 font-semibold px-3 py-1.5 rounded-lg vera-card-secondary">
                <CheckCircle2 className="w-3.5 h-3.5 text-rose-500" />
                EMS Active
              </span>
            ) : canApproveHospital() ? (
              <button
                onClick={() => handleAgencyApproval('hospital')}
                disabled={loadingAction !== null}
                className="vera-button-primary text-xs py-1.5 px-3.5 shadow-md disabled:opacity-50"
              >
                {loadingAction === 'hospital' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                Confirm Medical Response
              </button>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] text-[var(--vera-text-muted)] px-2.5 py-1 rounded vera-card-secondary border border-[var(--vera-border)]">
                <Lock className="w-3 h-3 text-[var(--vera-text-muted)]" />
                Hospital Role Required
              </span>
            )}
          </div>
        </div>

        {/* 3. Municipal Corporation Work Order Approval */}
        <div className="vera-card-secondary p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-[var(--vera-primary-soft)] text-[var(--brand-primary)] border border-[var(--vera-primary-border)] mt-0.5">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[var(--vera-text-primary)]">🏛️ Municipal Corporation Work Order</span>
                {isMunicipalApproved ? (
                  <span className="px-2 py-0.2 rounded text-[9px] font-bold vera-badge-success flex items-center gap-1">
                    <Check className="w-2.5 h-2.5" /> Authorized
                  </span>
                ) : (
                  <span className="px-2 py-0.2 rounded text-[9px] font-medium bg-[var(--vera-surface-muted)] text-[var(--vera-text-muted)] border border-[var(--vera-border)]">
                    Pending Municipal Action
                  </span>
                )}
              </div>
              <p className="text-[11px] text-[var(--vera-text-muted)] mt-0.5">
                {localApprovals.municipal?.by
                  ? `Authorized by ${localApprovals.municipal.by} at ${localApprovals.municipal.time}`
                  : 'Authorizes work order for road repair, water/sewerage isolation, electrical or sanitation crew.'}
              </p>
            </div>
          </div>

          <div>
            {isMunicipalApproved ? (
              <span className="inline-flex items-center gap-1 text-xs text-purple-600 dark:text-purple-400 font-semibold px-3 py-1.5 rounded-lg vera-card-secondary">
                <CheckCircle2 className="w-3.5 h-3.5 text-purple-500" />
                Crew Deployed
              </span>
            ) : canApproveMunicipal() ? (
              <button
                onClick={() => handleAgencyApproval('municipal')}
                disabled={loadingAction !== null}
                className="vera-button-primary text-xs py-1.5 px-3.5 shadow-md disabled:opacity-50"
              >
                {loadingAction === 'municipal' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                Approve Work Order
              </button>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] text-[var(--vera-text-muted)] px-2.5 py-1 rounded vera-card-secondary border border-[var(--vera-border)]">
                <Lock className="w-3 h-3 text-[var(--vera-text-muted)]" />
                Municipal Role Required
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Citizen Reassuring Live Status Grid */}
      {currentRole === 'citizen' && (
        <div className="bg-[var(--vera-primary-soft)] border border-[var(--vera-primary-border)] rounded-xl p-3.5 mb-5 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-[#800020] text-[#FFF9F2]">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div className="flex-1">
            <h5 className="text-xs font-bold text-[var(--brand-primary)]">Live Multi-Agency Public Tracking</h5>
            <p className="text-[11px] text-[var(--vera-text-secondary)]">
              Your incident is actively monitored. Responding police units, medical EMS, and municipal teams receive live telematics.
            </p>
          </div>
        </div>
      )}

      {/* False Alarm / Downgrade Bar */}
      {currentRole !== 'citizen' && !isDowngraded && (
        <div className="pt-3 border-t border-[var(--vera-border)] flex justify-end">
          <button
            onClick={() => setShowDowngradeModal(true)}
            disabled={loadingAction !== null}
            className="text-[11px] text-[var(--vera-text-muted)] hover:text-[#D45060] flex items-center gap-1 transition cursor-pointer"
          >
            <AlertOctagon className="w-3.5 h-3.5" />
            Mark False Alarm / Downgrade Priority
          </button>
        </div>
      )}

      {/* Downgrade / False Alarm Modal */}
      {showDowngradeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="vera-modal p-6 max-w-md w-full shadow-2xl">
            <h4 className="text-sm font-bold uppercase tracking-wider text-[#D45060] mb-2 flex items-center gap-2">
              <AlertOctagon className="w-5 h-5" /> False Alarm / Downgrade Verification
            </h4>
            <p className="text-xs text-[var(--vera-text-muted)] mb-4 leading-relaxed">
              Are you sure you want to cancel emergency escalation and downgrade this incident to a regular civic complaint queue?
            </p>
            <textarea
              value={downgradeReason}
              onChange={(e) => setDowngradeReason(e.target.value)}
              placeholder="Reason for downgrade (e.g. caller confirmed minor issue, no emergency)..."
              className="w-full vera-input mb-4 resize-none h-20 text-xs"
            />
            <div className="flex justify-end gap-2 text-xs">
              <button
                onClick={() => setShowDowngradeModal(false)}
                className="px-3.5 py-2 vera-button-secondary text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleDowngrade}
                disabled={loadingAction === 'downgrade'}
                className="vera-button-danger text-xs disabled:opacity-50 flex items-center gap-1.5"
              >
                {loadingAction === 'downgrade' && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Confirm Downgrade
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
