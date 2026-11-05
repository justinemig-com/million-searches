import { createServerFn } from "@tanstack/react-start";
import { loadAiVisibilityOverview } from "@/server/features/ai-visibility/services/aiVisibilityOverview";
import { loadAlhInsights } from "@/server/features/alh-insights/alhInsightsService";
import { loadAiReferrals } from "@/server/features/ga4/services/Ga4AiReferralsService";
import { requireProjectContext } from "@/serverFunctions/middleware";
import { alhInsightsInputSchema } from "@/types/schemas/alh-insights";

// Million Searches: read-only monthly insights published by the seo-pipeline.
export const getAlhInsights = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .validator(alhInsightsInputSchema)
  .handler(async ({ context }) => loadAlhInsights(context.project));

// Live from the project's AI tracker answers (not the monthly publish).
export const getAiVisibilityOverview = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .validator(alhInsightsInputSchema)
  .handler(async ({ context }) => loadAiVisibilityOverview(context.projectId));

// Live from the project's connected GA4 property.
export const getAiReferrals = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .validator(alhInsightsInputSchema)
  .handler(async ({ context }) => loadAiReferrals(context.projectId));
