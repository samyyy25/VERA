import React, { useState, useEffect, useCallback } from 'react';
import { 
  Building2, 
  Mail, 
  Phone, 
  Clock, 
  CheckCircle2, 
  RefreshCw,
  Flame
} from 'lucide-react';
import { fetchComplaints } from '../../../services/api';
import { Complaint } from '../../../types';

interface DepartmentRoutingInfo {
  department: string;
  category: string;
  email: string;
  phoneFallback: string;
  responseSLA: string;
  isEmergencyService: boolean;
}

const DEPARTMENTS: DepartmentRoutingInfo[] = [
  {
    category: 'Road damage',
    department: 'Municipal Corporation — Roads Dept',
    email: 'roads-dept-demo@vera-response.local',
    phoneFallback: '1800-ROADS-01',
    responseSLA: '24-48 Hours',
    isEmergencyService: false,
  },
  {
    category: 'Garbage/waste',
    department: 'Municipal Corporation — Sanitation Dept',
    email: 'sanitation-demo@vera-response.local',
    phoneFallback: '1800-CLEAN-02',
    responseSLA: '12-24 Hours',
    isEmergencyService: false,
  },
  {
    category: 'Streetlight problems',
    department: 'Municipal Corporation — Electrical Dept',
    email: 'electrical-dept-demo@vera-response.local',
    phoneFallback: '1800-POWER-03',
    responseSLA: '24 Hours',
    isEmergencyService: false,
  },
  {
    category: 'Water leakage',
    department: 'Municipal Corporation — Water & Sewerage Dept',
    email: 'water-dept-demo@vera-response.local',
    phoneFallback: '1800-WATER-04',
    responseSLA: '6-12 Hours',
    isEmergencyService: false,
  },
  {
    category: 'Noise complaints',
    department: 'Local Police — Non-Emergency Civic Cell',
    email: 'police-civic-demo@vera-response.local',
    phoneFallback: '100',
    responseSLA: '2-4 Hours',
    isEmergencyService: false,
  },
  {
    category: 'Harassment',
    department: 'Police Department — Emergency Control Room',
    email: 'police-emergency-demo@vera-response.local',
    phoneFallback: '100 / 112',
    responseSLA: 'Immediate (<15 Mins)',
    isEmergencyService: true,
  },
  {
    category: 'Suspicious activity',
    department: 'Police Department — Patrol Unit',
    email: 'police-patrol-demo@vera-response.local',
    phoneFallback: '100 / 112',
    responseSLA: 'Immediate (<30 Mins)',
    isEmergencyService: true,
  },
  {
    category: 'Accident',
    department: 'Police Dept + Nearest Hospital Emergency Trauma',
    email: 'accident-dispatch-demo@vera-response.local',
    phoneFallback: '108 / 112',
    responseSLA: 'Immediate Critical (<10 Mins)',
    isEmergencyService: true,
  },
  {
    category: 'Fire',
    department: 'Fire & Rescue Services',
    email: 'fire-control-demo@vera-response.local',
    phoneFallback: '101',
    responseSLA: 'Immediate Critical (<8 Mins)',
    isEmergencyService: true,
  },
  {
    category: 'Medical Emergency',
    department: 'Nearest Hospital Emergency & Ambulance Services',
    email: 'medical-ems-demo@vera-response.local',
    phoneFallback: '108',
    responseSLA: 'Immediate Critical (<8 Mins)',
    isEmergencyService: true,
  },
  {
    category: 'Other civic issues',
    department: 'General Municipal Helpdesk & Public Grievances',
    email: 'grievances-demo@vera-response.local',
    phoneFallback: '1800-CIVIC-00',
    responseSLA: '48-72 Hours',
    isEmergencyService: false,
  },
];

export const AuthoritiesPage: React.FC = () => {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchComplaints();
      if (res.success) {
        setComplaints(res.complaints);
      }
    } catch (err) {
      console.warn('Failed to fetch complaints for authority view:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Compute routed counts per department
  const countsByDept: Record<string, number> = {};
  complaints.forEach((c) => {
    const dept = c.routed_department || 'General Municipal Helpdesk & Public Grievances';
    countsByDept[dept] = (countsByDept[dept] || 0) + 1;
  });

  return (
    <div className="p-6 space-y-6 text-[var(--vera-text-primary)]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 vera-card p-5 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-[var(--brand-primary)]" />
            <h2 className="text-xl font-bold text-[var(--vera-text-primary)]">Authority Dispatch Routing Matrix</h2>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[var(--vera-primary-soft)] text-[var(--brand-primary)] border border-[var(--vera-primary-border)]">
              SECTION 40 PROTOCOL
            </span>
          </div>
          <p className="text-xs text-[var(--vera-text-muted)] mt-1">
            Deterministic mapping of citizen incident categories to municipal agencies, emergency services, and automated notification endpoints
          </p>
        </div>

        <button
          onClick={loadData}
          disabled={loading}
          className="p-2.5 rounded-xl vera-button-secondary transition self-start sm:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[var(--brand-primary)]' : ''}`} />
        </button>
      </div>

      {/* Grid of Authorities */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {DEPARTMENTS.map((item) => {
          const activeCount = countsByDept[item.department] || 0;
          return (
            <div
              key={item.category}
              className={`vera-card p-5 flex flex-col justify-between gap-4 shadow-lg ${
                item.isEmergencyService
                  ? 'border-[#D45060]/40'
                  : ''
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded vera-card-secondary text-[var(--brand-primary)] border border-[var(--vera-border)]">
                    Category: {item.category}
                  </span>
                  {item.isEmergencyService ? (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold vera-badge-critical flex items-center gap-1">
                      <Flame className="w-3 h-3" /> Urgent
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded text-[10px] font-medium vera-card-secondary text-[var(--vera-text-muted)]">
                      Civic
                    </span>
                  )}
                </div>

                <div>
                  <h3 className="text-sm font-bold text-[var(--vera-text-primary)] leading-snug">{item.department}</h3>
                  <div className="flex items-center gap-1.5 text-xs text-[var(--vera-text-muted)] mt-1">
                    <Clock className="w-3.5 h-3.5 text-[var(--brand-primary)]" />
                    <span>Target SLA: <strong className="text-[var(--vera-text-primary)] font-medium">{item.responseSLA}</strong></span>
                  </div>
                </div>

                <div className="space-y-1.5 pt-2 border-t border-[var(--vera-border)] text-xs">
                  <div className="flex items-center gap-2 text-[var(--vera-text-secondary)] truncate">
                    <Mail className="w-3.5 h-3.5 text-[var(--brand-primary)] shrink-0" />
                    <span className="font-mono text-[11px] truncate">{item.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[var(--vera-text-secondary)]">
                    <Phone className="w-3.5 h-3.5 text-[var(--brand-primary)] shrink-0" />
                    <span className="font-mono text-[11px]">{item.phoneFallback}</span>
                  </div>
                </div>
              </div>

              {/* Status and Active Count */}
              <div className="pt-3 border-t border-[var(--vera-border)] flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">Auto-Notify Active</span>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-[var(--vera-text-muted)] block uppercase">Routed</span>
                  <span className={`font-mono text-sm font-bold ${activeCount > 0 ? 'text-[var(--brand-primary)]' : 'text-[var(--vera-text-muted)]'}`}>
                    {activeCount} incident{activeCount === 1 ? '' : 's'}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
