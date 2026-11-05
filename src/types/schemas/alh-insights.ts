import { z } from "zod";

export const alhInsightsInputSchema = z.object({
  projectId: z.string().min(1, "Project id is required"),
});
