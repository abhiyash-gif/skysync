import type { AppView } from '../types/travel';

interface FooterProps {
  onNavigate: (view: AppView) => void;
  onJumpToFaq: () => void;
}

export function Footer({ onNavigate, onJumpToFaq }: FooterProps) {
  return (
    <footer className="border-t border-slate-200 bg-white mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-1 max-w-xl">
          <div className="font-display text-base font-bold text-slate-900">
            Skysync
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            “See the real fare. Find the better time to fly.” All flight schedules, cross-platform
            fee structures, statistical predictions, and AI assistant answers use deterministic{' '}
            <strong className="font-medium text-slate-700">Demo Data</strong> structured for future
            authorized travel API integration.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-6 text-xs font-medium text-slate-600">
          <button
            type="button"
            onClick={() => {
              onNavigate('landing');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Overview
          </button>
          <button
            type="button"
            onClick={() => onNavigate('results')}
            className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Compare Fares
          </button>
          <button
            type="button"
            onClick={() => onNavigate('forecast')}
            className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Forecasting
          </button>
          <button
            type="button"
            onClick={() => onNavigate('tracker')}
            className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Price Tracker
          </button>
          <button
            type="button"
            onClick={() => onNavigate('assistant')}
            className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Ask AI
          </button>
          <button
            type="button"
            onClick={onJumpToFaq}
            className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            FAQ
          </button>
        </div>
      </div>
    </footer>
  );
}
