import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Ga4RunReportRequest } from "@/server/lib/ga4Client";
import { makeGa4Connection } from "./ga4-test-fixtures";
import { loadAiReferrals } from "./Ga4AiReferralsService";

const mocks = vi.hoisted(() => ({
  getByProjectId: vi.fn(),
  runReport: vi.fn(),
}));

vi.mock("@/server/features/ga4/repositories/Ga4ConnectionRepository", () => ({
  Ga4ConnectionRepository: { getByProjectId: mocks.getByProjectId },
}));
vi.mock("@/server/lib/ga4Client", () => ({
  createGa4DataClient: () => ({ runReport: mocks.runReport }),
}));

const aiMetrics = ["sessions", "activeUsers", "engagedSessions", "keyEvents"];

function aiRow(month: string, source: string, sessions: string) {
  return {
    dimensionValues: [{ value: month }, { value: source }],
    metricValues: [sessions, "1", "1", "0"].map((value) => ({ value })),
  };
}

describe("loadAiReferrals", () => {
  beforeEach(() => {
    mocks.getByProjectId.mockResolvedValue(makeGa4Connection());
    mocks.runReport.mockImplementation((request: Ga4RunReportRequest) =>
      request.dimensions.length === 2
        ? {
            dimensionHeaders: request.dimensions,
            metricHeaders: aiMetrics.map((name) => ({ name })),
            rows: [
              aiRow("202610", "chatgpt.com", "10"),
              aiRow("202610", "chat.openai.com", "5"),
              aiRow("202610", "www.perplexity.ai", "2"),
            ],
          }
        : {
            dimensionHeaders: request.dimensions,
            metricHeaders: [{ name: "sessions" }],
            rows: [
              {
                dimensionValues: [{ value: "202610" }],
                metricValues: [{ value: "1000" }],
              },
            ],
          },
    );
  });

  it("groups AI sources by provider over complete months only", async () => {
    const result = await loadAiReferrals("p", new Date("2026-11-03T12:00:00Z"));
    expect(result?.connected && result.rows).toEqual([
      expect.objectContaining({
        month: "2026-10-01",
        provider: "ChatGPT",
        sessions: 15,
      }),
      expect.objectContaining({ provider: "Perplexity", sessions: 2 }),
    ]);
    expect(mocks.runReport).toHaveBeenCalledWith(
      expect.objectContaining({
        dateRanges: [{ startDate: "2025-10-01", endDate: "2026-10-31" }],
      }),
    );
  });

  it("reports a project with no GA4 connection", async () => {
    mocks.getByProjectId.mockResolvedValue(null);
    expect(await loadAiReferrals("p")).toEqual({ connected: false });
  });
});
