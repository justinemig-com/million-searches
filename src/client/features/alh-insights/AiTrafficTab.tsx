import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Bar, BarChart } from "recharts";
import { sort, sortBy } from "remeda";
import {
  ChartGrid,
  ChartXAxis,
  ChartYAxis,
} from "@/client/components/ChartAxes";
import { EmptyState } from "@/client/components/EmptyState";
import { SectionHeader } from "@/client/components/PageHeader";
import { QueryError } from "@/client/components/QueryState";
import { SkeletonCard } from "@/client/components/SkeletonPresets";
import { Button } from "@/client/components/ui/button";
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
import { getAiReferrals } from "@/serverFunctions/alhInsights";
import { fmtInt, fmtPct, monthLabel, SERIES_COLORS, StatCard } from "./shared";

const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);
const seriesKey = (name: string) => name.replace(/[^a-z0-9]/gi, "_");

function changeText(current: number, previous: number | undefined) {
  if (!previous) return undefined;
  const change = (current - previous) / previous;
  return `${change >= 0 ? "+" : ""}${Math.round(change * 100)}% vs. prior month`;
}

export function AiTrafficTab({ projectId }: { projectId: string }) {
  const query = useQuery({
    queryKey: ["alh-ai-referrals", projectId],
    queryFn: () => getAiReferrals({ data: { projectId } }),
  });
  if (query.isPending) return <SkeletonCard />;
  if (query.isError)
    return (
      <QueryError
        error={query.error}
        fallback="AI traffic couldn't be loaded from Google Analytics."
        onRetry={() => void query.refetch()}
      />
    );
  const data = query.data;
  if (!data?.connected)
    return (
      <EmptyState
        title="Connect Google Analytics to see AI traffic"
        description="This project has no working GA4 connection. Connect it from the project dashboard."
        action={
          <Button render={<Link to="/p/$projectId" params={{ projectId }} />}>
            Go to dashboard
          </Button>
        }
      />
    );
  if (!data.rows.length)
    return (
      <EmptyState
        title="No AI referrals yet"
        description={`Google Analytics (${data.propertyName}) shows no sessions from AI assistants in the last 13 complete months.`}
      />
    );

  const months = sort([...new Set(data.totals.map((t) => t.month))], (a, b) =>
    a.localeCompare(b),
  );
  const latest = months.at(-1) ?? "";
  const previous = months.at(-2);
  const inMonth = (month: string | undefined) =>
    data.rows.filter((r) => r.month === month);
  const latestRows = sortBy(inMonth(latest), [(r) => r.sessions, "desc"]);
  const latestSessions = sum(latestRows.map((r) => r.sessions));
  const previousRows = inMonth(previous);
  const previousSessions = previous
    ? sum(previousRows.map((r) => r.sessions))
    : undefined;
  const latestKeyEvents = sum(latestRows.map((r) => r.keyEvents));
  const latestTotal = data.totals.find((t) => t.month === latest)?.sessions;

  const providers = sortBy(
    [...new Set(data.rows.map((r) => r.provider))],
    [
      (p) =>
        sum(data.rows.filter((r) => r.provider === p).map((r) => r.sessions)),
      "desc",
    ],
  );
  const chartConfig: ChartConfig = Object.fromEntries(
    providers.map((provider, index) => [
      seriesKey(provider),
      {
        label: provider,
        color: SERIES_COLORS[index % SERIES_COLORS.length],
      },
    ]),
  );
  const chartData = months.map((month) => ({
    label: monthLabel(month),
    ...Object.fromEntries(
      inMonth(month).map((r) => [seriesKey(r.provider), r.sessions]),
    ),
  }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label={`AI sessions · ${monthLabel(latest)}`}
          value={fmtInt(latestSessions)}
          hint={
            previousSessions === undefined
              ? undefined
              : changeText(latestSessions, previousSessions)
          }
        />
        <StatCard
          label="Share of all sessions"
          value={
            latestTotal
              ? `${((latestSessions / latestTotal) * 100).toFixed(2)}%`
              : "–"
          }
          hint={latestTotal ? `of ${fmtInt(latestTotal)} sessions` : undefined}
        />
        <StatCard label="Key events from AI" value={fmtInt(latestKeyEvents)} />
        <StatCard
          label="Top AI source"
          value={latestRows[0]?.provider ?? "–"}
          hint={
            latestRows[0] && latestSessions
              ? `${fmtPct(latestRows[0].sessions / latestSessions)} of AI sessions`
              : undefined
          }
        />
      </div>
      <section className="space-y-2">
        <SectionHeader
          title="AI sessions by month"
          hint="Sessions Google Analytics attributes to each AI assistant, over the last 13 complete months."
        />
        <ChartContainer
          config={chartConfig}
          className="h-[300px]"
          aria-label="Monthly sessions referred by each AI assistant"
        >
          <BarChart data={chartData} margin={{ left: 0, right: 12, top: 8 }}>
            <ChartGrid />
            <ChartXAxis dataKey="label" />
            <ChartYAxis width={56} tickFormatter={(v: number) => fmtInt(v)} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <ChartLegend content={<ChartLegendContent />} />
            {providers.map((provider) => (
              <Bar
                key={provider}
                dataKey={seriesKey(provider)}
                stackId="ai"
                fill={`var(--color-${seriesKey(provider)})`}
              />
            ))}
          </BarChart>
        </ChartContainer>
      </section>
      <section className="space-y-2">
        <SectionHeader
          title={`By AI assistant · ${monthLabel(latest)}`}
          hint="Engagement rate is engaged sessions divided by sessions."
        />
        <TableCard>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>AI assistant</TableHead>
                <TableHead className="text-right">Sessions</TableHead>
                <TableHead className="text-right">Users</TableHead>
                <TableHead className="text-right">Engagement rate</TableHead>
                <TableHead className="text-right">Key events</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {latestRows.map((r) => (
                <TableRow key={r.provider}>
                  <TableCell className="font-medium">{r.provider}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {fmtInt(r.sessions)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {fmtInt(r.activeUsers)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {fmtPct(r.sessions ? r.engagedSessions / r.sessions : null)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {fmtInt(r.keyEvents)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableCard>
      </section>
      <p className="text-xs text-muted-foreground">
        From {data.propertyName} in Google Analytics, by session source. These
        are minimums: visits from an AI app that pass no referrer show as
        Direct, and clicks from Google AI Overviews and AI Mode count as Google
        organic search, so they can&apos;t be separated here.
        {data.hasLimitedData
          ? " Google Analytics sampled or limited some of this data."
          : ""}
      </p>
    </div>
  );
}
