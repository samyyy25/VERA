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
  RefreshCw,
  Activity,
} from 'lucide-react';

import { HealthResponse } from '../../services/api';
import { DashboardPage } from './pages/DashboardPage';
import { IncidentsPage } from './pages/IncidentsPage';
import { ResponseOrchestratorPage } from './pages/ResponseOrchestratorPage';
import { LiveIncidentUpdatesPage } from './pages/LiveIncidentUpdatesPage';
import { MapViewPage } from './pages/MapViewPage';
import { VideoRoomsPage } from './pages/VideoRoomsPage';
import { AuthoritiesPage } from './pages/AuthoritiesPage';
import { ReportsPage } from './pages/ReportsPage';
import { AnalyticsPage } from './pages/AnalyticsPage';

export type CommandSection =
  | 'dashboard'
  | 'incidents'
  | 'orchestrator'
  | 'liveupdates'
  | 'map'
  | 'videorooms'
  | 'authorities'
  | 'reports'
  | 'analytics';

interface NavItem {
  id: CommandSection;
  label: string;
  prefixSymbol: string;
  icon: React.ReactNode;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard',    label: 'Command Center',        prefixSymbol: '⌂', icon: <LayoutDashboard className="w-4 h-4" /> },
  { id: 'incidents',    label: 'Incidents',             prefixSymbol: '⚠', icon: <IncidentsIcon className="w-4 h-4" /> },
  { id: 'orchestrator', label: 'Response Orchestrator', prefixSymbol: '⚡', icon: <Activity className="w-4 h-4" /> },
  { id: 'liveupdates',  label: 'Live Incident Updates', prefixSymbol: '◉', icon: <Radio className="w-4 h-4" /> },
  { id: 'map',          label: 'Map View',              prefixSymbol: '⌖', icon: <Map className="w-4 h-4" /> },
  { id: 'videorooms',   label: 'Video Rooms',           prefixSymbol: '▣', icon: <Video className="w-4 h-4" /> },
  { id: 'authorities',  label: 'Authorities',           prefixSymbol: '♜', icon: <Building2 className="w-4 h-4" /> },
  { id: 'reports',      label: 'Reports',               prefixSymbol: '▤', icon: <FileText className="w-4 h-4" /> },
  { id: 'analytics',    label: 'Analytics',             prefixSymbol: '◒', icon: <BarChart2 className="w-4 h-4" /> },
];

interface CommandCenterProps {
  health: HealthResponse | null;
  healthLoading: boolean;
  lastChecked: Date;
  onRefreshHealth: () => void;
  onOpenReport?: () => void;
}

export const CommandCenter: React.FC<CommandCenterProps> = ({
  health,
  healthLoading,
  lastChecked,
  onRefreshHealth,
  onOpenReport,
}) => {
  const [activeSection, setActiveSection] = useState<CommandSection>('dashboard');
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);

  const isHealthy = health?.status === 'ok';

  const handleNavigate = (section: CommandSection, incidentId?: string) => {
    if (incidentId) {
      setSelectedIncidentId(incidentId);
    }
    setActiveSection(section);
  };

  const renderPage = () => {
    switch (activeSection) {
      case 'dashboard':
        return <DashboardPage onNavigateToSection={handleNavigate} onOpenReport={onOpenReport} />;
      case 'incidents':
        return (
          <IncidentsPage
            onNavigateToSection={handleNavigate}
          />
        );
      case 'orchestrator':
        return (
          <ResponseOrchestratorPage
            selectedIncidentId={selectedIncidentId}
            onSelectIncident={(id) => setSelectedIncidentId(id)}
          />
        );
      case 'liveupdates':
        return (
          <LiveIncidentUpdatesPage
            selectedIncidentId={selectedIncidentId}
            onSelectIncident={(id) => setSelectedIncidentId(id)}
          />
        );
      case 'map':
        return <MapViewPage />;
      case 'videorooms':
        return <VideoRoomsPage />;
      case 'authorities':
        return <AuthoritiesPage />;
      case 'reports':
        return <ReportsPage />;
      case 'analytics':
        return <AnalyticsPage />;
      default:
        return <DashboardPage onNavigateToSection={handleNavigate} onOpenReport={onOpenReport} />;
    }
  };

  return (
    <div className="flex h-full bg-[#0c1419] overflow-hidden text-[#edf5f2]">
      {/* ── Sidebar (Burgundy Command Center / Warm Cream Canvas) ────────────────── */}
      <aside className="w-[220px] flex-shrink-0 flex flex-col bg-[#16080D] border-r border-[#3d1422] overflow-y-auto transition-colors duration-200">
        {/* Nav items matching Canva template */}
        <nav className="flex-1 py-4 px-3 space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                id={`cmd-nav-${item.id}`}
                onClick={() => setActiveSection(item.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all text-left cursor-pointer ${
                  isActive
                    ? 'bg-[#800020] text-[#FFF9F2] border border-[#D45060]/40 shadow-md font-bold'
                    : 'text-[#F3E6D5] hover:text-[#FFF9F2] hover:bg-[#241018]'
                }`}
              >
                <span className={`text-sm ${isActive ? 'text-[#FFF9F2]' : 'text-[#C8AEB5]'}`}>
                  {item.prefixSymbol}
                </span>
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* System Status card at bottom of sidebar */}
        <div className="m-3 p-3.5 rounded-2xl bg-[#241018] border border-[#3d1422] flex flex-col gap-2 shadow-lg">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#C8AEB5]">
            SYSTEM STATUS
          </p>

          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse shadow-[0_0_8px_#10B981]" />
            <span className="text-[11px] font-black text-[#F3E6D5] tracking-wide">
              {isHealthy ? 'ALL SYSTEMS OPERATIONAL' : 'SYSTEM ONLINE'}
            </span>
          </div>

          <div className="space-y-1">
            <p className="text-[10px] text-[#C8AEB5] font-mono">
              Last sync {lastChecked.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </p>
            {/* ECG Heartbeat line */}
            <div className="h-6 w-full flex items-center">
              <svg className="w-full h-5" viewBox="0 0 100 20" fill="none">
                <path
                  d="M0,10 L30,10 L35,2 L40,18 L45,6 L50,14 L55,10 L100,10"
                  stroke="#D45060"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>

          <button
            onClick={onRefreshHealth}
            disabled={healthLoading}
            className="w-full py-2 rounded-xl bg-[#800020] hover:bg-[#A0002A] border border-[#D45060]/30 text-[10px] font-bold text-[#FFF9F2] transition flex items-center justify-center gap-1.5 uppercase tracking-wider disabled:opacity-50 cursor-pointer shadow-sm"
          >
            <RefreshCw className={`w-3 h-3 ${healthLoading ? 'animate-spin' : ''}`} />
            <span>SYNC STATUS</span>
          </button>
        </div>
      </aside>

      {/* ── Main content area ─────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto min-h-0 bg-[#10070B]">
        {renderPage()}
      </main>
    </div>
  );
};

