import React from 'react';

const COMPANIES = ["IndianOil", "HP Gas", "Bharat Gas"];

export default function PriceTicker({ mapPrices = {} }) {
  const items = Object.entries(mapPrices).flatMap(([city, companies]) => {
    const prices = COMPANIES.map(c => companies[c]?.price).filter(Boolean);
    if (!prices.length) return [];
    
    // Find the cheapest active price in the city
    const cheapest = Math.min(...prices);
    
    // Determine color based on price thresholds
    const color = cheapest < 880 ? "var(--status-clear)" : cheapest < 930 ? "var(--status-early)" : "var(--status-severe)";
    return [{ city, price: cheapest, color }];
  });

  if (!items.length) {
    return (
      <div className="w-full h-10 border border-border rounded-[var(--radius-sm)] flex items-center px-4 bg-bg-inset mb-6 overflow-hidden">
        <div className="h-4 w-full bg-border rounded opacity-40 animate-pulse" />
      </div>
    );
  }

  // Double the sequence to allow CSS endless marquee
  const doubled = [...items, ...items];

  return (
    <div className="w-full bg-bg-inset border border-border rounded-[var(--radius-sm)] overflow-hidden mb-8 h-12 flex items-center relative" aria-label="LPG prices ticker">
      {/* Absolute fade masks on the left and right edges */}
      <div className="absolute top-0 left-0 w-8 h-full bg-gradient-to-r from-bg-inset to-transparent z-10" />
      <div className="absolute top-0 right-0 w-8 h-full bg-gradient-to-l from-bg-inset to-transparent z-10" />
      
      <div className="flex animate-[marquee_30s_linear_infinite] whitespace-nowrap" style={{ '--tw-translate-x': '-50%' }}>
        {doubled.map(({ city, price, color }, i) => (
          <span key={`${city}-${i}`} className="inline-flex items-center mx-4 gap-2">
            <span className="text-[12px] font-bold text-text-secondary uppercase tracking-wider font-body">{city}</span>
            <span className="text-[14px] font-bold font-data" style={{ color }}>₹{price}</span>
            <span className="text-border ml-4">&middot;</span>
          </span>
        ))}
      </div>
    </div>
  );
}
