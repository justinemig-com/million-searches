CREATE TABLE "alh_ad_share" (
	"id" text PRIMARY KEY NOT NULL,
	"month" text NOT NULL,
	"ad_domain" text NOT NULL,
	"owner" text NOT NULL,
	"brand" text,
	"keywords_with_their_ad" integer NOT NULL,
	"keywords_checked" integer NOT NULL,
	"keywords_with_ads" integer NOT NULL,
	"share_of_keywords" real
);
--> statement-breakpoint
CREATE TABLE "alh_fanout_gaps" (
	"id" text PRIMARY KEY NOT NULL,
	"domain" text NOT NULL,
	"month" text NOT NULL,
	"engine" text NOT NULL,
	"fanout_query" text NOT NULL,
	"times_searched" integer NOT NULL,
	"prompts" integer NOT NULL,
	"example_prompt" text,
	"own_cited_rate" real,
	"dfs_position" integer,
	"gsc_position" real,
	"search_volume" integer,
	"ranking_url" text,
	"ranking_status" text NOT NULL,
	"is_gap" boolean NOT NULL
);
--> statement-breakpoint
CREATE TABLE "alh_paid_keywords" (
	"id" text PRIMARY KEY NOT NULL,
	"month" text NOT NULL,
	"domain" text NOT NULL,
	"owner" text NOT NULL,
	"brand" text,
	"keyword" text NOT NULL,
	"ad_position" integer,
	"ad_title" text,
	"ad_description" text,
	"landing_url" text,
	"search_volume" integer,
	"cpc" real,
	"our_best_organic_position" integer,
	"our_best_organic_domain" text,
	"bids_on_our_brand" boolean NOT NULL
);
--> statement-breakpoint
CREATE TABLE "alh_rank_buckets" (
	"id" text PRIMARY KEY NOT NULL,
	"domain" text NOT NULL,
	"month" text NOT NULL,
	"source" text NOT NULL,
	"brand_segment" text NOT NULL,
	"top3" integer,
	"top10" integer,
	"top20" integer,
	"top50" integer,
	"top100" integer
);
--> statement-breakpoint
CREATE TABLE "alh_shopping_brand_listings" (
	"id" text PRIMARY KEY NOT NULL,
	"month" text NOT NULL,
	"term" text NOT NULL,
	"seller" text,
	"owner" text NOT NULL,
	"title" text,
	"price" real,
	"product_rating" real,
	"rank_group" integer
);
--> statement-breakpoint
CREATE TABLE "alh_shopping_share" (
	"id" text PRIMARY KEY NOT NULL,
	"month" text NOT NULL,
	"seller" text NOT NULL,
	"owner" text NOT NULL,
	"listings" integer NOT NULL,
	"sponsored_listings" integer NOT NULL,
	"terms_present" integer NOT NULL,
	"terms_checked" integer NOT NULL,
	"share_of_terms" real,
	"min_price" real,
	"median_price" real,
	"max_price" real,
	"avg_rating" real
);
--> statement-breakpoint
CREATE TABLE "alh_traffic_value" (
	"id" text PRIMARY KEY NOT NULL,
	"domain" text NOT NULL,
	"month" text NOT NULL,
	"ranked_keywords" integer,
	"est_organic_traffic" real,
	"traffic_value_usd" real,
	"non_branded_traffic_value_usd" real
);
--> statement-breakpoint
CREATE INDEX "alh_ad_share_month_idx" ON "alh_ad_share" USING btree ("month");--> statement-breakpoint
CREATE INDEX "alh_fanout_gaps_domain_idx" ON "alh_fanout_gaps" USING btree ("domain");--> statement-breakpoint
CREATE INDEX "alh_paid_keywords_month_idx" ON "alh_paid_keywords" USING btree ("month");--> statement-breakpoint
CREATE INDEX "alh_rank_buckets_domain_idx" ON "alh_rank_buckets" USING btree ("domain");--> statement-breakpoint
CREATE INDEX "alh_shopping_brand_listings_month_idx" ON "alh_shopping_brand_listings" USING btree ("month");--> statement-breakpoint
CREATE INDEX "alh_shopping_share_month_idx" ON "alh_shopping_share" USING btree ("month");--> statement-breakpoint
CREATE INDEX "alh_traffic_value_domain_idx" ON "alh_traffic_value" USING btree ("domain");