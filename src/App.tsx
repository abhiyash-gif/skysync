import { ArrowLeft, Bot } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AskSkysyncAI } from './components/AskSkysyncAI';
import { ComparisonSection } from './components/ComparisonSection';
import { FareForecastPanel } from './components/FareForecastPanel';
import { Footer } from './components/Footer';
import { LandingPage } from './components/LandingPage';
import { Navbar } from './components/Navbar';
import { PriceTrackerDashboard } from './components/PriceTrackerDashboard';
import { SearchForm } from './components/SearchForm';
import {
  generateDemoItineraries,
  generateHistoricalFareSeries,
  getDefaultFutureDate,
} from './data/sampleData';
import {
  type AssistantChatMessage,
  type AssistantContext,
  createInitialAssistantMessage,
  generateAssistantResponse,
} from './modules/aiAssistant';
import { calculateCompleteFare, formatInr } from './modules/fareCalculator';
import { generateStatisticalFareForecast } from './modules/forecasting';
import {
  addOrUpdateTrackedJourney,
  createInitialDemoTrackedJourneys,
  getActiveTargetAlerts,
  loadTrackedJourneys,
  saveTrackedJourneys,
  simulateTrackedJourneyUpdate,
} from './modules/tracker';
import { travelDataAdapter } from './services/travelDataProvider';
import type {
  AppView,
  FlightItinerary,
  OptionalExtrasSelection,
  SearchQuery,
  TrackedJourney,
} from './types/travel';

const DEFAULT_DEMO_QUERY: SearchQuery = {
  originCode: 'RPR',
  destinationCode: 'DEL',
  departureDate: getDefaultFutureDate(14),
  returnDate: '',
  tripType: 'one_way',
  passengers: 1,
};

