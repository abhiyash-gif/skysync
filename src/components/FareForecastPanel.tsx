import {
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BellPlus,
  Check,
  Info,
  Minus,
} from 'lucide-react';
import { useState } from 'react';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { BENCHMARK_CORRIDORS, getCityByCode } from '../data/sampleData';
import { formatInr } from '../modules/fareCalculator';
import {
  type FareForecastResult,
  ForecastRecommendation,
  TrendClassification,
} from '../types/travel';

interface FareForecastPanelProps {
  forecast: FareForecastResult;
  onSelectCorridor?: (originCode: string, destinationCode: string) => void;
  onSaveToTracker: (suggestedTargetInr: number) => void;
  standalone?: boolean;
}

export function FareForecastPanel({
  forecast,
  onSelectCorridor,
  onSaveToTracker,
  standalone = false,
}: FareForecastPanelProps) {
  const [savedNotice, setSavedNotice] = useState(false);

  const originCity = getCityByCode(forecast.originCode)?.city || forecast.originCode;
  const destinationCity =
    getCityByCode(forecast.destinationCode)?.city || forecast.destinationCode;

  const suggestedTargetInr = Math.max(
    1800,
    Math.round((Math.min(forecast.currentLowestRealFareInr, forecast.range7Day.lowInr) - 50) / 10) *
      10
  );

  // Transform forecastBand into base + delta for clean Recharts stacked confidence band rendering
  const chartData = forecast.chartSeries.map((pt) => {
    const low = pt.forecastLowInr;
    const high = pt.forecastHighInr;
    return {
      ...pt,
      bandBase: low !== null ? low : null,
      bandSpan: low !== null && high !== null ? Math.max(0, high - low) : null,
    };
  });

  const handleSaveTarget = () => {
    onSaveToTracker(suggestedTargetInr);
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2500);
  };

  const renderTrendIcon = () => {
    if (forecast.trend === TrendClassification.RISING) {
      return <ArrowUpRight className="w-4 h-4 text-amber-700 shrink-0" />;
    }
    if (forecast.trend === TrendClassification.POTENTIALLY_FALLING) {
      return <ArrowDownRight className="w-4 h-4 text-emerald-700 shrink-0" />;
    }
    return <Minus className="w-4 h-4 text-slate-600 shrink-0" />;
  };

  return (
    <section
      aria-label="Statistical fare forecasting"
      className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-7 space-y-6"
    >
      {/* Header & Optional Corridor Switcher */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-200">
        <div>
          <div className="text-xs text-slate-500">
            <span className="font-medium text-slate-700">{forecast.methodologyLabel}</span>
            <span className="mx-1.5" aria-hidden="true">·</span>
            <span>Simulated Predictions (Demo Data)</span>
          </div>
          <h2 className="font-display text-xl sm:text-2xl font-bold text-slate-900 mt-1">
            Fare Trend &amp; 7-Day Outlook: {originCity} ({forecast.originCode}) →{' '}
            {destinationCity} ({forecast.destinationCode})
          </h2>
        </div>

        {standalone && onSelectCorridor && (
          <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg">
            {BENCHMARK_CORRIDORS.map((c) => {
              const active =
                c.originCode === forecast.originCode &&
                c.destinationCode === forecast.destinationCode;
              return (
                <button
                  key={`${c.originCode}-${c.destinationCode}`}
                  type="button"
                  onClick={() => onSelectCorridor(c.originCode, c.destinationCode)}
                  className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    active
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {c.originCode} → {c.destinationCode}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 4-Column Quantitative Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-slate-200 border border-slate-200 rounded-xl overflow-hidden">
        <div className="bg-white p-4">
          <div className="text-xs text-slate-500">Current Lowest Real Fare (1 pax)</div>
          <div className="font-mono text-xl font-semibold text-slate-900 tabular-nums mt-1">
            {formatInr(forecast.currentLowestRealFareInr)}
          </div>
          <div className="text-xs text-slate-500 mt-1 tabular-nums">
            30d range: {formatInr(forecast.historicalMinInr)}–{formatInr(forecast.historicalMaxInr)}
          </div>
        </div>

        <div className="bg-white p-4">
          <div className="text-xs text-slate-500">Estimated Next 3 Days</div>
          <div className="font-mono text-lg font-semibold text-slate-900 tabular-nums mt-1">
            {formatInr(forecast.range3Day.lowInr)} – {formatInr(forecast.range3Day.highInr)}
          </div>
          <div className="text-xs text-slate-500 mt-1 tabular-nums">
            Baseline median: {formatInr(forecast.range3Day.medianInr)}
          </div>
        </div>

        <div className="bg-white p-4">
          <div className="text-xs text-slate-500">Estimated Next 7 Days</div>
          <div className="font-mono text-lg font-semibold text-slate-900 tabular-nums mt-1">
            {formatInr(forecast.range7Day.lowInr)} – {formatInr(forecast.range7Day.highInr)}
          </div>
          <div className="text-xs text-slate-500 mt-1 tabular-nums">
            Baseline median: {formatInr(forecast.range7Day.medianInr)}
          </div>
        </div>

        <div className="bg-slate-50/80 p-4">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Trend &amp; Guidance</span>
            <span className="inline-flex items-center gap-1 font-medium text-slate-800">
              {renderTrendIcon()}
              <span>{forecast.trend}</span>
            </span>
          </div>
          <div
            className={`font-display text-lg font-bold mt-1 ${
              forecast.recommendation === ForecastRecommendation.BOOK_NOW
                ? 'text-blue-700'
                : forecast.recommendation === ForecastRecommendation.MONITOR_FARE
                ? 'text-emerald-800'
                : 'text-amber-800'
            }`}
          >
            {forecast.recommendation}
          </div>
          <div className="text-xs text-slate-500 mt-1 tabular-nums">
            Drift: {forecast.dailySlopeInr >= 0 ? '+' : ''}
            {formatInr(forecast.dailySlopeInr)}/day · ±{formatInr(forecast.residualStdDevInr)}
          </div>
        </div>
      </div>

      {/* Historical + 3/7-Day Forecast Confidence Band Chart */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3 text-xs text-slate-500">
          <span>
            21-Day Historical Demo Fares + 7-Day Statistical Prediction Interval (INR)
          </span>
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-slate-900 inline-block" />
              <span>Observed Demo History</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-blue-600 inline-block" />
              <span>Projected Median</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-2.5 bg-blue-500/20 border border-blue-400/40 rounded-xs inline-block" />
              <span>80% Uncertainty Band</span>
            </span>
          </div>
        </div>

        <div className="h-72 w-full bg-[#FAFAFA] border border-slate-200/80 rounded-xl p-3">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={chartData}
              margin={{ top: 12, right: 16, left: 4, bottom: 4 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
              <XAxis
                dataKey="displayDate"
                tick={{ fontSize: 11, fill: '#64748B' }}
                tickLine={false}
                axisLine={{ stroke: '#CBD5E1' }}
                interval="preserveStartEnd"
                minTickGap={24}
              />
              <YAxis
                tickFormatter={(v: number) => `₹${Math.round(v / 100) * 100}`}
                tick={{ fontSize: 11, fill: '#64748B' }}
                tickLine={false}
                axisLine={false}
                width={64}
                domain={['auto', 'auto']}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload || payload.length === 0) return null;
                  const pt = payload[0].payload as (typeof chartData)[number];
                  return (
                    <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-md text-xs space-y-1">
                      <div className="font-semibold text-slate-900">{pt.displayDate}</div>
                      {pt.historicalFareInr !== null && (
                        <div className="flex items-center justify-between gap-4 text-slate-700">
                          <span>Observed Demo Fare:</span>
                          <span className="font-mono font-semibold tabular-nums">
                            {formatInr(pt.historicalFareInr)}
                          </span>
                        </div>
                      )}
                      {pt.kind === 'forecast' && pt.forecastMedianInr !== null && (
                        <>
                          <div className="flex items-center justify-between gap-4 text-blue-700">
                            <span>Projected Median:</span>
                            <span className="font-mono font-semibold tabular-nums">
                              {formatInr(pt.forecastMedianInr)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-4 text-slate-600">
                            <span>Estimated Interval:</span>
                            <span className="font-mono tabular-nums">
                              {formatInr(pt.forecastLowInr ?? 0)} –{' '}
                              {formatInr(pt.forecastHighInr ?? 0)}
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  );
                }}
              />
              <ReferenceLine
                y={forecast.currentLowestRealFareInr}
                stroke="#94A3B8"
                strokeDasharray="4 4"
              />
              {/* Stacked transparent base + shaded span renders the exact [low, high] confidence cone */}
              <Area
                type="monotone"
                dataKey="bandBase"
                stackId="confidence"
                stroke="none"
                fill="transparent"
                isAnimationActive={false}
              />
              <Area
                type="monotone"
                dataKey="bandSpan"
                stackId="confidence"
                stroke="#93C5FD"
                strokeWidth={1}
                fill="#3B82F6"
                fillOpacity={0.14}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="historicalFareInr"
                stroke="#0F172A"
                strokeWidth={2}
                dot={{ r: 2.5, fill: '#0F172A' }}
                activeDot={{ r: 4 }}
                connectNulls={false}
              />
              <Line
                type="monotone"
                dataKey="forecastMedianInr"
                stroke="#2563EB"
                strokeWidth={2}
                strokeDasharray="5 4"
                dot={{ r: 3, fill: '#2563EB' }}
                connectNulls={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Reasoning Factors & Uncertainty Disclosure */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2">
        <div className="lg:col-span-7 space-y-2.5">
          <h3 className="text-sm font-semibold text-slate-900">
            Why Skysync Suggests “{forecast.recommendation}”
          </h3>
          <ul className="space-y-2 text-xs sm:text-sm text-slate-600">
            {forecast.reasoningPoints.map((reason, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <ArrowRight className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-1" />
                <span>{reason}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="lg:col-span-5 flex flex-col justify-between bg-[#FAFAFA] border border-slate-200 rounded-xl p-4 space-y-4">
          <div className="flex items-start gap-2.5 text-xs text-slate-600">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-slate-900 mb-0.5">
                Uncertainty &amp; Baseline Limitations
              </div>
              <p className="leading-relaxed">{forecast.uncertaintyNotice}</p>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200 flex items-center justify-between gap-3">
            <div className="text-xs text-slate-600 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span>
                Suggested alert target:{' '}
                <strong className="font-mono text-slate-900 tabular-nums">
                  {formatInr(suggestedTargetInr)}
                </strong>
              </span>
            </div>

            <button
              type="button"
              onClick={handleSaveTarget}
              className={`px-3.5 py-2 text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                savedNotice
                  ? 'bg-emerald-700 text-white'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {savedNotice ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Target Saved</span>
                </>
              ) : (
                <>
                  <BellPlus className="w-3.5 h-3.5" />
                  <span>Set {formatInr(suggestedTargetInr)} Alert</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
