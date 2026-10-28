import { ChevronDown } from 'lucide-react';
import { useState } from 'react';

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

export const SKYSYNC_FAQ_ITEMS: FaqItem[] = [
  {
    id: 'what-is-skysync',
    question: '1. What is Skysync?',
    answer:
      'Skysync is a travel-tech hackathon prototype designed to help flyers see the true payable cost of domestic flights upfront, compare total prices across booking platforms, evaluate 3- and 7-day fare trends, and track target prices before deciding to book.',
  },
  {
    id: 'how-final-price-calculated',
    question: '2. How does Skysync calculate the final flight price?',
    answer:
      'For every flight quote, Skysync combines the airline base fare, statutory 5% aviation GST, mandatory airport fees (UDF, PSF, and Aviation Security Fees), platform convenience/gateway surcharges, and any optional baggage or seat add-ons you select, then subtracts verified instant discounts. If a platform hides a mandatory fee at search time, Skysync flags it as Unknown and applies a conservative comparison buffer rather than assuming ₹0.',
  },
  {
    id: 'why-advertised-differs',
    question: '3. Why can the advertised fare differ from the final price?',
    answer:
      'Many booking portals rank results using stripped-down headline fares that exclude airport development fees, payment gateway convenience charges (often ₹300–₹550 per traveller), or higher seat and baggage markups until the final card step. That means the #1 advertised teaser fare frequently ends up costing more at checkout than a transparent competitor.',
  },
  {
    id: 'live-or-simulated',
    question: '4. Are the flight prices live or simulated?',
    answer:
      'All flight schedules, provider quotes, price updates, and historical series in this prototype use deterministic simulated Demo Data. Skysync does not scrape live airline websites or connect to live GDS inventory in this hackathon build, though its adapter architecture is structured for future authorized travel API integration.',
  },
  {
    id: 'how-prediction-works',
    question: '5. How does fare prediction work?',
    answer:
      'Skysync applies Holt’s linear exponential smoothing across 30 days of historical Demo Data route observations, combined with residual volatility bands and advance-purchase window timing, to estimate 3-day and 7-day fare ranges and classify trends as Rising, Stable, or Potentially falling.',
  },
  {
    id: 'can-guarantee-fall',
    question: '6. Can Skysync guarantee that prices will fall?',
    answer:
      'No. Airline pricing depends on real-time seat-bucket inventory, sudden demand spikes, holidays, and fuel surcharges that statistical baselines cannot predict with certainty. Skysync provides cautious guidance (“Book now,” “Monitor fare,” or “Compare alternatives”) alongside explicit uncertainty bands—never guaranteed savings.',
  },
  {
    id: 'how-price-alerts-work',
    question: '7. How do price alerts work?',
    answer:
      'You can save any route and set a target real payable price in the Smart Price Tracker. Saved routes persist in your browser’s localStorage across page refreshes. During a live demo, clicking “Simulate price update” records a simulated market observation and triggers an on-screen alert banner once the fare meets or drops below your target.',
  },
  {
    id: 'does-skysync-book-directly',
    question: '8. Does Skysync book flights directly?',
    answer:
      'No. Skysync is an independent fare-audit and comparison prototype, not a ticketing agency or payment gateway. Clicking “Select” opens a pre-booking fare reconciliation summary showing what you would expect to pay on the chosen platform in a production handoff.',
  },
  {
    id: 'is-baggage-included',
    question: '9. Is baggage included in the displayed price?',
    answer:
      'Standard domestic Demo Data quotes include 7 kg cabin baggage and 15 kg check-in baggage per adult. If you need extra +15 kg or +25 kg check-in luggage—or paid seat selection—you can toggle those add-ons once at the top of Compare Fares and every platform’s displayed total updates immediately.',
  },
  {
    id: 'is-skysync-free',
    question: '10. Is Skysync free to use?',
    answer:
      'Yes. This student hackathon prototype is completely free to use in your browser, requires no account sign-up, and relies on zero paid external APIs or hidden subscription fees.',
  },
];

export function FaqSection() {
  // Multi-open accessible accordion with first item open by default for immediate clarity
  const [openIds, setOpenIds] = useState<Record<string, boolean>>({
    'what-is-skysync': true,
    'live-or-simulated': true,
  });

  const allExpanded = SKYSYNC_FAQ_ITEMS.every((item) => Boolean(openIds[item.id]));

  const toggleItem = (id: string) => {
    setOpenIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const toggleAll = () => {
    if (allExpanded) {
      setOpenIds({});
    } else {
      const next: Record<string, boolean> = {};
      for (const item of SKYSYNC_FAQ_ITEMS) {
        next[item.id] = true;
      }
      setOpenIds(next);
    }
  };

  return (
    <section
      id="faq"
      aria-labelledby="faq-heading"
      className="scroll-mt-20 space-y-6"
    >
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div className="space-y-1.5 max-w-2xl">
          <p className="text-xs font-medium text-slate-500">
            04. Frequently Asked Questions · Prototype Transparency
          </p>
          <h2
            id="faq-heading"
            className="font-display text-2xl sm:text-3xl font-bold text-slate-900"
          >
            How Skysync Works
          </h2>
          <p className="text-sm text-slate-600">
            Straightforward answers on fare math, simulated Demo Data, statistical forecasting, and
            price alerts.
          </p>
        </div>

        <button
          type="button"
          onClick={toggleAll}
          className="self-start sm:self-end text-xs font-semibold text-blue-700 hover:text-blue-800 underline underline-offset-4 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        >
          {allExpanded ? 'Collapse all answers' : 'Expand all 10 answers'}
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl divide-y divide-slate-200 overflow-hidden">
        {SKYSYNC_FAQ_ITEMS.map((item) => {
          const isOpen = Boolean(openIds[item.id]);
          const buttonId = `faq-btn-${item.id}`;
          const panelId = `faq-panel-${item.id}`;

          return (
            <div key={item.id} className="transition-colors hover:bg-slate-50/50">
              <h3>
                <button
                  id={buttonId}
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  onClick={() => toggleItem(item.id)}
                  className="w-full px-5 sm:px-6 py-4 text-left flex items-center justify-between gap-4 text-sm sm:text-base font-semibold text-slate-900 cursor-pointer focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-blue-600"
                >
                  <span>{item.question}</span>
                  <ChevronDown
                    aria-hidden="true"
                    className={`w-4 h-4 text-slate-500 shrink-0 transition-transform duration-200 ${
                      isOpen ? 'rotate-180 text-blue-600' : 'rotate-0'
                    }`}
                  />
                </button>
              </h3>

              <div
                id={panelId}
                role="region"
                aria-labelledby={buttonId}
                className={`grid transition-[grid-template-rows,opacity] duration-200 ease-out ${
                  isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                }`}
              >
                <div className="overflow-hidden">
                  <p className="px-5 sm:px-6 pb-5 text-sm text-slate-600 leading-relaxed max-w-4xl">
                    {item.answer}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
