import { useState } from "react";
import { Line, LineChart } from "recharts";
import {
  ChartGrid,
  ChartXAxis,
  ChartYAxis,
} from "@/client/components/ChartAxes";
import { SegmentedToggle } from "@/client/components/SegmentedToggle";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/client/components/ui/chart";
import {
  fmtInt,
  monthLabel,
  NotPublished,
  type AlhInsightsData,
} from "./shared";

const SOURCES = [
  { value: "dataforseo", label: "Current", icon: null },
  { value: "dataforseo_history", label: "History", icon: null },
  { value: "gsc_10plus_impressions", label: "GSC (10+ impr.)", icon: null },
] as const;
const SEGMENTS = [
  { value: "non_branded", label: "Non-branded", icon: null },
  { value: "all", label: "All", icon: null },
  { value: "branded", label: "Branded", icon: null },
] as const;
type Source = (typeof SOURCES)[number]["value"];
type Segment = (typeof SEGMENTS)[number]["value"];

const series = [
  { key: "top10", label: "Top 10", color: "#2563eb" },
  { key: "top20", label: "Top 20", color: "#14b8a6" },
  { key: "top50", label: "Top 50", color: "#f59e0b" },
  { key: "top100", label: "Top 100", color: "#94a3b8" },
] as const;
const chartConfig: ChartConfig = Object.fromEntries(
  series.map((s) => [s.key, { label: s.label, color: s.color }]),
);

export function RankingTrendsTab({
  rows,
}: {
  rows: AlhInsightsData["rankBuckets"];
}) {
  const [source, setSource] = useState<Source>("dataforseo_history");
  const [segment, setSegment] = useState<Segment>("non_branded");
  if (!rows.length) return <NotPublished what="ranking trends" />;
  // Domain-level history has no keyword detail, so only "all" exists for it.
  const effectiveSegment = source === "dataforseo_history" ? "all" : segment;
  const data = rows
    .filter((r) => r.source === source && r.brandSegment === effectiveSegment)
    .map((r) => ({ ...r, label: monthLabel(r.month) }));
  const latest = data.at(-1);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <SegmentedToggle
          items={[...SOURCES]}
          value={source}
          onChange={setSource}
          showLabels
        />
        {source !== "dataforseo_history" && (
          <SegmentedToggle
            items={[...SEGMENTS]}
            value={segment}
            onChange={setSegment}
            showLabels
          />
        )}
      </div>
      {latest ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {series.map((s) => (
            <div key={s.key} className="rounded-xl border bg-card p-4">
              <div className="text-xs text-muted-foreground">
                {s.label} · {latest.label}
              </div>
              <div className="text-2xl font-semibold tabular-nums">
                {fmtInt(latest[s.key])}
              </div>
            </div>
          ))}
        </div>
      ) : null}
      {data.length ? (
        <ChartContainer
          config={chartConfig}
          className="h-[280px]"
          aria-label="Keywords ranking in the top 10, 20, 50 and 100 by month"
        >
          <LineChart data={data} margin={{ left: 0, right: 12, top: 8 }}>
            <ChartGrid />
            <ChartXAxis dataKey="label" />
            <ChartYAxis width={56} tickFormatter={(v: number) => fmtInt(v)} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <ChartLegend content={<ChartLegendContent />} />
            {series.map((s) => (
              <Line
                key={s.key}
                type="monotone"
                dataKey={s.key}
                stroke={`var(--color-${s.key})`}
                strokeWidth={2}
                dot={data.length < 30}
              />
            ))}
          </LineChart>
        </ChartContainer>
      ) : (
        <p className="text-sm text-muted-foreground">
          No data for this source and segment yet.
        </p>
      )}
      <p className="text-xs text-muted-foreground">
        GSC top 50 and top 100 counts fall from about September 2025 because
        Google stopped serving 100 results per page to scraping tools; use top
        10 and 20 for GSC trends.
      </p>
    </div>
  );
}
