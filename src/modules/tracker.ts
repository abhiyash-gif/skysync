import { getCityByCode, getDefaultFutureDate } from '../data/sampleData';
import {
  type OptionalExtrasSelection,
  type TrackedJourney,
  type TrackedPricePoint,
  type TripType,
  VerificationLabel,
} from '../types/travel';

const STORAGE_KEY = 'skysync_tracked_journeys_v1';

function formatCheckLabel(date: Date): string {
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export function createInitialDemoTrackedJourneys(): TrackedJourney[] {
  const now = new Date();
  const dayMinus4 = new Date(now.getTime() - 4 * 86400000);
  const dayMinus3 = new Date(now.getTime() - 3 * 86400000);
  const dayMinus2 = new Date(now.getTime() - 2 * 86400000);
  const dayMinus1 = new Date(now.getTime() - 1 * 86400000);

  return [
    {
      id: 'demo-rpr-del',
      originCode: 'RPR',
      originCity: 'Raipur',
      destinationCode: 'DEL',
      destinationCity: 'Delhi',
      departureDate: getDefaultFutureDate(14),
      tripType: 'one_way',
      passengers: 1,
      extras: { baggage: 'cabin_only', seat: 'auto_free' },
      targetPriceInr: 4950,
      alertsEnabled: true,
      createdAtIso: dayMinus4.toISOString(),
      lastCheckedAtIso: now.toISOString(),
      currentObservedInr: 5080,
      initialObservedInr: 5420,
      bestProviderName: 'ClearWing',
      verificationLabel: VerificationLabel.DEMO_DATA,
      priceHistory: [
        {
          observedAtIso: dayMinus4.toISOString(),
          dateLabel: formatCheckLabel(dayMinus4),
          totalPayableInr: 5420,
          source: 'demo_seed',
        },
        {
          observedAtIso: dayMinus3.toISOString(),
          dateLabel: formatCheckLabel(dayMinus3),
          totalPayableInr: 5310,
          source: 'demo_seed',
        },
        {
          observedAtIso: dayMinus2.toISOString(),
          dateLabel: formatCheckLabel(dayMinus2),
          totalPayableInr: 5260,
          source: 'demo_seed',
        },
        {
          observedAtIso: dayMinus1.toISOString(),
          dateLabel: formatCheckLabel(dayMinus1),
          totalPayableInr: 5150,
          source: 'demo_seed',
        },
        {
          observedAtIso: now.toISOString(),
          dateLabel: formatCheckLabel(now),
          totalPayableInr: 5080,
          source: 'demo_seed',
        },
      ],
    },
    {
      id: 'demo-bom-blr',
      originCode: 'BOM',
      originCity: 'Mumbai',
      destinationCode: 'BLR',
      destinationCity: 'Bengaluru',
      departureDate: getDefaultFutureDate(21),
      tripType: 'one_way',
      passengers: 1,
      extras: { baggage: 'cabin_only', seat: 'standard_choice' },
      targetPriceInr: 4550,
      alertsEnabled: true,
      createdAtIso: dayMinus3.toISOString(),
      lastCheckedAtIso: now.toISOString(),
      currentObservedInr: 4490,
      initialObservedInr: 4820,
      bestProviderName: 'AeroDirect',
      verificationLabel: VerificationLabel.DEMO_DATA,
      priceHistory: [
        {
          observedAtIso: dayMinus3.toISOString(),
          dateLabel: formatCheckLabel(dayMinus3),
          totalPayableInr: 4820,
          source: 'demo_seed',
        },
        {
          observedAtIso: dayMinus2.toISOString(),
          dateLabel: formatCheckLabel(dayMinus2),
          totalPayableInr: 4710,
          source: 'demo_seed',
        },
        {
          observedAtIso: dayMinus1.toISOString(),
          dateLabel: formatCheckLabel(dayMinus1),
          totalPayableInr: 4620,
          source: 'demo_seed',
        },
        {
          observedAtIso: now.toISOString(),
          dateLabel: formatCheckLabel(now),
          totalPayableInr: 4490,
          source: 'demo_seed',
        },
      ],
    },
  ];
}

export function loadTrackedJourneys(): TrackedJourney[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initial = createInitialDemoTrackedJourneys();
      saveTrackedJourneys(initial);
      return initial;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      const initial = createInitialDemoTrackedJourneys();
      saveTrackedJourneys(initial);
      return initial;
    }
    return parsed as TrackedJourney[];
  } catch {
    return createInitialDemoTrackedJourneys();
  }
}

export function saveTrackedJourneys(journeys: TrackedJourney[]): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(journeys));
  } catch {
    // Ignore storage quota errors in restricted frames
  }
}