export default function App() {
  const [activeView, setActiveView] = useState<AppView>('landing');
  const [query, setQuery] = useState<SearchQuery>(DEFAULT_DEMO_QUERY);
  const [extras, setExtras] = useState<OptionalExtrasSelection>({
    baggage: 'cabin_only',
    seat: 'auto_free',
  });

  // Pre-compute initial Raipur -> Delhi demo itineraries synchronously so launch state is instant
  const [itineraries, setItineraries] = useState<FlightItinerary[]>(() =>
    generateDemoItineraries(DEFAULT_DEMO_QUERY)
  );
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Persistent Smart Price Tracker state (localStorage)
  const [trackedJourneys, setTrackedJourneys] = useState<TrackedJourney[]>(() =>
    loadTrackedJourneys()
  );
  const [lastTriggeredAlertMessage, setLastTriggeredAlertMessage] = useState<string | null>(
    null
  );

  // Pending scroll flag for jumping cleanly to #faq from other views
  const [pendingScrollToFaq, setPendingScrollToFaq] = useState(false);

  // Dynamically recompute statistical forecast whenever route, itineraries, or optional extras change
  const forecast = useMemo(() => {
    let lowestSinglePaxRealInr = Infinity;
    for (const flt of itineraries) {
      for (const q of flt.providerQuotes) {
        const bd = calculateCompleteFare(q, extras, 1);
        if (bd.perPassengerConservativePayableInr < lowestSinglePaxRealInr) {
          lowestSinglePaxRealInr = bd.perPassengerConservativePayableInr;
        }
      }
    }
    if (lowestSinglePaxRealInr === Infinity) {
      lowestSinglePaxRealInr = 5000;
    }

    const historicalSeries = generateHistoricalFareSeries(
      query.originCode,
      query.destinationCode,
      query.departureDate,
      lowestSinglePaxRealInr
    );

    return generateStatisticalFareForecast({
      originCode: query.originCode,
      destinationCode: query.destinationCode,
      departureDate: query.departureDate,
      historicalSeries,
    });
  }, [itineraries, extras, query.originCode, query.destinationCode, query.departureDate]);

  const assistantContext: AssistantContext = useMemo(
    () => ({
      query,
      itineraries,
      extras,
      forecast,
      trackedJourneys,
    }),
    [query, itineraries, extras, forecast, trackedJourneys]
  );

  const latestContextRef = useRef<AssistantContext>(assistantContext);
  useEffect(() => {
    latestContextRef.current = assistantContext;
  }, [assistantContext]);

  const [assistantMessages, setAssistantMessages] = useState<AssistantChatMessage[]>(() => [
    createInitialAssistantMessage({
      query: DEFAULT_DEMO_QUERY,
      itineraries: generateDemoItineraries(DEFAULT_DEMO_QUERY),
      extras: { baggage: 'cabin_only', seat: 'auto_free' },
      forecast: generateStatisticalFareForecast({
        originCode: DEFAULT_DEMO_QUERY.originCode,
        destinationCode: DEFAULT_DEMO_QUERY.destinationCode,
        departureDate: DEFAULT_DEMO_QUERY.departureDate,
        historicalSeries: generateHistoricalFareSeries(
          DEFAULT_DEMO_QUERY.originCode,
          DEFAULT_DEMO_QUERY.destinationCode,
          DEFAULT_DEMO_QUERY.departureDate,
          5097
        ),
      }),
      trackedJourneys: loadTrackedJourneys(),
    }),
  ]);
  const [isAssistantTyping, setIsAssistantTyping] = useState(false);

  const handleSendAssistantQuestion = useCallback((promptText: string) => {
    const trimmed = promptText.trim();
    if (!trimmed) return;

    const userMsg: AssistantChatMessage = {
      id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      role: 'user',
      content: trimmed,
      timestampIso: new Date().toISOString(),
    };

    setAssistantMessages((prev) => [...prev, userMsg]);
    setIsAssistantTyping(true);

    window.setTimeout(() => {
      const reply = generateAssistantResponse(trimmed, latestContextRef.current);
      setAssistantMessages((prev) => [...prev, reply]);
      setIsAssistantTyping(false);
    }, 240);
  }, []);

  const handleClearAssistantConversation = useCallback(() => {
    setIsAssistantTyping(false);
    setAssistantMessages([createInitialAssistantMessage(latestContextRef.current)]);
  }, []);

  const handleOpenAssistantWithOptionalPrompt = useCallback(
    (promptText?: string) => {
      setActiveView('assistant');
      if (promptText) {
        handleSendAssistantQuestion(promptText);
      }
    },
    [handleSendAssistantQuestion]
  );

  const executeSearch = useCallback(
    async (
      nextQuery: SearchQuery,
      targetView: AppView = 'results',
      simulateError = false
    ) => {
      setQuery(nextQuery);
      setActiveView(targetView);
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const bundle = await travelDataAdapter.searchRoute(nextQuery, extras, {
          simulateError,
        });
        setItineraries(bundle.itineraries);
      } catch (err) {
        setErrorMessage(
          err instanceof Error
            ? err.message
            : 'Unable to load demonstration flight schedules.'
        );
      } finally {
        setIsLoading(false);
      }
    },
    [extras]
  );

  // Handle view transitions and FAQ smooth scrolling
  useEffect(() => {
    if (activeView === 'landing' && pendingScrollToFaq) {
      const timer = window.setTimeout(() => {
        const faqEl = document.getElementById('faq');
        faqEl?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        setPendingScrollToFaq(false);
      }, 60);
      return () => window.clearTimeout(timer);
    }

    if (!pendingScrollToFaq) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [activeView, pendingScrollToFaq]);

  const handleJumpToFaq = useCallback(() => {
    if (activeView === 'landing') {
      const faqEl = document.getElementById('faq');
      faqEl?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      setPendingScrollToFaq(true);
      setActiveView('landing');
    }
  }, [activeView]);

  const handleQuickDemoRoute = () => {
    const demoQuery: SearchQuery = {
      originCode: 'RPR',
      destinationCode: 'DEL',
      departureDate: getDefaultFutureDate(14),
      returnDate: '',
      tripType: 'one_way',
      passengers: 1,
    };
    void executeSearch(demoQuery, 'results', false);
  };

  const handleInspectCorridor = (originCode: string, destinationCode: string) => {
    const nextQuery: SearchQuery = {
      ...query,
      originCode,
      destinationCode,
      departureDate: query.departureDate || getDefaultFutureDate(14),
    };
    void executeSearch(nextQuery, 'results', false);
  };

  const handleTriggerDemoState = (mode: 'normal' | 'loading' | 'error') => {
    if (mode === 'loading') {
      void executeSearch(query, 'results', false);
    } else if (mode === 'error') {
      void executeSearch(query, 'results', true);
    } else {
      void executeSearch(query, 'results', false);
    }
  };

  const handleTrackCurrentRoute = (currentLowestInr: number, bestProviderName: string) => {
    const suggestedTarget = Math.max(
      1800,
      Math.round((currentLowestInr - 180) / 10) * 10
    );
    const { updated, journey } = addOrUpdateTrackedJourney(trackedJourneys, {
      originCode: query.originCode,
      destinationCode: query.destinationCode,
      departureDate: query.departureDate,
      returnDate: query.returnDate || undefined,
      tripType: query.tripType,
      passengers: query.passengers,
      extras,
      currentObservedInr: currentLowestInr,
      targetPriceInr: suggestedTarget,
      bestProviderName,
    });
    setTrackedJourneys(updated);
    setLastTriggeredAlertMessage(
      `Tracking ${journey.originCity} → ${journey.destinationCity} with target alert at ${formatInr(
        journey.targetPriceInr
      )}.`
    );
  };

  const handleSaveForecastTarget = (suggestedTargetInr: number) => {
    const { updated } = addOrUpdateTrackedJourney(trackedJourneys, {
      originCode: query.originCode,
      destinationCode: query.destinationCode,
      departureDate: query.departureDate,
      returnDate: query.returnDate || undefined,
      tripType: query.tripType,
      passengers: query.passengers,
      extras,
      currentObservedInr: forecast.currentLowestRealFareInr,
      targetPriceInr: suggestedTargetInr,
      bestProviderName: 'ClearWing',
    });
    setTrackedJourneys(updated);
  };

  const handleUpdateTarget = (id: string, nextTargetInr: number) => {
    const updated = trackedJourneys.map((j) =>
      j.id === id ? { ...j, targetPriceInr: nextTargetInr } : j
    );
    setTrackedJourneys(updated);
    saveTrackedJourneys(updated);
  };

  const handleToggleAlert = (id: string) => {
    const updated = trackedJourneys.map((j) =>
      j.id === id ? { ...j, alertsEnabled: !j.alertsEnabled } : j
    );
    setTrackedJourneys(updated);
    saveTrackedJourneys(updated);
  };

  const handleSimulateTrackerUpdate = (id: string) => {
    const { updated, updatedJourney, newlyTriggeredAlert } =
      simulateTrackedJourneyUpdate(trackedJourneys, id);
    setTrackedJourneys(updated);

    if (updatedJourney) {
      if (
        newlyTriggeredAlert ||
        (updatedJourney.alertsEnabled &&
          updatedJourney.currentObservedInr <= updatedJourney.targetPriceInr)
      ) {
        setLastTriggeredAlertMessage(
          `Simulated Alert Triggered: ${updatedJourney.originCity} → ${
            updatedJourney.destinationCity
          } dropped to ${formatInr(
            updatedJourney.currentObservedInr
          )} (meeting your ${formatInr(updatedJourney.targetPriceInr)} target).`
        );
      } else {
        setLastTriggeredAlertMessage(
          `Simulated update recorded for ${updatedJourney.originCity} → ${
            updatedJourney.destinationCity
          }: now ${formatInr(updatedJourney.currentObservedInr)} (Target: ${formatInr(
            updatedJourney.targetPriceInr
          )}). Click again to simulate further drop.`
        );
      }
    }
  };

  const handleRemoveTracked = (id: string) => {
    const updated = trackedJourneys.filter((j) => j.id !== id);
    setTrackedJourneys(updated);
    saveTrackedJourneys(updated);
  };

  const handleResetDemoTracked = () => {
    const initial = createInitialDemoTrackedJourneys();
    setTrackedJourneys(initial);
    saveTrackedJourneys(initial);
    setLastTriggeredAlertMessage(null);
  };

  const handleAddCustomTracked = (params: {
    originCode: string;
    destinationCode: string;
    departureDate: string;
    targetPriceInr: number;
  }) => {
    const sampleFlts = generateDemoItineraries({
      originCode: params.originCode,
      destinationCode: params.destinationCode,
      departureDate: params.departureDate,
      returnDate: '',
      tripType: 'one_way',
      passengers: 1,
    });
    let lowest = 5200;
    let bestProvider = 'AeroDirect';
    for (const flt of sampleFlts) {
      for (const q of flt.providerQuotes) {
        const bd = calculateCompleteFare(
          q,
          { baggage: 'cabin_only', seat: 'auto_free' },
          1
        );
        if (bd.perPassengerConservativePayableInr < lowest) {
          lowest = bd.perPassengerConservativePayableInr;
          bestProvider = q.providerName;
        }
      }
    }

    const { updated, journey } = addOrUpdateTrackedJourney(trackedJourneys, {
      originCode: params.originCode,
      destinationCode: params.destinationCode,
      departureDate: params.departureDate,
      tripType: 'one_way',
      passengers: 1,
      extras: { baggage: 'cabin_only', seat: 'auto_free' },
      currentObservedInr: lowest,
      targetPriceInr: params.targetPriceInr,
      bestProviderName: bestProvider,
    });
    setTrackedJourneys(updated);
    setLastTriggeredAlertMessage(
      `Added ${journey.originCity} → ${journey.destinationCity} (${formatInr(
        lowest
      )} current demo fare · ${formatInr(params.targetPriceInr)} target).`
    );
  };

  const isCurrentRouteTracked = trackedJourneys.some(
    (j) =>
      j.originCode === query.originCode &&
      j.destinationCode === query.destinationCode &&
      j.departureDate === query.departureDate
  );

  const triggeredAlertsCount = getActiveTargetAlerts(trackedJourneys).length;

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFAFA] text-slate-900">
      <Navbar
        activeView={activeView}
        onNavigate={setActiveView}
        onJumpToFaq={handleJumpToFaq}
        trackedCount={trackedJourneys.length}
        triggeredAlertsCount={triggeredAlertsCount}
        onQuickDemoRoute={handleQuickDemoRoute}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8">
        {activeView !== 'landing' && (
          <div className="pt-5 flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => setActiveView('landing')}
              className="text-xs font-medium text-slate-500 hover:text-slate-900 inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Overview</span>
            </button>

            {activeView !== 'assistant' && (
              <button
                type="button"
                onClick={() => setActiveView('assistant')}
                className="text-xs font-semibold text-blue-700 hover:text-blue-800 inline-flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Bot className="w-3.5 h-3.5" />
                <span>Ask Skysync AI about this route</span>
              </button>
            )}
          </div>
        )}

        {activeView === 'landing' && (
          <LandingPage
            query={query}
            extras={extras}
            onChangeExtras={setExtras}
            onSubmitSearch={(next) => void executeSearch(next, 'results')}
            onInspectCorridor={handleInspectCorridor}
            onNavigate={setActiveView}
            onAskAiQuestion={handleOpenAssistantWithOptionalPrompt}
          />
        )}

        {activeView === 'results' && (
          <div className="py-5 sm:py-6 space-y-8">
            <SearchForm
              query={query}
              onSubmitSearch={(next) => void executeSearch(next, 'results')}
              compact
            />

            <ComparisonSection
              query={query}
              itineraries={itineraries}
              extras={extras}
              onChangeExtras={setExtras}
              isLoading={isLoading}
              errorMessage={errorMessage}
              onRetrySearch={() => void executeSearch(query, 'results', false)}
              onTriggerDemoState={handleTriggerDemoState}
              onTrackRoute={handleTrackCurrentRoute}
              isRouteTracked={isCurrentRouteTracked}
              onOpenForecast={() => setActiveView('forecast')}
            />

            {!isLoading && !errorMessage && (
              <FareForecastPanel
                forecast={forecast}
                onSaveToTracker={handleSaveForecastTarget}
              />
            )}
          </div>
        )}

        {activeView === 'forecast' && (
          <div className="py-5 sm:py-6 space-y-6">
            <FareForecastPanel
              forecast={forecast}
              standalone
              onSelectCorridor={(orig, dest) => {
                const nextQuery: SearchQuery = {
                  ...query,
                  originCode: orig,
                  destinationCode: dest,
                };
                void executeSearch(nextQuery, 'forecast', false);
              }}
              onSaveToTracker={(targetInr) => {
                handleSaveForecastTarget(targetInr);
              }}
            />
          </div>
        )}

        {activeView === 'tracker' && (
          <div className="py-5 sm:py-6">
            <PriceTrackerDashboard
              journeys={trackedJourneys}
              onUpdateTarget={handleUpdateTarget}
              onToggleAlert={handleToggleAlert}
              onSimulateUpdate={handleSimulateTrackerUpdate}
              onRemoveJourney={handleRemoveTracked}
              onResetDemoJourneys={handleResetDemoTracked}
              onAddCustomJourney={handleAddCustomTracked}
              onOpenJourneyComparison={(journey) => {
                setExtras(journey.extras);
                void executeSearch(
                  {
                    originCode: journey.originCode,
                    destinationCode: journey.destinationCode,
                    departureDate: journey.departureDate,
                    returnDate: journey.returnDate || '',
                    tripType: journey.tripType,
                    passengers: journey.passengers,
                  },
                  'results',
                  false
                );
              }}
              lastTriggeredAlertMessage={lastTriggeredAlertMessage}
            />
          </div>
        )}

        {activeView === 'assistant' && (
          <div className="py-5 sm:py-6">
            <AskSkysyncAI
              context={assistantContext}
              messages={assistantMessages}
              isTyping={isAssistantTyping}
              onSendQuestion={handleSendAssistantQuestion}
              onClearConversation={handleClearAssistantConversation}
              onNavigate={setActiveView}
              onSelectCorridor={(orig, dest) => {
                const nextQuery: SearchQuery = {
                  ...query,
                  originCode: orig,
                  destinationCode: dest,
                };
                void executeSearch(nextQuery, 'assistant', false);
              }}
            />
          </div>
        )}
      </main>

      {/* Desktop quick-entry button for Ask Skysync AI when browsing other sections */}
      {activeView !== 'assistant' && (
        <button
          type="button"
          onClick={() => setActiveView('assistant')}
          className="hidden sm:inline-flex fixed bottom-5 right-5 z-30 items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-md transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        >
          <Bot className="w-4 h-4 text-blue-300" />
          <span>Ask Skysync AI</span>
        </button>
      )}

      <Footer onNavigate={setActiveView} onJumpToFaq={handleJumpToFaq} />
    </div>
  );
}
