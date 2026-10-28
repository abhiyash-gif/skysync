import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  BellPlus,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  RotateCcw,
  SlidersHorizontal,
  TrendingUp,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { getCityByCode } from '../data/sampleData';
import {
  buildCrossPlatformComparison,
  type ComparisonFilterState,
} from '../modules/comparison';
import { formatDuration, formatInr } from '../modules/fareCalculator';
import {
  type BaggageTierId,
  DepartureWindow,
  type EnrichedProviderComparison,
  type FlightItinerary,
  type OptionalExtrasSelection,
  type SearchQuery,
  type SeatTierId,
  SortOption,
  StopsFilter,
} from '../types/travel';
import { PriceBreakdownLedger } from './PriceBreakdownLedger';
import { ProviderAuditModal } from './ProviderAuditModal';

interface ComparisonSectionProps {
  query: SearchQuery;
  itineraries: FlightItinerary[];
  extras: OptionalExtrasSelection;
  onChangeExtras: (next: OptionalExtrasSelection) => void;
  isLoading: boolean;
  errorMessage: string | null;
  onRetrySearch: () => void;
  onTriggerDemoState: (mode: 'normal' | 'loading' | 'error') => void;
  onTrackRoute: (currentLowestInr: number, bestProviderName: string) => void;
  isRouteTracked: boolean;
  onOpenForecast: () => void;
}

