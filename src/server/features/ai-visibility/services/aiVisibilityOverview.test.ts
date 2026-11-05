import { describe, expect, it, vi } from "vitest";
import { runMetrics } from "@/client/features/alh-insights/aiVisibilityMetrics";
import { tallyRun } from "./aiVisibilityOverview";

vi.mock("../repositories/aiVisibilityTrendRepository", () => ({
  getOverviewObservations: vi.fn(),
  listTrendRuns: vi.fn(),
}));

function match(
  observationId: string,
  domain: string,
  firstMention: number | null,
  extra: {
    branded?: boolean;
    status?: "completed" | "failed";
    cited?: boolean;
  } = {},
) {
  return {
    observationId,
    runId: "run",
    engine: "chatgpt" as const,
    branded: extra.branded ?? false,
    status: extra.status ?? "completed",
    hasAnswer: 1,
    name: domain,
    domain,
    own: domain === "us.com",
    mentioned: firstMention !== null,
    cited: extra.cited ?? false,
    firstMention,
  };
}

describe("AI visibility overview metrics", () => {
  it("computes visibility, share of voice and position from answer order", () => {
    const run = {
      runId: "run",
      createdAt: "2026-11-01",
      engines: tallyRun([
        // Them first, us second.
        match("a", "them.com", 10),
        match("a", "us.com", 50, { cited: true }),
        // Us alone.
        match("b", "them.com", null),
        match("b", "us.com", 5),
        // Neither named: still an answer.
        match("c", "them.com", null),
        match("c", "us.com", null),
      ]),
    };
    const metrics = runMetrics(run, null);
    const us = metrics.get("us.com");
    expect(us?.visibility).toBeCloseTo(2 / 3);
    expect(us?.sov).toBeCloseTo(2 / 3);
    expect(us?.position).toBe(1.5);
    expect(us?.firstRate).toBeCloseTo(1 / 3);
    expect(us?.citationRate).toBeCloseTo(1 / 3);
    expect(metrics.get("them.com")?.position).toBe(1);
  });

  it("leaves out branded prompts and failed answers", () => {
    const engines = tallyRun([
      match("a", "us.com", 1, { branded: true }),
      match("b", "us.com", 1, { status: "failed" }),
    ]);
    expect(engines).toEqual([]);
  });
});
