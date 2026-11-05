import { Line, LineChart } from "recharts";
import {
  ChartGrid,
  ChartXAxis,
  ChartYAxis,
} from "@/client/components/ChartAxes";
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
  fmtUsd,
  monthLabel,
  NotPublished,
  type AlhInsightsData,
} from "./shared";

const chartConfig: ChartConfig = {
  trafficValueUsd: { label: "Total", color: "#2563eb" },
  nonBrandedTrafficValueUsd: { label: "Non-branded", color: "#14b8a6" },
};

export function TrafficValueTab({
  rows,
}: {
  rows: AlhInsightsData["trafficValue"];
}) {
  if (!rows.length) return <NotPublished what="traffic value" />;
  const data = rows.map((r) => ({ ...r, label: monthLabel(r.month) }));
  const latest = data.at(-1)!;
  const cards = [
    { label: "Organic traffic value", value: fmtUsd(latest.trafficValueUsd) },
    {
      label: "Non-branded value",
      value: fmtUsd(latest.nonBrandedTrafficValueUsd),
    },
    { label: "Est. organic visits", value: fmtInt(latest.estOrganicTraffic) },
    { label: "Ranked keywords", value: fmtInt(latest.rankedKeywords) },
  ];
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        What this site&apos;s organic traffic would cost as Google Ads clicks
        (estimated monthly traffic × cost per click), from the monthly
        DataForSEO snapshot. {latest.label}.
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-xl border bg-card p-4">
            <div className="text-xs text-muted-foreground">{c.label}</div>
            <div className="text-2xl font-semibold tabular-nums">{c.value}</div>
          </div>
        ))}
      </div>
      {data.length > 1 ? (
        <ChartContainer
          config={chartConfig}
          className="h-[240px]"
          aria-label="Organic traffic value by month"
        >
          <LineChart data={data} margin={{ left: 0, right: 12, top: 8 }}>
            <ChartGrid />
            <ChartXAxis dataKey="label" />
            <ChartYAxis width={64} tickFormatter={(v: number) => fmtUsd(v)} />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  valueFormatter={(v) => fmtUsd(Number(v))}
                />
              }
            />
            <ChartLegend content={<ChartLegendContent />} />
            <Line
              type="monotone"
              dataKey="trafficValueUsd"
              stroke="var(--color-trafficValueUsd)"
              strokeWidth={2}
            />
            <Line
              type="monotone"
              dataKey="nonBrandedTrafficValueUsd"
              stroke="var(--color-nonBrandedTrafficValueUsd)"
              strokeWidth={2}
            />
          </LineChart>
        </ChartContainer>
      ) : (
        <p className="text-sm text-muted-foreground">
          The trend chart appears once a second month is published.
        </p>
      )}
    </div>
  );
}
