import {
  ArrowRight,
  Bot,
  Loader2,
  MessageSquare,
  RotateCcw,
  Send,
  ShieldAlert,
  User,
} from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { BENCHMARK_CORRIDORS, getCityByCode } from '../data/sampleData';
import {
  type AssistantChatMessage,
  type AssistantContext,
  SUGGESTED_AI_QUESTIONS,
} from '../modules/aiAssistant';
import { BAGGAGE_LABELS, formatInr } from '../modules/fareCalculator';
import type { AppView } from '../types/travel';

interface AskSkysyncAIProps {
  context: AssistantContext;
  messages: AssistantChatMessage[];
  isTyping: boolean;
  onSendQuestion: (question: string) => void;
  onClearConversation: () => void;
  onNavigate: (view: AppView) => void;
  onSelectCorridor: (originCode: string, destinationCode: string) => void;
}

export function AskSkysyncAI({
  context,
  messages,
  isTyping,
  onSendQuestion,
  onClearConversation,
  onNavigate,
  onSelectCorridor,
}: AskSkysyncAIProps) {
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const originCity =
    getCityByCode(context.query.originCode)?.city || context.query.originCode;
  const destCity =
    getCityByCode(context.query.destinationCode)?.city ||
    context.query.destinationCode;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [messages.length, isTyping]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputValue.trim();
    if (!trimmed || isTyping) return;
    setInputValue('');
    onSendQuestion(trimmed);
  };

  const handleSuggestedClick = (promptText: string) => {
    if (isTyping) return;
    onSendQuestion(promptText);
    inputRef.current?.focus();
  };

  return (
    <section
      aria-label="Ask Skysync AI travel assistant"
      className="max-w-4xl mx-auto space-y-5"
    >
      {/* Top Header & Route Context Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-slate-200">
          <div className="space-y-1">
            <div className="text-xs text-slate-500">
              <span className="font-medium text-slate-700">Rule-Based Fare Analyst</span>
              <span className="mx-1.5" aria-hidden="true">·</span>
              <span>Simulated Demo Data</span>
              <span className="mx-1.5" aria-hidden="true">·</span>
              <span>Zero External API Keys</span>
            </div>
            <h1 className="font-display text-2xl font-bold text-slate-900">
              Ask Skysync AI
            </h1>
            <p className="text-sm text-slate-600">Your smarter travel companion.</p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onClearConversation}
              disabled={messages.length <= 1 && !isTyping}
              className="px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 disabled:opacity-45 rounded-lg inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:cursor-default"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Clear conversation</span>
            </button>
          </div>
        </div>

        {/* Active Route Context + Quick Switcher */}
        <div className="pt-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3 text-xs">
          <div className="text-slate-600 flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="font-semibold text-slate-900">
              Active Route: {originCity} ({context.query.originCode}) → {destCity} (
              {context.query.destinationCode})
            </span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums">
              Lowest real fare: {formatInr(context.forecast.currentLowestRealFareInr)}/adult
            </span>
            <span aria-hidden="true">·</span>
            <span>{BAGGAGE_LABELS[context.extras.baggage]}</span>
          </div>

          <div className="inline-flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg self-start lg:self-auto">
            {BENCHMARK_CORRIDORS.map((c) => {
              const active =
                c.originCode === context.query.originCode &&
                c.destinationCode === context.query.destinationCode;
              return (
                <button
                  key={`${c.originCode}-${c.destinationCode}`}
                  type="button"
                  onClick={() => onSelectCorridor(c.originCode, c.destinationCode)}
                  className={`px-2 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
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
        </div>
      </div>

      {/* Main Chat Container */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col">
        {/* Clickable Suggested Questions */}
        <div className="px-4 sm:px-6 py-3.5 bg-slate-50/80 border-b border-slate-200 space-y-2">
          <div className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
            <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
            <span>Suggested questions for {context.query.originCode} → {context.query.destinationCode}:</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {[...SUGGESTED_AI_QUESTIONS, 'Is baggage included in the fare?'].map((qText) => (
              <button
                key={qText}
                type="button"
                disabled={isTyping}
                onClick={() => handleSuggestedClick(qText)}
                className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:border-blue-600 hover:text-blue-700 disabled:opacity-50 rounded-lg transition-colors text-left cursor-pointer"
              >
                {qText}
              </button>
            ))}
          </div>
        </div>

        {/* Conversation Log */}
        <div
          role="log"
          aria-live="polite"
          className="p-4 sm:p-6 space-y-5 min-h-[340px] max-h-[520px] overflow-y-auto"
        >
          {messages.map((msg) => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={msg.id}
                className={`flex items-start gap-3 ${
                  isUser ? 'justify-end' : 'justify-start'
                }`}
              >
                {!isUser && (
                  <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200/80 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="w-4 h-4 text-blue-700" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] sm:max-w-[78%] rounded-2xl px-4 py-3.5 text-sm space-y-2.5 ${
                    isUser
                      ? 'bg-slate-900 text-white rounded-tr-sm'
                      : 'bg-[#FAFAFA] border border-slate-200 text-slate-800 rounded-tl-sm'
                  }`}
                >
                  <p className="leading-relaxed">{msg.content}</p>

                  {msg.bulletPoints && msg.bulletPoints.length > 0 && (
                    <ul className="space-y-1.5 pt-1 text-xs sm:text-sm text-slate-700">
                      {msg.bulletPoints.map((bp, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <ArrowRight className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-1" />
                          <span>{bp}</span>
                        </li>
                      ))}
                    </ul>
                  )}

                  {msg.suggestedViewAction && (
                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={() => onNavigate(msg.suggestedViewAction!.targetView)}
                        className="px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <span>{msg.suggestedViewAction.label}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {msg.footnote && (
                    <p className="pt-2 border-t border-slate-200/80 text-[11px] text-slate-500">
                      {msg.footnote}
                    </p>
                  )}
                </div>

                {isUser && (
                  <div className="w-8 h-8 rounded-lg bg-slate-200/80 flex items-center justify-center shrink-0 mt-0.5">
                    <User className="w-4 h-4 text-slate-700" />
                  </div>
                )}
              </div>
            );
          })}

          {isTyping && (
            <div className="flex items-start gap-3 justify-start">
              <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200/80 flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4 text-blue-700" />
              </div>
              <div className="bg-[#FAFAFA] border border-slate-200 rounded-2xl rounded-tl-sm px-4 py-3 text-xs text-slate-600 inline-flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 text-blue-600 animate-spin" />
                <span>Checking Demo Data fare breakdowns &amp; forecast baseline…</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Form + Honest Limitations Notice */}
        <div className="p-4 sm:p-5 bg-white border-t border-slate-200 space-y-2.5">
          <form onSubmit={handleSubmit} className="flex items-center gap-2.5">
            <label htmlFor="skysync-ai-input" className="sr-only">
              Ask a question about flight fares, hidden charges, booking timing, or baggage
            </label>
            <input
              ref={inputRef}
              id="skysync-ai-input"
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Ask about cheapest flights, hidden fees, baggage costs, or when to book…"
              className="flex-1 h-11 px-3.5 bg-[#FAFAFA] border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15 transition-colors"
            />
            <button
              type="submit"
              disabled={!inputValue.trim() || isTyping}
              aria-label="Send message"
              className="h-11 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-45 text-white text-xs sm:text-sm font-semibold rounded-xl inline-flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:cursor-default focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
            >
              <span>Send</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>

          <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <ShieldAlert className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>
              Predictions are statistical estimates and prices are simulated Demo Data—Ask Skysync
              AI has no access to live airline fares.
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
