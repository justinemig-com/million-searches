import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { sortBy } from "remeda";
import { cn } from "cn";
import { EmptyState } from "@/client/components/EmptyState";
import { SectionHeader } from "@/client/components/PageHeader";
import { QueryError } from "@/client/components/QueryState";
import { SegmentedToggle } from "@/client/components/SegmentedToggle";
import { SkeletonCard } from "@/client/components/SkeletonPresets";
import {
  Table,
  TableBody,
  TableCard,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/client/components/ui/table";
import { EngineLabel } from "@/client/features/ai-visibility/EngineLabel";
import { getAiVisibilityOverview } from "@/serverFunctions/alhInsights";
import { AI_ENGINE_LABELS, type AiEngine } from "@/shared/ai-visibility";
import {
  fmtPosition,
  runLabel,
  ShareOfVoice,
  TrendChart,
} from "./AiVisibilityCharts";
import { runMetrics, sharedEngines } from "./aiVisibilityMetrics";
import { OwnerBadge, StatCard, fmtPct } from "./shared";

/** Change in percentage points, on the engines both runs share. */
function PointChange({
  current,
  previous,
}: {
  current: number | null | undefined;
  previous: number | null | undefined;
}) {
  if (current == null || previous == null) return null;
  const points = Math.round((current - previous) * 100);
  if (!points) return null;
  return (
    <span
      className={cn(
        "ml-1.5 text-xs",
        points > 0 ? "text-success" : "text-destructive",
      )}
    >
      {points > 0 ? "+" : ""}
      {points}
    </span>
  );
}

function engineLabel(engine: AiEngine) {
  return <EngineLabel engine={engine} />;
}

export function AiVisibilityTab({ projectId }: { projectId: string }) {
  const [engine, setEngine] = useState<AiEngine | "all">("all");
  const query = useQuery({
    queryKey: ["alh-ai-overview", projectId],
    queryFn: () => getAiVisibilityOverview({ data: { projectId } }),
  });
  if (query.isPending) return <SkeletonCard />;
  if (query.isError)
    return (
      <QueryError
        error={query.error}
        fallback="AI visibility couldn't be loaded."
        onRetry={() => void query.refetch()}
      />
    );
  const { runs, brands } = query.data;
  if (!runs.length)
    return (
      <EmptyState
        title="No AI visibility answers yet"
        description="Set up the AI tracker for this project under AI Visibility. Charts appear after its first finished run."
      />
    );

  const engines = [
    ...new Set(runs.flatMap((run) => run.engines.map((e) => e.engine))),
  ];
  const selected = engine === "all" ? null : engine;
  const scoped = runs.filter(
    (run) => !selected || run.engines.some((e) => e.engine === selected),
  );
  const latestRun = scoped.at(-1) ?? runs[runs.length - 1];
  const previousRun = scoped.at(-2);
  const metrics = runMetrics(latestRun, selected ? [selected] : null);
  const shared = previousRun
    ? sharedEngines(latestRun, previousRun, selected)
    : [];
  const comparable = shared.length > 0 && previousRun;
  const nowMatched = comparable ? runMetrics(latestRun, shared) : null;
  const before = comparable ? runMetrics(previousRun, shared) : null;

  const ranked = sortBy(brands, [
    (brand) => metrics.get(brand.domain)?.sov ?? -1,
    "desc",
  ]);
  const inLatest = ranked.filter((brand) => metrics.has(brand.domain));
  const own = inLatest.find((brand) => brand.own);
  const ownMetrics = own ? metrics.get(own.domain) : undefined;
  const ownNow = own ? nowMatched?.get(own.domain) : undefined;
  const ownBefore = own ? before?.get(own.domain) : undefined;
  const rank = own ? inLatest.indexOf(own) + 1 : null;

  const byEngine = own
    ? sortBy(
        latestRun.engines.map((e) => ({
          engine: e.engine,
          visibility:
            runMetrics(latestRun, [e.engine]).get(own.domain)?.visibility ?? 0,
        })),
        [(e) => e.visibility, "desc"],
      )
    : [];
  const strongest = byEngine[0];
  const weakest = byEngine.at(-1);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">
            {rank
              ? `You're #${rank} of ${inLatest.length} tracked brands`
              : "AI visibility"}
          </h2>
          <p className="text-sm text-muted-foreground">
            Latest run: {runLabel(latestRun.createdAt)}, ranked by share of
            voice.
          </p>
        </div>
        <SegmentedToggle
          items={[
            { value: "all", label: "All engines", icon: null },
            ...engines.map((value) => ({
              value,
              label: AI_ENGINE_LABELS[value],
              icon: null,
            })),
          ]}
          value={engine}
          onChange={setEngine}
          showLabels
        />
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard
          label="Visibility"
          value={
            <>
              {fmtPct(ownMetrics?.visibility)}
              <PointChange
                current={ownNow?.visibility}
                previous={ownBefore?.visibility}
              />
            </>
          }
          hint="Answers naming your brand"
        />
        <StatCard
          label="Share of voice"
          value={
            <>
              {fmtPct(ownMetrics?.sov)}
              <PointChange current={ownNow?.sov} previous={ownBefore?.sov} />
            </>
          }
          hint="Of tracked-brand mentions"
        />
        <StatCard
          label="Avg. position"
          value={fmtPosition(ownMetrics?.position)}
          hint="Order among named brands"
        />
        <StatCard
          label="Named first"
          value={
            <>
              {fmtPct(ownMetrics?.firstRate)}
              <PointChange
                current={ownNow?.firstRate}
                previous={ownBefore?.firstRate}
              />
            </>
          }
          hint="Answers naming you first"
        />
        <StatCard
          label="Cited"
          value={
            <>
              {fmtPct(ownMetrics?.citationRate)}
              <PointChange
                current={ownNow?.citationRate}
                previous={ownBefore?.citationRate}
              />
            </>
          }
          hint="Answers linking to your site"
        />
      </div>
      {!selected && byEngine.length > 1 && strongest && weakest ? (
        <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            Strongest: {engineLabel(strongest.engine)} (
            {fmtPct(strongest.visibility)})
          </span>
          <span className="inline-flex items-center gap-1.5">
            Weakest: {engineLabel(weakest.engine)} ({fmtPct(weakest.visibility)}
            )
          </span>
        </p>
      ) : null}
      <TrendChart runs={scoped} brands={ranked} engine={selected} />
      <ShareOfVoice brands={inLatest} metrics={metrics} />
      <section className="space-y-2">
        <SectionHeader
          title="Brand comparison"
          hint="The latest run. Small numbers are the point change since the previous run, on engines both runs used."
        />
        <TableCard>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8">#</TableHead>
                <TableHead>Brand</TableHead>
                <TableHead className="text-right">Visibility</TableHead>
                <TableHead className="text-right">Share of voice</TableHead>
                <TableHead className="text-right">Avg. position</TableHead>
                <TableHead className="text-right">Named first</TableHead>
                <TableHead className="text-right">Cited</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {inLatest.map((brand, index) => {
                const m = metrics.get(brand.domain);
                const now = nowMatched?.get(brand.domain);
                const then = before?.get(brand.domain);
                return (
                  <TableRow
                    key={brand.domain}
                    className={brand.own ? "bg-muted/50" : undefined}
                  >
                    <TableCell className="tabular-nums">{index + 1}</TableCell>
                    <TableCell className="font-medium">
                      <span className="mr-2">{brand.name}</span>
                      <OwnerBadge owner={brand.own ? "own" : "competitor"} />
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {fmtPct(m?.visibility)}
                      <PointChange
                        current={now?.visibility}
                        previous={then?.visibility}
                      />
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {fmtPct(m?.sov)}
                      <PointChange current={now?.sov} previous={then?.sov} />
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {fmtPosition(m?.position)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {fmtPct(m?.firstRate)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {fmtPct(m?.citationRate)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableCard>
        <p className="text-xs text-muted-foreground">
          Only the competitors added to this project are compared, so share of
          voice and position are relative to that list. Failed runs are left
          out.
        </p>
      </section>
    </div>
  );
}
