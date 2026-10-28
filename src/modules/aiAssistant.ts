import { getCityByCode } from '../data/sampleData';
import { buildCrossPlatformComparison } from './comparison';
import {
  BAGGAGE_LABELS,
  formatDuration,
  formatInr,
  SEAT_LABELS,
} from './fareCalculator';
import {
  DepartureWindow,
  type FareForecastResult,
  type FlightItinerary,
  ForecastRecommendation,
  type OptionalExtrasSelection,
  type SearchQuery,
  SortOption,
  StopsFilter,
  type TrackedJourney,
} from '../types/travel';

export interface AssistantChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  bulletPoints?: string[];
  footnote?: string;
  suggestedViewAction?: {
    label: string;
    targetView: 'results' | 'forecast' | 'tracker';
  };
  timestampIso: string;
}

export interface AssistantContext {
  query: SearchQuery;
  itineraries: FlightItinerary[];
  extras: OptionalExtrasSelection;
  forecast: FareForecastResult;
  trackedJourneys: TrackedJourney[];
}

export const SUGGESTED_AI_QUESTIONS: string[] = [
  'Which flight is cheapest overall?',
  'Why is the final fare higher than advertised?',
  'Should I book now or wait?',
  'How can I save money on this trip?',
];

export function createInitialAssistantMessage(ctx: AssistantContext): AssistantChatMessage {
  const originCity = getCityByCode(ctx.query.originCode)?.city || ctx.query.originCode;
  const destCity =
    getCityByCode(ctx.query.destinationCode)?.city || ctx.query.destinationCode;

  return {
    id: 'welcome-msg',
    role: 'assistant',
    content: `Hello! I’m Ask Skysync AI. Right now I’m analyzing your selected ${originCity} (${ctx.query.originCode}) → ${destCity} (${ctx.query.destinationCode}) route for ${ctx.query.passengers} ${
      ctx.query.passengers === 1 ? 'adult' : 'adults'
    }. Ask me about cheapest real totals, hidden platform fees, baggage costs, or 3- and 7-day fare trends.`,
    footnote:
      'Prototype notice: Responses use Skysync’s deterministic Demo Data and statistical baseline estimates—not live airline inventory.',
    timestampIso: new Date().toISOString(),
  };
}

/**
 * Lightweight, deterministic rule-based travel assistant grounded strictly in
 * Skysync's existing fare calculation, cross-platform comparison, forecast, and tracker state.
 * Never invents facts or claims access to live airline prices.
 */
