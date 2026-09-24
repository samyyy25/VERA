import { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  Activity, 
  Cpu
} from 'lucide-react';
import { checkHealth, HealthResponse } from './services/api';
import { ComplaintForm } from './components/citizen/ComplaintForm';
import { CommandCenter } from './components/admin/CommandCenter';
import { RoleProvider } from './context/RoleContext';
import { RoleSwitcher } from './components/common/RoleSwitcher';
import { ThemeProvider } from './context/ThemeContext';
import { ThemeToggle } from './components/common/ThemeToggle';

function MainApp() {
  const [activeTab, setActiveTab] = useState<'citizen' | 'admin'>('admin');
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [healthLoading, setHealthLoading] = useState<boolean>(true);
  const [lastChecked, setLastChecked] = useState<Date>(new Date());

  const fetchHealth = async () => {
    setHealthLoading(true);
    try {
      const data = await checkHealth();
      setHealth(data);
    } catch {
      setHealth({
        status: 'degraded',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        service: 'VERA Emergency Response Backend',
        services: {
          database: 'error: backend unreachable',
          omniroute: 'unreachable',
          translation: 'offline',
          maps: 'offline',
        },
      });
    } finally {
      setHealthLoading(false);
      setLastChecked(new Date());
    }
  };

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen vera-page flex flex-col font-sans">
      {/* Top Navigation Bar Matching Canva Template */}
      <header className="vera-header sticky top-0 z-50">
        <div className="w-full px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Left: VERA Logo & Subtitle */}
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-[#800020] border border-[#D45060]/60 shadow-lg shadow-[#800020]/30">
              <ShieldAlert className="w-5 h-5 text-[#FFF9F2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black tracking-wider text-[var(--vera-text-primary)]">
                  VERA
                </h1>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.2 rounded-full text-[10px] font-bold bg-[#800020]/20 text-[#D45060] border border-[#800020]/40">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#D45060] animate-pulse" />
                  System Online
                </span>
              </div>
              <p className="text-[10px] text-[var(--vera-text-muted)] -mt-0.5 font-medium">
                Voice Emergency Response Assistant &bull; Sequenced Command Center
              </p>
            </div>
          </div>

          {/* Center: Navigation Tabs with active Burgundy-Rose underline indicator */}
          <nav className="hidden md:flex items-center gap-6">
            <button
              onClick={() => setActiveTab('admin')}
              className={`text-xs font-bold uppercase tracking-wider py-5 relative transition cursor-pointer ${
                activeTab === 'admin'
                  ? 'text-[var(--vera-text-primary)]'
                  : 'text-[var(--vera-text-muted)] hover:text-[var(--vera-text-primary)]'
              }`}
            >
              COMMAND CENTER
              {activeTab === 'admin' && (
                <span className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-gradient-to-r from-[#800020] to-[#D45060] rounded-t-full shadow-[0_0_12px_rgba(212,80,96,0.8)]" />
              )}
            </button>

            <button
              onClick={() => setActiveTab('citizen')}
              className={`text-xs font-bold uppercase tracking-wider py-5 relative transition cursor-pointer ${
                activeTab === 'citizen'
                  ? 'text-[var(--vera-text-primary)]'
                  : 'text-[var(--vera-text-muted)] hover:text-[var(--vera-text-primary)]'
              }`}
            >
              REPORT ISSUE (CITIZEN)
              {activeTab === 'citizen' && (
                <span className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-gradient-to-r from-[#800020] to-[#D45060] rounded-t-full shadow-[0_0_12px_rgba(212,80,96,0.8)]" />
              )}
            </button>
          </nav>

          {/* Right: Interactive 4-Role Switcher, Theme Toggle & Notification Telemetry */}
          <div className="flex items-center gap-2.5">
            {/* Theme Toggle (Dark / Bright Mode) */}
            <ThemeToggle />

            {/* Notification Activity Indicator */}
            <div className="relative p-2 rounded-xl bg-[var(--vera-surface-muted)] border border-[var(--vera-border)] text-[var(--vera-text-primary)] cursor-pointer hover:bg-[var(--vera-surface-elevated)] transition">
              <Activity className="w-4 h-4 text-[#D45060]" />
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#800020] text-[#FFF9F2] text-[9px] font-bold flex items-center justify-center border border-[#D45060]/50">
                4
              </span>
            </div>

            {/* 4-Role Account & Authority Switcher */}
            <div className="pl-2 border-l border-[var(--vera-border)]">
              <RoleSwitcher />
            </div>
          </div>
        </div>
      </header>

      {/* Main Body */}
      {activeTab === 'admin' ? (
        <div className="flex-1 flex flex-col h-[calc(100vh-4rem)] overflow-hidden">
          <CommandCenter
            health={health}
            healthLoading={healthLoading}
            lastChecked={lastChecked}
            onRefreshHealth={fetchHealth}
            onOpenReport={() => setActiveTab('citizen')}
          />
        </div>
      ) : (
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-6">
          {/* System Health Telemetry Banner */}
          <section className="vera-card rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 border border-[var(--vera-border)]">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-[var(--vera-surface-muted)] border border-[var(--vera-border)] flex items-center justify-center">
                <Cpu className="w-6 h-6 text-[#800020] dark:text-[#D45060]" />
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-sm font-semibold text-[var(--vera-text-primary)]">System Gateway & Telemetry Status</h2>
                  {health?.status === 'ok' ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      LIVE
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                      INITIALIZING
                    </span>
                  )}
                </div>
                <p className="text-xs text-[var(--vera-text-muted)] mt-0.5">
                  Local-first architecture • Backend @ <span className="font-mono text-[var(--vera-text-secondary)]">localhost:5000</span> • OmniRoute @ <span className="font-mono text-[var(--vera-text-secondary)]">localhost:20128</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 self-end md:self-auto">
              <span className="text-[11px] text-[var(--vera-text-muted)] font-mono">
                Last checked: {lastChecked.toLocaleTimeString()}
              </span>
              <button
                onClick={fetchHealth}
                disabled={healthLoading}
                className="px-3 py-1.5 text-xs font-medium vera-button-secondary rounded-lg transition cursor-pointer"
              >
                {healthLoading ? 'Checking...' : 'Refresh Health'}
              </button>
            </div>
          </section>

          {/* Citizen Issue Report Form */}
          {activeTab === 'citizen' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-8">
                <ComplaintForm
                  onSuccess={() => {}}
                  onNavigateToDashboard={() => setActiveTab('admin')}
                />
              </div>
              <div className="lg:col-span-4 space-y-4">
                <div className="vera-card rounded-2xl p-5 border border-[var(--vera-border)]">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#800020] dark:text-[#D45060] mb-2">
                    Live Public Safety Pipeline
                  </h4>
                  <p className="text-xs text-[var(--vera-text-secondary)] leading-relaxed">
                    Every issue submitted is assigned a unique incident tracking ID, verified against reverse-geocoded GPS coordinates, and queued into the real-time Command Center.
                  </p>
                </div>

                <div className="vera-card rounded-2xl p-5 border border-[var(--vera-border)]">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--vera-text-secondary)] mb-2">
                    Emergency Keywords Notice
                  </h4>
                  <p className="text-xs text-[var(--vera-text-secondary)] leading-relaxed">
                    In Level 2, descriptions containing urgent danger terms (fire, collision, unconscious, bleeding) automatically trigger server-side escalation into Critical Incident status.
                  </p>
                </div>
              </div>
            </div>
          )}
        </main>
      )}

      {/* Footer */}
      {activeTab !== 'admin' && (
        <footer className="border-t border-[var(--vera-border)] py-4 bg-[var(--vera-surface-muted)] text-xs text-[var(--vera-text-muted)]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
            <p>© 2026 VERA — Voice Emergency Response Assistant</p>
            <div className="flex items-center gap-4">
              <span>Local Architecture Active</span>
              <span>•</span>
              <span>Deterministic Risk Engine</span>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <RoleProvider>
        <MainApp />
      </RoleProvider>
    </ThemeProvider>
  );
}

