"use client";

import { cn } from "@/core/lib/cn";
import { currencyName, currencySymbol } from "@/core/lib/format";
import { useMenuCurrency } from "@/modules/storefront/lib/display-currency";

/** Lets the customer see every price in another currency. Hidden when the owner set no rates. */
export function PublicCurrencySwitcher({ className }: { className?: string }) {
  const { options, selected, select } = useMenuCurrency();

  if (options.length < 2) return null;

  return (
    <div
      role="radiogroup"
      aria-label="عملة العرض"
      className={cn("flex items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none]", className)}
    >
      <span className="shrink-0 text-xs font-bold opacity-60">العملة</span>
      {options.map((code) => {
        const active = code === selected;
        return (
          <button
            key={code}
            type="button"
            role="radio"
            aria-checked={active}
            title={currencyName(code)}
            onClick={() => select(code)}
            className={cn(
              "flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-xs font-bold ring-1 transition-colors",
              active
                ? "bg-[var(--mh-primary)] text-white ring-[var(--mh-primary)]"
                : "bg-white text-zinc-700 ring-black/10 hover:bg-zinc-50"
            )}
          >
            <span dir="ltr">{currencySymbol(code)}</span>
            <span dir="ltr">{code}</span>
          </button>
        );
      })}
    </div>
  );
}
