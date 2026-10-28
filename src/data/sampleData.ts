import {
  type FlightItinerary,
  type HistoricalFareObservation,
  type IndianCity,
  type ProviderQuote,
  type SearchQuery,
  VerificationLabel,
} from '../types/travel';

export const INDIAN_CITIES: IndianCity[] = [
  {
    code: 'RPR',
    city: 'Raipur',
    state: 'Chhattisgarh',
    airportName: 'Swami Vivekananda Airport',
    popular: true,
  },
  {
    code: 'DEL',
    city: 'Delhi',
    state: 'Delhi NCR',
    airportName: 'Indira Gandhi International Airport',
    popular: true,
  },
  {
    code: 'BOM',
    city: 'Mumbai',
    state: 'Maharashtra',
    airportName: 'Chhatrapati Shivaji Maharaj International Airport',
    popular: true,
  },
  {
    code: 'BLR',
    city: 'Bengaluru',
    state: 'Karnataka',
    airportName: 'Kempegowda International Airport',
    popular: true,
  },
  {
    code: 'HYD',
    city: 'Hyderabad',
    state: 'Telangana',
    airportName: 'Rajiv Gandhi International Airport',
    popular: true,
  },
  {
    code: 'CCU',
    city: 'Kolkata',
    state: 'West Bengal',
    airportName: 'Netaji Subhas Chandra Bose International Airport',
    popular: true,
  },
  {
    code: 'MAA',
    city: 'Chennai',
    state: 'Tamil Nadu',
    airportName: 'Chennai International Airport',
    popular: false,
  },
  {
    code: 'PNQ',
    city: 'Pune',
    state: 'Maharashtra',
    airportName: 'Pune International Airport',
    popular: false,
  },
  {
    code: 'GOI',
    city: 'Goa',
    state: 'Goa',
    airportName: 'Manohar / Dabolim International Airport',
    popular: false,
  },
  {
    code: 'AMD',
    city: 'Ahmedabad',
    state: 'Gujarat',
    airportName: 'Sardar Vallabhbhai Patel International Airport',
    popular: false,
  },
  {
    code: 'COK',
    city: 'Kochi',
    state: 'Kerala',
    airportName: 'Cochin International Airport',
    popular: false,
  },
  {
    code: 'JAI',
    city: 'Jaipur',
    state: 'Rajasthan',
    airportName: 'Jaipur International Airport',
    popular: false,
  },
];

export interface BenchmarkCorridor {
  originCode: string;
  originCity: string;
  destinationCode: string;
  destinationCity: string;
  typicalAdvertisedInr: number;
  typicalHiddenFeesInr: number;
  realLowestPayableInr: number;
  durationLabel: string;
  sevenDayOutlook: 'Rising' | 'Stable' | 'Potentially falling';
}

export const BENCHMARK_CORRIDORS: BenchmarkCorridor[] = [
  {
    originCode: 'RPR',
    originCity: 'Raipur',
    destinationCode: 'DEL',
    destinationCity: 'Delhi',
    typicalAdvertisedInr: 4130,
    typicalHiddenFeesInr: 1463,
    realLowestPayableInr: 5097,
    durationLabel: '1h 55m · Non-stop',
    sevenDayOutlook: 'Rising',
  },
  {
    originCode: 'BOM',
    originCity: 'Mumbai',
    destinationCode: 'BLR',
    destinationCity: 'Bengaluru',
    typicalAdvertisedInr: 3340,
    typicalHiddenFeesInr: 1423,
    realLowestPayableInr: 4296,
    durationLabel: '1h 40m · Non-stop',
    sevenDayOutlook: 'Stable',
  },
  {
    originCode: 'DEL',
    originCity: 'Delhi',
    destinationCode: 'BOM',
    destinationCity: 'Mumbai',
    typicalAdvertisedInr: 4490,
    typicalHiddenFeesInr: 1481,
    realLowestPayableInr: 5459,
    durationLabel: '2h 15m · Non-stop',
    sevenDayOutlook: 'Potentially falling',
  },
  {
    originCode: 'RPR',
    originCity: 'Raipur',
    destinationCode: 'BLR',
    destinationCity: 'Bengaluru',
    typicalAdvertisedInr: 4520,
    typicalHiddenFeesInr: 1482,
    realLowestPayableInr: 5491,
    durationLabel: '2h 05m · Non-stop',
    sevenDayOutlook: 'Potentially falling',
  },
];

