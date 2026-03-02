import { type ReactNode } from "react";

import { cn } from "@/lib/utils";

interface ProductDisplayCardProps {
  readonly as?: "article" | "button";
  readonly disabled?: boolean;
  readonly testId?: string;
  readonly onClick?: () => void;
  readonly headerLeft?: ReactNode;
  readonly headerRight?: ReactNode;
  readonly media: ReactNode;
  readonly title: ReactNode;
  readonly subtitle?: ReactNode;
  readonly supporting?: ReactNode;
  readonly details?: ReactNode;
  readonly footer?: ReactNode;
  readonly className?: string;
  readonly contentClassName?: string;
  readonly mediaClassName?: string;
  readonly titleClassName?: string;
  readonly subtitleClassName?: string;
}

export function ProductDisplayCard({
  as = "article",
  disabled = false,
  testId,
  onClick,
  headerLeft,
  headerRight,
  media,
  title,
  subtitle,
  supporting,
  details,
  footer,
  className,
  contentClassName,
  mediaClassName,
  titleClassName,
  subtitleClassName,
}: ProductDisplayCardProps): JSX.Element {
  const lowerSection =
    details || footer ? (
      <div className="mt-auto flex flex-col gap-2.5">
        {details}
        {footer}
      </div>
    ) : null;

  const content = (
    <div className={cn("flex h-full min-h-[24.5rem] flex-col gap-4 p-4 md:p-5", contentClassName)}>
      {headerLeft || headerRight ? (
        <div className="flex min-h-[2.5rem] items-start justify-between gap-3">
          <div className="min-w-0">{headerLeft}</div>
          <div className="shrink-0">{headerRight}</div>
        </div>
      ) : null}

      <div
        className={cn(
          "flex h-[9.5rem] items-center justify-center overflow-hidden rounded-[1.35rem] bg-slate-100 p-3 lg:h-[10rem]",
          mediaClassName,
        )}
      >
        {media}
      </div>

      <div className="flex min-h-[5.75rem] flex-col gap-2">
        <div
          className={cn(
            "text-[1.02rem] leading-[1.12] font-semibold tracking-tight text-slate-900",
            titleClassName,
          )}
        >
          {title}
        </div>
        {subtitle ? (
          <div className={cn("text-sm leading-tight text-slate-500", subtitleClassName)}>
            {subtitle}
          </div>
        ) : null}
        {supporting ? <div>{supporting}</div> : null}
      </div>

      {lowerSection}
    </div>
  );

  const rootClassName = cn(
    "overflow-hidden rounded-[1.6rem] border border-slate-200 bg-white shadow-[0_14px_30px_rgba(15,23,42,0.07)]",
    as === "button" &&
      "w-full text-left transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70",
    className,
  );

  if (as === "button") {
    return (
      <button
        type="button"
        data-testid={testId}
        onClick={onClick}
        disabled={disabled}
        className={rootClassName}
      >
        {content}
      </button>
    );
  }

  return (
    <article data-testid={testId} className={rootClassName}>
      {content}
    </article>
  );
}