export function generateAssistantResponse(
  rawPrompt: string,
  ctx: AssistantContext
): AssistantChatMessage {
  const text = rawPrompt.trim().toLowerCase();
  const originCity = getCityByCode(ctx.query.originCode)?.city || ctx.query.originCode;
  const destCity =
    getCityByCode(ctx.query.destinationCode)?.city || ctx.query.destinationCode;
  const routeLabel = `${originCity} (${ctx.query.originCode}) → ${destCity} (${ctx.query.destinationCode})`;
  const paxLabel = `${ctx.query.passengers} ${ctx.query.passengers === 1 ? 'adult' : 'adults'}`;

  const comparison = buildCrossPlatformComparison(
    ctx.itineraries,
    ctx.extras,
    ctx.query.passengers,
    {
      sortBy: SortOption.LOWEST_PRICE,
      departureWindow: DepartureWindow.ALL,
      stopsFilter: StopsFilter.ALL,
      maxPricePerPassengerInr: 999999,
    }
  );

  const cheapestOverall = comparison.cheapestOverallQuote;
  const topFlightGroup = comparison.groups[0];

  // Check if the user asked about a different city not currently loaded
  const mentionedDifferentCities = checkUnloadedRouteMention(text, ctx.query);
  if (mentionedDifferentCities) {
    return {
      id: `msg-${Date.now()}`,
      role: 'assistant',
      content: `My active fare breakdown is currently loaded for ${routeLabel}, while your question mentions ${mentionedDifferentCities}. Run a search for that route in Compare Fares first so I can calculate its exact cross-platform totals and 7-day forecast.`,
      suggestedViewAction: {
        label: 'Change Route in Compare Fares',
        targetView: 'results',
      },
      footnote: 'Simulated Demo Data only — no live airline feed is queried.',
      timestampIso: new Date().toISOString(),
    };
  }

  // Out-of-scope / unanswerable topics — be strictly honest rather than inventing facts
  if (
    /\b(weather|rain|temperature|hotel|stay|airbnb|cab|taxi|uber|visa|passport|covid|vaccine|meal|food|wifi|lounge|miles|loyalty|delay|on-time|gate|terminal number)\b/.test(
      text
    )
  ) {
    return {
      id: `msg-${Date.now()}`,
      role: 'assistant',
      content: `I can’t answer that reliably. Ask Skysync AI only has access to this prototype’s simulated flight fare breakdowns, cross-platform fee comparisons, 3/7-day statistical forecasts, and saved price alerts—not live flight operations, weather, hotels, cabin amenities, or travel regulations.`,
      bulletPoints: [
        `Active route available for analysis: ${routeLabel} (${paxLabel})`,
        'Try asking: “Which flight is cheapest overall?” or “Why is the final fare higher than advertised?”',
      ],
      footnote:
        'Skysync never fabricates external travel facts when data is unavailable.',
      timestampIso: new Date().toISOString(),
    };
  }

  // 1. Cheapest flight overall
  if (
    /\b(cheapest|lowest|best flight|which flight|best deal|least expensive|minimum fare)\b/.test(
      text
    ) &&
    !/\b(why|higher|advertised)\b/.test(text)
  ) {
    if (!cheapestOverall || !topFlightGroup) {
      return {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: `No flight schedules are currently available to rank for ${routeLabel}. Try running a search in Compare Fares.`,
        timestampIso: new Date().toISOString(),
      };
    }

    const { itinerary, quote, breakdown } = cheapestOverall;
    const trap = topFlightGroup.lowestAdvertisedQuote;
    const bullets: string[] = [
      `Flight: ${itinerary.airlineName} (${itinerary.flightNumber}) departing ${itinerary.departureTime24} → ${itinerary.arrivalTime24} (${formatDuration(
        itinerary.durationMinutes
      )}, ${itinerary.stops === 0 ? 'Non-stop' : `${itinerary.stops} stop via ${itinerary.stopCity}`}).`,
      `Cheapest platform by real total: ${quote.providerName} at ${formatInr(
        breakdown.totalPassengersConservativePayableInr
      )} for ${paxLabel} (${BAGGAGE_LABELS[ctx.extras.baggage]}, ${SEAT_LABELS[ctx.extras.seat]}).`,
    ];

    if (topFlightGroup.hasAdvertisedRankFlip && topFlightGroup.rankFlipOverpayTotalInr > 0) {
      bullets.push(
        `Hidden-fee rank flip avoided: ${trap.quote.providerName} advertises ${formatInr(
          trap.quote.advertisedPriceInr * ctx.query.passengers
        )} upfront, but reaches ${formatInr(
          trap.breakdown.totalPassengersConservativePayableInr
        )} at checkout (${formatInr(topFlightGroup.rankFlipOverpayTotalInr)} higher).`
      );
    }

    return {
      id: `msg-${Date.now()}`,
      role: 'assistant',
      content: `Based on actual payable cost on ${routeLabel} (Demo Data), the cheapest overall option is ${itinerary.airlineName} ${itinerary.flightNumber} booked via ${quote.providerName} at ${formatInr(
        breakdown.totalPassengersConservativePayableInr
      )} total.`,
      bulletPoints: bullets,
      suggestedViewAction: {
        label: 'View Full 4-Platform Comparison',
        targetView: 'results',
      },
      footnote:
        'Demo Data estimate: Calculated from simulated provider quotes; does not reflect live airline seat availability.',
      timestampIso: new Date().toISOString(),
    };
  }

  // 2. Why is the final fare higher than advertised? / Hidden charges / Unknown fees
  if (
    /\b(why|higher|advertised|hidden|convenience|tax|taxes|udf|asf|fee|fees|difference|jump|markup|unknown)\b/.test(
      text
    )
  ) {
    const sampleGroup = topFlightGroup;
    const trapQuote = sampleGroup?.lowestAdvertisedQuote;
    const winnerQuote = sampleGroup?.bestQuoteForFlight;

    const bullets: string[] = [
      'Statutory Taxes & Airport Charges: Headline teaser fares frequently omit 5% aviation GST plus mandatory Airport UDF, PSF, and Aviation Security Fees (~₹690 per one-way leg).',
      'Payment Convenience Surcharges: Discount OTAs often add ₹300–₹550 per passenger at the final card/UPI payment screen.',
      'Unknown Charges Never Assumed ₹0: When an aggregator (such as FlyVista in this demo) hides its checkout surcharge until after passenger details, Skysync flags it as Unknown and applies a conservative buffer instead of treating it as ₹0.',
    ];

    if (trapQuote && winnerQuote) {
      bullets.unshift(
        `Example on ${sampleGroup.itinerary.flightNumber}: ${trapQuote.quote.providerName} advertises ${formatInr(
          trapQuote.quote.advertisedPriceInr * ctx.query.passengers
        )} but totals ${formatInr(
          trapQuote.breakdown.totalPassengersConservativePayableInr
        )} after mandatory fees—whereas ${winnerQuote.quote.providerName} totals ${formatInr(
          winnerQuote.breakdown.totalPassengersConservativePayableInr
        )}.`
      );
    }

    return {
      id: `msg-${Date.now()}`,
      role: 'assistant',
      content: `Advertised fares often show only the stripped-down base tariff (minus teaser promo codes) while deferring mandatory airport fees, GST, gateway convenience charges, and add-on markups to the final checkout step.`,
      bulletPoints: bullets,
      suggestedViewAction: {
        label: 'Inspect Itemized Fare Ledger',
        targetView: 'results',
      },
      footnote:
        'All fee structures shown are realistic Demo Data examples—not live OTA checkout scrapes.',
      timestampIso: new Date().toISOString(),
    };
  }

  // 3. Should I book now or wait? / Forecast / Prediction
  if (
    /\b(book now|wait|when to book|forecast|predict|prediction|trend|rising|falling|stable|3 day|7 day|next week|drop)\b/.test(
      text
    )
  ) {
    const f = ctx.forecast;
    const recIntro =
      f.recommendation === ForecastRecommendation.BOOK_NOW
        ? `Our statistical baseline suggests “Book now” for ${routeLabel}.`
        : f.recommendation === ForecastRecommendation.MONITOR_FARE
        ? `Our statistical baseline suggests “Monitor fare” for ${routeLabel}.`
        : `Our statistical baseline suggests “Compare alternatives” for ${routeLabel}.`;

    return {
      id: `msg-${Date.now()}`,
      role: 'assistant',
      content: `${recIntro} The simulated 30-day corridor trend is classified as “${f.trend}” around today’s ${formatInr(
        f.currentLowestRealFareInr
      )} per-adult lowest real fare.`,
      bulletPoints: [
        `3-Day Estimated Range: ${formatInr(f.range3Day.lowInr)} – ${formatInr(
          f.range3Day.highInr
        )} (median ${formatInr(f.range3Day.medianInr)}).`,
        `7-Day Estimated Range: ${formatInr(f.range7Day.lowInr)} – ${formatInr(
          f.range7Day.highInr
        )} (median ${formatInr(f.range7Day.medianInr)}).`,
        `Statistical Drivers: Holt linear drift of ${f.dailySlopeInr >= 0 ? '+' : ''}${formatInr(
          f.dailySlopeInr
        )}/day, ±${formatInr(f.residualStdDevInr)} residual volatility, and ${
          f.daysUntilDeparture
        } days remaining before departure.`,
      ],
      suggestedViewAction: {
        label: 'Open 7-Day Prediction Chart',
        targetView: 'forecast',
      },
      footnote:
        'Important: Predictions are statistical estimates on Demo Data without access to live airline inventory. Future prices are never guaranteed.',
      timestampIso: new Date().toISOString(),
    };
  }

  // 4. Baggage & Seat Selection costs
  if (/\b(baggage|luggage|bag|bags|suitcase|kg|cabin|check-in|seat|legroom|window|aisle)\b/.test(text)) {
    const sampleFlight = topFlightGroup?.itinerary || ctx.itineraries[0];
    const aero = sampleFlight?.providerQuotes.find((q) => q.providerId === 'aerodirect');
    const yatra = sampleFlight?.providerQuotes.find((q) => q.providerId === 'yatrapulse');

    const aeroBag15 =
      aero?.optionalPricing.baggage.extra_15kg.kind === 'known'
        ? aero.optionalPricing.baggage.extra_15kg.amountInr
        : 1350;
    const yatraBag15 =
      yatra?.optionalPricing.baggage.extra_15kg.kind === 'known'
        ? yatra.optionalPricing.baggage.extra_15kg.amountInr
        : 1580;

    return {
      id: `msg-${Date.now()}`,
      role: 'assistant',
      content: `On ${routeLabel} Demo Data schedules, standard fares already include ${
        sampleFlight?.cabinBagIncludedKg ?? 7
      } kg cabin baggage and ${
        sampleFlight?.checkedBagIncludedKg ?? 15
      } kg check-in baggage per adult. Your current selection is “${
        BAGGAGE_LABELS[ctx.extras.baggage]
      }” and “${SEAT_LABELS[ctx.extras.seat]}.”`,
      bulletPoints: [
        `Extra +15 kg Check-in Baggage ranges from ${formatInr(
          aeroBag15
        )} on AeroDirect up to ${formatInr(yatraBag15)} on YatraPulse per adult.`,
        'Auto-assigned check-in seats cost ₹0, whereas paid Window/Aisle or Extra-Legroom seats add ₹300–₹1,180+ per adult depending on the platform.',
        'Tip: Toggle baggage and seat options in Compare Fares to update all 4 platform totals instantaneously.',
      ],
      suggestedViewAction: {
        label: 'Test Add-ons in Compare Fares',
        targetView: 'results',
      },
      footnote: 'Simulated Demo Data add-on slabs; no live airline ancillary feed is connected.',
      timestampIso: new Date().toISOString(),
    };
  }

  // 5. How can I save money on this trip?
  if (/\b(save|saving|savings|money|tips|cheaper|reduce|budget|lower cost|best value)\b/.test(text)) {
    const maxSpread =
      topFlightGroup && cheapestOverall
        ? Math.max(
            0,
            topFlightGroup.highestConservativeOnFlightInr * ctx.query.passengers -
              cheapestOverall.breakdown.totalPassengersConservativePayableInr
          )
        : 450;

    const currentOptionalPerPax =
      cheapestOverall?.breakdown.optionalConservativeSubtotalInr ?? 0;

    const suggestedTarget = Math.max(
      1800,
      Math.round(
        (Math.min(ctx.forecast.currentLowestRealFareInr, ctx.forecast.range7Day.lowInr) - 50) / 10
      ) * 10
    );

    const bullets: string[] = [
      `Compare Real Totals, Not Teasers: On ${routeLabel}, picking ${
        cheapestOverall?.quote.providerName ?? 'ClearWing'
      } (${formatInr(
        cheapestOverall?.breakdown.totalPassengersConservativePayableInr ?? 5097
      )}) instead of the highest checkout quote saves up to ${formatInr(maxSpread)}.`,
      currentOptionalPerPax > 0
        ? `Review Optional Add-ons: Your active baggage/seat selection adds ${formatInr(
            currentOptionalPerPax * ctx.query.passengers
          )}. Using the included 15 kg check-in bag and ₹0 auto-assigned seat lowers your total immediately.`
        : 'Pack Within Included Allowance: Standard 15 kg check-in + 7 kg cabin baggage and auto-assigned check-in seats cost ₹0 across audited flights.',
      `Set a Target Fare Alert: Save ${routeLabel} in the Price Tracker around ${formatInr(
        suggestedTarget
      )}/adult to watch for dips before booking.`,
    ];

    if (ctx.itineraries.some((i) => i.stops > 0)) {
      const oneStopGroup = comparison.groups.find((g) => g.itinerary.stops > 0);
      const nonStopGroups = comparison.groups.filter((g) => g.itinerary.stops === 0);
      if (oneStopGroup && nonStopGroups.length > 0) {
        const bestNonStop = nonStopGroups[0].bestQuoteForFlight;
        const diff =
          bestNonStop.breakdown.totalPassengersConservativePayableInr -
          oneStopGroup.bestQuoteForFlight.breakdown.totalPassengersConservativePayableInr;
        if (diff > 0) {
          bullets.push(
            `Flexible Schedule Option: The 1-stop ${oneStopGroup.itinerary.airlineName} flight (${formatDuration(
              oneStopGroup.itinerary.durationMinutes
            )}) saves ${formatInr(diff)} compared to the cheapest non-stop option.`
          );
        }
      }
    }

    return {
      id: `msg-${Date.now()}`,
      role: 'assistant',
      content: `Here are the highest-impact ways to reduce your real payable fare on ${routeLabel} (${paxLabel}):`,
      bulletPoints: bullets,
      suggestedViewAction: {
        label: 'Set Target Alert in Price Tracker',
        targetView: 'tracker',
      },
      footnote:
        'Savings figures are calculated from Skysync’s Demo Data schedules; future discounts are estimates and not guaranteed.',
      timestampIso: new Date().toISOString(),
    };
  }

  // 6. Fastest / Non-stop / Duration questions
  if (/\b(fastest|quickest|shortest|duration|long|hours|non-stop|nonstop|direct|stops)\b/.test(text)) {
    const byDuration = [...comparison.groups].sort(
      (a, b) => a.itinerary.durationMinutes - b.itinerary.durationMinutes
    );
    const fastest = byDuration[0];
    if (fastest) {
      return {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: `The shortest flight on ${routeLabel} is ${fastest.itinerary.airlineName} (${
          fastest.itinerary.flightNumber
        }) at ${formatDuration(fastest.itinerary.durationMinutes)} (${
          fastest.itinerary.stops === 0 ? 'Non-stop' : `${fastest.itinerary.stops} stop`
        }), departing ${fastest.itinerary.departureTime24}.`,
        bulletPoints: [
          `Lowest real payable fare on this flight: ${formatInr(
            fastest.bestQuoteForFlight.breakdown.totalPassengersConservativePayableInr
          )} (${paxLabel}) via ${fastest.bestQuoteForFlight.quote.providerName}.`,
          `Overall cheapest flight on this route: ${
            cheapestOverall?.itinerary.flightNumber
          } at ${formatInr(
            cheapestOverall?.breakdown.totalPassengersConservativePayableInr ?? 0
          )} (${formatDuration(cheapestOverall?.itinerary.durationMinutes ?? 0)}).`,
        ],
        suggestedViewAction: {
          label: 'Sort by Shortest Duration',
          targetView: 'results',
        },
        footnote: 'Simulated Demo Data schedules.',
        timestampIso: new Date().toISOString(),
      };
    }
  }

  // 7. Price tracking / alerts / local storage
  if (/\b(track|tracker|alert|alerts|target|notification|simulate)\b/.test(text)) {
    const metCount = ctx.trackedJourneys.filter(
      (j) => j.alertsEnabled && j.currentObservedInr <= j.targetPriceInr
    ).length;

    return {
      id: `msg-${Date.now()}`,
      role: 'assistant',
      content: `You currently have ${ctx.trackedJourneys.length} saved route${
        ctx.trackedJourneys.length === 1 ? '' : 's'
      } in your browser’s Price Tracker (${metCount} currently meeting target).`,
      bulletPoints: [
        'Tracked journeys are stored in localStorage so your target fares survive page refreshes.',
        'In the Price Tracker tab, click “Simulate price update” on any route to test a simulated fare drop and trigger a target alert.',
      ],
      suggestedViewAction: {
        label: 'Open Smart Price Tracker',
        targetView: 'tracker',
      },
      footnote: 'Price checks in this prototype are simulated Demo Data updates, not live airline polling.',
      timestampIso: new Date().toISOString(),
    };
  }

  // 8. Live vs Demo Data / Booking directly / About Skysync
  if (/\b(live|real|demo|simulated|book directly|booking|what is skysync|hello|hi|help)\b/.test(text)) {
    return {
      id: `msg-${Date.now()}`,
      role: 'assistant',
      content: `Skysync is a transparent airfare comparison and timing prototype currently analyzing ${routeLabel}. All flight schedules, cross-platform fees, and 3/7-day forecasts run on deterministic Demo Data—I do not have access to live airline prices or process real ticket bookings.`,
      bulletPoints: [
        'Ask me: “Which flight is cheapest overall?”',
        'Ask me: “Why is the final fare higher than advertised?”',
        'Ask me: “Should I book now or wait?” or “How can I save money on this trip?”',
      ],
      footnote: 'Rule-based hackathon assistant — no paid external AI APIs or live GDS keys required.',
      timestampIso: new Date().toISOString(),
    };
  }

  // 9. Honest fallback when question is unrecognized or ambiguous
  return {
    id: `msg-${Date.now()}`,
    role: 'assistant',
    content: `I don’t have enough reliable information to answer that question directly without guessing. I can only analyze your searched route (${routeLabel}), itemized Demo Data fare breakdowns, baggage/seat add-ons, 3- and 7-day statistical fare estimates, and saved price alerts.`,
    bulletPoints: [
      `Current route lowest real total (${paxLabel}): ${formatInr(
        cheapestOverall?.breakdown.totalPassengersConservativePayableInr ??
          ctx.forecast.currentLowestRealFareInr
      )} via ${cheapestOverall?.quote.providerName ?? 'ClearWing'}.`,
      `Current 7-day statistical guidance: “${ctx.forecast.recommendation}” (${ctx.forecast.trend} trend).`,
      'Try one of the suggested questions above to inspect hidden fees, baggage costs, or booking timing.',
    ],
    footnote:
      'Predictions are statistical estimates on simulated Demo Data; Skysync does not access live airline prices.',
    timestampIso: new Date().toISOString(),
  };
}

