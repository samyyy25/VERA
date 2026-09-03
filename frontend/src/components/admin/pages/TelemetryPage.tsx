import React from 'react';
import {
  Database,
  Languages,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Server,
  Cpu,
} from 'lucide-react';
import { HealthResponse } from '../../../services/api';

interface TelemetryPageProps {
  health: HealthResponse | null;
  healthLoading: boolean;
  lastChecked: Date;
  onRefresh: () => void;
}

const getStatusBadge = (statusStr: string | undefined) => {
  if (!statusStr) return <span className="text-slate-500 text-xs">Checking...</span>;
  if (statusStr.includes('connected') || statusStr.includes('available') || statusStr === 'ok') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
        <CheckCircle2 className="w-3.5 h-3.5" />
        {statusStr}
      </span>
    );
  }
  if (statusStr.includes('degraded') || statusStr.includes('unconfigured') || statusStr.includes('not_configured')) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
        <AlertTriangle className="w-3.5 h-3.5" />
        {statusStr}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20">
      <XCircle className="w-3.5 h-3.5" />
      {statusStr}
    </span>
  );
};

export const TelemetryPage: React.FC<TelemetryPageProps> = ({
  health,
  healthLoading,
  lastChecked,
  onRefresh,
}) => {
  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div>
        <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-1">
          <Server className="w-5 h-5 text-teal-400" />
          System Telemetry
        </h2>
        <p className="text-sm text-slate-400">Live health status for all VERA services</p>
      </div>

      {/* Overall status banner */}
      <div className={`rounded-2xl p-4 border flex items-center justify-between ${
        health?.status === 'ok'
          ? 'bg-emerald-950/30 border-emerald-500/30'
          : 'bg-amber-950/30 border-amber-500/30'
      }`}>
        <div className="flex items-center gap-3">
          <Cpu className={`w-5 h-5 ${health?.status === 'ok' ? 'text-emerald-400' : 'text-amber-400'}`} />
          <div>
            <p className="text-sm font-semibold text-slate-200">
              {health?.status === 'ok' ? 'All Systems Operational' : 'System Degraded or Initializing'}
            </p>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              Last checked: {lastChecked.toLocaleTimeString()}
            </p>
          </div>
        </div>
        <button
          onClick={onRefresh}
          disabled={healthLoading}
          className="px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition"
        >
          {healthLoading ? 'Checking...' : 'Refresh'}
        </button>
      </div>

      {/* Service matrix */}
      <div className="glass-panel rounded-2xl p-6 border border-slate-800">
        <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
          <Server className="w-5 h-5 text-teal-400" />
          Service Health Matrix
          <span className="text-xs font-mono text-slate-500 ml-1">(/api/health)</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            {
              icon: <Database className="w-5 h-5 text-teal-400" />,
              title: 'Supabase Database',
              subtitle: 'PostgreSQL + Realtime',
              status: health?.services?.database,
            },
            {
              icon: <Cpu className="w-5 h-5 text-teal-400" />,
              title: 'OmniRoute Gateway',
              subtitle: 'http://localhost:20128/v1',
              status: health?.services?.omniroute,
            },
            {
              icon: <MapPin className="w-5 h-5 text-teal-400" />,
              title: 'OSM & Nominatim',
              subtitle: 'Geocoding & Overpass POIs',
              status: health?.services?.maps,
            },
            {
              icon: <Languages className="w-5 h-5 text-teal-400" />,
              title: 'Translation Service',
              subtitle: 'LibreTranslate / MyMemory',
              status: health?.services?.translation,
            },
          ].map((svc) => (
            <div
              key={svc.title}
              className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                {svc.icon}
                <div>
                  <h4 className="text-sm font-semibold text-slate-200">{svc.title}</h4>
                  <p className="text-xs text-slate-400">{svc.subtitle}</p>
                </div>
              </div>
              {getStatusBadge(svc.status)}
            </div>
          ))}
        </div>
      </div>

      {/* Architecture notes */}
      <div className="glass-panel rounded-2xl p-5 border border-slate-800 space-y-2">
        <h4 className="text-xs font-bold uppercase tracking-wider text-teal-400">Architecture</h4>
        <ul className="text-xs text-slate-400 space-y-1.5 leading-relaxed">
          <li>• Local-first architecture — backend at <span className="font-mono text-slate-300">localhost:5000</span></li>
          <li>• OmniRoute AI gateway at <span className="font-mono text-slate-300">localhost:20128</span></li>
          <li>• Supabase PostgreSQL for persistent storage + real-time subscriptions</li>
          <li>• Nominatim/OSM for reverse geocoding and emergency service POIs</li>
          <li>• Deterministic risk engine runs server-side — no LLM latency for risk scoring</li>
        </ul>
      </div>
    </div>
  );
};
