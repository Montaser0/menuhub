"use client";

import { MENU_CURRENCIES, currencyName, currencySymbol } from "@/core/lib/format";
import { cn } from "@/core/lib/cn";

/** Lets the owner pick which currencies customers can switch to; rates are fetched automatically. */
export function DisplayCurrenciesEditor({
  baseCurrency,
  selected,
  onChange,
}: {
  baseCurrency: string;
  selected: string[];
  onChange: (codes: string[]) => void;
}) {
  const available = MENU_CURRENCIES.filter((item) => item.value !== baseCurrency);

  function toggle(code: string) {
    onChange(selected.includes(code) ? selected.filter((item) => item !== code) : [...selected, code]);
  }

  return (
    <div className="grid gap-3">
      <div>
        <p className="text-sm font-bold text-zinc-900">عملات إضافية للزبائن</p>
        <p className="mt-1 text-xs leading-relaxed text-zinc-500">
          اختر العملات التي يستطيع الزبون عرض المنيو بها. يتم احتساب سعر الصرف تلقائياً وتحديثه كل
          عدة ساعات، ولا حاجة لإدخاله. أسعار المنتجات تبقى بعملتها الأصلية والتحويل للعرض فقط.
        </p>
        <p className="mt-1 text-xs text-zinc-500">
          عملة النشاط الحالية: <strong>{currencyName(baseCurrency)}</strong>. اترك الاختيار فارغاً لإخفاء زر التبديل.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {available.map((item) => {
          const active = selected.includes(item.value);
          return (
            <button
              key={item.value}
              type="button"
              aria-pressed={active}
              onClick={() => toggle(item.value)}
              className={cn(
                "flex h-10 items-center gap-2 rounded-xl border px-3.5 text-sm font-medium transition-colors",
                active
                  ? "border-teal-700 bg-teal-700 text-white"
                  : "border-zinc-200 bg-white text-zinc-800 hover:bg-zinc-50"
              )}
            >
              <span dir="ltr">{currencySymbol(item.value)}</span>
              {item.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
