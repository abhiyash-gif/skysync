import {
  Bell,
  BellOff,
  CheckCircle2,
  Plus,
  RefreshCw,
  RotateCcw,
  Trash2,
  TrendingDown,
} from 'lucide-react';
import React, { useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { getDefaultFutureDate, getTodayDateString, INDIAN_CITIES } from '../data/sampleData';
import { BAGGAGE_LABELS, formatInr } from '../modules/fareCalculator';
import { getActiveTargetAlerts } from '../modules/tracker';
import type { TrackedJourney } from '../types/travel';

interface PriceTrackerDashboardProps {
  journeys: TrackedJourney[];
  onUpdateTarget: (id: string, nextTargetInr: number) => void;
  onToggleAlert: (id: string) => void;
  onSimulateUpdate: (id: string) => void;
  onRemoveJourney: (id: string) => void;
  onResetDemoJourneys: () => void;
  onAddCustomJourney: (params: {
    originCode: string;
    destinationCode: string;
    departureDate: string;
    targetPriceInr: number;
  }) => void;
  onOpenJourneyComparison: (journey: TrackedJourney) => void;
  lastTriggeredAlertMessage: string | null;
}

export function PriceTrackerDashboard({
  journeys,
  onUpdateTarget,
  onToggleAlert,
  onSimulateUpdate,
  onRemoveJourney,
  onResetDemoJourneys,
  onAddCustomJourney,
  onOpenJourneyComparison,
  lastTriggeredAlertMessage,
}: PriceTrackerDashboardProps) {
  const [draftTargets, setDraftTargets] = useState<Record<string, string>>({});
  const [newOrigin, setNewOrigin] = useState('DEL');
  const [newDestination, setNewDestination] = useState('BOM');
  const [newDate, setNewDate] = useState(getDefaultFutureDate(16));
  const [newTarget, setNewTarget] = useState('5250');
  const [formError, setFormError] = useState<string | null>(null);

  const activeAlerts = getActiveTargetAlerts(journeys);
  const minDate = getTodayDateString();

  const handleSaveTarget = (journey: TrackedJourney) => {
    const raw = draftTargets[journey.id];
    if (raw === undefined) return;
    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || parsed < 1000 || parsed > 150000) return;
    onUpdateTarget(journey.id, Math.round(parsed));
    setDraftTargets((prev) => {
      const next = { ...prev };
      delete next[journey.id];
      return next;
    });
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newOrigin === newDestination) {
      setFormError('Choose two different Indian cities to track.');
      return;
    }
    if (!newDate || newDate < minDate) {
      setFormError('Select a valid upcoming departure date.');
      return;
    }
    const targetNum = Number(newTarget);
    if (!Number.isFinite(targetNum) || targetNum < 1500) {
      setFormError('Enter a target fare of at least ₹1,500.');
      return;
    }
    setFormError(null);
    onAddCustomJourney({
      originCode: newOrigin,
      destinationCode: newDestination,
      departureDate: newDate,
      targetPriceInr: Math.round(targetNum),
    });
  };

  return (
    <section aria-label="Smart price tracker" className="space-y-6">
      {/* Header & Persistence Disclosure */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="text-xs text-slate-500">
            <span className="font-medium text-slate-700">LocalStorage Persistence</span>
            <span className="mx-1.5" aria-hidden="true">·</span>
            <span>Demo Data &amp; Simulated Price Checks</span>
          </div>
          <h1 className="font-display text-2xl font-bold text-slate-900 mt-1">
            Smart Price Tracker
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Save routes, set real-payable target thresholds, and test live alert activation with
            deterministic simulated market updates.
          </p>
        </div>

        <div className="flex items-center gap-6 text-xs tabular-nums shrink-0 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100">
          <div>
            <div className="text-slate-500">Saved Routes</div>
            <div className="font-mono text-lg font-semibold text-slate-900 mt-0.5">
              {journeys.length}
            </div>
          </div>
          <div>
            <div className="text-slate-500">Targets Reached</div>
            <div className="font-mono text-lg font-semibold text-emerald-700 mt-0.5">
              {activeAlerts.length}
            </div>
          </div>
          <button
            type="button"
            onClick={onResetDemoJourneys}
            className="px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg inline-flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Demo Routes</span>
          </button>
        </div>
      </div>

      {/* Live Simulated Alert Banner when Target is Met */}
      {(lastTriggeredAlertMessage || activeAlerts.length > 0) && (
        <div
          role="status"
          aria-live="polite"
          className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-4 sm:p-5 space-y-2"
        >
          <div className="flex items-center gap-2 text-sm font-semibold text-emerald-950">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              {lastTriggeredAlertMessage ||
                `Target Fare Reached on ${activeAlerts.length} Tracked Route${
                  activeAlerts.length > 1 ? 's' : ''
                } (Demo Alert)`}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-xs text-emerald-900">
            {activeAlerts.map((al) => (
              <span key={al.id} className="tabular-nums">
                <strong>
                  {al.originCity} → {al.destinationCity}:
                </strong>{' '}
                Observed {formatInr(al.currentObservedInr)} ≤ Target {formatInr(al.targetPriceInr)}{' '}
                via {al.bestProviderName}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Quick Add Route Form */}
      <form
        onSubmit={handleCreateSubmit}
        className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5"
      >
        <div className="text-xs font-semibold text-slate-900 mb-3">
          Add Route to Price Tracker (Persists Across Page Refreshes)
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-end">
          <div className="lg:col-span-3">
            <label htmlFor="trk-origin" className="block text-xs text-slate-600 mb-1">
              Origin
            </label>
            <select
              id="trk-origin"
              value={newOrigin}
              onChange={(e) => setNewOrigin(e.target.value)}
              className="w-full h-10 px-3 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-blue-600"
            >
              {INDIAN_CITIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.city} ({c.code})
                </option>
              ))}
            </select>
          </div>

          <div className="lg:col-span-3">
            <label htmlFor="trk-dest" className="block text-xs text-slate-600 mb-1">
              Destination
            </label>
            <select
              id="trk-dest"
              value={newDestination}
              onChange={(e) => setNewDestination(e.target.value)}
              className="w-full h-10 px-3 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-blue-600"
            >
              {INDIAN_CITIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.city} ({c.code})
                </option>
              ))}
            </select>
          </div>

          <div className="lg:col-span-2">
            <label htmlFor="trk-date" className="block text-xs text-slate-600 mb-1">
              Departure Date
            </label>
            <input
              id="trk-date"
              type="date"
              min={minDate}
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              className="w-full h-10 px-3 bg-white border border-slate-200 rounded-lg text-sm font-mono tabular-nums text-slate-900 focus:outline-none focus:border-blue-600"
            />
          </div>

          <div className="lg:col-span-2">
            <label htmlFor="trk-target" className="block text-xs text-slate-600 mb-1">
              Target Real Fare (₹)
            </label>
            <input
              id="trk-target"
              type="number"
              min={1500}
              step={50}
              value={newTarget}
              onChange={(e) => setNewTarget(e.target.value)}
              className="w-full h-10 px-3 bg-white border border-slate-200 rounded-lg text-sm font-mono tabular-nums text-slate-900 focus:outline-none focus:border-blue-600"
            />
          </div>

          <div className="lg:col-span-2">
            <button
              type="submit"
              className="w-full h-10 px-4 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg inline-flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Track Route</span>
            </button>
          </div>
        </div>

        {formError && (
          <p className="mt-2.5 text-xs font-medium text-red-700">{formError}</p>
        )}
      </form>

      {/* Empty State */}
      {journeys.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center">
          <TrendingDown className="w-8 h-8 text-slate-400 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-900">
            No Tracked Journeys Saved
          </h3>
          <p className="text-sm text-slate-600 mt-1 max-w-md mx-auto">
            Add any Indian route above or restore the preconfigured Raipur → Delhi and Mumbai →
            Bengaluru demo trackers.
          </p>
          <button
            type="button"
            onClick={onResetDemoJourneys}
            className="mt-5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg inline-flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restore Demo Routes</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5">
          {journeys.map((journey) => {
            const targetMet = journey.currentObservedInr <= journey.targetPriceInr;
            const deltaFromInitial = journey.currentObservedInr - journey.initialObservedInr;
            const currentInputValue =
              draftTargets[journey.id] !== undefined
                ? draftTargets[journey.id]
                : String(journey.targetPriceInr);
            const hasSimulatedPoints = journey.priceHistory.some(
              (p) => p.source === 'simulated_update'
            );

            return (
              <article
                key={journey.id}
                className={`bg-white rounded-2xl p-5 sm:p-6 border transition-colors ${
                  targetMet && journey.alertsEnabled
                    ? 'border-emerald-500'
                    : 'border-slate-200'
                }`}
              >
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  {/* Left 5 cols: Journey Details & Target Controls */}
                  <div className="lg:col-span-5 space-y-4">
                    <div>
                      <div className="text-xs text-slate-500 flex flex-wrap items-center gap-1.5">
                        <span className="font-medium text-slate-700">
                          {journey.verificationLabel}
                        </span>
                        {hasSimulatedPoints && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="text-blue-700 font-medium">
                              Includes Simulated Update
                            </span>
                          </>
                        )}
                        <span aria-hidden="true">·</span>
                        <span>Departs {journey.departureDate}</span>
                      </div>

                      <h3 className="font-display text-lg font-bold text-slate-900 mt-1">
                        {journey.originCity} ({journey.originCode}) → {journey.destinationCity} (
                        {journey.destinationCode})
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {journey.passengers} {journey.passengers === 1 ? 'adult' : 'adults'} ·{' '}
                        {BAGGAGE_LABELS[journey.extras.baggage]} · Best via{' '}
                        <span className="font-medium text-slate-700">
                          {journey.bestProviderName}
                        </span>
                      </p>
                    </div>

                    {/* Metrics */}
                    <div className="grid grid-cols-3 gap-3 py-3 border-t border-b border-slate-200 tabular-nums">
                      <div>
                        <div className="text-xs text-slate-500">Current Demo Fare</div>
                        <div className="font-mono text-lg font-semibold text-slate-900 mt-0.5">
                          {formatInr(journey.currentObservedInr)}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-500">Target Price</div>
                        <div className="font-mono text-lg font-semibold text-blue-700 mt-0.5">
                          {formatInr(journey.targetPriceInr)}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-500">Net Change</div>
                        <div
                          className={`font-mono text-sm font-semibold mt-1 ${
                            deltaFromInitial <= 0 ? 'text-emerald-700' : 'text-amber-800'
                          }`}
                        >
                          {formatInr(deltaFromInitial, true)}
                        </div>
                      </div>
                    </div>

                    {/* Edit Target + Alert Toggle */}
                    <div className="flex flex-wrap items-center gap-2">
                      <label htmlFor={`target-edit-${journey.id}`} className="sr-only">
                        Target Price in INR
                      </label>
                      <input
                        id={`target-edit-${journey.id}`}
                        type="number"
                        min={1500}
                        step={50}
                        value={currentInputValue}
                        onChange={(e) =>
                          setDraftTargets((prev) => ({
                            ...prev,
                            [journey.id]: e.target.value,
                          }))
                        }
                        className="w-28 h-9 px-2.5 bg-white border border-slate-200 rounded-lg text-xs font-mono tabular-nums text-slate-900 focus:outline-none focus:border-blue-600"
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveTarget(journey)}
                        disabled={draftTargets[journey.id] === undefined}
                        className="h-9 px-3 text-xs font-medium rounded-lg border border-slate-200 bg-slate-50 text-slate-800 hover:bg-slate-100 disabled:opacity-45 transition-colors cursor-pointer disabled:cursor-default"
                      >
                        Save Target
                      </button>

                      <button
                        type="button"
                        onClick={() => onToggleAlert(journey.id)}
                        className={`h-9 px-3 text-xs font-medium rounded-lg border inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                          journey.alertsEnabled
                            ? 'border-blue-200 bg-blue-50/70 text-blue-800'
                            : 'border-slate-200 bg-white text-slate-600'
                        }`}
                      >
                        {journey.alertsEnabled ? (
                          <>
                            <Bell className="w-3.5 h-3.5" />
                            <span>Alerts Active</span>
                          </>
                        ) : (
                          <>
                            <BellOff className="w-3.5 h-3.5" />
                            <span>Alerts Paused</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Action Row including working "Simulate price update" */}
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => onSimulateUpdate(journey.id)}
                        className="px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Simulate price update</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onOpenJourneyComparison(journey)}
                        className="px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        Compare Fares
                      </button>

                      <button
                        type="button"
                        onClick={() => onRemoveJourney(journey.id)}
                        aria-label={`Remove ${journey.originCity} to ${journey.destinationCity} from tracker`}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Right 7 cols: Price History Chart with Target Reference Line */}
                  <div className="lg:col-span-7">
                    <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                      <span>Observed &amp; Simulated Price History (Per Adult Real Fare)</span>
                      <span className="tabular-nums">
                        {targetMet
                          ? 'Target Met — Below Dashed Threshold'
                          : `${formatInr(
                              journey.currentObservedInr - journey.targetPriceInr
                            )} above target`}
                      </span>
                    </div>

                    <div className="h-48 w-full bg-[#FAFAFA] border border-slate-200/80 rounded-xl p-2.5">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                          data={journey.priceHistory}
                          margin={{ top: 10, right: 12, left: 0, bottom: 2 }}
                        >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="#E2E8F0"
                            vertical={false}
                          />
                          <XAxis
                            dataKey="dateLabel"
                            tick={{ fontSize: 10, fill: '#64748B' }}
                            tickLine={false}
                            axisLine={{ stroke: '#CBD5E1' }}
                            minTickGap={20}
                          />
                          <YAxis
                            tickFormatter={(v: number) => `₹${v}`}
                            tick={{ fontSize: 10, fill: '#64748B' }}
                            tickLine={false}
                            axisLine={false}
                            width={56}
                            domain={[
                              (dataMin: number) =>
                                Math.min(dataMin, journey.targetPriceInr) - 200,
                              (dataMax: number) =>
                                Math.max(dataMax, journey.targetPriceInr) + 200,
                            ]}
                          />
                          <Tooltip
                            content={({ active, payload }) => {
                              if (!active || !payload || payload.length === 0) return null;
                              const pt = payload[0].payload as TrackedJourney['priceHistory'][number];
                              return (
                                <div className="bg-white border border-slate-200 rounded-lg p-2.5 shadow-md text-xs space-y-0.5">
                                  <div className="font-semibold text-slate-900">{pt.dateLabel}</div>
                                  <div className="font-mono tabular-nums text-slate-800">
                                    Real Fare: {formatInr(pt.totalPayableInr)}
                                  </div>
                                  <div className="text-[11px] text-slate-500">
                                    {pt.source === 'simulated_update'
                                      ? 'Simulated Demo Update'
                                      : 'Demo Data Observation'}
                                  </div>
                                </div>
                              );
                            }}
                          />
                          <ReferenceLine
                            y={journey.targetPriceInr}
                            stroke="#2563EB"
                            strokeDasharray="4 4"
                            label={{
                              value: `Target ${formatInr(journey.targetPriceInr)}`,
                              position: 'insideTopRight',
                              fill: '#1D4ED8',
                              fontSize: 10,
                            }}
                          />
                          <Area
                            type="monotone"
                            dataKey="totalPayableInr"
                            stroke={targetMet ? '#15803D' : '#0F172A'}
                            strokeWidth={2}
                            fill={targetMet ? '#22C55E' : '#3B82F6'}
                            fillOpacity={0.1}
                            isAnimationActive={false}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
