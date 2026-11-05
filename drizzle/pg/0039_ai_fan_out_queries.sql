CREATE TABLE "ai_fan_out_queries" (
	"id" text PRIMARY KEY NOT NULL,
	"observation_id" text NOT NULL,
	"query" text NOT NULL,
	"position" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ai_fan_out_queries" ADD CONSTRAINT "ai_fan_out_queries_observation_id_ai_observations_id_fk" FOREIGN KEY ("observation_id") REFERENCES "public"."ai_observations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ai_fan_out_queries_observation_idx" ON "ai_fan_out_queries" USING btree ("observation_id");