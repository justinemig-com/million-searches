// Chart-free so the route's validateSearch can import it without pulling
// recharts into the eager bundle (route options aren't code-split).
export const INSIGHTS_TABS = [
  { value: "rankings", label: "Ranking trends" },
  { value: "competitors", label: "Competitors" },
  { value: "ai", label: "AI visibility" },
  { value: "ai-traffic", label: "AI traffic" },
  { value: "value", label: "Traffic value" },
  { value: "fanout", label: "Fan-out gaps" },
  { value: "ads", label: "Ads & Shopping" },
] as const;
export type InsightsTab = (typeof INSIGHTS_TABS)[number]["value"];
