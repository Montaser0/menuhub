"use client";

import { currencyName, formatPrice } from "@/core/lib/format";
import { useMenuCurrency } from "@/modules/storefront/lib/display-currency";
import type { ProductWithRelations } from "@/modules/catalog/types";
import { PublicQtyStepper } from "@/modules/storefront/components/public-qty-stepper";
import { stockCap } from "@/modules/catalog/lib/stock";
import { PublicSheet } from "@/modules/storefront/components/public-sheet";
import { CartIcon, TrashIcon, UtensilsIcon } from "@/core/ui/icons";

export type PublicCartItem = {
  product: ProductWithRelations;
  quantity: number;
};

export function PublicCartSheet({
  open,
  onOpenChange,
  items,
  onQuantityChange,
  onRemove,
  onClear,
  onCheckout,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: PublicCartItem[];
  onQuantityChange: (productId: string, next: number) => void;
  onRemove: (productId: string) => void;
  onClear: () => void;
  onCheckout: () => void;
}) {
  const { convert, selected } = useMenuCurrency();
  const total = items.reduce(
    (sum, item) =>
      sum +
      (item.product.price != null
        ? convert(item.product.price, item.product.currency).amount
        : 0) *
        item.quantity,
    0
  );
  const first = items[0]?.product;
  const currency = first ? convert(0, first.currency).currency : selected;
  const converted = items.some((item) => item.product.currency !== currency);

  return (
    <PublicSheet
      open={open}
      onOpenChange={onOpenChange}
      title="سلة التسوق"
      icon={CartIcon}
      size="md"
      footer={
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={items.length === 0}
            onClick={onCheckout}
            className="h-12 rounded-xl bg-[var(--mh-primary)] text-sm font-bold text-white disabled:opacity-50"
          >
            متابعة الطلب
          </button>
          <button
            type="button"
            disabled={items.length === 0}
            onClick={onClear}
            className="h-12 rounded-xl bg-zinc-700 text-sm font-bold text-white disabled:opacity-50"
          >
            مسح السلة
          </button>
        </div>
      }
    >
      {items.length === 0 ? (
        <p className="py-10 text-center text-sm opacity-60">السلة فارغة</p>
      ) : (
        <div className="grid gap-3">
          {items.map(({ product, quantity }) => {
            const unit =
              product.price != null ? convert(product.price, product.currency) : null;
            return (
              <div
                key={product.id}
                className="flex items-center gap-2 rounded-2xl border border-zinc-100 bg-white p-3 shadow-sm"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--mh-primary)]/10 text-[var(--mh-primary)]">
                  <UtensilsIcon className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{product.name_ar}</p>
                  <p className="mt-0.5 text-[11px] text-zinc-500">
                    {unit == null
                      ? `الكمية: ${quantity}`
                      : `${formatPrice(unit.amount, unit.currency)} × ${quantity} = ${formatPrice(unit.amount * quantity, unit.currency)}`}
                  </p>
                </div>
                <PublicQtyStepper
                  variant="cart"
                  value={quantity}
                  max={stockCap(product)}
                  onChange={(next) => onQuantityChange(product.id, next)}
                />
                <button
                  type="button"
                  onClick={() => onRemove(product.id)}
                  className="flex size-8 shrink-0 items-center justify-center rounded-full bg-red-500 text-white"
                  aria-label={`حذف ${product.name_ar}`}
                >
                  <TrashIcon className="size-3.5" />
                </button>
              </div>
            );
          })}
          <div className="rounded-xl bg-zinc-100 px-4 py-3 text-sm font-bold">
            المجموع: {formatPrice(total, currency)}
          </div>
          {converted ? (
            <p className="text-[11px] leading-relaxed text-zinc-500">
              الأسعار بـ{currencyName(currency)} تقريبية حسب سعر الصرف المعتمد في المنيو، ويُسجَّل الطلب
              بالعملة الأصلية للمنتجات.
            </p>
          ) : null}
        </div>
      )}
    </PublicSheet>
  );
}
