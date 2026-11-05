import { Ga4ConnectionRepository } from "@/server/features/ga4/repositories/Ga4ConnectionRepository";
import type { Ga4RunReportRequest } from "@/server/lib/ga4Client";
import { createGa4DataClient } from "@/server/lib/ga4Client";
import { Ga4ReportError } from "@/server/lib/ga4Errors";
import { ga4DateInTimeZone, shiftGa4Date } from "./Ga4Dates";
import { normalizeGa4Response } from "./Ga4ReportNormalization";
import { mapGa4ReportError } from "./Ga4ReportingService";

// Session sources for each AI assistant. Each domain also matches its subdomains.
const AI_PROVIDERS: { provider: string; domains: string[] }[] = [
  {
    provider: "ChatGPT",
    domains: ["chatgpt.com", "chat.openai.com", "openai.com"],
  },
  { provider: "Gemini", domains: ["gemini.google.com", "bard.google.com"] },
  {
    provider: "Copilot",
    domains: ["copilot.microsoft.com", "copilot.com", "edgeservices.bing.com"],
  },
  { provider: "Perplexity", domains: ["perplexity.ai"] },
  { provider: "Claude", domains: ["claude.ai"] },
  { provider: "Meta AI", domains: ["meta.ai"] },
  { provider: "Grok", domains: ["grok.com", "x.ai"] },
  { provider: "DeepSeek", domains: ["deepseek.com"] },
  { provider: "Mistral", domains: ["chat.mistral.ai"] },
  { provider: "You.com", domains: ["you.com"] },
  { provider: "Poe", domains: ["poe.com"] },
];

const AI_SOURCE_REGEX = `(.*\\.)?(${AI_PROVIDERS.flatMap((p) => p.domains)
  .map((domain) => domain.replaceAll(".", "\\."))
  .join("|")})`;

function providerForSource(source: string): string | null {
  const host = source.toLowerCase();
  for (const { provider, domains } of AI_PROVIDERS)
    if (domains.some((d) => host === d || host.endsWith(`.${d}`)))
      return provider;
  return null;
}

/** The 13 complete months before `today`, as YYYY-MM-DD. */
function completeMonthsRange(today: string) {
  const endDate = shiftGa4Date(`${today.slice(0, 7)}-01`, -1);
  const start = new Date(`${endDate.slice(0, 7)}-01T00:00:00.000Z`);
  start.setUTCMonth(start.getUTCMonth() - 12);
  return { startDate: start.toISOString().slice(0, 10), endDate };
}

function request(
  range: { startDate: string; endDate: string },
  dimensions: string[],
  metrics: string[],
  dimensionFilter?: unknown,
): Ga4RunReportRequest {
  return {
    dateRanges: [range],
    dimensions: dimensions.map((name) => ({ name })),
    metrics: metrics.map((name) => ({ name })),
    dimensionFilter,
    offset: "0",
    limit: "5000",
    orderBys: [{ dimension: { dimensionName: "yearMonth" } }],
    keepEmptyRows: false,
    returnPropertyQuota: true,
  };
}

const num = (value: string | number | null | undefined) =>
  typeof value === "number" ? value : 0;

/** "202610" → "2026-10-01". */
const monthStart = (yearMonth: string) =>
  `${yearMonth.slice(0, 4)}-${yearMonth.slice(4, 6)}-01`;

/** Sessions referred by AI assistants, per month and provider, from GA4. */
export async function loadAiReferrals(projectId: string, now = new Date()) {
  const connection = await Ga4ConnectionRepository.getByProjectId(projectId);
  if (!connection) return { connected: false as const };
  const range = completeMonthsRange(
    ga4DateInTimeZone(now, connection.propertyTimeZone),
  );
  const aiRequest = request(
    range,
    ["yearMonth", "sessionSource"],
    ["sessions", "activeUsers", "engagedSessions", "keyEvents"],
    {
      filter: {
        fieldName: "sessionSource",
        stringFilter: {
          matchType: "FULL_REGEXP",
          value: AI_SOURCE_REGEX,
          caseSensitive: false,
        },
      },
    },
  );
  const totalRequest = request(range, ["yearMonth"], ["sessions"]);
  const client = createGa4DataClient({
    userId: connection.connectedByUserId,
    ga4AccountId: connection.ga4AccountId,
    propertyId: connection.propertyId,
  });
  try {
    const [aiResponse, totalResponse] = await Promise.all([
      client.runReport(aiRequest),
      client.runReport(totalRequest),
    ]);
    const ai = normalizeGa4Response(aiResponse, aiRequest);
    const totals = normalizeGa4Response(totalResponse, totalRequest);
    const rows = new Map<
      string,
      {
        month: string;
        provider: string;
        sessions: number;
        activeUsers: number;
        engagedSessions: number;
        keyEvents: number;
      }
    >();
    for (const row of ai.rows) {
      const provider = providerForSource(String(row.sessionSource));
      if (!provider) continue;
      const month = monthStart(String(row.yearMonth));
      const key = `${month}|${provider}`;
      const entry = rows.get(key) ?? {
        month,
        provider,
        sessions: 0,
        activeUsers: 0,
        engagedSessions: 0,
        keyEvents: 0,
      };
      entry.sessions += num(row.sessions);
      entry.activeUsers += num(row.activeUsers);
      entry.engagedSessions += num(row.engagedSessions);
      entry.keyEvents += num(row.keyEvents);
      rows.set(key, entry);
    }
    return {
      connected: true as const,
      propertyName: connection.propertyDisplayName,
      rows: [...rows.values()],
      totals: totals.rows.map((row) => ({
        month: monthStart(String(row.yearMonth)),
        sessions: num(row.sessions),
      })),
      hasLimitedData:
        ai.reportMetadata.hasLimitedData ||
        totals.reportMetadata.hasLimitedData,
    };
  } catch (error) {
    try {
      mapGa4ReportError(error);
    } catch (mapped) {
      // A dead grant or lost property reads as "connect GA4" on this tab.
      if (
        mapped instanceof Ga4ReportError &&
        (mapped.code === "ga4_reconnect_required" ||
          mapped.code === "ga4_property_inaccessible")
      )
        return { connected: false as const };
      throw mapped;
    }
  }
}
