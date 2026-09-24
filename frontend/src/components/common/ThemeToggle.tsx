import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

interface ThemeToggleProps {
  compact?: boolean;
  className?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ compact = false, className = '' }) => {
  const { toggleTheme, isDark } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      id="theme-mode-toggle"
      aria-label={`Switch to ${isDark ? 'Bright' : 'Dark'} Mode`}
      title={`Switch to ${isDark ? 'Bright' : 'Dark'} Mode`}
      className={`relative inline-flex items-center gap-2 px-2.5 py-1.5 rounded-xl border transition-all duration-300 cursor-pointer shadow-sm group ${
        isDark
          ? 'bg-[#220e15] border-[#3d1422] hover:bg-[#380d1c] hover:border-[#800020] text-[#FFF9F2]'
          : 'bg-[#ffffff] border-[#F3E6D5] hover:bg-[#FAF3EB] hover:border-[#D45060] text-[#800020] shadow-sm'
      } ${className}`}
    >
      {/* Icon with rotational and color transition */}
      <div
        className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all duration-300 ${
          isDark
            ? 'bg-[#380d1c] text-[#F3E6D5] border border-[#800020] shadow-[0_0_8px_rgba(212,80,96,0.25)]'
            : 'bg-[#FAF3EB] text-[#800020] border border-[#F3E6D5] shadow-[0_0_8px_rgba(128,0,32,0.1)]'
        }`}
      >
        {isDark ? (
          <Moon className="w-3.5 h-3.5 transform transition-transform duration-300 group-hover:-rotate-12" />
        ) : (
          <Sun className="w-3.5 h-3.5 transform transition-transform duration-300 group-hover:rotate-45" />
        )}
      </div>

      {/* Label (if not compact) */}
      {!compact && (
        <div className="flex flex-col text-left leading-none pr-1">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold tracking-tight">
              {isDark ? 'Dark Mode' : 'Bright Mode'}
            </span>
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isDark ? 'bg-[#D45060] shadow-[0_0_6px_#D45060]' : 'bg-[#800020] shadow-[0_0_6px_#800020]'
              }`}
            />
          </div>
          <span className="text-[9px] opacity-60 mt-0.5 uppercase tracking-wider font-semibold">
            {isDark ? 'Burgundy Velvet' : 'Warm Ivory'}
          </span>
        </div>
      )}
    </button>
  );
};