export function ComparisonSection({
  query,
  itineraries,
  extras,
  onChangeExtras,
  isLoading,
  errorMessage,
  onRetrySearch,
  onTriggerDemoState,
  onTrackRoute,
  isRouteTracked,
  onOpenForecast,
}: ComparisonSectionProps) {
  const [sortBy, setSortBy] = useState<SortOption>(SortOption.LOWEST_PRICE);
  const [departureWindow, setDepartureWindow] = useState<DepartureWindow>(DepartureWindow.ALL);
  const [stopsFilter, setStopsFilter] = useState<StopsFilter>(StopsFilter.ALL);
  const [maxPriceCap, setMaxPriceCap] = useState<number>(25000);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [auditSelection, setAuditSelection] = useState<EnrichedProviderComparison | null>(null);
  const [justTrackedFeedback, setJustTrackedFeedback] = useState(false);

  // Compute baseline bounds first so slider max adapts when route or extras change
  const unfilteredComparison = useMemo(
    () =>
      buildCrossPlatformComparison(itineraries, extras, query.passengers, {
        sortBy,
        departureWindow: DepartureWindow.ALL,
        stopsFilter: StopsFilter.ALL,
        maxPricePerPassengerInr: 999999,
      }),
    [itineraries, extras, query.passengers, sortBy]
  );

  useEffect(() => {
    setMaxPriceCap(unfilteredComparison.priceBounds.maxInr);
  }, [
    query.originCode,
    query.destinationCode,
    query.departureDate,
    query.tripType,
    unfilteredComparison.priceBounds.maxInr,
  ]);

  const filters: ComparisonFilterState = {
    sortBy,
    departureWindow,
    stopsFilter,
    maxPricePerPassengerInr: maxPriceCap,
  };

  const { groups, cheapestOverallQuote, priceBounds } = useMemo(
    () => buildCrossPlatformComparison(itineraries, extras, query.passengers, filters),
    [itineraries, extras, query.passengers, sortBy, departureWindow, stopsFilter, maxPriceCap]
  );

  // Auto-open the first flight's cheapest breakdown on initial route load so transparency is immediately visible
  useEffect(() => {
    if (groups.length > 0) {
      const top = groups[0].bestQuoteForFlight;
      setExpandedKey(`${top.itinerary.id}::${top.quote.providerId}`);
    } else {
      setExpandedKey(null);
    }
  }, [query.originCode, query.destinationCode, query.departureDate, query.tripType]);

  const originCity = getCityByCode(query.originCode)?.city || query.originCode;
  const destinationCity = getCityByCode(query.destinationCode)?.city || query.destinationCode;

  const handleResetFilters = () => {
    setDepartureWindow(DepartureWindow.ALL);
    setStopsFilter(StopsFilter.ALL);
    setMaxPriceCap(priceBounds.maxInr);
    setSortBy(SortOption.LOWEST_PRICE);
  };

  const handleTrackClick = () => {
    const lowest =
      cheapestOverallQuote?.breakdown.perPassengerConservativePayableInr ??
      unfilteredComparison.cheapestOverallQuote?.breakdown.perPassengerConservativePayableInr ??
      5000;
    const provider =
      cheapestOverallQuote?.quote.providerName ??
      unfilteredComparison.cheapestOverallQuote?.quote.providerName ??
      'AeroDirect';
    onTrackRoute(lowest, provider);
    setJustTrackedFeedback(true);
    setTimeout(() => setJustTrackedFeedback(false), 2500);
  };

  const baggageChoices: { id: BaggageTierId; label: string }[] = [
    { id: 'cabin_only', label: 'Included 15 kg' },
    { id: 'extra_15kg', label: '+15 kg Extra' },
    { id: 'extra_25kg', label: '+25 kg Extra' },
  ];

  const seatChoices: { id: SeatTierId; label: string }[] = [
    { id: 'auto_free', label: 'Auto Seat (₹0)' },
    { id: 'standard_choice', label: 'Window / Aisle' },
    { id: 'extra_legroom', label: 'Extra Legroom' },
  ];

  return (
    <section aria-label="Cross-platform flight comparison" className="space-y-6">
      {/* Route Summary & Actions Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="text-xs text-slate-500 flex flex-wrap items-center gap-1.5">
              <span className="font-medium text-slate-700">Cross-Platform Audit</span>
              <span aria-hidden="true">·</span>
              <span>Demo Data</span>
              <span aria-hidden="true">·</span>
              <span>
                {query.passengers} {query.passengers === 1 ? 'Adult' : 'Adults'} ·{' '}
                {query.tripType === 'round_trip' ? 'Round-trip' : 'One-way'}
              </span>
            </div>
            <h2 className="font-display text-xl sm:text-2xl font-bold text-slate-900 mt-1">
              {originCity} ({query.originCode}) to {destinationCity} ({query.destinationCode})
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">
              Ranked by <span className="font-semibold text-slate-900">actual checkout cost</span>{' '}
              across 4 booking platforms — never by stripped-down teaser base fares.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onOpenForecast}
              className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
              <span>7-Day Fare Forecast</span>
            </button>

            <button
              type="button"
              onClick={handleTrackClick}
              className={`px-4 py-2 text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                justTrackedFeedback || isRouteTracked
                  ? 'bg-emerald-700 text-white hover:bg-emerald-800'
                  : 'bg-slate-900 text-white hover:bg-slate-800'
              }`}
            >
              {justTrackedFeedback ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Saved to Tracker</span>
                </>
              ) : (
                <>
                  <BellPlus className="w-3.5 h-3.5" />
                  <span>{isRouteTracked ? 'Update Target Alert' : 'Track Route Price'}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Global Optional Extras Bar — updates all platforms live */}
        <div className="mt-5 pt-5 border-t border-slate-200 grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          <div className="md:col-span-4">
            <div className="text-xs font-semibold text-slate-900">
              Configure Optional Extras Once
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Toggle baggage or seat preferences to recalculate every platform’s real total live.
            </p>
          </div>

          <div className="md:col-span-4">
            <span className="block text-xs font-medium text-slate-600 mb-1">
              Check-in Baggage
            </span>
            <div className="inline-flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg">
              {baggageChoices.map((b) => (
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
          </div>

          <div className="md:col-span-4">
            <span className="block text-xs font-medium text-slate-600 mb-1">
              Seat Preference
            </span>
            <div className="inline-flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg">
              {seatChoices.map((s) => (
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
      </div>

      {/* Sort, Filter & Demo State Controls */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-4">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          {/* Sort By */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-slate-500 mr-1 inline-flex items-center gap-1">
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Sort:</span>
            </span>
            <div className="inline-flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg">
              {[
                { id: SortOption.LOWEST_PRICE, label: 'Lowest Real Payable' },
                { id: SortOption.BEST_VALUE, label: 'Best Value' },
                { id: SortOption.SHORTEST_DURATION, label: 'Shortest Duration' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setSortBy(opt.id)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    sortBy === opt.id
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Stops + Departure Window */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
              {[
                { id: StopsFilter.ALL, label: 'All Stops' },
                { id: StopsFilter.NON_STOP, label: 'Non-stop Only' },
              ].map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setStopsFilter(st.id)}
                  className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    stopsFilter === st.id
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>

            <div className="inline-flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg">
              {[
                { id: DepartureWindow.ALL, label: 'Any Time' },
                { id: DepartureWindow.EARLY_MORNING, label: 'Before 6 AM' },
                { id: DepartureWindow.MORNING, label: '6 AM–12 PM' },
                { id: DepartureWindow.AFTERNOON, label: '12–6 PM' },
                { id: DepartureWindow.EVENING, label: 'After 6 PM' },
              ].map((win) => (
                <button
                  key={win.id}
                  type="button"
                  onClick={() => setDepartureWindow(win.id)}
                  className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    departureWindow === win.id
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {win.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Price range slider + UI Resilience State Switcher */}
        <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 max-w-md">
            <label
              htmlFor="max-price-slider"
              className="text-xs font-medium text-slate-600 whitespace-nowrap shrink-0"
            >
              Max per adult:{' '}
              <span className="font-mono font-semibold text-slate-900 tabular-nums">
                {formatInr(maxPriceCap)}
              </span>
            </label>
            <input
              id="max-price-slider"
              type="range"
              min={Math.max(1500, priceBounds.minInr - 500)}
              max={priceBounds.maxInr}
              step={100}
              value={Math.min(maxPriceCap, priceBounds.maxInr)}
              onChange={(e) => setMaxPriceCap(Number(e.target.value))}
              className="w-full accent-blue-600 cursor-pointer"
            />
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span>
              Showing <strong className="text-slate-900 tabular-nums">{groups.length}</strong> of{' '}
              <span className="tabular-nums">{itineraries.length}</span> flights
            </span>
            <span aria-hidden="true">·</span>
            <button
              type="button"
              onClick={() => onTriggerDemoState('loading')}
              className="hover:text-slate-900 underline underline-offset-4 cursor-pointer"
            >
              Preview Loading
            </button>
            <button
              type="button"
              onClick={() => onTriggerDemoState('error')}
              className="hover:text-slate-900 underline underline-offset-4 cursor-pointer"
            >
              Preview Error
            </button>
          </div>
        </div>
      </div>

      {/* 1. LOADING STATE */}
      {isLoading && (
        <div
          aria-live="polite"
          className="space-y-4"
        >
          {[1, 2, 3].map((skeletonIdx) => (
            <div
              key={skeletonIdx}
              className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 animate-pulse"
            >
              <div className="flex items-center justify-between">
                <div className="h-5 w-48 bg-slate-200 rounded" />
                <div className="h-5 w-32 bg-slate-200 rounded" />
              </div>
              <div className="h-4 w-72 bg-slate-100 rounded" />
              <div className="space-y-2 pt-2">
                <div className="h-10 w-full bg-slate-100 rounded-lg" />
                <div className="h-10 w-full bg-slate-100 rounded-lg" />
                <div className="h-10 w-full bg-slate-100 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 2. ERROR STATE */}
      {!isLoading && errorMessage && (
        <div
          role="alert"
          className="bg-white border border-red-200 rounded-2xl p-8 text-center max-w-xl mx-auto"
        >
          <AlertCircle className="w-8 h-8 text-red-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-900">
            Unable to Complete Fare Normalization
          </h3>
          <p className="text-sm text-slate-600 mt-1.5">{errorMessage}</p>
          <div className="mt-5">
            <button
              type="button"
              onClick={onRetrySearch}
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restore Deterministic Demo Data</span>
            </button>
          </div>
        </div>
      )}

      {/* 3. EMPTY STATE */}
      {!isLoading && !errorMessage && groups.length === 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center">
          <Clock className="w-8 h-8 text-slate-400 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-900">
            No Flights Match Active Filters
          </h3>
          <p className="text-sm text-slate-600 mt-1 max-w-md mx-auto">
            Your current departure window, non-stop constraint, or {formatInr(maxPriceCap)} per-adult
            cap excluded all {itineraries.length} available Demo Data schedules.
          </p>
          <div className="mt-5">
            <button
              type="button"
              onClick={handleResetFilters}
              className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset All Filters</span>
            </button>
          </div>
        </div>
      )}

      {/* 4. POPULATED FLIGHT & CROSS-PLATFORM LEDGER */}
      {!isLoading &&
        !errorMessage &&
        groups.map((group) => {
          const {
            itinerary,
            quotes,
            bestQuoteForFlight,
            lowestAdvertisedQuote,
            hasAdvertisedRankFlip,
            rankFlipOverpayTotalInr,
            isOverallCheapestFlight,
          } = group;

          return (
            <article
              key={itinerary.id}
              className={`bg-white rounded-2xl overflow-hidden transition-colors ${
                isOverallCheapestFlight
                  ? 'border-2 border-blue-600'
                  : 'border border-slate-200'
              }`}
            >
              {/* Top Flight Header */}
              <div className="p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    {isOverallCheapestFlight && (
                      <>
                        <span className="font-semibold text-blue-700 inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Lowest Real Payable on Route</span>
                        </span>
                        <span aria-hidden="true">·</span>
                      </>
                    )}
                    <span className="font-medium text-slate-800">{itinerary.airlineName}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums">{itinerary.flightNumber}</span>
                    <span aria-hidden="true">·</span>
                    <span>
                      Cabin {itinerary.cabinBagIncludedKg} kg + Check-in{' '}
                      {itinerary.checkedBagIncludedKg} kg included
                    </span>
                  </div>

                  <div className="flex flex-wrap items-baseline gap-3 pt-1">
                    <span className="font-mono text-xl sm:text-2xl font-semibold text-slate-900 tabular-nums">
                      {itinerary.departureTime24}
                    </span>
                    <span className="text-xs font-mono text-slate-500">{itinerary.originCode}</span>
                    <ArrowRight className="w-4 h-4 text-slate-400 self-center" />
                    <span className="font-mono text-xl sm:text-2xl font-semibold text-slate-900 tabular-nums">
                      {itinerary.arrivalTime24}
                    </span>
                    <span className="text-xs font-mono text-slate-500">
                      {itinerary.destinationCode}
                    </span>
                    <span className="text-xs text-slate-500 ml-1 tabular-nums">
                      {formatDuration(itinerary.durationMinutes)} ·{' '}
                      {itinerary.stops === 0
                        ? 'Non-stop'
                        : `${itinerary.stops} stop via ${itinerary.stopCity}`}
                    </span>
                  </div>

                  {itinerary.returnSummary && (
                    <div className="text-xs text-slate-500 pt-0.5 tabular-nums">
                      Return ({itinerary.returnSummary.flightNumber}):{' '}
                      {itinerary.returnSummary.departureTime24} →{' '}
                      {itinerary.returnSummary.arrivalTime24} ·{' '}
                      {formatDuration(itinerary.returnSummary.durationMinutes)}
                    </div>
                  )}
                </div>

                {/* Right summary metric */}
                <div className="flex items-center justify-between lg:justify-end gap-6 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                  <div className="text-left lg:text-right">
                    <div className="text-xs text-slate-500">
                      Best real total ({query.passengers}{' '}
                      {query.passengers === 1 ? 'adult' : 'adults'}) via{' '}
                      <span className="font-semibold text-slate-800">
                        {bestQuoteForFlight.quote.providerName}
                      </span>
                    </div>
                    <div className="font-mono text-2xl font-semibold text-slate-900 tabular-nums mt-0.5">
                      {formatInr(
                        bestQuoteForFlight.breakdown.totalPassengersConservativePayableInr
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Measurable Rank-Flip Proof Callout (Core Hackathon Innovation!) */}
              {hasAdvertisedRankFlip && rankFlipOverpayTotalInr > 0 && (
                <div className="px-5 sm:px-6 py-3 bg-amber-50/70 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-800">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>
                      <strong className="font-semibold text-slate-900">
                        Hidden-Fee Rank Flip:
                      </strong>{' '}
                      {lowestAdvertisedQuote.quote.providerName} advertises the lowest teaser fare (
                      <span className="font-mono tabular-nums">
                        {formatInr(lowestAdvertisedQuote.quote.advertisedPriceInr * query.passengers)}
                      </span>
                      ) but reaches{' '}
                      <span className="font-mono font-semibold tabular-nums">
                        {formatInr(
                          lowestAdvertisedQuote.breakdown.totalPassengersConservativePayableInr
                        )}
                      </span>{' '}
                      at checkout. Booking{' '}
                      <strong className="font-semibold text-slate-900">
                        {bestQuoteForFlight.quote.providerName}
                      </strong>{' '}
                      saves{' '}
                      <strong className="font-mono text-emerald-800 tabular-nums">
                        {formatInr(rankFlipOverpayTotalInr)}
                      </strong>
                      .
                    </span>
                  </div>
                </div>
              )}

              {/* Cross-Platform Comparison Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs font-medium text-slate-500 bg-slate-50/60">
                      <th className="py-2.5 pl-5 sm:pl-6 pr-3">Booking Platform</th>
                      <th className="py-2.5 px-3 text-right">Advertised Fare</th>
                      <th className="py-2.5 px-3 text-right">Hidden / Added Mandatory</th>
                      <th className="py-2.5 px-3 text-right">Extras &amp; Promo</th>
                      <th className="py-2.5 px-3 text-right">Final Payable ({query.passengers}x)</th>
                      <th className="py-2.5 pl-3 pr-5 sm:pr-6 text-right">Breakdown &amp; Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-sm">
                    {quotes.map((item) => {
                      const rowKey = `${itinerary.id}::${item.quote.providerId}`;
                      const isExpanded = expandedKey === rowKey;
                      const advertisedTotal =
                        item.quote.advertisedPriceInr * query.passengers;
                      const finalTotal =
                        item.breakdown.totalPassengersConservativePayableInr;
                      const mandatoryAddedPerPax =
                        item.breakdown.mandatoryConservativeSubtotalInr -
                        item.breakdown.discountInr -
                        item.quote.advertisedPriceInr;
                      const optionalExtrasTotal =
                        item.breakdown.optionalConservativeSubtotalInr *
                        query.passengers;

                      return (
                        <FragmentRow
                          key={rowKey}
                          item={item}
                          isExpanded={isExpanded}
                          onToggleExpand={() =>
                            setExpandedKey(isExpanded ? null : rowKey)
                          }
                          onSelectAudit={() => setAuditSelection(item)}
                          advertisedTotal={advertisedTotal}
                          mandatoryAddedTotal={mandatoryAddedPerPax * query.passengers}
                          netExtrasAndDiscountTotal={optionalExtrasTotal}
                          finalTotal={finalTotal}
                          extras={extras}
                          onChangeExtras={onChangeExtras}
                          passengers={query.passengers}
                        />
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </article>
          );
        })}

      <ProviderAuditModal
        selection={auditSelection}
        passengers={query.passengers}
        onClose={() => setAuditSelection(null)}
      />
    </section>
  );
}

interface FragmentRowProps {
  item: EnrichedProviderComparison;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onSelectAudit: () => void;
  advertisedTotal: number;
  mandatoryAddedTotal: number;
  netExtrasAndDiscountTotal: number;
  finalTotal: number;
  extras: OptionalExtrasSelection;
  onChangeExtras: (next: OptionalExtrasSelection) => void;
  passengers: number;
}

function FragmentRow({
  item,
  isExpanded,
  onToggleExpand,
  onSelectAudit,
  advertisedTotal,
  mandatoryAddedTotal,
  netExtrasAndDiscountTotal,
  finalTotal,
  extras,
  onChangeExtras,
  passengers,
}: FragmentRowProps) {
  const { quote, breakdown, isCheapestComparableOnFlight, itinerary } = item;

  return (
    <>
      <tr
        className={`transition-colors ${
          isCheapestComparableOnFlight
            ? 'bg-blue-50/35 hover:bg-blue-50/60'
            : 'hover:bg-slate-50/80'
        }`}
      >
        <td className="py-3.5 pl-5 sm:pl-6 pr-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-900">{quote.providerName}</span>
            {isCheapestComparableOnFlight && (
              <span className="text-xs font-semibold text-blue-700 inline-flex items-center gap-1 whitespace-nowrap">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Cheapest Real Total</span>
              </span>
            )}
          </div>
          <div className="text-xs text-slate-500 mt-0.5">
            <span>{quote.providerType}</span>
            <span className="mx-1.5" aria-hidden="true">·</span>
            <span>{breakdown.effectiveVerificationLabel}</span>
          </div>
        </td>

        <td className="py-3.5 px-3 text-right font-mono tabular-nums text-slate-600">
          {formatInr(advertisedTotal)}
        </td>

        <td className="py-3.5 px-3 text-right font-mono tabular-nums">
          {breakdown.hasUnknownCharges ? (
            <span className="text-amber-800 font-medium text-xs sm:text-sm">
              Unknown (~{formatInr(mandatoryAddedTotal)})
            </span>
          ) : mandatoryAddedTotal === 0 ? (
            <span className="text-emerald-700 font-medium">₹0 hidden</span>
          ) : (
            <span className="text-amber-800 font-medium">
              {formatInr(mandatoryAddedTotal, true)}
            </span>
          )}
        </td>

        <td className="py-3.5 px-3 text-right font-mono tabular-nums text-slate-600">
          {netExtrasAndDiscountTotal === 0
            ? '₹0'
            : formatInr(netExtrasAndDiscountTotal, true)}
        </td>

        <td className="py-3.5 px-3 text-right">
          <div className="font-mono font-semibold text-slate-900 text-base tabular-nums">
            {formatInr(finalTotal)}
          </div>
          {breakdown.hasUnknownCharges && (
            <div className="text-[11px] text-amber-800">Includes unknown-fee buffer</div>
          )}
        </td>

        <td className="py-3.5 pl-3 pr-5 sm:pr-6 text-right">
          <div className="inline-flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onToggleExpand}
              className="px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg inline-flex items-center gap-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span>Breakdown</span>
              {isExpanded ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>

            <button
              type="button"
              onClick={onSelectAudit}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                isCheapestComparableOnFlight
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-slate-900 text-white hover:bg-slate-800'
              }`}
            >
              Select
            </button>
          </div>
        </td>
      </tr>

      {isExpanded && (
        <tr>
          <td colSpan={6} className="p-0">
            <PriceBreakdownLedger
              quote={quote}
              breakdown={breakdown}
              extras={extras}
              onChangeExtras={onChangeExtras}
              passengers={passengers}
              flightLabel={`${itinerary.airlineName} ${itinerary.flightNumber}`}
            />
          </td>
        </tr>
      )}
    </>
  );
}
