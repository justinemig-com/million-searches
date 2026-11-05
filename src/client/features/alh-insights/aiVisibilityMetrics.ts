import type { AiEngine } from "@/shared/ai-visibility";
import type { getAiVisibilityOverview } from "@/serverFunctions/alhInsights";

export type AiOverview = Awaited<ReturnType<typeof getAiVisibilityOverview>>;
type OverviewRun = AiOverview["runs"][number];

export interface BrandMetrics {
  domain: string;
  /** Share of answers naming the brand, 0–1. */
  visibility: number;
  /** The brand's share of all tracked-brand mentions, 0–1 (null when no brand was named). */
  sov: number | null;
  /** Average order among named tracked brands; null when never named. */
  position: number | null;
  /** Share of answers naming this brand before any other tracked brand, 0–1. */
  firstRate: number;
  /** Share of answers citing the brand's site, 0–1. */
  citationRate: number;
}

/** Metrics per brand for one run, over the given engines (all when null). */
export function runMetrics(
  run: OverviewRun,
  engines: AiEngine[] | null,
): Map<string, BrandMetrics> {
  const selected = run.engines.filter(
    (e) => !engines || engines.includes(e.engine),
  );
  const answers = selected.reduce((total, e) => total + e.answers, 0);
  const tallies = new Map<
    string,
    {
      mentions: number;
      citations: number;
      first: number;
      positionSum: number;
      positionCount: number;
    }
  >();
  for (const engine of selected) {
    for (const brand of engine.brands) {
      const tally = tallies.get(brand.domain) ?? {
        mentions: 0,
        citations: 0,
        first: 0,
        positionSum: 0,
        positionCount: 0,
      };
      tally.mentions += brand.mentions;
      tally.citations += brand.citations;
      tally.first += brand.firstMentions;
      tally.positionSum += brand.positionSum;
      tally.positionCount += brand.positionCount;
      tallies.set(brand.domain, tally);
    }
  }
  const allMentions = [...tallies.values()].reduce(
    (total, t) => total + t.mentions,
    0,
  );
  const metrics = new Map<string, BrandMetrics>();
  if (!answers) return metrics;
  for (const [domain, t] of tallies) {
    metrics.set(domain, {
      domain,
      visibility: t.mentions / answers,
      sov: allMentions ? t.mentions / allMentions : null,
      position: t.positionCount ? t.positionSum / t.positionCount : null,
      firstRate: t.first / answers,
      citationRate: t.citations / answers,
    });
  }
  return metrics;
}

/** The engines two runs share, so a change compares like with like. */
export function sharedEngines(
  a: OverviewRun,
  b: OverviewRun,
  selected: AiEngine | null,
): AiEngine[] {
  const inB = new Set(b.engines.map((e) => e.engine));
  return a.engines
    .map((e) => e.engine)
    .filter((engine) => inB.has(engine) && (!selected || engine === selected));
}
