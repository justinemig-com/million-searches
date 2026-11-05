CREATE TABLE `alh_competitor_benchmark` (
	`id` text PRIMARY KEY NOT NULL,
	`domain` text NOT NULL,
	`name` text NOT NULL,
	`is_competitor` integer NOT NULL,
	`month` text NOT NULL,
	`source` text NOT NULL,
	`brand_segment` text NOT NULL,
	`top3` integer,
	`top10` integer,
	`top20` integer,
	`top50` integer,
	`top100` integer,
	`est_organic_traffic` real,
	`share_top3` real,
	`share_top10` real,
	`share_top100` real,
	`share_traffic` real
);
--> statement-breakpoint
CREATE INDEX `alh_competitor_benchmark_month_idx` ON `alh_competitor_benchmark` (`month`);