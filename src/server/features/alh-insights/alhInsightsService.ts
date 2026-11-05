import { AlhInsightsRepository } from "./AlhInsightsRepository";

/** Insight rows are keyed by bare domain ("example.com"), like the pipeline. */
function bareDomain(domain: string | null): string | null {
  if (!domain) return null;
  const host = domain
    .trim()
    .toLowerCase()
    .replace(/^[a-z][a-z\d+.-]*:\/\//, "")
    .split("/")[0]
    ?.replace(/^www\./, "");
  return host || null;
}

/** Everything the Insights page shows for one project, from the monthly publish. */
export async function loadAlhInsights(project: { domain: string | null }) {
  const domain = bareDomain(project.domain);
  const [
    rankBuckets,
    trafficValue,
    fanoutGaps,
    adsAndShopping,
    competitorBenchmark,
  ] = await Promise.all([
    domain ? AlhInsightsRepository.listRankBuckets(domain) : [],
    domain ? AlhInsightsRepository.listTrafficValue(domain) : [],
    domain ? AlhInsightsRepository.listFanoutGaps(domain) : [],
    AlhInsightsRepository.listAdsAndShopping(),
    AlhInsightsRepository.listCompetitorBenchmark(),
  ]);
  return {
    domain,
    rankBuckets,
    trafficValue,
    fanoutGaps,
    adsAndShopping,
    competitorBenchmark,
  };
}
