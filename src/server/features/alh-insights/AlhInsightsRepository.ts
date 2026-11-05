import { asc, desc, eq, max } from "drizzle-orm";
import { db } from "@/db";
import {
  alhAdShare,
  alhCompetitorBenchmark,
  alhFanoutGaps,
  alhPaidKeywords,
  alhRankBuckets,
  alhShoppingBrandListings,
  alhShoppingShare,
  alhTrafficValue,
} from "@/db/schema";

// Million Searches: reads the monthly insight tables the seo-pipeline publishes.
// Site-level tables are filtered by domain; Ads & Shopping tables are
// category-wide (the same for every project) and read for one month.

async function latestMonth(
  table: typeof alhPaidKeywords | typeof alhAdShare | typeof alhShoppingShare,
) {
  const rows = await db.select({ month: max(table.month) }).from(table);
  return rows[0]?.month ?? null;
}

async function listRankBuckets(domain: string) {
  return db
    .select()
    .from(alhRankBuckets)
    .where(eq(alhRankBuckets.domain, domain))
    .orderBy(asc(alhRankBuckets.month));
}

async function listTrafficValue(domain: string) {
  return db
    .select()
    .from(alhTrafficValue)
    .where(eq(alhTrafficValue.domain, domain))
    .orderBy(asc(alhTrafficValue.month));
}

async function listFanoutGaps(domain: string) {
  return db
    .select()
    .from(alhFanoutGaps)
    .where(eq(alhFanoutGaps.domain, domain))
    .orderBy(desc(alhFanoutGaps.month), desc(alhFanoutGaps.timesSearched));
}

async function listAdsAndShopping() {
  const month =
    (await latestMonth(alhShoppingShare)) ??
    (await latestMonth(alhPaidKeywords)) ??
    (await latestMonth(alhAdShare));
  if (!month) return null;
  const [paidKeywords, adShare, shoppingShare, brandListings] =
    await Promise.all([
      db
        .select()
        .from(alhPaidKeywords)
        .where(eq(alhPaidKeywords.month, month))
        .orderBy(desc(alhPaidKeywords.searchVolume)),
      db
        .select()
        .from(alhAdShare)
        .where(eq(alhAdShare.month, month))
        .orderBy(desc(alhAdShare.keywordsWithTheirAd)),
      db
        .select()
        .from(alhShoppingShare)
        .where(eq(alhShoppingShare.month, month))
        .orderBy(desc(alhShoppingShare.termsPresent)),
      db
        .select()
        .from(alhShoppingBrandListings)
        .where(eq(alhShoppingBrandListings.month, month))
        .orderBy(asc(alhShoppingBrandListings.term)),
    ]);
  return { month, paidKeywords, adShare, shoppingShare, brandListings };
}

// Category-wide: every benchmarked site, all months.
async function listCompetitorBenchmark() {
  return db
    .select()
    .from(alhCompetitorBenchmark)
    .orderBy(asc(alhCompetitorBenchmark.month));
}

export const AlhInsightsRepository = {
  listRankBuckets,
  listTrafficValue,
  listFanoutGaps,
  listAdsAndShopping,
  listCompetitorBenchmark,
};
