import { Menu, X } from 'lucide-react';
import { useState } from 'react';
import type { AppView } from '../types/travel';

interface NavbarProps {
  activeView: AppView;
  onNavigate: (view: AppView) => void;
  onJumpToFaq: () => void;
  trackedCount: number;
  triggeredAlertsCount: number;
  onQuickDemoRoute: () => void;
}

export function Navbar({
  activeView,
  onNavigate,
  onJumpToFaq,
  trackedCount,
  triggeredAlertsCount,
  onQuickDemoRoute,
}: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const trackerLabel =
    triggeredAlertsCount > 0
      ? `Tracker (${triggeredAlertsCount} alert${triggeredAlertsCount > 1 ? 's' : ''})`
      : `Tracker (${trackedCount})`;

  const desktopNavItems: {
    id: string;
    label: string;
    isActive: boolean;
    onClick: () => void;
  }[] = [
    {
      id: 'results',
      label: 'Compare Fares',
      isActive: activeView === 'results',
      onClick: () => onNavigate('results'),
    },
    {
      id: 'forecast',
      label: 'Forecasting',
      isActive: activeView === 'forecast',
      onClick: () => onNavigate('forecast'),
    },
    {
      id: 'tracker',
      label: trackerLabel,
      isActive: activeView === 'tracker',
      onClick: () => onNavigate('tracker'),
    },
    {
      id: 'assistant',
      label: 'Ask AI',
      isActive: activeView === 'assistant',
      onClick: () => onNavigate('assistant'),
    },
    {
      id: 'faq',
      label: 'FAQ',
      isActive: false,
      onClick: onJumpToFaq,
    },
  ];

  const handleBrandClick = () => {
    setMobileOpen(false);
    onNavigate('landing');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <header className="sticky top-0 z-40 bg-[#FAFAFA]/95 backdrop-blur-sm border-b border-slate-200">
      <div className="max-w-7xl mx-auto h-14 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-8">
        {/* Zone 1: Single clean text element wordmark */}
        <button
          type="button"
          onClick={handleBrandClick}
          className="font-display text-lg font-bold tracking-tight text-slate-900 hover:text-blue-700 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600 cursor-pointer"
        >
          Skysync
        </button>

        {/* Zone 2: 5 concise single-line text navigation links */}
        <nav aria-label="Primary" className="hidden md:flex items-center gap-7">
          {desktopNavItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={item.onClick}
              className={`relative py-1 text-sm font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600 ${
                item.isActive
                  ? 'text-slate-900 after:absolute after:inset-x-0 after:-bottom-[15px] after:h-[2px] after:bg-blue-600'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={onQuickDemoRoute}
            className="hidden sm:inline-flex items-center justify-center px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            Demo Raipur → Delhi
          </button>

          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-expanded={mobileOpen}
            aria-label="Toggle navigation menu"
            className="md:hidden inline-flex items-center justify-center w-10 h-10 rounded-lg text-slate-700 hover:bg-slate-200/70 transition-colors cursor-pointer"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden bg-white border-b border-slate-200 px-4 py-3 space-y-1">
          <button
            type="button"
            onClick={handleBrandClick}
            className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
              activeView === 'landing'
                ? 'bg-slate-100 text-slate-900'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            Overview
          </button>

          {desktopNavItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setMobileOpen(false);
                item.onClick();
              }}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                item.isActive
                  ? 'bg-slate-100 text-slate-900'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              {item.label}
            </button>
          ))}

          <div className="pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                setMobileOpen(false);
                onQuickDemoRoute();
              }}
              className="w-full py-2.5 px-4 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
            >
              Load Raipur → Delhi Demo
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
