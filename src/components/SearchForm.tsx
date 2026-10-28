import {
  AlertCircle,
  ArrowLeftRight,
  Calendar,
  MapPin,
  Search,
  Users,
} from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import {
  getCityByCode,
  getDefaultFutureDate,
  getTodayDateString,
  INDIAN_CITIES,
} from '../data/sampleData';
import type { IndianCity, SearchQuery, TripType } from '../types/travel';

interface SearchFormProps {
  query: SearchQuery;
  onSubmitSearch: (nextQuery: SearchQuery) => void;
  compact?: boolean;
}

interface CityFieldProps {
  id: string;
  label: string;
  selectedCode: string;
  excludeCode?: string;
  onSelectCity: (code: string) => void;
}

function CityAutocompleteField({
  id,
  label,
  selectedCode,
  onSelectCity,
}: CityFieldProps) {
  const selectedCity = getCityByCode(selectedCode);
  const [inputText, setInputText] = useState(
    selectedCity ? `${selectedCity.city} (${selectedCity.code})` : selectedCode
  );
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const city = getCityByCode(selectedCode);
    setInputText(city ? `${city.city} (${city.code})` : selectedCode);
  }, [selectedCode]);

  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        const city = getCityByCode(selectedCode);
        setInputText(city ? `${city.city} (${city.code})` : selectedCode);
      }
    }
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [selectedCode]);

  const trimmed = inputText.trim().toLowerCase();
  const isShowingCurrentSelection =
    selectedCity &&
    trimmed === `${selectedCity.city} (${selectedCity.code})`.toLowerCase();

  const matches: IndianCity[] = isShowingCurrentSelection || trimmed.length === 0
    ? INDIAN_CITIES
    : INDIAN_CITIES.filter(
        (c) =>
          c.city.toLowerCase().includes(trimmed) ||
          c.code.toLowerCase().includes(trimmed) ||
          c.state.toLowerCase().includes(trimmed) ||
          c.airportName.toLowerCase().includes(trimmed)
      );

  const handleChoose = (city: IndianCity) => {
    onSelectCity(city.code);
    setInputText(`${city.city} (${city.code})`);
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative flex-1 min-w-0">
      <label
        htmlFor={id}
        className="block text-xs font-medium text-slate-600 mb-1"
      >
        {label}
      </label>
      <div className="relative">
        <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          id={id}
          type="text"
          value={inputText}
          onFocus={() => {
            setOpen(true);
            setInputText('');
          }}
          onChange={(e) => {
            setInputText(e.target.value);
            setOpen(true);
          }}
          placeholder="City or airport code"
          autoComplete="off"
          className="w-full h-11 pl-9 pr-3 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15 transition-colors"
        />
      </div>

      {open && (
        <div
          role="listbox"
          className="absolute left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-lg max-h-64 overflow-y-auto z-30 py-1"
        >
          {matches.length === 0 ? (
            <div className="px-3.5 py-3 text-xs text-slate-500">
              No matching Indian airport found. Try Raipur, Delhi, Mumbai, or Bengaluru.
            </div>
          ) : (
            matches.map((city) => {
              const isSelected = city.code === selectedCode;
              return (
                <button
                  key={city.code}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => handleChoose(city)}
                  className={`w-full px-3.5 py-2.5 text-left flex items-center justify-between gap-3 transition-colors cursor-pointer ${
                    isSelected ? 'bg-blue-50/70 text-blue-950' : 'hover:bg-slate-50 text-slate-900'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">
                      {city.city}, {city.state}
                    </div>
                    <div className="text-xs text-slate-500 truncate">{city.airportName}</div>
                  </div>
                  <span className="font-mono text-xs font-semibold text-slate-700 shrink-0 tabular-nums">
                    {city.code}
                  </span>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

const QUICK_ROUTES: { label: string; origin: string; destination: string }[] = [
  { label: 'Raipur → Delhi', origin: 'RPR', destination: 'DEL' },
  { label: 'Mumbai → Bengaluru', origin: 'BOM', destination: 'BLR' },
  { label: 'Delhi → Mumbai', origin: 'DEL', destination: 'BOM' },
  { label: 'Raipur → Bengaluru', origin: 'RPR', destination: 'BLR' },
];

export function SearchForm({ query, onSubmitSearch, compact = false }: SearchFormProps) {
  const [originCode, setOriginCode] = useState(query.originCode);
  const [destinationCode, setDestinationCode] = useState(query.destinationCode);
  const [tripType, setTripType] = useState<TripType>(query.tripType);
  const [departureDate, setDepartureDate] = useState(query.departureDate);
  const [returnDate, setReturnDate] = useState(
    query.returnDate || getDefaultFutureDate(18)
  );
  const [passengers, setPassengers] = useState(query.passengers);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [swapRotated, setSwapRotated] = useState(false);

  useEffect(() => {
    setOriginCode(query.originCode);
    setDestinationCode(query.destinationCode);
    setTripType(query.tripType);
    setDepartureDate(query.departureDate);
    if (query.returnDate) setReturnDate(query.returnDate);
    setPassengers(query.passengers);
    setValidationError(null);
  }, [query]);

  const minDate = getTodayDateString();

  const handleSwap = () => {
    setOriginCode(destinationCode);
    setDestinationCode(originCode);
    setSwapRotated((prev) => !prev);
    setValidationError(null);
  };

  const validateAndSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!originCode || !destinationCode) {
      setValidationError('Select both an origin city and a destination city.');
      return;
    }
    if (originCode === destinationCode) {
      setValidationError('Origin and destination must be different cities.');
      return;
    }
    if (!departureDate || departureDate < minDate) {
      setValidationError('Departure date cannot be earlier than today.');
      return;
    }
    if (tripType === 'round_trip') {
      if (!returnDate) {
        setValidationError('Select a return date for a round-trip search.');
        return;
      }
      if (returnDate < departureDate) {
        setValidationError('Return date must be on or after the departure date.');
        return;
      }
    }
    if (passengers < 1 || passengers > 9) {
      setValidationError('Passenger count must be between 1 and 9.');
      return;
    }

    setValidationError(null);
    onSubmitSearch({
      originCode,
      destinationCode,
      departureDate,
      returnDate: tripType === 'round_trip' ? returnDate : '',
      tripType,
      passengers,
    });
  };

  const applyQuickRoute = (orig: string, dest: string) => {
    setOriginCode(orig);
    setDestinationCode(dest);
    setValidationError(null);
    onSubmitSearch({
      originCode: orig,
      destinationCode: dest,
      departureDate: departureDate >= minDate ? departureDate : getDefaultFutureDate(14),
      returnDate: tripType === 'round_trip' ? returnDate : '',
      tripType,
      passengers,
    });
  };

  return (
    <form
      onSubmit={validateAndSubmit}
      className={`bg-white border border-slate-200 rounded-2xl ${
        compact ? 'p-4 sm:p-5' : 'p-5 sm:p-6 shadow-xs'
      }`}
      noValidate
    >
      {/* Top row: Trip type selector + Demo Data provenance text */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div
          role="group"
          aria-label="Trip type"
          className="inline-flex items-center p-1 bg-slate-100 rounded-lg"
        >
          <button
            type="button"
            onClick={() => {
              setTripType('one_way');
              setValidationError(null);
            }}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              tripType === 'one_way'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            One-way
          </button>
          <button
            type="button"
            onClick={() => {
              setTripType('round_trip');
              if (!returnDate || returnDate < departureDate) {
                const depMs = new Date(departureDate).getTime();
                const plus4 = new Date(depMs + 4 * 86400000);
                setReturnDate(plus4.toISOString().slice(0, 10));
              }
              setValidationError(null);
            }}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              tripType === 'round_trip'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Round-trip
          </button>
        </div>

        <div className="text-xs text-slate-500">
          <span>Demo Data</span>
          <span className="mx-1.5" aria-hidden="true">·</span>
          <span>4 Booking Platforms Audited</span>
        </div>
      </div>

      {/* Main fields grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-end">
        {/* Origin + Swap + Destination */}
        <div className="lg:col-span-5 flex flex-col sm:flex-row items-stretch sm:items-end gap-2">
          <CityAutocompleteField
            id="search-origin"
            label="Origin"
            selectedCode={originCode}
            onSelectCity={(code) => {
              setOriginCode(code);
              setValidationError(null);
            }}
          />

          <button
            type="button"
            onClick={handleSwap}
            title="Swap origin and destination"
            aria-label="Swap origin and destination"
            className="self-center sm:self-end h-11 w-11 shrink-0 inline-flex items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-blue-600"
          >
            <ArrowLeftRight
              className={`w-4 h-4 transition-transform duration-200 ${
                swapRotated ? 'rotate-180' : 'rotate-0'
              }`}
            />
          </button>

          <CityAutocompleteField
            id="search-destination"
            label="Destination"
            selectedCode={destinationCode}
            onSelectCity={(code) => {
              setDestinationCode(code);
              setValidationError(null);
            }}
          />
        </div>

        {/* Departure Date */}
        <div className={tripType === 'round_trip' ? 'lg:col-span-2' : 'lg:col-span-3'}>
          <label
            htmlFor="search-departure"
            className="block text-xs font-medium text-slate-600 mb-1"
          >
            Departure
          </label>
          <div className="relative">
            <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="search-departure"
              type="date"
              min={minDate}
              value={departureDate}
              onChange={(e) => {
                const nextDep = e.target.value;
                setDepartureDate(nextDep);
                if (tripType === 'round_trip' && returnDate && returnDate < nextDep) {
                  setReturnDate(nextDep);
                }
                setValidationError(null);
              }}
              className="w-full h-11 pl-9 pr-2.5 bg-white border border-slate-200 rounded-lg text-sm font-mono tabular-nums text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15 transition-colors"
            />
          </div>
        </div>

        {/* Return Date (shown when Round-trip) */}
        {tripType === 'round_trip' && (
          <div className="lg:col-span-2">
            <label
              htmlFor="search-return"
              className="block text-xs font-medium text-slate-600 mb-1"
            >
              Return
            </label>
            <div className="relative">
              <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="search-return"
                type="date"
                min={departureDate || minDate}
                value={returnDate}
                onChange={(e) => {
                  setReturnDate(e.target.value);
                  setValidationError(null);
                }}
                className="w-full h-11 pl-9 pr-2.5 bg-white border border-slate-200 rounded-lg text-sm font-mono tabular-nums text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15 transition-colors"
              />
            </div>
          </div>
        )}

        {/* Passengers */}
        <div className={tripType === 'round_trip' ? 'lg:col-span-1' : 'lg:col-span-2'}>
          <label
            htmlFor="search-passengers"
            className="block text-xs font-medium text-slate-600 mb-1"
          >
            Travellers
          </label>
          <div className="relative">
            <Users className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <select
              id="search-passengers"
              value={passengers}
              onChange={(e) => setPassengers(Number(e.target.value))}
              className="w-full h-11 pl-9 pr-2 bg-white border border-slate-200 rounded-lg text-sm font-medium tabular-nums text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15 transition-colors"
            >
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <option key={n} value={n}>
                  {n} {n === 1 ? 'Adult' : 'Adults'}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Submit */}
        <div className="lg:col-span-2">
          <button
            type="submit"
            className="w-full h-11 px-4 inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            <Search className="w-4 h-4 shrink-0" />
            <span>Compare Real Fares</span>
          </button>
        </div>
      </div>

      {/* Validation Error */}
      {validationError && (
        <div
          role="alert"
          className="mt-3 px-3.5 py-2.5 rounded-lg border border-red-200 bg-red-50/70 flex items-center gap-2 text-xs font-medium text-red-800"
        >
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{validationError}</span>
        </div>
      )}

      {/* Quick demo corridors */}
      {!compact && (
        <div className="mt-4 pt-3.5 border-t border-slate-100 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
          <span className="text-slate-500 font-medium">Instant demo corridors:</span>
          {QUICK_ROUTES.map((rt) => {
            const isCurrent =
              originCode === rt.origin && destinationCode === rt.destination;
            return (
              <button
                key={rt.label}
                type="button"
                onClick={() => applyQuickRoute(rt.origin, rt.destination)}
                className={`font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  isCurrent
                    ? 'text-blue-700 underline underline-offset-4'
                    : 'text-slate-600 hover:text-slate-900 hover:underline hover:underline-offset-4'
                }`}
              >
                {rt.label}
              </button>
            );
          })}
        </div>
      )}
    </form>
  );
}
