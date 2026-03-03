import { X } from "lucide-react";

import { cn } from "@/lib/utils";

interface FloatingModalCloseButtonProps {
  readonly onClick: () => void;
  readonly ariaLabel: string;
  readonly disabled?: boolean;
  readonly testId?: string;
  readonly className?: string;
}

export function FloatingModalCloseButton({
  onClick,
  ariaLabel,
  disabled = false,
  testId,
  className,
}: FloatingModalCloseButtonProps): JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      data-testid={testId}
      className={cn(
        "fixed right-3 top-3 z-[60] flex size-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 shadow-[0_12px_24px_rgba(15,23,42,0.14)] transition hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60 md:right-5 md:top-5 md:size-12",
        className,
      )}
      aria-label={ariaLabel}
    >
      <X size={20} />
    </button>
  );
}
