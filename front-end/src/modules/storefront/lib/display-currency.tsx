"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { formatPrice } from "@/core/lib/format";

/** Units of each currency per 1 unit of the restaurant currency (fetched live by the API). */
export type CurrencyRates = Record<string, number>;

export type Money = { amount: number; currency: string };

export type MenuCurrency = {
  /** Currency the owner sets rates against. */
  base: string;
  /** Currencies the customer can pick, base first. Length 1 = no switcher. */
  options: string[];
  /** Currency prices are currently shown in. */
  selected: string;
  select: (code: string) => void;
  /** Converts a price from its own currency to the selected one (unchanged when no rate is known). */
  convert: (amount: number, from: string) => Money;
  /** Formatted price in the selected currency, e.g. "12.5 $". */
  format: (amount: number, from: string) => string;
};

const IDENTITY: MenuCurrency = {
  base: "SYP",
  options: ["SYP"],
  selected: "SYP",
  select: () => {},
  convert: (amount, from) => ({ amount, currency: from }),
  format: (amount, from) => formatPrice(amount, from),
};

const MenuCurrencyContext = createContext<MenuCurrency>(IDENTITY);

export function useMenuCurrency(): MenuCurrency {
  return useContext(MenuCurrencyContext);
}

/** Rates table keyed by currency code, always containing the base at 1. */
function rateTable(base: string, rates: CurrencyRates | null | undefined) {
  const table = new Map<string, number>([[base, 1]]);
  for (const [code, rate] of Object.entries(rates ?? {})) {
    if (code !== base && Number.isFinite(rate) && rate > 0) table.set(code, rate);
  }
  return table;
}

export function convertMoney(
  amount: number,
  from: string,
  to: string,
  table: Map<string, number>
): Money {
  if (from === to) return { amount, currency: from };
  const fromRate = table.get(from);
  const toRate = table.get(to);
  if (!fromRate || !toRate) return { amount, currency: from };
  return { amount: (amount / fromRate) * toRate, currency: to };
}

const STORAGE_PREFIX = "menuhub:currency:";
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function readStored(storageKey: string): string | null {
  try {
    return window.localStorage.getItem(storageKey);
  } catch {
    return null;
  }
}

function writeStored(storageKey: string, code: string) {
  try {
    window.localStorage.setItem(storageKey, code);
  } catch {
    // Storage can be blocked (private mode): the choice then lasts for this render tree only.
  }
  listeners.forEach((listener) => listener());
}

/**
 * Lets the customer view the menu in another currency. The choice is remembered per menu in
 * localStorage; without configured rates it renders prices exactly as stored.
 */
export function MenuCurrencyProvider({
  menuKey,
  base,
  currencies,
  rates,
  children,
}: {
  menuKey: string;
  base: string;
  /** Currencies the owner offers to customers (besides the base one). */
  currencies: string[] | null | undefined;
  rates: CurrencyRates | null | undefined;
  children: ReactNode;
}) {
  const table = useMemo(() => rateTable(base, rates), [base, rates]);
  const options = useMemo(
    () => [base, ...(currencies ?? []).filter((code) => code !== base && table.has(code))],
    [base, currencies, table]
  );
  const storageKey = STORAGE_PREFIX + menuKey;

  const stored = useSyncExternalStore(
    subscribe,
    () => readStored(storageKey),
    () => null
  );
  const selected = stored && options.includes(stored) ? stored : base;

  const select = useCallback(
    (code: string) => {
      if (options.includes(code)) writeStored(storageKey, code);
    },
    [options, storageKey]
  );

  const value = useMemo<MenuCurrency>(() => {
    const convert = (amount: number, from: string) => convertMoney(amount, from, selected, table);
    return {
      base,
      options,
      selected,
      select,
      convert,
      format: (amount, from) => {
        const money = convert(amount, from);
        return formatPrice(money.amount, money.currency);
      },
    };
  }, [base, options, selected, select, table]);

  return <MenuCurrencyContext.Provider value={value}>{children}</MenuCurrencyContext.Provider>;
}
