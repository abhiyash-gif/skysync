import {
  generateDemoItineraries,
  generateHistoricalFareSeries,
} from '../data/sampleData';
import { calculateCompleteFare } from '../modules/fareCalculator';
import { generateStatisticalFareForecast } from '../modules/forecasting';
import type {
  FareForecastResult,
  FlightItinerary,
  OptionalExtrasSelection,
  SearchQuery,
} from '../types/travel';

export interface RouteSearchBundle {
  query: SearchQuery;
  itineraries: FlightItinerary[];
  forecast: FareForecastResult;
  dataSourceMode: 'demo';
  fetchedAtIso: string;
}

/**
 * Clean Provider Adapter Interface.
 * Keeps frontend components decoupled from data transport so authorized server-side
 * GDS / OTA APIs (Amadeus, TBO, Airline NDC) can plug in later without exposing keys in client code.
 */
export interface TravelDataAdapter {
  readonly adapterName: string;
  readonly isLiveData: boolean;
  searchRoute(
    query: SearchQuery,
    extras: OptionalExtrasSelection,
    options?: { simulateError?: boolean; instant?: boolean }
  ): Promise<RouteSearchBundle>;
}

class DeterministicDemoTravelAdapter implements TravelDataAdapter {
  public readonly adapterName = 'Skysync Deterministic Demo Engine';
  public readonly isLiveData = false;

  public async searchRoute(
    query: SearchQuery,
    extras: OptionalExtrasSelection,
    options?: { simulateError?: boolean; instant?: boolean }
  ): Promise<RouteSearchBundle> {
    if (!options?.instant) {
      await new Promise((resolve) => setTimeout(resolve, 260));
    }

    if (options?.simulateError) {
      throw new Error(
        'Simulated provider timeout: Unable to normalize partner fare schedules. Retry with Demo Data.'
      );
    }

    const itineraries = generateDemoItineraries(query);

    // Compute lowest real conservative 1-passenger fare across itineraries to anchor forecast series
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

    const forecast = generateStatisticalFareForecast({
      originCode: query.originCode,
      destinationCode: query.destinationCode,
      departureDate: query.departureDate,
      historicalSeries,
    });

    return {
      query,
      itineraries,
      forecast,
      dataSourceMode: 'demo',
      fetchedAtIso: new Date().toISOString(),
    };
  }
}

export const travelDataAdapter: TravelDataAdapter = new DeterministicDemoTravelAdapter();
