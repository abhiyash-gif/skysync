import {
  AlertTriangle,
  ArrowRight,
  BellRing,
  Bot,
  CheckCircle2,
  Plane,
  TrendingUp,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import terminalEditorialImg from '../assets/images/editorial_airport_terminal_1793169387793.jpg';
import { BENCHMARK_CORRIDORS, generateDemoItineraries } from '../data/sampleData';
import { SUGGESTED_AI_QUESTIONS } from '../modules/aiAssistant';
import { calculateCompleteFare, formatInr } from '../modules/fareCalculator';
import type {
  AppView,
  BaggageTierId,
  OptionalExtrasSelection,
  SearchQuery,
  SeatTierId,
} from '../types/travel';
import { FaqSection } from './FaqSection';
import { SearchForm } from './SearchForm';

interface LandingPageProps {
  query: SearchQuery;
  extras: OptionalExtrasSelection;
  onChangeExtras: (next: OptionalExtrasSelection) => void;
  onSubmitSearch: (nextQuery: SearchQuery) => void;
  onInspectCorridor: (originCode: string, destinationCode: string) => void;
  onNavigate: (view: AppView) => void;
  onAskAiQuestion: (promptText?: string) => void;
}

export function LandingPage({
  query,
  extras,
  onChangeExtras,
  onSubmitSearch,
  onInspectCorridor,
  onNavigate,
  onAskAiQuestion,
}: LandingPageProps) {
  const [imgError, setImgError] = useState(false);

  // Live interactive Raipur -> Delhi proof right on the homepage
  const flagshipQuotes = useMemo(() => {
    const sampleFlight = generateDemoItineraries({
      originCode: 'RPR',
      destinationCode: 'DEL',
      departureDate: query.departureDate,
      returnDate: '',
      tripType: 'one_way',
      passengers: 1,
    })[0];

    const enriched = sampleFlight.providerQuotes.map((q) => ({
      quote: q,
      breakdown: calculateCompleteFare(q, extras, 1),
    }));

    const byAdvertised = [...enriched].sort(
      (a, b) => a.quote.advertisedPriceInr - b.quote.advertisedPriceInr
    );
    const byRealTotal = [...enriched].sort(
      (a, b) =>
        a.breakdown.perPassengerConservativePayableInr -
        b.breakdown.perPassengerConservativePayableInr
    );

    return {
      flight: sampleFlight,
      enrichedByReal: byRealTotal,
      cheapestAdvertised: byAdvertised[0],
      cheapestReal: byRealTotal[0],
    };
  }, [query.departureDate, extras]);

  const rankFlipDelta = Math.max(
    0,
    flagshipQuotes.cheapestAdvertised.breakdown.perPassengerConservativePayableInr -
      flagshipQuotes.cheapestReal.breakdown.perPassengerConservativePayableInr
  );

  const baggagePills: { id: BaggageTierId; label: string }[] = [
    { id: 'cabin_only', label: 'Included 15 kg' },
    { id: 'extra_15kg', label: '+15 kg Extra' },
  ];

  const seatPills: { id: SeatTierId; label: string }[] = [
    { id: 'auto_free', label: 'Auto Seat (₹0)' },
    { id: 'standard_choice', label: 'Window / Aisle' },
    { id: 'extra_legroom', label: 'Extra Legroom' },
  ];

  return (
    <div className="space-y-16 sm:space-y-24 pb-12">
      {/* HERO SECTION: Clear Problem Statement + Preconfigured Raipur-to-Delhi Search */}
      <section className="pt-8 sm:pt-12">
        <div className="max-w-3xl space-y-4 mb-8">
          <p className="text-xs sm:text-sm font-medium text-blue-700">
            See the real fare. Find the better time to fly. · Demo Data Prototype
          </p>
          <h1 className="font-display text-3xl sm:text-5xl font-bold tracking-tight text-slate-900 leading-[1.12] text-balance">
            Stop comparing teaser fares that jump ₹1,400 at checkout.
          </h1>
          <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl">
            Most booking platforms rank flights by stripped-down base tariffs—withholding airport
            charges, convenience fees, and baggage markups until the payment screen. Skysync
            calculates your true payable fare upfront, forecasts 3- and 7-day price windows, and
            tracks target drops before you book.
          </p>
        </div>

        <SearchForm query={query} onSubmitSearch={onSubmitSearch} />

        {/* Clearly visible Ask Skysync AI Entry Point right under Search */}
        <div className="mt-4 bg-white border border-slate-200 rounded-2xl p-4 sm:px-6 sm:py-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200/80 flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4 text-blue-700" />
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-900">
                Ask Skysync AI —{' '}
                <span className="font-normal text-slate-600">
                  Your smarter travel companion.
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                {SUGGESTED_AI_QUESTIONS.slice(0, 3).map((qText) => (
                  <button
                    key={qText}
                    type="button"
                    onClick={() => onAskAiQuestion(qText)}
                    className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 rounded-md transition-colors text-left cursor-pointer"
                  >
                    {qText}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onAskAiQuestion()}
            className="self-start lg:self-center px-4 py-2 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <span>Open Ask Skysync AI</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </section>

      {/* SECTION 01: Interactive Proof — How Hidden Charges Flip the Cheapest Option */}
      <section aria-labelledby="proof-heading" className="space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <p className="text-xs font-medium text-slate-500">
              01. Live Transparent Pricing Demonstration · Raipur (RPR) → Delhi (DEL)
            </p>
            <h2
              id="proof-heading"
              className="font-display text-2xl sm:text-3xl font-bold text-slate-900 text-balance"
            >
              Why the lowest advertised fare is rarely the cheapest flight
            </h2>
            <p className="text-sm text-slate-600">
              Toggle baggage or seat add-ons below to watch how hidden platform charges flip the
              winner on the exact same {flagshipQuotes.flight.airlineName} (
              {flagshipQuotes.flight.flightNumber}) morning flight.
            </p>
          </div>

          {/* Interactive Extras Toggles for Immediate Judge Demo */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg">
              {baggagePills.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => onChangeExtras({ ...extras, baggage: b.id })}
                  className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    extras.baggage === b.id
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {b.label}
                </button>
              ))}
            </div>

            <div className="inline-flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg">
              {seatPills.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => onChangeExtras({ ...extras, seat: s.id })}
                  className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    extras.seat === s.id
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Live Rank-Flip Comparison Table */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="px-5 sm:px-6 py-3.5 bg-amber-50/70 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm">
            <div className="flex items-center gap-2 text-slate-800">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                <strong>Rank Flip Exposed:</strong>{' '}
                {flagshipQuotes.cheapestAdvertised.quote.providerName} looks #1 on headline fare (
                <span className="font-mono tabular-nums">
                  {formatInr(flagshipQuotes.cheapestAdvertised.quote.advertisedPriceInr)}
                </span>
                ) but reaches{' '}
                <span className="font-mono font-semibold tabular-nums">
                  {formatInr(
                    flagshipQuotes.cheapestAdvertised.breakdown.perPassengerConservativePayableInr
                  )}
                </span>{' '}
                at checkout.{' '}
                <strong>{flagshipQuotes.cheapestReal.quote.providerName}</strong> saves{' '}
                <strong className="font-mono text-emerald-800 tabular-nums">
                  {formatInr(rankFlipDelta)}
                </strong>{' '}
                per adult.
              </span>
            </div>

            <button
              type="button"
              onClick={() => onInspectCorridor('RPR', 'DEL')}
              className="text-xs font-semibold text-blue-700 hover:text-blue-800 inline-flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span>Inspect Full Raipur → Delhi Audit</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-medium text-slate-500 bg-slate-50/60">
                  <th className="py-3 pl-5 sm:pl-6 pr-3">Platform (Demo Data)</th>
                  <th className="py-3 px-3 text-right">Advertised Teaser</th>
                  <th className="py-3 px-3 text-right">Convenience &amp; Gateway</th>
                  <th className="py-3 px-3 text-right">Taxes, UDF &amp; Extras</th>
                  <th className="py-3 pl-3 pr-5 sm:pr-6 text-right">Real Payable Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {flagshipQuotes.enrichedByReal.map(({ quote, breakdown }, idx) => {
                  const isWinner = idx === 0;
                  const isAdvertisedTrap =
                    quote.providerId === flagshipQuotes.cheapestAdvertised.quote.providerId &&
                    !isWinner;

                  const convItem = breakdown.lineItems.find(
                    (i) => i.id === 'convenience_charge'
                  );
                  const otherDelta =
                    breakdown.perPassengerConservativePayableInr -
                    quote.advertisedPriceInr -
                    (convItem?.numericForConservativeBound ?? 0);

                  return (
                    <tr
                      key={quote.providerId}
                      className={isWinner ? 'bg-blue-50/35' : 'hover:bg-slate-50/70'}
                    >
                      <td className="py-3.5 pl-5 sm:pl-6 pr-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-slate-900">
                            {quote.providerName}
                          </span>
                          {isWinner && (
                            <span className="text-xs font-semibold text-blue-700 inline-flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>True Cheapest Option</span>
                            </span>
                          )}
                          {isAdvertisedTrap && (
                            <span className="text-xs text-amber-800 font-medium">
                              · Lowest Advertised Teaser
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          {quote.providerType} · {breakdown.effectiveVerificationLabel}
                        </div>
                      </td>

                      <td className="py-3.5 px-3 text-right font-mono tabular-nums text-slate-600">
                        {formatInr(quote.advertisedPriceInr)}
                      </td>

                      <td className="py-3.5 px-3 text-right font-mono tabular-nums">
                        {convItem?.isUnverified ? (
                          <span className="text-amber-800 font-medium text-xs">
                            Unknown (Not ₹0 · ~{formatInr(convItem.numericForConservativeBound)})
                          </span>
                        ) : (
                          <span className="text-slate-700">{convItem?.displayText}</span>
                        )}
                      </td>

                      <td className="py-3.5 px-3 text-right font-mono tabular-nums text-slate-600">
                        {otherDelta === 0 ? 'Included' : formatInr(otherDelta, true)}
                      </td>

                      <td className="py-3.5 pl-3 pr-5 sm:pr-6 text-right font-mono font-semibold text-base text-slate-900 tabular-nums">
                        {formatInr(breakdown.perPassengerConservativePayableInr)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* SECTION 02: Asymmetric Bento Capabilities + Architectural Visual */}
      <section aria-labelledby="capabilities-heading" className="space-y-6">
        <div className="max-w-2xl space-y-1.5">
          <p className="text-xs font-medium text-slate-500">
            02. End-to-End Decision Architecture
          </p>
          <h2
            id="capabilities-heading"
            className="font-display text-2xl sm:text-3xl font-bold text-slate-900 text-balance"
          >
            Built like a financial audit for domestic air travel
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Left 7 cols: Editorial Aviation Visual + Core Invariant */}
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col justify-between">
            <div className="aspect-video w-full bg-slate-100 relative overflow-hidden">
              {!imgError ? (
                <img
                  src={terminalEditorialImg}
                  alt="Modern sunlit airport terminal overlooking an airliner wing at dawn"
                  referrerPolicy="no-referrer"
                  onError={() => setImgError(true)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100 text-slate-500 p-6 text-center">
                  <Plane className="w-8 h-8 text-blue-600 mb-2" />
                  <span className="text-sm font-medium text-slate-800">
                    Skysync Fare Normalization Engine
                  </span>
                </div>
              )}
            </div>

            <div className="p-6 space-y-2">
              <div className="text-xs text-slate-500">
                Core Pricing Invariant · Zero Assumed Zeros
              </div>
              <h3 className="font-display text-lg font-bold text-slate-900">
                01. Unknown fees are flagged, never treated as ₹0
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                When an aggregator hides convenience charges behind passenger contact forms,
                ordinary meta-search tools treat the missing fee as ₹0 and rank that site #1.
                Skysync flags unverified charges explicitly and applies a transparent comparison
                buffer so honest platforms aren’t penalized.
              </p>
            </div>
          </div>

          {/* Right 5 cols: Forecasting + Price Tracking */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            <div className="flex-1 bg-white border border-slate-200 rounded-2xl p-6 flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>Statistical Baseline</span>
                  <TrendingUp className="w-4 h-4 text-blue-600" />
                </div>
                <h3 className="font-display text-lg font-bold text-slate-900">
                  02. Cautious 3- &amp; 7-Day Fare Forecasting
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Uses Holt’s linear exponential smoothing and 30-day residual volatility bands to
                  classify routes as Rising, Stable, or Potentially falling—explaining uncertainty
                  honestly without inventing accuracy claims.
                </p>
              </div>
              <div>
                <button
                  type="button"
                  onClick={() => onNavigate('forecast')}
                  className="text-xs font-semibold text-blue-700 hover:text-blue-800 inline-flex items-center gap-1 cursor-pointer"
                >
                  <span>Explore Prediction Dashboard</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="flex-1 bg-white border border-slate-200 rounded-2xl p-6 flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>Persistent Alerts</span>
                  <BellRing className="w-4 h-4 text-blue-600" />
                </div>
                <h3 className="font-display text-lg font-bold text-slate-900">
                  03. Smart Price Tracker with Live Simulation
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Save routes and target fares in browser storage so they persist across refreshes.
                  Trigger deterministic simulated market updates during demos to verify alert
                  thresholds live.
                </p>
              </div>
              <div>
                <button
                  type="button"
                  onClick={() => onNavigate('tracker')}
                  className="text-xs font-semibold text-blue-700 hover:text-blue-800 inline-flex items-center gap-1 cursor-pointer"
                >
                  <span>Open Smart Price Tracker</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 03: Benchmark Indian Domestic Corridors */}
      <section aria-labelledby="corridors-heading" className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div className="space-y-1">
            <p className="text-xs font-medium text-slate-500">
              03. Preconfigured Indian Corridors · Demo Data
            </p>
            <h2
              id="corridors-heading"
              className="font-display text-2xl font-bold text-slate-900"
            >
              Benchmark Routes Ready to Compare
            </h2>
          </div>
          <p className="text-xs text-slate-500">
            Select any route to load full multi-platform breakdowns and 7-day forecasts
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-medium text-slate-500 bg-slate-50/60">
                  <th className="py-3 pl-5 sm:pl-6 pr-3">Corridor</th>
                  <th className="py-3 px-3">Flight Profile</th>
                  <th className="py-3 px-3 text-right">Typical Teaser</th>
                  <th className="py-3 px-3 text-right">Avg Hidden Jump</th>
                  <th className="py-3 px-3 text-right">Lowest Real Payable</th>
                  <th className="py-3 px-3">7-Day Trend</th>
                  <th className="py-3 pl-3 pr-5 sm:pr-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {BENCHMARK_CORRIDORS.map((corridor) => (
                  <tr
                    key={`${corridor.originCode}-${corridor.destinationCode}`}
                    className="hover:bg-slate-50/80 transition-colors"
                  >
                    <td className="py-3.5 pl-5 sm:pl-6 pr-3 font-semibold text-slate-900">
                      {corridor.originCity} ({corridor.originCode}) → {corridor.destinationCity} (
                      {corridor.destinationCode})
                    </td>
                    <td className="py-3.5 px-3 text-xs text-slate-500">
                      {corridor.durationLabel}
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono tabular-nums text-slate-600">
                      {formatInr(corridor.typicalAdvertisedInr)}
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono tabular-nums text-amber-800 font-medium">
                      +{formatInr(corridor.typicalHiddenFeesInr)}
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono tabular-nums font-semibold text-slate-900">
                      {formatInr(corridor.realLowestPayableInr)}
                    </td>
                    <td className="py-3.5 px-3 text-xs font-medium text-slate-700">
                      {corridor.sevenDayOutlook}
                    </td>
                    <td className="py-3.5 pl-3 pr-5 sm:pr-6 text-right">
                      <button
                        type="button"
                        onClick={() =>
                          onInspectCorridor(corridor.originCode, corridor.destinationCode)
                        }
                        className="px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg inline-flex items-center gap-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        <span>Compare Route</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* SECTION 04: Interactive Accessible FAQ Section */}
      <FaqSection />
    </div>
  );
}
