import { Check, X } from "lucide-react";

export type CartNotificationProps = {
  productName: string | null;
  isVisible: boolean;
  onDismiss: () => void;
};

export function CartNotification({
  productName,
  isVisible,
  onDismiss,
}: CartNotificationProps) {
  if (!productName && !isVisible) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed bottom-4 left-1/2 z-50 flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 items-center justify-between gap-3 rounded-2xl border border-primary/30 bg-[#161820]/95 px-4 py-3 shadow-[0_12px_40px_rgba(0,0,0,0.6)] backdrop-blur-md transition-all duration-300 ease-out sm:bottom-6 sm:w-auto sm:min-w-[420px] ${
        isVisible
          ? "translate-y-0 opacity-100 scale-100 pointer-events-auto"
          : "translate-y-6 opacity-0 scale-95 pointer-events-none"
      }`}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-[0_0_8px_rgba(16,185,129,0.3)]">
          <Check className="h-4 w-4 stroke-[2.5]" aria-hidden="true" />
        </div>
        <div className="flex min-w-0 flex-col">
          <p className="text-xs font-bold text-white sm:text-sm">
            ✓ Produto adicionado ao carrinho!
          </p>
          <p className="truncate text-xs font-medium text-slate-300">
            {productName}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <a
          href="/carrinho"
          onClick={onDismiss}
          className="inline-flex items-center justify-center rounded-xl bg-ember px-3.5 py-1.5 text-xs font-bold text-primary-foreground shadow-md transition-transform hover:scale-105 active:scale-95"
        >
          Ver carrinho
        </a>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Fechar notificação"
          className="text-slate-400 hover:text-white transition-colors cursor-pointer p-1"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
