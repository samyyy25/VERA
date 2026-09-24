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
  if (!statusStr) return <span className="text-[var(--vera-text-muted)] text-xs">Checking...</span>;
  if (statusStr.includes('connected') || statusStr.includes('available') || statusStr === 'ok') {
    return (
      <span className="vera-badge vera-badge-success text-xs font-medium inline-flex items-center gap-1.5">
        <CheckCircle2 className="w-3.5 h-3.5" />
        {statusStr}
      </span>
    );
  }
  if (statusStr.includes('degraded') || statusStr.includes('unconfigured') || statusStr.includes('not_configured')) {
    return (
      <span className="vera-badge vera-badge-warning text-xs font-medium inline-flex items-center gap-1.5">
        <AlertTriangle className="w-3.5 h-3.5" />
        {statusStr}
      </span>
    );
  }
  return (
    <span className="vera-badge vera-badge-critical text-xs font-medium inline-flex items-center gap-1.5">
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
    <div className="p-4 sm:p-6 space-y-6 max-w-4xl">
      <div>
        <h2 className="text-xl font-bold text-[var(--vera-text-primary)] flex items-center gap-2 mb-1">
          <Server className="w-5 h-5 text-[var(--vera-primary)]" />
          System Telemetry
        </h2>
        <p className="text-sm text-[var(--vera-text-muted)]">Live health status for all VERA services</p>
      </div>

      {/* Overall status banner */}
      <div className={`rounded-2xl p-4 border flex items-center justify-between ${
        health?.status === 'ok'
          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600'
          : 'bg-amber-500/10 border-amber-500/30 text-amber-600'
      }`}>
        <div className="flex items-center gap-3">
          <Cpu className={`w-5 h-5 ${health?.status === 'ok' ? 'text-emerald-500' : 'text-amber-500'}`} />
          <div>
            <p className="text-sm font-semibold text-[var(--vera-text-primary)]">
              {health?.status === 'ok' ? 'All Systems Operational' : 'System Degraded or Initializing'}
            </p>
            <p className="text-xs text-[var(--vera-text-muted)] font-mono mt-0.5">
              Last checked: {lastChecked.toLocaleTimeString()}
            </p>
          </div>
        </div>
        <button
          onClick={onRefresh}
          disabled={healthLoading}
          className="px-3 py-1.5 text-xs font-medium vera-button-secondary rounded-lg transition cursor-pointer"
        >
          {healthLoading ? 'Checking...' : 'Refresh'}
        </button>
      </div>

      {/* Service matrix */}
      <div className="vera-card rounded-2xl p-6 shadow-md border border-[var(--vera-border)]">
        <h3 className="text-base font-bold text-[var(--vera-text-primary)] mb-4 flex items-center gap-2">
          <Server className="w-5 h-5 text-[var(--vera-primary)]" />
          Service Health Matrix
          <span className="text-xs font-mono text-[var(--vera-text-muted)] ml-1">(/api/health)</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            {
              icon: <Database className="w-5 h-5 text-[var(--vera-primary)]" />,
              title: 'Supabase Database',
              subtitle: 'PostgreSQL + Realtime',
              status: health?.services?.database,
            },
            {
              icon: <Cpu className="w-5 h-5 text-[var(--vera-primary)]" />,
              title: 'OmniRoute Gateway',
              subtitle: 'http://localhost:20128/v1',
              status: health?.services?.omniroute,
            },
            {
              icon: <MapPin className="w-5 h-5 text-[var(--vera-primary)]" />,
              title: 'OSM & Nominatim',
              subtitle: 'Geocoding & Overpass POIs',
              status: health?.services?.maps,
            },
            {
              icon: <Languages className="w-5 h-5 text-[var(--vera-primary)]" />,
              title: 'Translation Service',
              subtitle: 'LibreTranslate / MyMemory',
              status: health?.services?.translation,
            },
          ].map((svc) => (
            <div
              key={svc.title}
              className="p-4 rounded-xl vera-card-secondary border border-[var(--vera-border)] flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                {svc.icon}
                <div>
                  <h4 className="text-sm font-semibold text-[var(--vera-text-primary)]">{svc.title}</h4>
                  <p className="text-xs text-[var(--vera-text-muted)]">{svc.subtitle}</p>
                </div>
              </div>
              {getStatusBadge(svc.status)}
            </div>
          ))}
        </div>
      </div>

      {/* Architecture notes */}
      <div className="vera-card rounded-2xl p-5 shadow-sm border border-[var(--vera-border)] space-y-2">
        <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--vera-primary)]">Architecture</h4>
        <ul className="text-xs text-[var(--vera-text-secondary)] space-y-1.5 leading-relaxed">
          <li>• Local-first architecture — backend at <span className="font-mono text-[var(--vera-text-primary)]">localhost:5000</span></li>
          <li>• OmniRoute AI gateway at <span className="font-mono text-[var(--vera-text-primary)]">localhost:20128</span></li>
          <li>• Supabase PostgreSQL for persistent storage + real-time subscriptions</li>
          <li>• Nominatim/OSM for reverse geocoding and emergency service POIs</li>
          <li>• Deterministic risk engine runs server-side — no LLM latency for risk scoring</li>
        </ul>
      </div>
    </div>
  );
};

