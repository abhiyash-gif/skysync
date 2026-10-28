import {
  type ChargeCertitude,
  type ComputedFareBreakdown,
  type ComputedLineItem,
  type OptionalExtrasSelection,
  type ProviderQuote,
  VerificationLabel,
} from '../types/travel';

/**
 * Formats an integer/float amount in Indian Rupees (en-IN grouping, e.g. ₹12,450).
 */
export function formatInr(amount: number, showPlusSign = false): string {
  const rounded = Math.round(amount);
  const absFormatted = Math.abs(rounded).toLocaleString('en-IN');
  if (rounded < 0) {
    return `-₹${absFormatted}`;
  }
  if (showPlusSign && rounded > 0) {
    return `+₹${absFormatted}`;
  }
  return `₹${absFormatted}`;
}

/**
 * Formats minutes into clean human duration (e.g., 130 -> "2h 10m").
 */
export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m.toString().padStart(2, '0')}m`;
}

/**
 * Resolves a ChargeCertitude object WITHOUT EVER treating unknown charges as zero.
 * - 'known': exact amount for both known subtotal and conservative bound
 * - 'estimated': typical amount for display range, maxInr for conservative bound
 * - 'unknown': flagged as unverified, adds conservativeBufferInr to conservative bound,
 *   and displays "Unverified (Not ₹0)" in the ledger.
 */
function resolveCertitude(certitude: ChargeCertitude): {
  displayText: string;
  knownAmount: number;
  conservativeAmount: number;
  isUnknown: boolean;
  isEstimated: boolean;
  reason?: string;
} {
  if (certitude.kind === 'known') {
    return {
      displayText: certitude.amountInr === 0 ? '₹0 (Included)' : formatInr(certitude.amountInr),
      knownAmount: certitude.amountInr,
      conservativeAmount: certitude.amountInr,
      isUnknown: false,
      isEstimated: false,
    };
  }

  if (certitude.kind === 'estimated') {
    return {
      displayText: `Est. ${formatInr(certitude.minInr)}–${formatInr(certitude.maxInr)}`,
      knownAmount: certitude.typicalInr,
      conservativeAmount: certitude.maxInr,
      isUnknown: false,
      isEstimated: true,
      reason: certitude.basis,
    };
  }

  // certitude.kind === 'unknown' — NEVER treat unknown charges as zero!
  return {
    displayText: `Unverified (Not ₹0 · ~${formatInr(certitude.conservativeBufferInr)} buffer)`,
    knownAmount: 0,
    conservativeAmount: certitude.conservativeBufferInr,
    isUnknown: true,
    isEstimated: false,
    reason: certitude.reason,
  };
}

export const BAGGAGE_LABELS: Record<OptionalExtrasSelection['baggage'], string> = {
  cabin_only: 'Standard Included Allowance',
  extra_15kg: 'Extra +15 kg Check-in Baggage',
  extra_25kg: 'Extra +25 kg Check-in Baggage',
};

export const SEAT_LABELS: Record<OptionalExtrasSelection['seat'], string> = {
  auto_free: 'Auto-Assigned Seat at Check-in',
  standard_choice: 'Standard Window / Aisle Selection',
  extra_legroom: 'Front Row / Extra-Legroom Seat',
};

/**
 * Computes the complete, itemized fare breakdown for a provider quote,
 * selected optional extras, and passenger count.
 */
export function calculateCompleteFare(
  quote: ProviderQuote,
  extras: OptionalExtrasSelection,
  passengers: number
): ComputedFareBreakdown {
  const safePassengers = Math.max(1, Math.min(9, Math.floor(passengers || 1)));
  const unverifiedReasons: string[] = [];

  const convResolved = resolveCertitude(quote.convenienceCharge);
  if (convResolved.reason && (convResolved.isUnknown || convResolved.isEstimated)) {
    unverifiedReasons.push(`Convenience charge: ${convResolved.reason}`);
  }

  const baggageCertitude = quote.optionalPricing.baggage[extras.baggage];
  const baggageResolved = resolveCertitude(baggageCertitude);
  if (
    extras.baggage !== 'cabin_only' &&
    baggageResolved.reason &&
    (baggageResolved.isUnknown || baggageResolved.isEstimated)
  ) {
    unverifiedReasons.push(`Baggage fee: ${baggageResolved.reason}`);
  }

  const seatCertitude = quote.optionalPricing.seat[extras.seat];
  const seatResolved = resolveCertitude(seatCertitude);
  if (
    extras.seat !== 'auto_free' &&
    seatResolved.reason &&
    (seatResolved.isUnknown || seatResolved.isEstimated)
  ) {
    unverifiedReasons.push(`Seat selection: ${seatResolved.reason}`);
  }

  const lineItems: ComputedLineItem[] = [
    {
      id: 'base_fare',
      label: 'Airline Base Fare',
      category: 'mandatory',
      certitude: { kind: 'known', amountInr: quote.baseFareInr },
      displayText: formatInr(quote.baseFareInr),
      numericForKnownSubtotal: quote.baseFareInr,
      numericForConservativeBound: quote.baseFareInr,
      isUnverified: false,
    },
    {
      id: 'taxes_gst',
      label: 'Aviation GST & Statutory Taxes (5%)',
      category: 'mandatory',
      certitude: { kind: 'known', amountInr: quote.taxesGstInr },
      displayText: formatInr(quote.taxesGstInr),
      numericForKnownSubtotal: quote.taxesGstInr,
      numericForConservativeBound: quote.taxesGstInr,
      isUnverified: false,
    },
    {
      id: 'mandatory_airport_fees',
      label: 'Airport UDF, PSF & Aviation Security Fee',
      category: 'mandatory',
      certitude: { kind: 'known', amountInr: quote.mandatoryAirportFeesInr },
      displayText: formatInr(quote.mandatoryAirportFeesInr),
      numericForKnownSubtotal: quote.mandatoryAirportFeesInr,
      numericForConservativeBound: quote.mandatoryAirportFeesInr,
      isUnverified: false,
    },
    {
      id: 'convenience_charge',
      label: 'Platform Convenience & Gateway Fee',
      category: 'mandatory',
      certitude: quote.convenienceCharge,
      displayText: convResolved.displayText,
      numericForKnownSubtotal: convResolved.knownAmount,
      numericForConservativeBound: convResolved.conservativeAmount,
      isUnverified: convResolved.isUnknown,
    },
    {
      id: 'optional_baggage',
      label: BAGGAGE_LABELS[extras.baggage],
      category: 'optional',
      certitude: baggageCertitude,
      displayText: baggageResolved.displayText,
      numericForKnownSubtotal: baggageResolved.knownAmount,
      numericForConservativeBound: baggageResolved.conservativeAmount,
      isUnverified: extras.baggage !== 'cabin_only' && baggageResolved.isUnknown,
    },
    {
      id: 'optional_seat',
      label: SEAT_LABELS[extras.seat],
      category: 'optional',
      certitude: seatCertitude,
      displayText: seatResolved.displayText,
      numericForKnownSubtotal: seatResolved.knownAmount,
      numericForConservativeBound: seatResolved.conservativeAmount,
      isUnverified: extras.seat !== 'auto_free' && seatResolved.isUnknown,
    },
  ];

  if (quote.discountInr > 0) {
    lineItems.push({
      id: 'discount',
      label: quote.discountLabel || 'Platform Instant Fare Discount',
      category: 'discount',
      certitude: { kind: 'known', amountInr: -quote.discountInr },
      displayText: `-${formatInr(quote.discountInr)}`,
      numericForKnownSubtotal: -quote.discountInr,
      numericForConservativeBound: -quote.discountInr,
      isUnverified: false,
    });
  }

  const mandatoryKnownSubtotalInr =
    quote.baseFareInr +
    quote.taxesGstInr +
    quote.mandatoryAirportFeesInr +
    convResolved.knownAmount;

  const mandatoryConservativeSubtotalInr =
    quote.baseFareInr +
    quote.taxesGstInr +
    quote.mandatoryAirportFeesInr +
    convResolved.conservativeAmount;

  const optionalKnownSubtotalInr = baggageResolved.knownAmount + seatResolved.knownAmount;
  const optionalConservativeSubtotalInr =
    baggageResolved.conservativeAmount + seatResolved.conservativeAmount;

  const perPassengerKnownPayableInr = Math.max(
    0,
    mandatoryKnownSubtotalInr + optionalKnownSubtotalInr - quote.discountInr
  );

  const perPassengerConservativePayableInr = Math.max(
    0,
    mandatoryConservativeSubtotalInr + optionalConservativeSubtotalInr - quote.discountInr
  );

  const hasUnknownCharges =
    convResolved.isUnknown ||
    (extras.baggage !== 'cabin_only' && baggageResolved.isUnknown) ||
    (extras.seat !== 'auto_free' && seatResolved.isUnknown);

  const hasEstimatedCharges =
    convResolved.isEstimated ||
    (extras.baggage !== 'cabin_only' && baggageResolved.isEstimated) ||
    (extras.seat !== 'auto_free' && seatResolved.isEstimated);

  // Hidden markup compares real mandatory checkout cost (conservative if unverified) vs advertised teaser price
  const hiddenMarkupOverAdvertisedInr = Math.max(
    0,
    mandatoryConservativeSubtotalInr - quote.discountInr - quote.advertisedPriceInr
  );

  let effectiveVerificationLabel = quote.verificationLabel;
  if (hasUnknownCharges || hasEstimatedCharges) {
    effectiveVerificationLabel = VerificationLabel.ESTIMATED;
  }

  return {
    perPassengerKnownPayableInr,
    perPassengerConservativePayableInr,
    totalPassengersKnownPayableInr: perPassengerKnownPayableInr * safePassengers,
    totalPassengersConservativePayableInr: perPassengerConservativePayableInr * safePassengers,
    mandatoryKnownSubtotalInr,
    mandatoryConservativeSubtotalInr,
    optionalKnownSubtotalInr,
    optionalConservativeSubtotalInr,
    discountInr: quote.discountInr,
    hiddenMarkupOverAdvertisedInr,
    hasUnknownCharges,
    hasEstimatedCharges,
    unverifiedReasons,
    effectiveVerificationLabel,
    lineItems,
  };
}
