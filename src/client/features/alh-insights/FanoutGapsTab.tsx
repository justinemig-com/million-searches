import { useState } from "react";
import { Badge } from "@/client/components/ui/badge";
import { Switch } from "@/client/components/ui/switch";
import { Label } from "@/client/components/ui/label";
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
  type AlhInsightsData,
} from "./shared";

const STATUS_VARIANT = {
  "top 10": "secondary",
  "ranking 11-100": "outline",
  "not ranking": "destructive",
} as const;

export function FanoutGapsTab({
  rows,
}: {
  rows: AlhInsightsData["fanoutGaps"];
}) {
  const [gapsOnly, setGapsOnly] = useState(true);
  if (!rows.length) return <NotPublished what="fan-out searches" />;
  const month = rows[0]!.month;
  const monthRows = rows.filter((r) => r.month === month);
  const shown = gapsOnly ? monthRows.filter((r) => r.isGap) : monthRows;
  const gaps = monthRows.filter((r) => r.isGap).length;
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Searches ChatGPT ran while answering your tracked prompts (
        {monthLabel(month)}). A gap is a search you don&apos;t rank in
        Google&apos;s top 10 for: content that could earn the citation.{" "}
        <strong className="text-foreground">
          {gaps} of {monthRows.length}
        </strong>{" "}
        are gaps.
      </p>
      <div className="flex items-center gap-2">
        <Switch
          id="fanout-gaps-only"
          checked={gapsOnly}
          onCheckedChange={setGapsOnly}
        />
        <Label htmlFor="fanout-gaps-only">Gaps only</Label>
      </div>
      <TableCard>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ChatGPT searched for</TableHead>
              <TableHead className="text-right">Times</TableHead>
              <TableHead>Your ranking</TableHead>
              <TableHead className="text-right">DataForSEO</TableHead>
              <TableHead className="text-right">GSC</TableHead>
              <TableHead className="text-right">Volume</TableHead>
              <TableHead className="text-right">You cited</TableHead>
              <TableHead>Example prompt</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {shown.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.fanoutQuery}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {r.timesSearched}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      STATUS_VARIANT[
                        r.rankingStatus as keyof typeof STATUS_VARIANT
                      ] ?? "outline"
                    }
                  >
                    {r.rankingStatus}
                  </Badge>
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {fmtInt(r.dfsPosition)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {fmtInt(r.gscPosition)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {fmtInt(r.searchVolume)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {fmtPct(r.ownCitedRate)}
                </TableCell>
                <TableCell className="max-w-xs truncate text-muted-foreground">
                  {r.examplePrompt}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableCard>
    </div>
  );
}
