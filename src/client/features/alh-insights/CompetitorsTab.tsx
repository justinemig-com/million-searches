import { useState } from "react";
import { Line, LineChart } from "recharts";
import { sortBy } from "remeda";
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
import {
  Table,
  TableBody,
  TableCard,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/client/components/ui/table";
import {
  fmtInt,
  fmtPct,
  monthLabel,
  NotPublished,
  OwnerBadge,
  type AlhInsightsData,
} from "./shared";

const SEGMENTS = [
  { value: "non_branded", label: "Non-branded", icon: null },
  { value: "all", label: "All", icon: null },
] as const;
type Segment = (typeof SEGMENTS)[number]["value"];

// Your sites in blues/teals, competitors in warm and neutral tones.
const OWN_COLORS = ["#2563eb", "#14b8a6", "#7c3aed", "#0ea5e9", "#22c55e"];
const COMPETITOR_COLORS = [
  "#f59e0b",
  "#ef4444",
  "#a16207",
  "#ec4899",
  "#64748b",
  "#f97316",
  "#78716c",
  "#be123c",
];

type Row = AlhInsightsData["competitorBenchmark"][number];

function seriesKey(domain: string) {
  return domain.replace(/[^a-z0-9]/gi, "_");
}

function TrendChart({ rows }: { rows: Row[] }) {
  const history = rows.filter((r) => r.source === "dataforseo_history");
  if (!history.length) return null;
  const sites = sortBy(
    [...new Map(history.map((r) => [r.domain, r])).values()],
    (s) => s.isCompetitor,
  );
  let own = 0;
  let competitor = 0;
  const chartConfig: ChartConfig = Object.fromEntries(
    sites.map((s) => [
      seriesKey(s.domain),
      {
        label: s.name,
        color: s.isCompetitor
          ? COMPETITOR_COLORS[competitor++ % COMPETITOR_COLORS.length]
          : OWN_COLORS[own++ % OWN_COLORS.length],
      },
    ]),
  );
  const byMonth = new Map<string, Record<string, number | string | null>>();
  for (const r of history) {
    const point = byMonth.get(r.month) ?? { label: monthLabel(r.month) };
    point[seriesKey(r.domain)] = r.top10;
    byMonth.set(r.month, point);
  }
  const data = sortBy([...byMonth.entries()], ([month]) => month).map(
    ([, point]) => point,
  );
  return (
    <section className="space-y-2">
      <SectionHeader
        title="Top 10 keywords over time"
        hint="DataForSEO monthly history, all keywords (history has no branded split)."
      />
      <ChartContainer
        config={chartConfig}
        className="h-[320px]"
        aria-label="Keywords in the top 10 by month for your sites and competitors"
      >
        <LineChart data={data} margin={{ left: 0, right: 12, top: 8 }}>
          <ChartGrid />
          <ChartXAxis dataKey="label" />
          <ChartYAxis width={64} tickFormatter={(v: number) => fmtInt(v)} />
          <ChartTooltip content={<ChartTooltipContent />} />
          <ChartLegend content={<ChartLegendContent />} />
          {sites.map((s) => (
            <Line
              key={s.domain}
              type="monotone"
              dataKey={seriesKey(s.domain)}
              stroke={`var(--color-${seriesKey(s.domain)})`}
              strokeWidth={s.isCompetitor ? 1.5 : 2.5}
              dot={false}
              connectNulls
            />
          ))}
        </LineChart>
      </ChartContainer>
    </section>
  );
}

export function CompetitorsTab({
  rows,
  domain,
}: {
  rows: AlhInsightsData["competitorBenchmark"];
  domain: string | null;
}) {
  const [segment, setSegment] = useState<Segment>("non_branded");
  const snapshot = rows.filter((r) => r.source === "dataforseo");
  if (!snapshot.length) return <NotPublished what="competitor benchmark" />;
  const month = snapshot.reduce((m, r) => (r.month > m ? r.month : m), "");
  const table = sortBy(
    snapshot.filter((r) => r.month === month && r.brandSegment === segment),
    [(r) => r.top10 ?? 0, "desc"],
  );
  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <SectionHeader
            title={`Organic benchmark · ${monthLabel(month)}`}
            hint="Keywords each site ranks for in Google US, and its share of all benchmarked sites' rankings."
          />
          <SegmentedToggle
            items={[...SEGMENTS]}
            value={segment}
            onChange={setSegment}
            showLabels
          />
        </div>
        <TableCard>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Site</TableHead>
                <TableHead className="text-right">Top 3</TableHead>
                <TableHead className="text-right">Top 10</TableHead>
                <TableHead className="text-right">Top 20</TableHead>
                <TableHead className="text-right">Top 100</TableHead>
                <TableHead className="text-right">Est. traffic</TableHead>
                <TableHead className="text-right">Share of top 10</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {table.map((r) => (
                <TableRow
                  key={r.id}
                  className={r.domain === domain ? "bg-muted/50" : undefined}
                >
                  <TableCell className="font-medium">
                    <span className="mr-2">{r.name}</span>
                    <OwnerBadge owner={r.isCompetitor ? "competitor" : "own"} />
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {fmtInt(r.top3)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {fmtInt(r.top10)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {fmtInt(r.top20)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {fmtInt(r.top100)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {fmtInt(r.estOrganicTraffic)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {fmtPct(r.shareTop10)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableCard>
        <p className="text-xs text-muted-foreground">
          Non-branded leaves out each site&apos;s own brand searches (for
          example &ldquo;acme recliner&rdquo; for Acme). Est. traffic is
          DataForSEO&apos;s estimate of monthly organic visits.
        </p>
      </section>
      <TrendChart rows={rows} />
    </div>
  );
}
