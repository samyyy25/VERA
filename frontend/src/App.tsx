import { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  Activity, 
  Server, 
  Database, 
  Cpu, 
  MapPin, 
  Languages, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle
} from 'lucide-react';
import { checkHealth, HealthResponse } from './services/api';
import { ComplaintForm } from './components/citizen/ComplaintForm';
import { CommandCenter } from './components/admin/CommandCenter';


export default function App() {
  const [activeTab, setActiveTab] = useState<'citizen' | 'admin' | 'diagnostics'>('citizen');
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

  const getStatusBadge = (statusStr: string | undefined) => {
    if (!statusStr) return <span className="text-slate-500">Checking...</span>;
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

  return (
    <div className="min-h-screen bg-[#080d1a] text-slate-100 flex flex-col font-sans">
      {/* Top Navigation Bar Matching Template */}
      <header className="border-b border-slate-800/80 bg-[#090c1a]/95 backdrop-blur-md sticky top-0 z-50">
        <div className="w-full px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Left: VERA Logo & Subtitle */}
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-600 to-indigo-800 shadow-lg shadow-indigo-500/30">
              <ShieldAlert className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-wider text-white">
                VERA
              </h1>
              <p className="text-[10px] text-slate-400 -mt-0.5 font-medium">
                Emergency Intelligence Platform
              </p>
            </div>
          </div>

          {/* Center: Navigation Tabs with active pink underline indicator */}
          <nav className="hidden md:flex items-center gap-6">
            <button
              onClick={() => setActiveTab('admin')}
              className={`text-xs font-bold uppercase tracking-wider py-5 relative transition ${
                activeTab === 'admin'
                  ? 'text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              COMMAND CENTER
              {activeTab === 'admin' && (
                <span className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 rounded-t-full shadow-[0_0_12px_rgba(236,72,153,0.8)]" />
              )}
            </button>



            <button
              onClick={() => setActiveTab('citizen')}
              className={`text-xs font-bold uppercase tracking-wider py-5 relative transition ${
                activeTab === 'citizen'
                  ? 'text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              REPORT ISSUE
              {activeTab === 'citizen' && (
                <span className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 rounded-t-full shadow-[0_0_12px_rgba(236,72,153,0.8)]" />
              )}
            </button>

            <button
              onClick={() => setActiveTab('diagnostics')}
              className={`text-xs font-bold uppercase tracking-wider py-5 relative transition ${
                activeTab === 'diagnostics'
                  ? 'text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              TELEMETRY
              {activeTab === 'diagnostics' && (
                <span className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 rounded-t-full shadow-[0_0_12px_rgba(236,72,153,0.8)]" />
              )}
            </button>

            <button
              onClick={() => setActiveTab('admin')}
              className="text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-slate-200 py-5 transition"
            >
              ANALYTICS
            </button>
          </nav>

          {/* Right: Live status, Notification Bell, User Profile */}
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[11px] font-bold text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>LIVE</span>
              <span className="text-slate-400 font-normal">SYSTEM ONLINE</span>
            </div>

            {/* Notification Bell with Badge */}
            <div className="relative p-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 cursor-pointer hover:text-white transition">
              <Activity className="w-4 h-4" />
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-600 text-white text-[9px] font-bold flex items-center justify-center">
                4
              </span>
            </div>

            {/* User Profile */}
            <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-500 to-orange-400 flex items-center justify-center text-slate-950 font-bold text-xs shadow-md">
                AD
              </div>
              <div className="hidden lg:block text-left">
                <p className="text-xs font-bold text-slate-200 leading-tight">Admin</p>
                <p className="text-[10px] text-slate-400 leading-tight">Control Room</p>
              </div>
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
          />
        </div>
      ) : (
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-6">
          {/* System Health Telemetry Banner */}
          <section className="glass-panel rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 border border-slate-800">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center">
                <Cpu className="w-6 h-6 text-teal-400" />
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-sm font-semibold text-slate-200">System Gateway & Telemetry Status</h2>
                  {health?.status === 'ok' ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      LIVE
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      INITIALIZING
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Local-first architecture • Backend @ <span className="font-mono text-slate-300">localhost:5000</span> • OmniRoute @ <span className="font-mono text-slate-300">localhost:20128</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 self-end md:self-auto">
              <span className="text-[11px] text-slate-500 font-mono">
                Last checked: {lastChecked.toLocaleTimeString()}
              </span>
              <button
                onClick={fetchHealth}
                disabled={healthLoading}
                className="px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition"
              >
                {healthLoading ? 'Checking...' : 'Refresh Health'}
              </button>
            </div>
          </section>

          {/* Content Tabs */}
          {activeTab === 'citizen' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-8">
                <ComplaintForm
                  onSuccess={() => {}}
                  onNavigateToDashboard={() => setActiveTab('admin')}
                />
              </div>
              <div className="lg:col-span-4 space-y-4">
                <div className="glass-panel rounded-2xl p-5 border border-slate-800">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-teal-400 mb-2">
                    Live Public Safety Pipeline
                  </h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Every issue submitted is assigned a unique incident tracking ID, verified against reverse-geocoded GPS coordinates, and queued into the real-time Command Center.
                  </p>
                </div>

                <div className="glass-panel rounded-2xl p-5 border border-slate-800">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                    Emergency Keywords Notice
                  </h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    In Level 2, descriptions containing urgent danger terms (fire, collision, unconscious, bleeding) automatically trigger server-side escalation into Critical Incident status.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'diagnostics' && (
            <section className="flex flex-col gap-6">
              <div className="glass-panel rounded-2xl p-6 border border-slate-800">
                <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">

                <Server className="w-5 h-5 text-teal-400" />
                Service Health Matrix (`/api/health`)
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Database className="w-5 h-5 text-teal-400" />
                    <div>
                      <h4 className="text-sm font-semibold text-slate-200">Supabase Database</h4>
                      <p className="text-xs text-slate-400">PostgreSQL + Realtime</p>
                    </div>
                  </div>
                  {getStatusBadge(health?.services?.database)}
                </div>

                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Cpu className="w-5 h-5 text-teal-400" />
                    <div>
                      <h4 className="text-sm font-semibold text-slate-200">OmniRoute Gateway</h4>
                      <p className="text-xs text-slate-400">http://localhost:20128/v1</p>
                    </div>
                  </div>
                  {getStatusBadge(health?.services?.omniroute)}
                </div>

                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <MapPin className="w-5 h-5 text-teal-400" />
                    <div>
                      <h4 className="text-sm font-semibold text-slate-200">OSM & Nominatim</h4>
                      <p className="text-xs text-slate-400">Geocoding & Overpass POIs</p>
                    </div>
                  </div>
                  {getStatusBadge(health?.services?.maps)}
                </div>

                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Languages className="w-5 h-5 text-teal-400" />
                    <div>
                      <h4 className="text-sm font-semibold text-slate-200">Translation Service</h4>
                      <p className="text-xs text-slate-400">LibreTranslate / MyMemory</p>
                    </div>
                  </div>
                  {getStatusBadge(health?.services?.translation)}
                </div>
              </div>
            </div>
          </section>
        )}
      </main>
      )}

      {/* Footer */}
      {activeTab !== 'admin' && (
        <footer className="border-t border-slate-900 py-4 bg-[#060a14] text-xs text-slate-500">
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

