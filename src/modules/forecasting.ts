import {
  type FareForecastResult,
  type ForecastChartPoint,
  ForecastRecommendation,
  type HistoricalFareObservation,
  TrendClassification,
} from '../types/travel';
import { formatInr } from './fareCalculator';

function formatShortDate(yyyyMmDd: string): string {
  const [y, m, d] = yyyyMmDd.split('-').map(Number);
  const dt = new Date(y, (m || 1) - 1, d || 1);
  return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

function addDaysIso(yyyyMmDd: string, daysToAdd: number): string {
  const [y, m, d] = yyyyMmDd.split('-').map(Number);
  const dt = new Date(y, (m || 1) - 1, d || 1);
  dt.setDate(dt.getDate() + daysToAdd);
  const yyyy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Statistical Fare Forecasting Baseline using Holt's Linear Exponential Smoothing
 * + Historical Residual Volatility Bands.
 *
 * Strictly adheres to honest forecasting rules:
 * - Never invents accuracy percentages
 * - Never guarantees future prices
 * - Explicitly surfaces horizon-widening uncertainty intervals
 */
export function generateStatisticalFareForecast(params: {
  originCode: string;
  destinationCode: string;
  departureDate: string;
  historicalSeries: HistoricalFareObservation[];
}): FareForecastResult {
  const { originCode, destinationCode, departureDate, historicalSeries } = params;
  const series = historicalSeries.length > 0
    ? historicalSeries
    : [{ date: departureDate, observedLowestTotalInr: 5000 }];

  const values = series.map((p) => p.observedLowestTotalInr);
  const n = values.length;
  const currentFare = values[n - 1];

  const historicalMinInr = Math.min(...values);
  const historicalMaxInr = Math.max(...values);
  const historicalMeanInr = Math.round(values.reduce((acc, v) => acc + v, 0) / n);

  const sortedVals = [...values].sort((a, b) => a - b);
  const rankIdx = sortedVals.findIndex((v) => v >= currentFare);
  const farePercentile = Math.round(((rankIdx === -1 ? n : rankIdx + 1) / n) * 100);

  // Holt's Double Exponential Smoothing (level alpha = 0.40, trend beta = 0.24)
  const alpha = 0.4;
  const beta = 0.24;
  let level = values[0];
  let trendSlope = n > 1 ? (values[Math.min(4, n - 1)] - values[0]) / Math.min(4, n - 1) : 0;
  const residuals: number[] = [];

  for (let t = 1; t < n; t++) {
    const oneStepPred = level + trendSlope;
    residuals.push(values[t] - oneStepPred);
    const prevLevel = level;
    level = alpha * values[t] + (1 - alpha) * (level + trendSlope);
    trendSlope = beta * (level - prevLevel) + (1 - beta) * trendSlope;
  }

  // Residual standard deviation (minimum floor so intervals are never artificially zero-width)
  const variance =
    residuals.length > 1
      ? residuals.reduce((acc, r) => acc + r * r, 0) / (residuals.length - 1)
      : Math.pow(currentFare * 0.04, 2);
  const residualStdDevInr = Math.max(120, Math.round(Math.sqrt(variance)));

  // Days until departure (advance-purchase curve pressure within 10 days of flight)
  const todayIso = series[n - 1].date;
  const daysUntilDeparture = Math.max(
    0,
    Math.round(
      (new Date(departureDate).getTime() - new Date(todayIso).getTime()) / (1000 * 60 * 60 * 24)
    )
  );

  // Near-departure booking pressure adjustment
  const proximityLiftPerDay =
    daysUntilDeparture <= 5 ? 65 : daysUntilDeparture <= 10 ? 28 : 0;
  const adjustedDailySlope = trendSlope + proximityLiftPerDay;

  const projectHorizon = (h: number) => {
    // Dampen slope slightly at longer horizons so linear extrapolation stays realistic
    const damping = Math.pow(0.92, h - 1);
    const median = Math.max(
      Math.round(historicalMinInr * 0.85),
      Math.round((currentFare + adjustedDailySlope * h * damping) / 10) * 10
    );
    // 80% empirical prediction interval widens proportionally to sqrt(h)
    const halfWidth = Math.round(1.28 * residualStdDevInr * Math.sqrt(h * 0.72));
    return {
      lowInr: Math.max(1800, Math.round((median - halfWidth) / 10) * 10),
      medianInr: median,
      highInr: Math.round((median + halfWidth) / 10) * 10,
    };
  };

  const band3 = projectHorizon(3);
  const band7 = projectHorizon(7);

  // Trend classification relative to volatility
  const normalizedSlope = adjustedDailySlope / Math.max(1, currentFare);
  let trend: TrendClassification;
  if (normalizedSlope > 0.0038 || adjustedDailySlope >= 18) {
    trend = TrendClassification.RISING;
  } else if (normalizedSlope < -0.0035 || adjustedDailySlope <= -16) {
    trend = TrendClassification.POTENTIALLY_FALLING;
  } else {
    trend = TrendClassification.STABLE;
  }

  // Cautious recommendation logic
  let recommendation: ForecastRecommendation;
  if (daysUntilDeparture <= 5 || (trend === TrendClassification.RISING && farePercentile <= 78)) {
    recommendation = ForecastRecommendation.BOOK_NOW;
  } else if (farePercentile >= 82 && daysUntilDeparture > 7) {
    recommendation = ForecastRecommendation.COMPARE_ALTERNATIVES;
  } else if (trend === TrendClassification.POTENTIALLY_FALLING && daysUntilDeparture >= 7) {
    recommendation = ForecastRecommendation.MONITOR_FARE;
  } else if (trend === TrendClassification.RISING && farePercentile > 78) {
    recommendation = ForecastRecommendation.COMPARE_ALTERNATIVES;
  } else {
    recommendation =
      farePercentile <= 35
        ? ForecastRecommendation.BOOK_NOW
        : ForecastRecommendation.MONITOR_FARE;
  }

  // Transparent reasoning bullets grounded in calculated figures
  const reasoningPoints: string[] = [
    `Holt’s double exponential smoothing across ${n} daily Demo Data observations shows a ${
      adjustedDailySlope >= 0 ? '+' : ''
    }${formatInr(adjustedDailySlope)}/day directional drift (residual volatility ±${formatInr(
      residualStdDevInr
    )}).`,
    `Today’s lowest real payable fare (${formatInr(
      currentFare
    )}) sits at the ${farePercentile}th percentile of the 30-day observed corridor range (${formatInr(
      historicalMinInr
    )}–${formatInr(historicalMaxInr)}).`,
    daysUntilDeparture <= 7
      ? `Departure is ${daysUntilDeparture} day${
          daysUntilDeparture === 1 ? '' : 's'
        } away, where airline advance-purchase inventory buckets typically tighten rather than discount.`
      : `With ${daysUntilDeparture} days before departure, the 3-day (${formatInr(
          band3.lowInr
        )}–${formatInr(band3.highInr)}) and 7-day (${formatInr(band7.lowInr)}–${formatInr(
          band7.highInr
        )}) intervals reflect historical corridor variance.`,
  ];

  if (recommendation === ForecastRecommendation.COMPARE_ALTERNATIVES) {
    reasoningPoints.push(
      `Current quotes sit near the upper end of recent observations; checking adjacent travel dates or 1-stop itineraries may yield lower real totals.`
    );
  } else if (recommendation === ForecastRecommendation.MONITOR_FARE) {
    reasoningPoints.push(
      `Recent momentum is ${trend.toLowerCase()} with moderate volatility; setting a target alert in the Price Tracker lets you watch for dips without overpaying.`
    );
  } else {
    reasoningPoints.push(
      `Waiting carries asymmetric upside cost risk relative to limited historical downside below ${formatInr(
        historicalMinInr
      )}.`
    );
  }

  // Build unified chart series (last 21 historical days + 7-day forecast horizon for crisp readability)
  const visibleHistorical = series.slice(Math.max(0, n - 21));
  const chartSeries: ForecastChartPoint[] = visibleHistorical.map((pt, idx) => {
    const isLastHistorical = idx === visibleHistorical.length - 1;
    return {
      date: pt.date,
      displayDate: formatShortDate(pt.date),
      historicalFareInr: pt.observedLowestTotalInr,
      forecastMedianInr: isLastHistorical ? pt.observedLowestTotalInr : null,
      forecastBand: isLastHistorical
        ? [pt.observedLowestTotalInr, pt.observedLowestTotalInr]
        : null,
      forecastLowInr: isLastHistorical ? pt.observedLowestTotalInr : null,
      forecastHighInr: isLastHistorical ? pt.observedLowestTotalInr : null,
      kind: isLastHistorical ? 'bridge' : 'historical',
    };
  });

  for (let h = 1; h <= 7; h++) {
    const fDate = addDaysIso(todayIso, h);
    const band = projectHorizon(h);
    chartSeries.push({
      date: fDate,
      displayDate: `+${h}d (${formatShortDate(fDate)})`,
      historicalFareInr: null,
      forecastMedianInr: band.medianInr,
      forecastBand: [band.lowInr, band.highInr],
      forecastLowInr: band.lowInr,
      forecastHighInr: band.highInr,
      kind: 'forecast',
    });
  }

  return {
    routeKey: `${originCode}-${destinationCode}`,
    originCode,
    destinationCode,
    departureDate,
    daysUntilDeparture,
    sampleCount: n,
    currentLowestRealFareInr: currentFare,
    historicalMinInr,
    historicalMaxInr,
    historicalMeanInr,
    farePercentile,
    dailySlopeInr: Math.round(adjustedDailySlope),
    residualStdDevInr,
    range3Day: { horizonDays: 3, ...band3 },
    range7Day: { horizonDays: 7, ...band7 },
    trend,
    recommendation,
    reasoningPoints,
    uncertaintyNotice:
      'Simulated Demo Forecast: Intervals represent an 80% statistical prediction band from Holt’s linear exponential smoothing on 30-day sample data. Sudden seat-bucket closures, holiday surges, or airline sales can move actual fares outside these bounds. Future prices are never guaranteed.',
    methodologyLabel: 'Holt Linear Smoothing · Demo Data Baseline',
    chartSeries,
  };
}
