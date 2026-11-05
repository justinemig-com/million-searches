import {
  createFileRoute,
  stripSearchParams,
  useNavigate,
} from "@tanstack/react-router";
import { z } from "zod";
import { InsightsPage } from "@/client/features/alh-insights/InsightsPage";
import {
  INSIGHTS_TABS,
  type InsightsTab,
} from "@/client/features/alh-insights/insightsTabs";

const searchSchema = z.object({
  tab: z
    .enum(INSIGHTS_TABS.map((t) => t.value) as [string, ...string[]])
    .catch("rankings")
    .default("rankings"),
});

export const Route = createFileRoute("/_app/p/$projectId/insights")({
  validateSearch: searchSchema,
  search: { middlewares: [stripSearchParams({ tab: "rankings" })] },
  component: InsightsRoute,
});

function InsightsRoute() {
  const { projectId } = Route.useParams();
  const { tab } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  return (
    <InsightsPage
      projectId={projectId}
      tab={tab as InsightsTab}
      onTabChange={(next) =>
        void navigate({ search: { tab: next }, replace: true })
      }
    />
  );
}
