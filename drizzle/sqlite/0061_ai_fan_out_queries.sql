CREATE TABLE `ai_fan_out_queries` (
	`id` text PRIMARY KEY NOT NULL,
	`observation_id` text NOT NULL,
	`query` text NOT NULL,
	`position` integer NOT NULL,
	FOREIGN KEY (`observation_id`) REFERENCES `ai_observations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `ai_fan_out_queries_observation_idx` ON `ai_fan_out_queries` (`observation_id`);