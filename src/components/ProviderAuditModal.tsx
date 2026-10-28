import { AlertTriangle, CheckCircle2, ExternalLink, ShieldCheck, X } from 'lucide-react';
import { formatDuration, formatInr } from '../modules/fareCalculator';
import type { EnrichedProviderComparison } from '../types/travel';

interface ProviderAuditModalProps {
  selection: EnrichedProviderComparison | null;
  passengers: number;
  onClose: () => void;
}

export function ProviderAuditModal({
  selection,
  passengers,
  onClose,
}: ProviderAuditModalProps) {
  if (!selection) return null;

  const { itinerary, quote, breakdown } = selection;
  const totalAdvertised = quote.advertisedPriceInr * passengers;
  const totalPayable = breakdown.totalPassengersConservativePayableInr;
  const totalDelta = totalPayable - totalAdvertised;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="audit-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/45 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <div className="text-xs text-slate-500">
              <span>Pre-Booking Audit</span>
              <span className="mx-1.5" aria-hidden="true">·</span>
              <span>Demo Data Simulation</span>
            </div>
            <h3 id="audit-modal-title" className="text-lg font-semibold text-slate-900 mt-0.5">
              {quote.providerName} — {itinerary.originCode} to {itinerary.destinationCode}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close audit modal"
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="py-4 space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-600 bg-slate-50 rounded-xl p-3.5 border border-slate-200/80">
            <div>
              <div className="font-semibold text-slate-900">
                {itinerary.airlineName} ({itinerary.flightNumber})
              </div>
              <div className="mt-0.5">
                {itinerary.departureTime24} → {itinerary.arrivalTime24} ·{' '}
                {formatDuration(itinerary.durationMinutes)} ·{' '}
                {itinerary.stops === 0 ? 'Non-stop' : `${itinerary.stops} stop`}
              </div>
            </div>
            <div className="text-right font-mono tabular-nums">
              <div className="text-slate-500">Travellers</div>
              <div className="font-semibold text-slate-900">{passengers}</div>
            </div>
          </div>

          <div className="divide-y divide-slate-200 border-t border-b border-slate-200 text-sm">
            <div className="py-2.5 flex items-center justify-between">
              <span className="text-slate-600">Advertised headline fare ({passengers} pax)</span>
              <span className="font-mono tabular-nums text-slate-700">
                {formatInr(totalAdvertised)}
              </span>
            </div>
            <div className="py-2.5 flex items-center justify-between">
              <span className="text-slate-600">Taxes, airport UDF/ASF, gateway & add-ons</span>
              <span
                className={`font-mono tabular-nums font-medium ${
                  totalDelta > 0 ? 'text-amber-800' : 'text-emerald-700'
                }`}
              >
                {formatInr(totalDelta, true)}
              </span>
            </div>
            <div className="py-3 flex items-center justify-between font-semibold text-slate-900">
              <span>Verified / Buffered Checkout Payable</span>
              <span className="font-mono text-lg tabular-nums">{formatInr(totalPayable)}</span>
            </div>
          </div>

          {breakdown.hasUnknownCharges ? (
            <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/70 flex items-start gap-2.5 text-xs text-amber-900">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold">Watch for unverified checkout fee</div>
                <p className="mt-0.5">{breakdown.unverifiedReasons.join(' ')}</p>
              </div>
            </div>
          ) : (
            <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/60 flex items-start gap-2.5 text-xs text-emerald-900">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold">Transparent fare structure verified</div>
                <p className="mt-0.5">{quote.paymentNote}</p>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 text-xs text-slate-500">
            <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
            <span className="truncate">
              Simulated Provider Endpoint: <span className="font-mono">{quote.providerUrl}</span>
            </span>
          </div>
        </div>

        <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            Back to Comparison
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg inline-flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <span>Acknowledge Demo Handoff</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
