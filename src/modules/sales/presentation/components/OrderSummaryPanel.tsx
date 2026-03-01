export interface OrderSummaryItem {
  readonly id: string;
  readonly name: string;
  readonly price: number;
  readonly quantity: number;
  readonly emoji: string;
  readonly imageUrl?: string;
}

interface OrderSummaryPanelProps {
  readonly items: readonly OrderSummaryItem[];
  readonly subtotal: number;
}

function currency(amount: number): string {
  return `$${amount.toFixed(0)}`;
}

export function OrderSummaryPanel({
  items,
  subtotal,
}: OrderSummaryPanelProps): JSX.Element {
  const total = subtotal;

  return (
    <section className="flex h-full flex-col rounded-[2rem] bg-white/95 p-5 shadow-xl shadow-slate-300/30 lg:p-6">
      <header className="mb-4 flex items-baseline justify-between">
        <h2 className="text-3xl font-semibold tracking-tight text-slate-900">
          Order List
        </h2>
        <p className="text-xs text-slate-500">MVP Demo</p>
      </header>

      <div className="max-h-[32rem] space-y-3 overflow-y-auto pr-1">
        {items.map((item) => (
          <article
            key={item.id}
            className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm"
          >
            <div className="flex items-center gap-3">
              <div className="flex size-12 items-center justify-center rounded-full bg-slate-100 text-xl">
                {item.imageUrl ? (
                  <span
                    role="img"
                    aria-label={item.name}
                    className="size-full rounded-full bg-cover bg-center"
                    style={{ backgroundImage: `url(${item.imageUrl})` }}
                  />
                ) : (
                  <span aria-hidden>{item.emoji}</span>
                )}
              </div>
              <div className="flex-1">
                <p className="text-base font-semibold text-slate-900">{item.name}</p>
                <p className="text-sm text-slate-500">{currency(item.price)}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="flex min-h-11 min-w-11 items-center justify-center rounded-full border border-slate-300 text-lg font-semibold"
                  aria-label={`decrease ${item.name}`}
                >
                  -
                </button>
                <span className="w-5 text-center text-sm font-semibold text-slate-900">
                  {item.quantity}
                </span>
                <button
                  type="button"
                  className="flex min-h-11 min-w-11 items-center justify-center rounded-full bg-blue-500 text-lg font-semibold text-white"
                  aria-label={`increase ${item.name}`}
                >
                  +
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>

      <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-sm font-semibold text-slate-700">Payment Method</p>
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            className="min-h-11 flex-1 rounded-xl bg-blue-500 px-3 text-sm font-semibold text-white"
          >
            Cash
          </button>
          <button
            type="button"
            className="min-h-11 flex-1 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700"
          >
            On account
          </button>
        </div>
      </div>

      <footer className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
        <div className="space-y-2 text-sm text-slate-600">
          <div className="flex items-center justify-between">
            <span>Subtotal</span>
            <span className="font-semibold text-slate-900">{currency(subtotal)}</span>
          </div>
        </div>

        <div className="mt-4 border-t border-slate-200 pt-3">
          <div className="flex items-center justify-between">
            <p className="text-base font-semibold text-slate-700">Total</p>
            <p className="text-3xl font-bold text-slate-900">{currency(total)}</p>
          </div>
          <button
            type="button"
            className="mt-4 min-h-12 w-full rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white shadow-lg shadow-blue-900/30"
          >
            Proceed to payment
          </button>
        </div>
      </footer>
    </section>
  );
}
