import React, { useState } from 'react';
import {
  LayoutDashboard,
  AlertTriangle as IncidentsIcon,
  Map,
  Radio,
  Video,
  Building2,
  FileText,
  BarChart2,
  Activity as TelemetryIcon,
  Settings,
  ArrowRight,
} from 'lucide-react';

import { HealthResponse } from '../../services/api';
import { TelemetryPage } from './pages/TelemetryPage';
import { DashboardPage } from './pages/DashboardPage';
import { IncidentsPage } from './pages/IncidentsPage';
import { MapViewPage } from './pages/MapViewPage';
import { LiveFeedPage } from './pages/LiveFeedPage';
import { VideoRoomsPage } from './pages/VideoRoomsPage';
import { AuthoritiesPage } from './pages/AuthoritiesPage';
import { ReportsPage } from './pages/ReportsPage';
import { AnalyticsPage } from './pages/AnalyticsPage';

export type CommandSection =
  | 'dashboard'
  | 'incidents'
  | 'map'
  | 'livefeed'
  | 'videorooms'
  | 'authorities'
  | 'reports'
  | 'analytics'
  | 'telemetry'
  | 'settings';

interface NavItem {
  id: CommandSection;
  label: string;
  icon: React.ReactNode;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard',    label: 'Dashboard',    icon: <LayoutDashboard className="w-4 h-4" /> },
  { id: 'incidents',    label: 'Incidents',    icon: <IncidentsIcon className="w-4 h-4" /> },
  { id: 'map',          label: 'Map View',     icon: <Map className="w-4 h-4" /> },
  { id: 'livefeed',     label: 'Live Feed',    icon: <Radio className="w-4 h-4" /> },
  { id: 'videorooms',   label: 'Video Rooms',  icon: <Video className="w-4 h-4" /> },
  { id: 'authorities',  label: 'Authorities',  icon: <Building2 className="w-4 h-4" /> },
  { id: 'reports',      label: 'Reports',      icon: <FileText className="w-4 h-4" /> },
  { id: 'analytics',    label: 'Analytics',    icon: <BarChart2 className="w-4 h-4" /> },
  { id: 'telemetry',    label: 'Telemetry',    icon: <TelemetryIcon className="w-4 h-4" /> },
  { id: 'settings',     label: 'Settings',     icon: <Settings className="w-4 h-4" /> },
];

interface CommandCenterProps {
  health: HealthResponse | null;
  healthLoading: boolean;
  lastChecked: Date;
  onRefreshHealth: () => void;
}

export const CommandCenter: React.FC<CommandCenterProps> = ({
  health,
  healthLoading,
  lastChecked,
  onRefreshHealth,
}) => {
  const [activeSection, setActiveSection] = useState<CommandSection>('dashboard');

  const isHealthy = health?.status === 'ok';

  const renderPage = () => {
    switch (activeSection) {
      case 'dashboard':
        return <DashboardPage />;
      case 'incidents':
        return <IncidentsPage />;
      case 'map':
        return <MapViewPage />;
      case 'livefeed':
        return <LiveFeedPage />;
      case 'videorooms':
        return <VideoRoomsPage />;
      case 'authorities':
        return <AuthoritiesPage />;
      case 'reports':
        return <ReportsPage />;
      case 'analytics':
        return <AnalyticsPage />;
      case 'telemetry':
      case 'settings':
        return (
          <TelemetryPage
            health={health}
            healthLoading={healthLoading}
            lastChecked={lastChecked}
            onRefresh={onRefreshHealth}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex h-full bg-[#080a14] overflow-hidden">
      {/* ── Sidebar (Matching Image Template) ────────────────── */}
      <aside className="w-[210px] flex-shrink-0 flex flex-col bg-[#0b0e20] border-r border-slate-800/80 overflow-y-auto">
        {/* Nav items */}
        <nav className="flex-1 py-5 px-3 space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                id={`cmd-nav-${item.id}`}
                onClick={() => setActiveSection(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all text-left ${
                  isActive
                    ? 'bg-[#5848c2]/30 text-indigo-200 border border-[#6366f1]/40 shadow-[0_0_20px_rgba(99,102,241,0.25)]'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                <span className={isActive ? 'text-indigo-400' : 'text-slate-400'}>
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* System Status card at bottom of sidebar (Matching Image Template) */}
        <div className="m-3 p-3.5 rounded-2xl bg-[#0f142c] border border-slate-800 flex flex-col gap-2 shadow-lg">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            SYSTEM STATUS
          </p>

          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px] font-black text-emerald-400 tracking-wide">
              {isHealthy ? 'ALL SYSTEMS OPERATIONAL' : 'SYSTEM ONLINE'}
            </span>
          </div>

          <div className="space-y-1">
            <p className="text-[10px] text-slate-500 font-mono">
              Last checked {lastChecked.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </p>
            {/* ECG Heartbeat line matching template */}
            <div className="h-6 w-full flex items-center">
              <svg className="w-full h-5" viewBox="0 0 100 20" fill="none">
                <path
                  d="M0,10 L30,10 L35,2 L40,18 L45,6 L50,14 L55,10 L100,10"
                  stroke="#10b981"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>

          <button
            onClick={() => setActiveSection('telemetry')}
            className="w-full py-2 rounded-xl bg-[#5848c2]/30 hover:bg-[#5848c2]/50 border border-indigo-500/40 text-[10px] font-bold text-indigo-300 transition flex items-center justify-center gap-1 uppercase tracking-wider"
          >
            <span>VIEW TELEMETRY</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </aside>

      {/* ── Main content area ─────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto min-h-0 bg-[#080a14]">
        {renderPage()}
      </main>
    </div>
  );
};
