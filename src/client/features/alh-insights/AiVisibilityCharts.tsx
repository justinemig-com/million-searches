import { useState } from "react";
import { Line, LineChart } from "recharts";
import { sortBy } from "remeda";
import { cn } from "cn";
import {
  ChartGrid,
  ChartXAxis,
  ChartYAxis,
} from "@/client/components/ChartAxes";
import { SectionHeader } from "@/client/components/PageHeader";
import { SegmentedToggle } from "@/client/components/SegmentedToggle";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/client/components/ui/chart";
import type { AiEngine } from "@/shared/ai-visibility";
import {
  runMetrics,
  type AiOverview,
  type BrandMetrics,
} from "./aiVisibilityMetrics";
import { SERIES_COLORS, fmtPct } from "./shared";

const METRICS = [
  { value: "visibility", label: "Visibility", icon: null },
  { value: "sov", label: "Share of voice", icon: null },
  { value: "position", label: "Position", icon: null },
  { value: "firstRate", label: "Named first", icon: null },
  { value: "citationRate", label: "Cited", icon: null },
] as const;
type Metric = (typeof METRICS)[number]["value"];

export const fmtPosition = (value: number | null | undefined) =>
  value == null ? "–" : `#${value.toFixed(1)}`;
const seriesKey = (domain: string) => domain.replace(/[^a-z0-9]/gi, "_");
export const runLabel = (createdAt: string) =>
  new Date(createdAt).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "2-digit",
  });

type Brand = AiOverview["brands"][number];
type Run = AiOverview["runs"][number];

export function TrendChart({
  runs,
  brands,
  engine,
}: {
  runs: Run[];
  brands: Brand[];
  engine: AiEngine | null;
}) {
  const [metric, setMetric] = useState<Metric>("visibility");
  const chartConfig: ChartConfig = Object.fromEntries(
    brands.map((brand, index) => [
      seriesKey(brand.domain),
      {
        label: brand.name,
        color: SERIES_COLORS[index % SERIES_COLORS.length],
      },
    ]),
  );
  const data = runs.flatMap((run) => {
    const metrics = runMetrics(run, engine ? [engine] : null);
    if (!metrics.size) return [];
    return [
      {
        label: runLabel(run.createdAt),
        ...Object.fromEntries(
          brands.map((brand) => {
            const value = metrics.get(brand.domain)?.[metric];
            const scaled =
              value == null
                ? null
                : metric === "position"
                  ? Math.round(value * 10) / 10
                  : Math.round(value * 1000) / 10;
            return [seriesKey(brand.domain), scaled];
          }),
        ),
      },
    ];
  });
  const position = metric === "position";
  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <SectionHeader
          title="Your brand and competitors over time"
          hint="One point per tracker run, over neutral prompts (prompts that name your brand are left out)."
        />
        <SegmentedToggle
          items={[...METRICS]}
          value={metric}
          onChange={setMetric}
          showLabels
        />
      </div>
      {data.length < 2 ? (
        <p className="text-sm text-muted-foreground">
          The trend appears after a second run with answers for this engine.
        </p>
      ) : (
        <ChartContainer
          config={chartConfig}
          className="h-[320px]"
          aria-label={`${metric} by tracker run for your brand and competitors`}
        >
          <LineChart data={data} margin={{ left: 0, right: 12, top: 8 }}>
            <ChartGrid />
            <ChartXAxis dataKey="label" />
            <ChartYAxis
              width={48}
              reversed={position}
              allowDecimals={position}
              tickFormatter={(v: number) => (position ? `#${v}` : `${v}%`)}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <ChartLegend content={<ChartLegendContent />} />
            {brands.map((brand) => (
              <Line
                key={brand.domain}
                type="monotone"
                dataKey={seriesKey(brand.domain)}
                stroke={`var(--color-${seriesKey(brand.domain)})`}
                strokeWidth={brand.own ? 3 : 1.5}
                dot
                connectNulls
              />
            ))}
          </LineChart>
        </ChartContainer>
      )}
    </section>
  );
}

export function ShareOfVoice({
  brands,
  metrics,
}: {
  brands: Brand[];
  metrics: Map<string, BrandMetrics>;
}) {
  const rows = sortBy(brands, [
    (brand) => metrics.get(brand.domain)?.sov ?? 0,
    "desc",
  ]);
  return (
    <section className="space-y-2">
      <SectionHeader
        title="Share of voice"
        hint="Each brand's share of all mentions of the tracked brands in the latest run."
      />
      <div className="space-y-2 rounded-xl border bg-card p-4">
        {rows.map((brand) => {
          const sov = metrics.get(brand.domain)?.sov ?? 0;
          return (
            <div key={brand.domain} className="flex items-center gap-3">
              <span className="w-40 shrink-0 truncate text-sm">
                {brand.name}
              </span>
              <div className="h-3 min-w-0 flex-1 overflow-hidden rounded-sm bg-muted">
                <div
                  className={cn(
                    "h-full rounded-sm",
                    brand.own ? "bg-primary" : "bg-muted-foreground/50",
                  )}
                  style={{ width: `${sov * 100}%` }}
                />
              </div>
              <span className="w-10 shrink-0 text-right text-sm tabular-nums">
                {fmtPct(sov)}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