function checkUnloadedRouteMention(lowerPrompt: string, currentQuery: SearchQuery): string | null {
  const cityChecks: { code: string; names: string[] }[] = [
    { code: 'RPR', names: ['raipur', 'rpr'] },
    { code: 'DEL', names: ['delhi', 'new delhi', 'del'] },
    { code: 'BOM', names: ['mumbai', 'bombay', 'bom'] },
    { code: 'BLR', names: ['bengaluru', 'bangalore', 'blr'] },
    { code: 'HYD', names: ['hyderabad', 'hyd'] },
    { code: 'CCU', names: ['kolkata', 'calcutta', 'ccu'] },
    { code: 'MAA', names: ['chennai', 'maa'] },
    { code: 'PNQ', names: ['pune', 'pnq'] },
    { code: 'GOI', names: ['goa', 'goi'] },
    { code: 'AMD', names: ['ahmedabad', 'amd'] },
    { code: 'COK', names: ['kochi', 'cochin', 'cok'] },
    { code: 'JAI', names: ['jaipur', 'jai'] },
  ];

  const mentioned = cityChecks.filter((c) =>
    c.names.some((nm) => new RegExp(`\\b${nm}\\b`, 'i').test(lowerPrompt))
  );

  const foreignMentions = mentioned.filter(
    (m) => m.code !== currentQuery.originCode && m.code !== currentQuery.destinationCode
  );

  if (foreignMentions.length > 0) {
    return foreignMentions
      .map((m) => getCityByCode(m.code)?.city || m.code)
      .join(' / ');
  }
  return null;
}