export function addOrUpdateTrackedJourney(
  existing: TrackedJourney[],
  input: {
    originCode: string;
    destinationCode: string;
    departureDate: string;
    returnDate?: string;
    tripType: TripType;
    passengers: number;
    extras: OptionalExtrasSelection;
    currentObservedInr: number;
    targetPriceInr: number;
    bestProviderName: string;
  }
): { updated: TrackedJourney[]; journey: TrackedJourney; isNew: boolean } {
  const now = new Date();
  const originCity = getCityByCode(input.originCode)?.city || input.originCode;
  const destinationCity = getCityByCode(input.destinationCode)?.city || input.destinationCode;

  const matchIdx = existing.findIndex(
    (j) =>
      j.originCode === input.originCode &&
      j.destinationCode === input.destinationCode &&
      j.departureDate === input.departureDate &&
      j.tripType === input.tripType
  );

  if (matchIdx >= 0) {
    const current = existing[matchIdx];
    const point: TrackedPricePoint = {
      observedAtIso: now.toISOString(),
      dateLabel: formatCheckLabel(now),
      totalPayableInr: input.currentObservedInr,
      source: 'user_saved',
    };
    const merged: TrackedJourney = {
      ...current,
      passengers: input.passengers,
      extras: input.extras,
      targetPriceInr: input.targetPriceInr,
      alertsEnabled: true,
      lastCheckedAtIso: now.toISOString(),
      currentObservedInr: input.currentObservedInr,
      bestProviderName: input.bestProviderName,
      priceHistory: [...current.priceHistory.slice(-14), point],
    };
    const updated = [...existing];
    updated[matchIdx] = merged;
    saveTrackedJourneys(updated);
    return { updated, journey: merged, isNew: false };
  }

  const newJourney: TrackedJourney = {
    id: `trk-${input.originCode.toLowerCase()}-${input.destinationCode.toLowerCase()}-${Date.now()}`,
    originCode: input.originCode,
    originCity,
    destinationCode: input.destinationCode,
    destinationCity,
    departureDate: input.departureDate,
    returnDate: input.returnDate,
    tripType: input.tripType,
    passengers: input.passengers,
    extras: input.extras,
    targetPriceInr: input.targetPriceInr,
    alertsEnabled: true,
    createdAtIso: now.toISOString(),
    lastCheckedAtIso: now.toISOString(),
    currentObservedInr: input.currentObservedInr,
    initialObservedInr: input.currentObservedInr,
    bestProviderName: input.bestProviderName,
    verificationLabel: VerificationLabel.DEMO_DATA,
    priceHistory: [
      {
        observedAtIso: new Date(now.getTime() - 86400000).toISOString(),
        dateLabel: formatCheckLabel(new Date(now.getTime() - 86400000)),
        totalPayableInr: Math.round((input.currentObservedInr * 1.04) / 10) * 10,
        source: 'demo_seed',
      },
      {
        observedAtIso: now.toISOString(),
        dateLabel: formatCheckLabel(now),
        totalPayableInr: input.currentObservedInr,
        source: 'user_saved',
      },
    ],
  };

  const updated = [newJourney, ...existing];
  saveTrackedJourneys(updated);
  return { updated, journey: newJourney, isNew: true };
}

/**
 * Simulates a clearly labelled market fare observation for a tracked journey.
 * Designed for deterministic, reliable live demonstration:
 * - If currentObservedInr > targetPriceInr, steps down realistically so the user can observe
 *   target-price alert activation cleanly.
 * - If already at or below target, simulates a realistic small market movement.
 */
export function simulateTrackedJourneyUpdate(
  existing: TrackedJourney[],
  journeyId: string
): {
  updated: TrackedJourney[];
  updatedJourney: TrackedJourney | null;
  newlyTriggeredAlert: boolean;
} {
  const idx = existing.findIndex((j) => j.id === journeyId);
  if (idx === -1) {
    return { updated: existing, updatedJourney: null, newlyTriggeredAlert: false };
  }

  const targetItem = existing[idx];
  const wasMeetingTarget =
    targetItem.alertsEnabled && targetItem.currentObservedInr <= targetItem.targetPriceInr;

  const now = new Date();
  let nextPrice: number;

  if (targetItem.currentObservedInr > targetItem.targetPriceInr) {
    const gap = targetItem.currentObservedInr - targetItem.targetPriceInr;
    // If within ₹450 of target, drop slightly below target so alert triggers smoothly during demo;
    // otherwise drop by ~55% of the remaining gap (at least ₹180).
    if (gap <= 450) {
      nextPrice = Math.max(1800, targetItem.targetPriceInr - 60);
    } else {
      const stepDown = Math.max(190, Math.round((gap * 0.58) / 10) * 10);
      nextPrice = Math.max(1800, targetItem.currentObservedInr - stepDown);
    }
  } else {
    // Already met target: simulate realistic minor market oscillation while keeping history rich
    const stepCount = targetItem.priceHistory.length;
    const delta = stepCount % 2 === 0 ? -50 : 90;
    nextPrice = Math.max(1800, targetItem.currentObservedInr + delta);
  }

  const newPoint: TrackedPricePoint = {
    observedAtIso: now.toISOString(),
    dateLabel: `${formatCheckLabel(now)} (Sim)`,
    totalPayableInr: nextPrice,
    source: 'simulated_update',
  };

  const updatedJourney: TrackedJourney = {
    ...targetItem,
    lastCheckedAtIso: now.toISOString(),
    currentObservedInr: nextPrice,
    priceHistory: [...targetItem.priceHistory.slice(-15), newPoint],
  };

  const nowMeetingTarget =
    updatedJourney.alertsEnabled &&
    updatedJourney.currentObservedInr <= updatedJourney.targetPriceInr;

  const updated = [...existing];
  updated[idx] = updatedJourney;
  saveTrackedJourneys(updated);

  return {
    updated,
    updatedJourney,
    newlyTriggeredAlert: !wasMeetingTarget && nowMeetingTarget,
  };
}

export function getActiveTargetAlerts(journeys: TrackedJourney[]): TrackedJourney[] {
  return journeys.filter((j) => j.alertsEnabled && j.currentObservedInr <= j.targetPriceInr);
}
