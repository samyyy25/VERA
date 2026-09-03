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
    responseSLA: 'Immediate Critical (<10 Mins)',
    isEmergencyService: true,
  },
  {
    category: 'Other civic issues',
    department: 'General Municipal Helpdesk & Public Grievances',
    email: 'helpdesk-demo@vera-response.local',
    phoneFallback: '1800-CIVIC-00',
    responseSLA: '48 Hours',
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
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel rounded-2xl p-5 border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-teal-400" />
            <h2 className="text-xl font-bold text-white">Authority Dispatch Routing Matrix</h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-500/10 text-teal-300 border border-teal-500/30">
              SECTION 40 PROTOCOL
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Deterministic mapping of citizen incident categories to municipal agencies, emergency services, and automated notification endpoints
          </p>
        </div>

        <button
          onClick={loadData}
          disabled={loading}
          className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white transition self-start sm:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Grid of Authorities */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {DEPARTMENTS.map((item) => {
          const activeCount = countsByDept[item.department] || 0;
          return (
            <div
              key={item.category}
              className={`glass-panel rounded-2xl p-5 border flex flex-col justify-between gap-4 ${
                item.isEmergencyService
                  ? 'border-red-500/30 bg-red-950/10'
                  : 'border-slate-800'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-teal-400 border border-slate-700">
                    Category: {item.category}
                  </span>
                  {item.isEmergencyService ? (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-600/20 text-red-400 border border-red-500/30 flex items-center gap-1">
                      <Flame className="w-3 h-3" /> Urgent
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-400">
                      Civic
                    </span>
                  )}
                </div>

                <div>
                  <h3 className="text-sm font-bold text-white leading-snug">{item.department}</h3>
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-1">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    <span>Target SLA: <strong className="text-slate-300 font-medium">{item.responseSLA}</strong></span>
                  </div>
                </div>

                <div className="space-y-1.5 pt-2 border-t border-slate-800/60 text-xs">
                  <div className="flex items-center gap-2 text-slate-400 truncate">
                    <Mail className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                    <span className="font-mono text-[11px] truncate text-slate-300">{item.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-400">
                    <Phone className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                    <span className="font-mono text-[11px] text-slate-300">{item.phoneFallback}</span>
                  </div>
                </div>
              </div>

              {/* Status and Active Count */}
              <div className="pt-3 border-t border-slate-800/60 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-[11px] text-emerald-300 font-medium">Auto-Notify Active</span>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-slate-500 block uppercase">Routed</span>
                  <span className={`font-mono text-sm font-bold ${activeCount > 0 ? 'text-teal-400' : 'text-slate-500'}`}>
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
