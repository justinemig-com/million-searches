import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/client/components/PageHeader";
import { QueryError } from "@/client/components/QueryState";
import { SkeletonCard } from "@/client/components/SkeletonPresets";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/client/components/ui/tabs";
import { getAlhInsights } from "@/serverFunctions/alhInsights";
import { AdsShoppingTab } from "./AdsShoppingTab";
import { AiTrafficTab } from "./AiTrafficTab";
import { AiVisibilityTab } from "./AiVisibilityTab";
import { CompetitorsTab } from "./CompetitorsTab";
import { INSIGHTS_TABS, type InsightsTab } from "./insightsTabs";
import { FanoutGapsTab } from "./FanoutGapsTab";
import { RankingTrendsTab } from "./RankingTrendsTab";
import { TrafficValueTab } from "./TrafficValueTab";

/** Million Searches: monthly insights published from the BigQuery pipeline. */
export function InsightsPage({
  projectId,
  tab,
  onTabChange,
}: {
  projectId: string;
  tab: InsightsTab;
  onTabChange: (tab: InsightsTab) => void;
}) {
  const query = useQuery({
    queryKey: ["alh-insights", projectId],
    queryFn: () => getAlhInsights({ data: { projectId } }),
  });
  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-4 sm:p-6">
      <PageHeader
        title="Monthly Insights"
        description="Ranking history, the competitor benchmark, AI visibility and traffic, traffic value, ChatGPT fan-out gaps and competitor Ads & Shopping research."
      />
      {query.isPending ? (
        <SkeletonCard />
      ) : query.isError ? (
        <QueryError
          error={query.error}
          fallback="Monthly insights couldn't be loaded."
          onRetry={() => void query.refetch()}
        />
      ) : (
        <Tabs
          value={tab}
          onValueChange={(value: unknown) => {
            const next = INSIGHTS_TABS.find((t) => t.value === value);
            if (next) onTabChange(next.value);
          }}
        >
          <TabsList className="h-auto flex-wrap">
            {INSIGHTS_TABS.map((t) => (
              <TabsTrigger key={t.value} value={t.value}>
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
          <TabsContent value="rankings" className="pt-4">
            <RankingTrendsTab rows={query.data.rankBuckets} />
          </TabsContent>
          <TabsContent value="competitors" className="pt-4">
            <CompetitorsTab
              rows={query.data.competitorBenchmark}
              domain={query.data.domain}
            />
          </TabsContent>
          <TabsContent value="ai" className="pt-4">
            <AiVisibilityTab projectId={projectId} />
          </TabsContent>
          <TabsContent value="ai-traffic" className="pt-4">
            <AiTrafficTab projectId={projectId} />
          </TabsContent>
          <TabsContent value="value" className="pt-4">
            <TrafficValueTab rows={query.data.trafficValue} />
          </TabsContent>
          <TabsContent value="fanout" className="pt-4">
            <FanoutGapsTab rows={query.data.fanoutGaps} />
          </TabsContent>
          <TabsContent value="ads" className="pt-4">
            <AdsShoppingTab ads={query.data.adsAndShopping} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
