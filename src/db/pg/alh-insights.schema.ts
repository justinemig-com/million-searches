import {
  boolean,
  index,
  integer,
  pgTable,
  real,
  text,
} from "drizzle-orm/pg-core";

// Million Searches: read-only monthly insights published by the seo-pipeline repo
// (`publish-insights` job) from BigQuery. The app only reads these tables;
// each publish replaces their contents. `id` is a stable key the pipeline derives.

// Monthly top-N keyword counts per site, source and brand segment.
export const alhRankBuckets = pgTable(
  "alh_rank_buckets",
  {
    id: text("id").primaryKey(),
    domain: text("domain").notNull(),
    month: text("month").notNull(),
    source: text("source").notNull(),
    brandSegment: text("brand_segment").notNull(),
    top3: integer("top3"),
    top10: integer("top10"),
    top20: integer("top20"),
    top50: integer("top50"),
    top100: integer("top100"),
  },
  (t) => [index("alh_rank_buckets_domain_idx").on(t.domain)],
);

// Organic traffic value per site and month (estimated traffic × CPC).
export const alhTrafficValue = pgTable(
  "alh_traffic_value",
  {
    id: text("id").primaryKey(),
    domain: text("domain").notNull(),
    month: text("month").notNull(),
    rankedKeywords: integer("ranked_keywords"),
    estOrganicTraffic: real("est_organic_traffic"),
    trafficValueUsd: real("traffic_value_usd"),
    nonBrandedTrafficValueUsd: real("non_branded_traffic_value_usd"),
  },
  (t) => [index("alh_traffic_value_domain_idx").on(t.domain)],
);

// ChatGPT fan-out searches per site and month, with your ranking for each.
export const alhFanoutGaps = pgTable(
  "alh_fanout_gaps",
  {
    id: text("id").primaryKey(),
    domain: text("domain").notNull(),
    month: text("month").notNull(),
    engine: text("engine").notNull(),
    fanoutQuery: text("fanout_query").notNull(),
    timesSearched: integer("times_searched").notNull(),
    prompts: integer("prompts").notNull(),
    examplePrompt: text("example_prompt"),
    ownCitedRate: real("own_cited_rate"),
    dfsPosition: integer("dfs_position"),
    gscPosition: real("gsc_position"),
    searchVolume: integer("search_volume"),
    rankingUrl: text("ranking_url"),
    rankingStatus: text("ranking_status").notNull(),
    isGap: boolean("is_gap").notNull(),
  },
  (t) => [index("alh_fanout_gaps_domain_idx").on(t.domain)],
);

// Google Ads keywords each tracked site or competitor bids on, per month.
export const alhPaidKeywords = pgTable(
  "alh_paid_keywords",
  {
    id: text("id").primaryKey(),
    month: text("month").notNull(),
    domain: text("domain").notNull(),
    owner: text("owner").notNull(),
    brand: text("brand"),
    keyword: text("keyword").notNull(),
    adPosition: integer("ad_position"),
    adTitle: text("ad_title"),
    adDescription: text("ad_description"),
    landingUrl: text("landing_url"),
    searchVolume: integer("search_volume"),
    cpc: real("cpc"),
    ourBestOrganicPosition: integer("our_best_organic_position"),
    ourBestOrganicDomain: text("our_best_organic_domain"),
    bidsOnOurBrand: boolean("bids_on_our_brand").notNull(),
  },
  (t) => [index("alh_paid_keywords_month_idx").on(t.month)],
);

// Share of checked searches showing each advertiser's ad, per month.
export const alhAdShare = pgTable(
  "alh_ad_share",
  {
    id: text("id").primaryKey(),
    month: text("month").notNull(),
    adDomain: text("ad_domain").notNull(),
    owner: text("owner").notNull(),
    brand: text("brand"),
    keywordsWithTheirAd: integer("keywords_with_their_ad").notNull(),
    keywordsChecked: integer("keywords_checked").notNull(),
    keywordsWithAds: integer("keywords_with_ads").notNull(),
    shareOfKeywords: real("share_of_keywords"),
  },
  (t) => [index("alh_ad_share_month_idx").on(t.month)],
);

// Google Shopping presence per seller and month.
export const alhShoppingShare = pgTable(
  "alh_shopping_share",
  {
    id: text("id").primaryKey(),
    month: text("month").notNull(),
    seller: text("seller").notNull(),
    owner: text("owner").notNull(),
    listings: integer("listings").notNull(),
    sponsoredListings: integer("sponsored_listings").notNull(),
    termsPresent: integer("terms_present").notNull(),
    termsChecked: integer("terms_checked").notNull(),
    shareOfTerms: real("share_of_terms"),
    minPrice: real("min_price"),
    medianPrice: real("median_price"),
    maxPrice: real("max_price"),
    avgRating: real("avg_rating"),
  },
  (t) => [index("alh_shopping_share_month_idx").on(t.month)],
);

// Shopping listings that are yours or name one of your brands (often a retailer's), per month.
export const alhShoppingBrandListings = pgTable(
  "alh_shopping_brand_listings",
  {
    id: text("id").primaryKey(),
    month: text("month").notNull(),
    term: text("term").notNull(),
    seller: text("seller"),
    owner: text("owner").notNull(),
    title: text("title"),
    price: real("price"),
    productRating: real("product_rating"),
    rankGroup: integer("rank_group"),
  },
  (t) => [index("alh_shopping_brand_listings_month_idx").on(t.month)],
);

// Organic benchmark: your sites and competitors per month, source and brand
// segment, with each one's share of the category. Category-wide (every project).
export const alhCompetitorBenchmark = pgTable(
  "alh_competitor_benchmark",
  {
    id: text("id").primaryKey(),
    domain: text("domain").notNull(),
    name: text("name").notNull(),
    isCompetitor: boolean("is_competitor").notNull(),
    month: text("month").notNull(),
    source: text("source").notNull(),
    brandSegment: text("brand_segment").notNull(),
    top3: integer("top3"),
    top10: integer("top10"),
    top20: integer("top20"),
    top50: integer("top50"),
    top100: integer("top100"),
    estOrganicTraffic: real("est_organic_traffic"),
    shareTop3: real("share_top3"),
    shareTop10: real("share_top10"),
    shareTop100: real("share_top100"),
    shareTraffic: real("share_traffic"),
  },
  (t) => [index("alh_competitor_benchmark_month_idx").on(t.month)],
);
