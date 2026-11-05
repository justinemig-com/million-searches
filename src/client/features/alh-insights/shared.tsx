import type { ReactNode } from "react";
import { EmptyState } from "@/client/components/EmptyState";
import { Badge } from "@/client/components/ui/badge";
import type { getAlhInsights } from "@/serverFunctions/alhInsights";

export type AlhInsightsData = Awaited<ReturnType<typeof getAlhInsights>>;

export const monthLabel = (month: string) =>
  new Date(`${month.slice(0, 7)}-01T00:00:00Z`).toLocaleDateString(undefined, {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });

export const fmtInt = (value: number | null | undefined) =>
  value == null ? "–" : Math.round(value).toLocaleString();

export const fmtUsd = (value: number | null | undefined) =>
  value == null
    ? "–"
    : value.toLocaleString(undefined, {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      });

export const fmtPct = (value: number | null | undefined) =>
  value == null ? "–" : `${Math.round(value * 100)}%`;

export function OwnerBadge({ owner }: { owner: string }) {
  if (owner === "own") return <Badge variant="secondary">You</Badge>;
  if (owner === "competitor")
    return <Badge variant="outline">Competitor</Badge>;
  return null;
}

export const SERIES_COLORS = [
  "#2563eb",
  "#f59e0b",
  "#14b8a6",
  "#ef4444",
  "#7c3aed",
  "#ec4899",
  "#64748b",
  "#22c55e",
  "#a16207",
  "#0ea5e9",
  "#be123c",
];

export function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
}) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-2xl font-semibold tabular-nums">{value}</div>
      {hint ? (
        <div className="mt-1 text-xs text-muted-foreground">{hint}</div>
      ) : null}
    </div>
  );
}

/** Shown until the pipeline publishes data for this view. */
export function NotPublished({ what }: { what: string }) {
  return (
    <EmptyState
      title={`No ${what} published yet`}
      description="These insights are published monthly by the Million Searches data pipeline, on the 4th of each month after the BigQuery rebuild."
    />
  );
}
