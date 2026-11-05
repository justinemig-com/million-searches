import { groupByProp, sortBy } from "remeda";
import type { AiEngine } from "@/shared/ai-visibility";
import {
  getOverviewObservations,
  listTrendRuns,
} from "../repositories/aiVisibilityTrendRepository";

const MAX_RUNS = 13;
const YEAR_AND_A_MONTH_MS = 400 * 86_400_000;

type Row = Awaited<ReturnType<typeof getOverviewObservations>>[number];

interface BrandTally {
  domain: string;
  mentions: number;
  citations: number;
  firstMentions: number;
  positionSum: number;
  positionCount: number;
}
interface EngineTally {
  engine: AiEngine;
  answers: number;
  brands: BrandTally[];
}

function emptyBrand(domain: string): BrandTally {
  return {
    domain,
    mentions: 0,
    citations: 0,
    firstMentions: 0,
    positionSum: 0,
    positionCount: 0,
  };
}

/**
 * Tallies one run per engine and brand, over neutral prompts with an answer.
 * A brand's position is its order among the tracked brands the answer names.
 */
export function tallyRun(rows: Row[]): EngineTally[] {
  const answers = groupByProp(
    rows.filter(
      (row) => row.status === "completed" && row.hasAnswer && !row.branded,
    ),
    "observationId",
  );
  const engines = new Map<AiEngine, EngineTally>();
  for (const matches of Object.values(answers)) {
    const engine = matches[0].engine;
    const tally = engines.get(engine) ?? { engine, answers: 0, brands: [] };
    engines.set(engine, tally);
    tally.answers++;
    const named = sortBy(
      matches.filter((m) => m.mentioned && m.firstMention !== null),
      (m) => m.firstMention ?? 0,
    );
    for (const match of matches) {
      if (!match.domain) continue;
      let brand = tally.brands.find((b) => b.domain === match.domain);
      if (!brand) {
        brand = emptyBrand(match.domain);
        tally.brands.push(brand);
      }
      if (match.mentioned) brand.mentions++;
      if (match.cited) brand.citations++;
      const index = named.findIndex((n) => n.domain === match.domain);
      if (index >= 0) {
        brand.positionSum += index + 1;
        brand.positionCount++;
        if (index === 0) brand.firstMentions++;
      }
    }
  }
  return [...engines.values()];
}

/** The last 13 finished runs with answers, for the Insights AI visibility tab. */
export async function loadAiVisibilityOverview(projectId: string) {
  const since = new Date(Date.now() - YEAR_AND_A_MONTH_MS).toISOString();
  const runs = (await listTrendRuns(projectId, since)).slice(-MAX_RUNS);
  const rows = await getOverviewObservations(runs.map((run) => run.id));
  const byRun = groupByProp(rows, "runId");
  // Later runs win, so an edited brand name shows its newest spelling.
  const brands = new Map<
    string,
    { domain: string; name: string; own: boolean }
  >();
  const tallied = runs.flatMap((run) => {
    const runRows = byRun[run.id] ?? [];
    const engines = tallyRun(runRows);
    if (!engines.length) return [];
    for (const row of runRows)
      if (row.domain && row.name)
        brands.set(row.domain, {
          domain: row.domain,
          name: row.name,
          own: Boolean(row.own),
        });
    return [{ runId: run.id, createdAt: run.createdAt, engines }];
  });
  return { runs: tallied, brands: [...brands.values()] };
}
