import { AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { BAGGAGE_LABELS, formatInr, SEAT_LABELS } from '../modules/fareCalculator';
import type {
  BaggageTierId,
  ComputedFareBreakdown,
  OptionalExtrasSelection,
  ProviderQuote,
  SeatTierId,
} from '../types/travel';

interface PriceBreakdownLedgerProps {
  quote: ProviderQuote;
  breakdown: ComputedFareBreakdown;
  extras: OptionalExtrasSelection;
  onChangeExtras: (next: OptionalExtrasSelection) => void;
  passengers: number;
  flightLabel?: string;
}

export function PriceBreakdownLedger({
  quote,
  breakdown,
  extras,
  onChangeExtras,
  passengers,
  flightLabel,
}: PriceBreakdownLedgerProps) {
  const mandatoryItems = breakdown.lineItems.filter((i) => i.category === 'mandatory');
  const optionalItems = breakdown.lineItems.filter((i) => i.category === 'optional');
  const discountItems = breakdown.lineItems.filter((i) => i.category === 'discount');

  const verifiedTimeFormatted = new Date(quote.verifiedAtIso).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const advertisedVsFinalPerPax =
    breakdown.perPassengerConservativePayableInr - quote.advertisedPriceInr;

  const baggageOptions: BaggageTierId[] = ['cabin_only', 'extra_15kg', 'extra_25kg'];
  const seatOptions: SeatTierId[] = ['auto_free', 'standard_choice', 'extra_legroom'];

  return (
    <div className="bg-[#FAFAFA] border-t border-slate-200 p-4 sm:p-6">
      {/* Header & Provenance Metadata (Zero-pill clean inline text) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-200">
        <div>
          <h4 className="text-sm font-semibold text-slate-900">
            Itemized Fare Audit — {quote.providerName}
            {flightLabel ? ` (${flightLabel})` : ''}
          </h4>
          <p className="text-xs text-slate-500 mt-0.5">{quote.paymentNote}</p>
        </div>
        <div className="text-xs text-slate-500 tabular-nums shrink-0">
          <span className="font-medium text-slate-700">
            {breakdown.effectiveVerificationLabel}
          </span>
          <span className="mx-1.5" aria-hidden="true">·</span>
          <span>Demo Data</span>
          <span className="mx-1.5" aria-hidden="true">·</span>
          <span>Checked {verifiedTimeFormatted}</span>
        </div>
      </div>

      {/* Interactive Optional Extras Toggles right inside the breakdown */}
      <div className="py-4 border-b border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <div className="text-xs font-medium text-slate-700 mb-1.5">
            Optional Check-in Baggage (updates total live)
          </div>
          <div className="inline-flex flex-wrap items-center gap-1 p-1 bg-slate-200/70 rounded-lg">
            {baggageOptions.map((tier) => {
              const active = extras.baggage === tier;
              const shortLabel =
                tier === 'cabin_only'
                  ? 'Included (15 kg)'
                  : tier === 'extra_15kg'
                  ? '+15 kg Extra'
                  : '+25 kg Extra';
              return (
                <button
                  key={tier}
                  type="button"
                  onClick={() => onChangeExtras({ ...extras, baggage: tier })}
                  className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    active
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {shortLabel}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <div className="text-xs font-medium text-slate-700 mb-1.5">
            Optional Seat Selection (updates total live)
          </div>
          <div className="inline-flex flex-wrap items-center gap-1 p-1 bg-slate-200/70 rounded-lg">
            {seatOptions.map((tier) => {
              const active = extras.seat === tier;
              const shortLabel =
                tier === 'auto_free'
                  ? 'Auto Seat (₹0)'
                  : tier === 'standard_choice'
                  ? 'Window / Aisle'
                  : 'Extra Legroom';
              return (
                <button
                  key={tier}
                  type="button"
                  onClick={() => onChangeExtras({ ...extras, seat: tier })}
                  className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    active
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {shortLabel}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Two-column ledger: Mandatory Charges vs Optional Extras & Reconciliation */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-4">
        {/* Left 7 cols: Mandatory + Optional + Discounts */}
        <div className="lg:col-span-7 space-y-4">
          {/* Mandatory Section */}
          <div>
            <div className="flex items-center justify-between text-xs font-semibold text-slate-900 mb-2">
              <span>Mandatory Charges (Per Traveller)</span>
              <span className="text-slate-500 font-normal">Required to issue ticket</span>
            </div>
            <div className="divide-y divide-slate-200/80 border-t border-b border-slate-200">
              {mandatoryItems.map((item) => (
                <div
                  key={item.id}
                  className="py-2 flex items-center justify-between gap-4 text-xs sm:text-sm"
                >
                  <span className="text-slate-700">{item.label}</span>
                  <span
                    className={`font-mono tabular-nums shrink-0 ${
                      item.isUnverified
                        ? 'text-amber-800 font-semibold'
                        : 'text-slate-900 font-medium'
                    }`}
                  >
                    {item.isUnverified
                      ? `Unknown (Buffer ${formatInr(item.numericForConservativeBound)})`
                      : item.displayText}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Optional Section */}
          <div>
            <div className="flex items-center justify-between text-xs font-semibold text-slate-900 mb-2">
              <span>Optional Add-ons Selected (Per Traveller)</span>
              <span className="text-slate-500 font-normal">
                {BAGGAGE_LABELS[extras.baggage]} · {SEAT_LABELS[extras.seat]}
              </span>
            </div>
            <div className="divide-y divide-slate-200/80 border-t border-b border-slate-200">
              {optionalItems.map((item) => (
                <div
                  key={item.id}
                  className="py-2 flex items-center justify-between gap-4 text-xs sm:text-sm"
                >
                  <span className="text-slate-600">{item.label}</span>
                  <span
                    className={`font-mono tabular-nums shrink-0 ${
                      item.isUnverified
                        ? 'text-amber-800 font-semibold'
                        : item.numericForConservativeBound > 0
                        ? 'text-blue-700 font-medium'
                        : 'text-slate-500'
                    }`}
                  >
                    {item.isUnverified
                      ? `Unknown (Buffer ${formatInr(item.numericForConservativeBound)})`
                      : item.displayText}
                  </span>
                </div>
              ))}
              {discountItems.map((item) => (
                <div
                  key={item.id}
                  className="py-2 flex items-center justify-between gap-4 text-xs sm:text-sm"
                >
                  <span className="text-emerald-800 font-medium">{item.label}</span>
                  <span className="font-mono tabular-nums text-emerald-700 font-semibold shrink-0">
                    {item.displayText}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right 5 cols: Advertised vs Final Payable Summary */}
        <div className="lg:col-span-5 flex flex-col justify-between bg-white border border-slate-200 rounded-xl p-4 sm:p-5">
          <div className="space-y-3">
            <div className="text-xs font-semibold text-slate-900">
              Advertised vs. Real Payable Reconciliation
            </div>

            <div className="flex items-center justify-between text-xs text-slate-600">
              <span>Advertised headline fare (1 adult)</span>
              <span className="font-mono tabular-nums text-slate-700">
                {formatInr(quote.advertisedPriceInr)}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-600">
              <span>Added mandatory + selected extras − promo</span>
              <span
                className={`font-mono tabular-nums font-medium ${
                  advertisedVsFinalPerPax > 0 ? 'text-amber-800' : 'text-emerald-700'
                }`}
              >
                {formatInr(advertisedVsFinalPerPax, true)}
              </span>
            </div>

            <div className="pt-3 border-t border-slate-200 flex items-baseline justify-between gap-2">
              <div>
                <div className="text-sm font-semibold text-slate-900">
                  Final Payable Total
                </div>
                <div className="text-xs text-slate-500">
                  {passengers} {passengers === 1 ? 'traveller' : 'travellers'} ·{' '}
                  {breakdown.hasUnknownCharges
                    ? 'Includes conservative unknown-fee buffer'
                    : 'All mandatory charges included'}
                </div>
              </div>
              <div className="text-right">
                <div className="font-mono text-xl font-semibold text-slate-900 tabular-nums">
                  {formatInr(breakdown.totalPassengersConservativePayableInr)}
                </div>
                {passengers > 1 && (
                  <div className="font-mono text-xs text-slate-500 tabular-nums">
                    {formatInr(breakdown.perPassengerConservativePayableInr)} / adult
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Explicit Unknown / Estimated Safeguard Explanation */}
          <div className="mt-4 pt-3 border-t border-slate-100">
            {breakdown.hasUnknownCharges ? (
              <div className="flex items-start gap-2 text-xs text-amber-900">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold">Unknown charge never assumed ₹0: </span>
                  {breakdown.unverifiedReasons.join(' ')} Known subtotal is{' '}
                  <span className="font-mono tabular-nums">
                    {formatInr(breakdown.totalPassengersKnownPayableInr)}
                  </span>
                  , buffered to{' '}
                  <span className="font-mono tabular-nums">
                    {formatInr(breakdown.totalPassengersConservativePayableInr)}
                  </span>{' '}
                  for fair comparison.
                </div>
              </div>
            ) : breakdown.hasEstimatedCharges ? (
              <div className="flex items-start gap-2 text-xs text-slate-600">
                <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-slate-800">Estimated gateway range: </span>
                  {breakdown.unverifiedReasons.join(' ')} Upper bound used so checkout cost won’t
                  exceed estimate.
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-2 text-xs text-emerald-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  100% of mandatory taxes, airport fees, and selected add-ons are known upfront in
                  this Demo Data quote.
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
