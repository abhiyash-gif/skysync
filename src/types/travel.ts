export enum VerificationLabel {
  VERIFIED = 'Verified',
  ESTIMATED = 'Estimated',
  DEMO_DATA = 'Demo Data',
}

export enum TrendClassification {
  RISING = 'Rising',
  STABLE = 'Stable',
  POTENTIALLY_FALLING = 'Potentially falling',
}

export enum ForecastRecommendation {
  BOOK_NOW = 'Book now',
  MONITOR_FARE = 'Monitor fare',
  COMPARE_ALTERNATIVES = 'Compare alternatives',
}

export enum SortOption {
  LOWEST_PRICE = 'lowest_price',
  SHORTEST_DURATION = 'shortest_duration',
  BEST_VALUE = 'best_value',
}

export enum DepartureWindow {
  ALL = 'all',
  EARLY_MORNING = 'early_morning', // 00:00 - 05:59
  MORNING = 'morning',             // 06:00 - 11:59
  AFTERNOON = 'afternoon',         // 12:00 - 17:59
  EVENING = 'evening',             // 18:00 - 23:59
}

export enum StopsFilter {
  ALL = 'all',
  NON_STOP = 'non_stop',
  MAX_ONE_STOP = 'max_one_stop',
}

export type AppView = 'landing' | 'results' | 'forecast' | 'tracker' | 'assistant';

export type TripType = 'one_way' | 'round_trip';

export type BaggageTierId = 'cabin_only' | 'extra_15kg' | 'extra_25kg';
export type SeatTierId = 'auto_free' | 'standard_choice' | 'extra_legroom';

export interface IndianCity {
  code: string;
  city: string;
  state: string;
  airportName: string;
  popular: boolean;
}

export interface SearchQuery {
  originCode: string;
  destinationCode: string;
  departureDate: string;
  returnDate: string;
  tripType: TripType;
  passengers: number;
}

/**
 * Explicit representation of charge certainty.
 * CRITICAL INVARIANT: Unknown charges are NEVER treated as zero.
 */
export type ChargeCertitude =
  | {
      kind: 'known';
      amountInr: number;
    }
  | {
      kind: 'estimated';
      minInr: number;
      maxInr: number;
      typicalInr: number;
      basis: string;
    }
  | {
      kind: 'unknown';
      conservativeBufferInr: number;
      reason: string;
    };

export interface OptionalExtrasSelection {
  baggage: BaggageTierId;
  seat: SeatTierId;
}

export interface ProviderOptionalPricing {
  baggage: Record<BaggageTierId, ChargeCertitude>;
  seat: Record<SeatTierId, ChargeCertitude>;
}

export interface ProviderQuote {
  providerId: string;
  providerName: string;
  providerType: 'Airline Direct' | 'Transparent OTA' | 'Discount OTA' | 'Meta Aggregator';
  providerUrl: string;
  advertisedPriceInr: number;
  baseFareInr: number;
  taxesGstInr: number;
  mandatoryAirportFeesInr: number; // UDF + ASF + PSF
  convenienceCharge: ChargeCertitude;
  discountInr: number; // Positive integer subtracted from total
  discountLabel?: string;
  optionalPricing: ProviderOptionalPricing;
  verificationLabel: VerificationLabel;
  verifiedAtIso: string;
  paymentNote: string;
}

export interface FlightItinerary {
  id: string;
  airlineName: string;
  airlineCode: string;
  flightNumber: string;
  originCode: string;
  destinationCode: string;
  departureTime24: string; // e.g., "06:45"
  arrivalTime24: string;   // e.g., "08:50"
  durationMinutes: number;
  stops: number;
  stopCity?: string;
  cabinBagIncludedKg: number;
  checkedBagIncludedKg: number;
  returnSummary?: {
    flightNumber: string;
    departureTime24: string;
    arrivalTime24: string;
    durationMinutes: number;
    stops: number;
  };
  providerQuotes: ProviderQuote[];
}

export interface ComputedLineItem {
  id: string;
  label: string;
  category: 'mandatory' | 'optional' | 'discount';
  certitude: ChargeCertitude;
  displayText: string;
  numericForKnownSubtotal: number;
  numericForConservativeBound: number;
  isUnverified: boolean;
}

export interface ComputedFareBreakdown {
  perPassengerKnownPayableInr: number;
  perPassengerConservativePayableInr: number;
  totalPassengersKnownPayableInr: number;
  totalPassengersConservativePayableInr: number;
  mandatoryKnownSubtotalInr: number;
  mandatoryConservativeSubtotalInr: number;
  optionalKnownSubtotalInr: number;
  optionalConservativeSubtotalInr: number;
  discountInr: number;
  hiddenMarkupOverAdvertisedInr: number;
  hasUnknownCharges: boolean;
  hasEstimatedCharges: boolean;
  unverifiedReasons: string[];
  effectiveVerificationLabel: VerificationLabel;
  lineItems: ComputedLineItem[];
}

export interface EnrichedProviderComparison {
  itinerary: FlightItinerary;
  quote: ProviderQuote;
  breakdown: ComputedFareBreakdown;
  valueScore: number; // Lower is better value
  isCheapestComparableOnFlight: boolean;
  isCheapestOverallVerified: boolean;
  savingsVsHighestOnSameFlightInr: number;
}

export interface HistoricalFareObservation {
  date: string; // YYYY-MM-DD
  observedLowestTotalInr: number;
  isSimulatedUpdate?: boolean;
}

export interface ForecastHorizonBand {
  horizonDays: 3 | 7;
  lowInr: number;
  medianInr: number;
  highInr: number;
}

export interface ForecastChartPoint {
  date: string;
  displayDate: string;
  historicalFareInr: number | null;
  forecastMedianInr: number | null;
  forecastBand: [number, number] | null;
  forecastLowInr: number | null;
  forecastHighInr: number | null;
  kind: 'historical' | 'bridge' | 'forecast';
}

export interface FareForecastResult {
  routeKey: string;
  originCode: string;
  destinationCode: string;
  departureDate: string;
  daysUntilDeparture: number;
  sampleCount: number;
  currentLowestRealFareInr: number;
  historicalMinInr: number;
  historicalMaxInr: number;
  historicalMeanInr: number;
  farePercentile: number; // 0 to 100
  dailySlopeInr: number;
  residualStdDevInr: number;
  range3Day: ForecastHorizonBand;
  range7Day: ForecastHorizonBand;
  trend: TrendClassification;
  recommendation: ForecastRecommendation;
  reasoningPoints: string[];
  uncertaintyNotice: string;
  methodologyLabel: string;
  chartSeries: ForecastChartPoint[];
}

export interface TrackedPricePoint {
  observedAtIso: string;
  dateLabel: string;
  totalPayableInr: number;
  source: 'demo_seed' | 'user_saved' | 'simulated_update';
}

export interface TrackedJourney {
  id: string;
  originCode: string;
  originCity: string;
  destinationCode: string;
  destinationCity: string;
  departureDate: string;
  returnDate?: string;
  tripType: TripType;
  passengers: number;
  extras: OptionalExtrasSelection;
  targetPriceInr: number;
  alertsEnabled: boolean;
  createdAtIso: string;
  lastCheckedAtIso: string;
  currentObservedInr: number;
  initialObservedInr: number;
  bestProviderName: string;
  verificationLabel: VerificationLabel;
  priceHistory: TrackedPricePoint[];
}
