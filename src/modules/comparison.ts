import {
  DepartureWindow,
  type EnrichedProviderComparison,
  type FlightItinerary,
  type OptionalExtrasSelection,
  SortOption,
  StopsFilter,
} from '../types/travel';
import { calculateCompleteFare } from './fareCalculator';

export interface ComparisonFilterState {
  sortBy: SortOption;
  departureWindow: DepartureWindow;
  stopsFilter: StopsFilter;
  maxPricePerPassengerInr: number;
}

export function matchesDepartureWindow(time24: string, window: DepartureWindow): boolean {
  if (window === DepartureWindow.ALL) return true;
  const hour = Number(time24.split(':')[0] || 0);
  switch (window) {
    case DepartureWindow.EARLY_MORNING:
      return hour >= 0 && hour < 6;
    case DepartureWindow.MORNING:
      return hour >= 6 && hour < 12;
    case DepartureWindow.AFTERNOON:
      return hour >= 12 && hour < 18;
    case DepartureWindow.EVENING:
      return hour >= 18 && hour < 24;
    default:
      return true;
  }
}

export function matchesStopsFilter(stops: number, filter: StopsFilter): boolean {
  if (filter === StopsFilter.ALL) return true;
  if (filter === StopsFilter.NON_STOP) return stops === 0;
  return stops <= 1;
}

/**
 * Computes a transparent "Best Value" composite score (lower is better):
 * Combines conservative payable price (INR), flight time cost (₹14 per minute),
 * layover penalty (₹650 per stop), and unverified fee uncertainty penalty (₹350).
 */
export function computeBestValueScore(
  conservativePerPaxInr: number,
  durationMinutes: number,
  stops: number,
  hasUnknownCharges: boolean
): number {
  return (
    conservativePerPaxInr +
    durationMinutes * 14 +
    stops * 650 +
    (hasUnknownCharges ? 350 : 0)
  );
}

export interface FlightComparisonGroup {
  itinerary: FlightItinerary;
  quotes: EnrichedProviderComparison[];
  bestQuoteForFlight: EnrichedProviderComparison;
  lowestAdvertisedQuote: EnrichedProviderComparison;
  hasAdvertisedRankFlip: boolean;
  rankFlipOverpayTotalInr: number;
  highestConservativeOnFlightInr: number;
  isOverallCheapestFlight: boolean;
}

/**
 * Builds enriched, filtered, and sorted flight & cross-platform comparison groups.
 * Highlights the cheapest comparable option based on actual total cost, not advertised teaser fare.
 */