export function getCityByCode(code: string): IndianCity | undefined {
  return INDIAN_CITIES.find((c) => c.code.toUpperCase() === code.toUpperCase());
}

export function getDefaultFutureDate(daysAhead: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function getTodayDateString(): string {
  return getDefaultFutureDate(0);
}

/**
 * Deterministic string hash so identical routes/dates always yield consistent demo fares.
 */
function deterministicHash(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

const ROUTE_BASE_METRIC: Record<string, { baseInr: number; nonStopMinutes: number; hub: string }> = {
  'RPR-DEL': { baseInr: 4120, nonStopMinutes: 115, hub: 'HYD' },
  'DEL-RPR': { baseInr: 4180, nonStopMinutes: 115, hub: 'IND' },
  'BOM-BLR': { baseInr: 3380, nonStopMinutes: 100, hub: 'PNQ' },
  'BLR-BOM': { baseInr: 3440, nonStopMinutes: 105, hub: 'HYD' },
  'DEL-BOM': { baseInr: 4460, nonStopMinutes: 135, hub: 'AMD' },
  'BOM-DEL': { baseInr: 4510, nonStopMinutes: 130, hub: 'JAI' },
  'RPR-BLR': { baseInr: 4490, nonStopMinutes: 125, hub: 'HYD' },
  'BLR-RPR': { baseInr: 4540, nonStopMinutes: 125, hub: 'HYD' },
  'RPR-BOM': { baseInr: 4390, nonStopMinutes: 115, hub: 'HYD' },
  'BOM-RPR': { baseInr: 4420, nonStopMinutes: 115, hub: 'HYD' },
  'DEL-BLR': { baseInr: 5280, nonStopMinutes: 165, hub: 'HYD' },
  'BLR-DEL': { baseInr: 5340, nonStopMinutes: 165, hub: 'BOM' },
};

function getRouteBaseline(originCode: string, destinationCode: string) {
  const key = `${originCode}-${destinationCode}`;
  if (ROUTE_BASE_METRIC[key]) {
    return ROUTE_BASE_METRIC[key];
  }
  const h = deterministicHash(key);
  const nonStopMinutes = 95 + (h % 80);
  const baseInr = 3400 + (h % 2100);
  const hubs = ['HYD', 'DEL', 'BOM', 'BLR'].filter(
    (c) => c !== originCode && c !== destinationCode
  );
  return {
    baseInr,
    nonStopMinutes,
    hub: hubs[h % hubs.length] || 'HYD',
  };
}

function addMinutesToTime(startTime24: string, durationMinutes: number): string {
  const [hh, mm] = startTime24.split(':').map(Number);
  const total = hh * 60 + mm + durationMinutes;
  const endH = Math.floor((total / 60) % 24);
  const endM = total % 60;
  return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
}

function buildProviderQuotesForFlight(
  flightId: string,
  coreBaseFare: number,
  tripMultiplier: number,
  verifiedTimestampIso: string
): ProviderQuote[] {
  const scaledBase = Math.round((coreBaseFare * tripMultiplier) / 10) * 10;
  const gstTaxes = Math.round(scaledBase * 0.05);
  const airportMandatoryFees = Math.round(690 * tripMultiplier); // UDF + ASF + PSF

  // 1. AeroDirect — Airline Direct Portal (Transparent, ₹0 convenience charge, Verified Demo Structure)
  const aeroDirect: ProviderQuote = {
    providerId: 'aerodirect',
    providerName: 'AeroDirect',
    providerType: 'Airline Direct',
    providerUrl: 'https://demo.skysync.example/providers/aerodirect',
    advertisedPriceInr: scaledBase + gstTaxes + airportMandatoryFees,
    baseFareInr: scaledBase,
    taxesGstInr: gstTaxes,
    mandatoryAirportFeesInr: airportMandatoryFees,
    convenienceCharge: { kind: 'known', amountInr: 0 },
    discountInr: 0,
    optionalPricing: {
      baggage: {
        cabin_only: { kind: 'known', amountInr: 0 },
        extra_15kg: { kind: 'known', amountInr: Math.round(1350 * tripMultiplier) },
        extra_25kg: { kind: 'known', amountInr: Math.round(2250 * tripMultiplier) },
      },
      seat: {
        auto_free: { kind: 'known', amountInr: 0 },
        standard_choice: { kind: 'known', amountInr: Math.round(300 * tripMultiplier) },
        extra_legroom: { kind: 'known', amountInr: Math.round(950 * tripMultiplier) },
      },
    },
    verificationLabel: VerificationLabel.VERIFIED,
    verifiedAtIso: verifiedTimestampIso,
    paymentNote: 'Direct airline checkout with zero UPI/RuPay convenience surcharge (Demo Dataset).',
  };

  // 2. ClearWing — Transparent Fintech OTA (Known convenience fee + clean instant discount)
  const clearWingBase = scaledBase - Math.round(40 * tripMultiplier);
  const clearWingGst = Math.round(clearWingBase * 0.05);
  const clearWingDiscount = Math.round(260 * tripMultiplier);
  const clearWingConv = Math.round(299 * tripMultiplier);

  const clearWing: ProviderQuote = {
    providerId: 'clearwing',
    providerName: 'ClearWing',
    providerType: 'Transparent OTA',
    providerUrl: 'https://demo.skysync.example/providers/clearwing',
    advertisedPriceInr: clearWingBase + clearWingGst + airportMandatoryFees - clearWingDiscount,
    baseFareInr: clearWingBase,
    taxesGstInr: clearWingGst,
    mandatoryAirportFeesInr: airportMandatoryFees,
    convenienceCharge: { kind: 'known', amountInr: clearWingConv },
    discountInr: clearWingDiscount,
    discountLabel: 'Instant UPI / NetBanking Promo',
    optionalPricing: {
      baggage: {
        cabin_only: { kind: 'known', amountInr: 0 },
        extra_15kg: { kind: 'known', amountInr: Math.round(1450 * tripMultiplier) },
        extra_25kg: { kind: 'known', amountInr: Math.round(2400 * tripMultiplier) },
      },
      seat: {
        auto_free: { kind: 'known', amountInr: 0 },
        standard_choice: { kind: 'known', amountInr: Math.round(350 * tripMultiplier) },
        extra_legroom: { kind: 'known', amountInr: Math.round(1050 * tripMultiplier) },
      },
    },
    verificationLabel: VerificationLabel.DEMO_DATA,
    verifiedAtIso: verifiedTimestampIso,
    paymentNote: `Discloses ₹${clearWingConv} convenience fee before traveller details step (Demo Dataset).`,
  };

  // 3. YatraPulse — Discount Teaser OTA (Low advertised base teaser, Estimated payment gateway fee)
  const yatraBase = scaledBase + Math.round(70 * tripMultiplier);
  const yatraGst = Math.round(yatraBase * 0.05);
  const yatraDiscount = Math.round(350 * tripMultiplier);

  const yatraPulse: ProviderQuote = {
    providerId: 'yatrapulse',
    providerName: 'YatraPulse',
    providerType: 'Discount OTA',
    providerUrl: 'https://demo.skysync.example/providers/yatrapulse',
    // Advertises artificially low teaser excluding airport fees & convenience charge!
    advertisedPriceInr: yatraBase - yatraDiscount,
    baseFareInr: yatraBase,
    taxesGstInr: yatraGst,
    mandatoryAirportFeesInr: airportMandatoryFees,
    convenienceCharge: {
      kind: 'estimated',
      minInr: Math.round(399 * tripMultiplier),
      maxInr: Math.round(549 * tripMultiplier),
      typicalInr: Math.round(469 * tripMultiplier),
      basis: 'Varies by card network vs UPI at final payment screen',
    },
    discountInr: yatraDiscount,
    discountLabel: 'Teaser Coupon SKYDEAL',
    optionalPricing: {
      baggage: {
        cabin_only: { kind: 'known', amountInr: 0 },
        extra_15kg: { kind: 'known', amountInr: Math.round(1580 * tripMultiplier) },
        extra_25kg: { kind: 'known', amountInr: Math.round(2590 * tripMultiplier) },
      },
      seat: {
        auto_free: { kind: 'known', amountInr: 0 },
        standard_choice: { kind: 'known', amountInr: Math.round(420 * tripMultiplier) },
        extra_legroom: { kind: 'known', amountInr: Math.round(1180 * tripMultiplier) },
      },
    },
    verificationLabel: VerificationLabel.ESTIMATED,
    verifiedAtIso: verifiedTimestampIso,
    paymentNote: 'Headline price omits airport UDF/ASF and card gateway convenience fee (Demo Dataset).',
  };

  // 4. FlyVista — Meta Aggregator (Unknown convenience charge — NEVER treated as ₹0!)
  const vistaSeed = deterministicHash(flightId);
  const vistaBase = scaledBase - Math.round((80 + (vistaSeed % 50)) * tripMultiplier);
  const vistaGst = Math.round(vistaBase * 0.05);

  const flyVista: ProviderQuote = {
    providerId: 'flyvista',
    providerName: 'FlyVista',
    providerType: 'Meta Aggregator',
    providerUrl: 'https://demo.skysync.example/providers/flyvista',
    advertisedPriceInr: vistaBase + vistaGst,
    baseFareInr: vistaBase,
    taxesGstInr: vistaGst,
    mandatoryAirportFeesInr: airportMandatoryFees,
    convenienceCharge: {
      kind: 'unknown',
      conservativeBufferInr: Math.round(520 * tripMultiplier),
      reason: 'Platform withholds convenience & gateway fee until passenger contact submission.',
    },
    discountInr: Math.round(120 * tripMultiplier),
    discountLabel: 'Aggregator Referral Rebate',
    optionalPricing: {
      baggage: {
        cabin_only: { kind: 'known', amountInr: 0 },
        extra_15kg: { kind: 'known', amountInr: Math.round(1520 * tripMultiplier) },
        extra_25kg: { kind: 'known', amountInr: Math.round(2480 * tripMultiplier) },
      },
      seat: {
        auto_free: { kind: 'known', amountInr: 0 },
        standard_choice: {
          kind: 'unknown',
          conservativeBufferInr: Math.round(450 * tripMultiplier),
          reason: 'Seat map surcharge unverified prior to PNR hold.',
        },
        extra_legroom: { kind: 'known', amountInr: Math.round(1150 * tripMultiplier) },
      },
    },
    verificationLabel: VerificationLabel.DEMO_DATA,
    verifiedAtIso: verifiedTimestampIso,
    paymentNote: 'Unverified checkout fee is explicitly buffered rather than assumed ₹0 (Demo Dataset).',
  };

  return [aeroDirect, clearWing, yatraPulse, flyVista];
}

/**
 * Generates consistent, realistic Indian flight itineraries and cross-platform quotes
 * for any valid SearchQuery. Clearly stamped as Demonstration Data.
 */
export function generateDemoItineraries(query: SearchQuery): FlightItinerary[] {
  const { originCode, destinationCode, departureDate, returnDate, tripType } = query;
  const baseline = getRouteBaseline(originCode, destinationCode);
  const seed = deterministicHash(`${originCode}-${destinationCode}-${departureDate}`);

  // Days until departure affects advance-purchase pricing realistically
  const todayMs = new Date(getTodayDateString()).getTime();
  const depMs = new Date(departureDate).getTime();
  const daysOut = Math.max(0, Math.round((depMs - todayMs) / (1000 * 60 * 60 * 24)));

  let advanceFactor = 1.0;
  if (daysOut <= 2) advanceFactor = 1.34;
  else if (daysOut <= 6) advanceFactor = 1.19;
  else if (daysOut <= 14) advanceFactor = 1.07;
  else if (daysOut >= 30) advanceFactor = 0.93;

  const tripMultiplier = tripType === 'round_trip' ? 1.92 : 1.0;
  const verifiedTimestampIso = new Date(Date.now() - ((seed % 18) + 4) * 60 * 1000).toISOString();

  const templates = [
    {
      suffix: 'morn-direct',
      airlineName: 'IndiAir Express',
      airlineCode: 'IA',
      flightNum: `${210 + (seed % 70)}`,
      depTime: '06:50',
      durationDelta: 0,
      stops: 0,
      fareMultiplier: 1.0,
      checkedBagKg: 15,
    },
    {
      suffix: 'late-morn-direct',
      airlineName: 'Vistara Crest',
      airlineCode: 'VC',
      flightNum: `${604 + (seed % 85)}`,
      depTime: '10:25',
      durationDelta: 5,
      stops: 0,
      fareMultiplier: 1.09,
      checkedBagKg: 15,
    },
    {
      suffix: 'afternoon-1stop',
      airlineName: 'Akasa Horizon',
      airlineCode: 'AH',
      flightNum: `${412 + (seed % 60)}`,
      depTime: '14:15',
      durationDelta: 115,
      stops: 1,
      fareMultiplier: 0.91,
      checkedBagKg: 15,
    },
    {
      suffix: 'evening-direct',
      airlineName: 'IndiAir Express',
      airlineCode: 'IA',
      flightNum: `${845 + (seed % 90)}`,
      depTime: '19:10',
      durationDelta: 5,
      stops: 0,
      fareMultiplier: 1.05,
      checkedBagKg: 15,
    },
    {
      suffix: 'early-bird-saver',
      airlineName: 'Deccan Wings',
      airlineCode: 'DW',
      flightNum: `${118 + (seed % 50)}`,
      depTime: '05:15',
      durationDelta: 10,
      stops: 0,
      fareMultiplier: 0.95,
      checkedBagKg: 15,
    },
  ];

  return templates.map((tpl) => {
    const durationMinutes = baseline.nonStopMinutes + tpl.durationDelta;
    const arrivalTime24 = addMinutesToTime(tpl.depTime, durationMinutes);
    const coreBase = Math.round(baseline.baseInr * advanceFactor * tpl.fareMultiplier);
    const id = `${originCode}-${destinationCode}-${departureDate}-${tpl.suffix}`;

    const returnSummary =
      tripType === 'round_trip' && returnDate
        ? {
            flightNumber: `${tpl.airlineCode}-${Number(tpl.flightNum) + 1}`,
            departureTime24: '17:40',
            arrivalTime24: addMinutesToTime('17:40', baseline.nonStopMinutes + (tpl.stops ? 95 : 0)),
            durationMinutes: baseline.nonStopMinutes + (tpl.stops ? 95 : 0),
            stops: tpl.stops,
          }
        : undefined;

    return {
      id,
      airlineName: tpl.airlineName,
      airlineCode: tpl.airlineCode,
      flightNumber: `${tpl.airlineCode}-${tpl.flightNum}`,
      originCode,
      destinationCode,
      departureTime24: tpl.depTime,
      arrivalTime24,
      durationMinutes,
      stops: tpl.stops,
      stopCity: tpl.stops > 0 ? getCityByCode(baseline.hub)?.city || baseline.hub : undefined,
      cabinBagIncludedKg: 7,
      checkedBagIncludedKg: tpl.checkedBagKg,
      returnSummary,
      providerQuotes: buildProviderQuotesForFlight(
        id,
        coreBase,
        tripMultiplier,
        verifiedTimestampIso
      ),
    };
  });
}

/**
 * Generates a realistic 30-day historical observed lowest real total fare series
 * for the route, tailored to match the current observed lowest real fare on day 30.
 */
export function generateHistoricalFareSeries(
  originCode: string,
  destinationCode: string,
  departureDate: string,
  currentLowestRealFareInr: number
): HistoricalFareObservation[] {
  const seed = deterministicHash(`hist-${originCode}-${destinationCode}-${departureDate}`);
  const regime = seed % 3; // 0: upward booking pressure, 1: stable corridor, 2: recent post-spike dip
  const points: HistoricalFareObservation[] = [];
  const totalDays = 30;
  const now = new Date();

  for (let i = totalDays - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;

    if (i === 0) {
      points.push({
        date: dateStr,
        observedLowestTotalInr: Math.round(currentLowestRealFareInr),
      });
      continue;
    }

    const dayOfWeek = d.getDay();
    const weekendBump = dayOfWeek === 5 || dayOfWeek === 0 ? 185 : -55;
    const pseudoNoise = ((deterministicHash(`${dateStr}-${originCode}-${destinationCode}`) % 260) - 130);

    let driftFromToday = 0;
    if (regime === 0) {
      // Gradually rose over the past 30 days toward today's fare
      driftFromToday = -i * 22;
    } else if (regime === 1) {
      // Oscillated cleanly around a stable corridor mean
      driftFromToday = Math.round(Math.sin(i * 0.45) * 140);
    } else {
      // Was elevated 1–2 weeks ago and has been easing downward recently
      driftFromToday = i * 19;
    }

    // Override specific benchmark routes so their landing page outlook matches default search
    const routePair = `${originCode}-${destinationCode}`;
    if (routePair === 'RPR-DEL') {
      driftFromToday = -i * 26;
    } else if (routePair === 'BOM-BLR') {
      driftFromToday = Math.round(Math.sin(i * 0.5) * 115);
    } else if (routePair === 'DEL-BOM' || routePair === 'RPR-BLR') {
      driftFromToday = i * 23;
    }

    const rawFare = Math.max(
      2400,
      Math.round((currentLowestRealFareInr + driftFromToday + weekendBump + pseudoNoise) / 10) * 10
    );

    points.push({
      date: dateStr,
      observedLowestTotalInr: rawFare,
    });
  }

  return points;
}
