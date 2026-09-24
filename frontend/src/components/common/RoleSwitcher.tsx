import React, { useState, useRef, useEffect } from 'react';
import { useRole } from '../../context/RoleContext';
import { UserRole } from '../../types';
import {
  User,
  Shield,
  HeartPulse,
  Building2,
  ChevronDown,
  Check,
  Sparkles,
} from 'lucide-react';

export const RoleSwitcher: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { currentRole, currentUserProfile, setRole, allProfiles } = useRole();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getRoleIcon = (role: UserRole, className = 'w-4 h-4') => {
    switch (role) {
      case 'citizen':
        return <User className={className} />;
      case 'police':
        return <Shield className={className} />;
      case 'hospital':
        return <HeartPulse className={className} />;
      case 'municipal':
        return <Building2 className={className} />;
    }
  };

  const getRoleTheme = (role: UserRole) => {
    switch (role) {
      case 'citizen':
        return {
          badge: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40',
          accent: 'text-emerald-400',
          bg: 'bg-emerald-500/10 hover:bg-emerald-500/20',
          indicator: 'bg-emerald-400',
          border: 'border-emerald-500/30',
        };
      case 'police':
        return {
          badge: 'bg-blue-950/80 text-blue-300 border-blue-500/40',
          accent: 'text-blue-400',
          bg: 'bg-blue-500/10 hover:bg-blue-500/20',
          indicator: 'bg-blue-400',
          border: 'border-blue-500/30',
        };
      case 'hospital':
        return {
          badge: 'bg-rose-950/80 text-rose-300 border-rose-500/40',
          accent: 'text-rose-400',
          bg: 'bg-rose-500/10 hover:bg-rose-500/20',
          indicator: 'bg-rose-400',
          border: 'border-rose-500/30',
        };
      case 'municipal':
        return {
          badge: 'bg-purple-950/80 text-purple-300 border-purple-500/40',
          accent: 'text-purple-400',
          bg: 'bg-purple-500/10 hover:bg-purple-500/20',
          indicator: 'bg-purple-400',
          border: 'border-purple-500/30',
        };
    }
  };

  const currentTheme = getRoleTheme(currentRole);

  const roleList: { role: UserRole; label: string; desc: string }[] = [
    { role: 'citizen', label: '👤 Citizen', desc: 'Eyewitness reporting & evidence' },
    { role: 'police', label: '👮 Police', desc: 'Tactical command & patrol dispatch' },
    { role: 'hospital', label: '🏥 Hospital / EMS', desc: 'Trauma ICU & ambulance readiness' },
    { role: 'municipal', label: '🏛️ Municipal Authority', desc: 'Civic work orders & dept repairs' },
  ];

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2.5 px-3 py-1.5 rounded-xl border transition cursor-pointer shadow-md ${
          currentTheme.badge
        } bg-[var(--vera-surface)] hover:bg-[var(--vera-surface-muted)] border-[var(--vera-border)]`}
        title="Switch User Profile & Authority Role"
      >
        <div
          className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs border ${currentTheme.border} ${currentTheme.bg} ${currentTheme.accent}`}
        >
          {currentUserProfile.avatarInitials}
        </div>

        <div className="text-left leading-none">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-[var(--vera-text-primary)]">{currentUserProfile.name}</span>
            <span
              className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded border ${currentTheme.badge}`}
            >
              {currentRole}
            </span>
          </div>
          {!compact && (
            <p className="text-[10px] text-[var(--vera-text-muted)] truncate max-w-[170px] mt-0.5">
              {currentUserProfile.title}
            </p>
          )}
        </div>

        <ChevronDown
          className={`w-3.5 h-3.5 text-[var(--vera-text-muted)] transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 rounded-2xl bg-[var(--vera-surface-elevated)] border border-[var(--vera-border)] shadow-2xl shadow-black/40 z-50 overflow-hidden backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150">
          <div className="px-4 py-3 border-b border-[var(--vera-border)] bg-[var(--vera-surface-muted)]">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#800020] dark:text-[#D45060] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                Active Profile Switcher
              </span>
              <span className="text-[10px] text-[var(--vera-text-muted)]">4 Verified Roles</span>
            </div>
            <p className="text-[11px] text-[var(--vera-text-muted)] mt-1">
              Switch roles to verify decoupled approvals & permissions for the same incident.
            </p>
          </div>

          <div className="p-2 space-y-1">
            {roleList.map(({ role, label, desc }) => {
              const profile = allProfiles[role];
              const theme = getRoleTheme(role);
              const isActive = currentRole === role;

              return (
                <button
                  key={role}
                  onClick={() => {
                    setRole(role);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition cursor-pointer ${
                    isActive
                      ? 'bg-[#800020] text-[#FFF9F2] border border-[#D45060]/50 shadow-sm'
                      : 'hover:bg-[var(--vera-surface-muted)] border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs border ${
                        isActive ? 'bg-[#FFF9F2] text-[#800020] border-[#FFF9F2]' : `${theme.border} ${theme.bg} ${theme.accent}`
                      }`}
                    >
                      {getRoleIcon(role, 'w-4 h-4')}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold ${isActive ? 'text-[#FFF9F2]' : 'text-[var(--vera-text-primary)]'}`}>{label}</span>
                        {isActive && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold uppercase bg-[#D45060] text-[#FFF9F2]">
                            Active
                          </span>
                        )}
                      </div>
                      <p className={`text-[11px] font-medium ${isActive ? 'text-[#F3E6D5]' : 'text-[var(--vera-text-secondary)]'}`}>{profile.name}</p>
                      <p className={`text-[10px] ${isActive ? 'text-[#F3E6D5]/80' : 'text-[var(--vera-text-muted)]'}`}>{desc}</p>
                    </div>
                  </div>

                  {isActive ? (
                    <Check className="w-4 h-4 text-[#FFF9F2]" />
                  ) : (
                    <div className="w-2 h-2 rounded-full bg-[var(--vera-border)]" />
                  )}
                </button>
              );
            })}
          </div>

          <div className="px-3.5 py-2.5 bg-[var(--vera-surface-muted)] border-t border-[var(--vera-border)] flex items-center justify-between text-[10px] text-[var(--vera-text-muted)]">
            <span>Current Dept:</span>
            <span className="font-semibold text-[var(--vera-text-secondary)] truncate max-w-[200px]">
              {currentUserProfile.department}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