export function buildCrossPlatformComparison(
  itineraries: FlightItinerary[],
  extras: OptionalExtrasSelection,
  passengers: number,
  filters: ComparisonFilterState
): {
  groups: FlightComparisonGroup[];
  allFlatQuotes: EnrichedProviderComparison[];
  cheapestOverallQuote: EnrichedProviderComparison | null;
  priceBounds: { minInr: number; maxInr: number };
} {
  let globalMinPrice = Infinity;
  let globalMaxPrice = 0;

  const rawGroups = itineraries.map((itinerary) => {
    const initialQuotes = itinerary.providerQuotes.map((quote) => {
      const breakdown = calculateCompleteFare(quote, extras, passengers);
      const valueScore = computeBestValueScore(
        breakdown.perPassengerConservativePayableInr,
        itinerary.durationMinutes,
        itinerary.stops,
        breakdown.hasUnknownCharges
      );
      if (breakdown.perPassengerConservativePayableInr < globalMinPrice) {
        globalMinPrice = breakdown.perPassengerConservativePayableInr;
      }
      if (breakdown.perPassengerConservativePayableInr > globalMaxPrice) {
        globalMaxPrice = breakdown.perPassengerConservativePayableInr;
      }
      return {
        itinerary,
        quote,
        breakdown,
        valueScore,
        isCheapestComparableOnFlight: false,
        isCheapestOverallVerified: false,
        savingsVsHighestOnSameFlightInr: 0,
      } satisfies EnrichedProviderComparison;
    });

    // Sort providers within the same flight by actual conservative payable total
    initialQuotes.sort((a, b) => {
      const diff =
        a.breakdown.perPassengerConservativePayableInr -
        b.breakdown.perPassengerConservativePayableInr;
      if (diff !== 0) return diff;
      if (a.breakdown.hasUnknownCharges !== b.breakdown.hasUnknownCharges) {
        return a.breakdown.hasUnknownCharges ? 1 : -1;
      }
      return 0;
    });

    const highestOnFlight = Math.max(
      ...initialQuotes.map((q) => q.breakdown.perPassengerConservativePayableInr)
    );

    const markedQuotes = initialQuotes.map((item, idx) => ({
      ...item,
      isCheapestComparableOnFlight: idx === 0,
      savingsVsHighestOnSameFlightInr: Math.max(
        0,
        (highestOnFlight - item.breakdown.perPassengerConservativePayableInr) * passengers
      ),
    }));

    const bestQuoteForFlight = markedQuotes[0];
    const lowestAdvertisedQuote = [...markedQuotes].sort(
      (a, b) => a.quote.advertisedPriceInr - b.quote.advertisedPriceInr
    )[0];

    const hasAdvertisedRankFlip =
      lowestAdvertisedQuote.quote.providerId !== bestQuoteForFlight.quote.providerId;

    const rankFlipOverpayTotalInr = hasAdvertisedRankFlip
      ? Math.max(
          0,
          lowestAdvertisedQuote.breakdown.totalPassengersConservativePayableInr -
            bestQuoteForFlight.breakdown.totalPassengersConservativePayableInr
        )
      : 0;

    return {
      itinerary,
      quotes: markedQuotes,
      bestQuoteForFlight,
      lowestAdvertisedQuote,
      hasAdvertisedRankFlip,
      rankFlipOverpayTotalInr,
      highestConservativeOnFlightInr: highestOnFlight,
      isOverallCheapestFlight: false,
    };
  });

  if (globalMinPrice === Infinity) {
    globalMinPrice = 3000;
    globalMaxPrice = 12000;
  }

  const filteredGroups = rawGroups.filter((group) => {
    if (!matchesDepartureWindow(group.itinerary.departureTime24, filters.departureWindow)) {
      return false;
    }
    if (!matchesStopsFilter(group.itinerary.stops, filters.stopsFilter)) {
      return false;
    }
    if (
      group.bestQuoteForFlight.breakdown.perPassengerConservativePayableInr >
      filters.maxPricePerPassengerInr
    ) {
      return false;
    }
    return true;
  });

  let cheapestOverallQuote: EnrichedProviderComparison | null = null;
  for (const group of filteredGroups) {
    for (const q of group.quotes) {
      if (
        q.breakdown.perPassengerConservativePayableInr <= filters.maxPricePerPassengerInr &&
        (!cheapestOverallQuote ||
          q.breakdown.perPassengerConservativePayableInr <
            cheapestOverallQuote.breakdown.perPassengerConservativePayableInr)
      ) {
        cheapestOverallQuote = q;
      }
    }
  }

  const finalGroups = filteredGroups.map((group) => {
    const isOverallCheapestFlight =
      cheapestOverallQuote !== null &&
      group.itinerary.id === cheapestOverallQuote.itinerary.id;

    const updatedQuotes = group.quotes.map((q) => ({
      ...q,
      isCheapestOverallVerified:
        cheapestOverallQuote !== null &&
        q.itinerary.id === cheapestOverallQuote.itinerary.id &&
        q.quote.providerId === cheapestOverallQuote.quote.providerId,
    }));

    const lowestAdvertisedQuote = [...updatedQuotes].sort(
      (a, b) => a.quote.advertisedPriceInr - b.quote.advertisedPriceInr
    )[0];

    return {
      ...group,
      quotes: updatedQuotes,
      bestQuoteForFlight: updatedQuotes[0],
      lowestAdvertisedQuote,
      isOverallCheapestFlight,
    };
  });

  finalGroups.sort((a, b) => {
    if (filters.sortBy === SortOption.LOWEST_PRICE) {
      return (
        a.bestQuoteForFlight.breakdown.perPassengerConservativePayableInr -
        b.bestQuoteForFlight.breakdown.perPassengerConservativePayableInr
      );
    }
    if (filters.sortBy === SortOption.SHORTEST_DURATION) {
      const durDiff = a.itinerary.durationMinutes - b.itinerary.durationMinutes;
      if (durDiff !== 0) return durDiff;
      return (
        a.bestQuoteForFlight.breakdown.perPassengerConservativePayableInr -
        b.bestQuoteForFlight.breakdown.perPassengerConservativePayableInr
      );
    }
    return a.bestQuoteForFlight.valueScore - b.bestQuoteForFlight.valueScore;
  });

  const allFlatQuotes = finalGroups.flatMap((g) => g.quotes);

  return {
    groups: finalGroups,
    allFlatQuotes,
    cheapestOverallQuote,
    priceBounds: {
      minInr: Math.floor(globalMinPrice / 100) * 100,
      maxInr: Math.ceil(globalMaxPrice / 100) * 100,
    },
  };
}
