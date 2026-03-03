"use client";

import * as React from "react";
import * as RechartsPrimitive from "recharts";
import type {
  NameType,
  ValueType,
} from "recharts/types/component/DefaultTooltipContent";
import type { TooltipContentProps } from "recharts/types/component/Tooltip";

import { cn } from "@/lib/utils";

export interface ChartConfigItem {
  readonly label?: React.ReactNode;
  readonly color?: string;
}

export type ChartConfig = Record<string, ChartConfigItem>;

const ChartContext = React.createContext<{ config: ChartConfig } | null>(null);

function useChart(): { config: ChartConfig } {
  const context = React.useContext(ChartContext);

  if (!context) {
    throw new Error("Chart components must be used inside <ChartContainer />.");
  }

  return context;
}

function ChartStyle({
  id,
  config,
}: {
  readonly id: string;
  readonly config: ChartConfig;
}): JSX.Element | null {
  const colorEntries = Object.entries(config).filter(
    ([, value]) => typeof value.color === "string" && value.color.length > 0,
  );

  if (colorEntries.length === 0) {
    return null;
  }

  const cssVariables = colorEntries
    .map(([key, value]) => `--color-${key}: ${value.color};`)
    .join("\n");

  return (
    <style
      dangerouslySetInnerHTML={{
        __html: `[data-chart="${id}"] { ${cssVariables} }`,
      }}
    />
  );
}

export const ChartContainer = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & {
    readonly config: ChartConfig;
    readonly children: React.ComponentProps<
      typeof RechartsPrimitive.ResponsiveContainer
    >["children"];
  }
>(({ id, className, children, config, ...props }, ref) => {
  const uniqueId = React.useId().replace(/:/g, "");
  const chartId = `chart-${id ?? uniqueId}`;

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        ref={ref}
        data-chart={chartId}
        className={cn(
          "h-full w-full text-xs",
          "[&_.recharts-cartesian-axis-tick_text]:fill-slate-400",
          "[&_.recharts-cartesian-grid_line]:stroke-slate-200",
          "[&_.recharts-curve.recharts-tooltip-cursor]:stroke-slate-300",
          "[&_.recharts-polar-grid_[stroke='#ccc']]:stroke-slate-200",
          "[&_.recharts-reference-line_[stroke='#ccc']]:stroke-slate-200",
          className,
        )}
        {...props}
      >
        <ChartStyle id={chartId} config={config} />
        <RechartsPrimitive.ResponsiveContainer>
          {children}
        </RechartsPrimitive.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  );
});

ChartContainer.displayName = "ChartContainer";

export const ChartTooltip = RechartsPrimitive.Tooltip;

interface ChartTooltipContentProps
  extends Partial<TooltipContentProps<ValueType, NameType>> {
  readonly className?: string;
  readonly hideLabel?: boolean;
}

export function ChartTooltipContent({
  active,
  payload,
  className,
  label,
  labelFormatter,
  formatter,
  hideLabel = false,
}: ChartTooltipContentProps): JSX.Element | null {
  const { config } = useChart();

  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const resolvedLabel =
    hideLabel || label === undefined
      ? null
      : labelFormatter
        ? labelFormatter(label, payload)
        : label;

  return (
    <div
      className={cn(
        "min-w-[12rem] rounded-2xl border border-slate-200 bg-white/96 px-3 py-2.5 shadow-[0_16px_36px_rgba(15,23,42,0.14)] backdrop-blur",
        className,
      )}
    >
      {resolvedLabel ? (
        <div className="mb-2 text-[0.75rem] font-semibold uppercase tracking-[0.14em] text-slate-500">
          {resolvedLabel}
        </div>
      ) : null}

      <div className="space-y-2">
        {payload.map((item, index) => {
          if (!item || item.value === undefined || item.value === null) {
            return null;
          }

          const dataKey = typeof item.dataKey === "string" ? item.dataKey : `value-${index}`;
          const itemConfig = config[dataKey];
          const indicatorColor =
            item.color ??
            item.fill ??
            `var(--color-${dataKey}, hsl(var(--chart-${(index % 5) + 1})))`;
          const defaultValue =
            typeof item.value === "number"
              ? item.value.toLocaleString("es-AR")
              : String(item.value);
          const renderedValue = formatter
            ? formatter(item.value, item.name ?? dataKey, item, index, item.payload)
            : defaultValue;

          return (
            <div key={`${dataKey}-${index}`} className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <span
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: indicatorColor }}
                  aria-hidden
                />
                <span className="truncate text-sm font-medium text-slate-600">
                  {itemConfig?.label ?? item.name ?? dataKey}
                </span>
              </div>
              <span className="text-sm font-semibold text-slate-950">{renderedValue}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export const ChartLegend = RechartsPrimitive.Legend;

export function ChartLegendContent({
  payload,
  className,
}: React.ComponentProps<"div"> & {
  readonly payload?: readonly RechartsPrimitive.LegendPayload[];
}): JSX.Element | null {
  const { config } = useChart();

  if (!payload || payload.length === 0) {
    return null;
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-3", className)}>
      {payload.map((item, index) => {
        const dataKey =
          typeof item.dataKey === "string" ? item.dataKey : `legend-${index}`;
        const itemConfig = config[dataKey];

        return (
          <div key={`${dataKey}-${index}`} className="flex items-center gap-2">
            <span
              className="size-2.5 rounded-full"
              style={{ backgroundColor: item.color ?? `var(--color-${dataKey})` }}
              aria-hidden
            />
            <span className="text-sm font-medium text-slate-600">
              {itemConfig?.label ?? item.value ?? dataKey}
            </span>
          </div>
        );
      })}
    </div>
  );
}
