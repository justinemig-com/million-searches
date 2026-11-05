import { beforeEach, describe, expect, it, vi } from "vitest";
import { projects } from "@/db/schema";
import { AiVisibilityRepository as repo } from "../repositories/AiVisibilityRepository";
import { runScheduledAiVisibility } from "./scheduledAiVisibility";
import { configuration } from "./aiVisibilityTestFixtures";

const { testDb, workflow, hosted } = await vi.hoisted(async () => {
  const { createAiVisibilityTestDb } = await import("../aiVisibilityTestDb");
  return {
    testDb: await createAiVisibilityTestDb(),
    workflow: { create: vi.fn(), get: vi.fn() },
    hosted: vi.fn(),
  };
});
vi.mock("cloudflare:workers", () => ({
  env: { DATABASE_PROVIDER: "d1", AI_VISIBILITY_WORKFLOW: workflow },
}));
vi.mock("@/db", () => ({ db: testDb.db }));
vi.mock("@/db/runBatch", () => ({ runBatch: testDb.runBatch }));
vi.mock("@/server/lib/runtime-env", () => ({
  getOptionalEnvValue: async () => "dataforseo-key",
  isHostedServerAuthMode: hosted,
}));
vi.mock("@/server/billing/subscription", () => ({
  getOrCreateOrganizationCustomer: async () => ({ id: "organization" }),
  getUsageCreditsRemaining: async () => ({
    monthlyRemaining: 0,
    topupRemaining: 0,
  }),
}));
vi.mock("@/server/email/onboarding-drip", () => ({
  sendCreditsExhaustedEvent: vi.fn(),
}));
vi.mock("./aiVisibilityRetention", () => ({ pruneAiVisibility: vi.fn() }));

const due = "2026-09-01T06:00:00.000Z";
async function dueTracker(projectId: string, paused: boolean) {
  const rows = configuration(
    { engines: ["chatgpt"], prompts: [{ text: "Which SEO tools?", paused }] },
    projectId,
  );
  await repo.saveConfiguration(rows);
  await repo.updateTracker(rows.tracker.id, {
    enabled: true,
    nextCheckAt: due,
  });
}

beforeEach(async () => {
  hosted.mockResolvedValue(false);
  await testDb.seedProject();
  await testDb.db.insert(projects).values({
    id: "paused-project",
    organizationId: "organization",
    name: "Paused",
    domain: "paused.example",
  });
});

it("moves every due tracker on, including one whose check cannot start", async () => {
  await dueTracker("paused-project", true);
  await dueTracker("project", false);

  await runScheduledAiVisibility();

  const skipped = await repo.getTracker("paused-project");
  expect(skipped?.nextCheckAt).not.toBe(due);
  expect(skipped?.lastSkipReason).toMatch(/unpause prompts/);
  expect((await repo.getTracker("project"))?.nextCheckAt).not.toBe(due);
  expect(await repo.listRuns("project")).toMatchObject([
    { trigger: "scheduled", status: "queued" },
  ]);
});

it("records a skipped check for credits on the tracker without starting it", async () => {
  hosted.mockResolvedValue(true);
  await dueTracker("project", false);

  await runScheduledAiVisibility();

  expect((await repo.getTracker("project"))?.lastSkipReason).toBe(
    "INSUFFICIENT_CREDITS",
  );
  expect(await repo.listRuns("project")).toEqual([]);
});

describe("retrying failed scheduled runs", () => {
  const later = "2099-01-01T00:00:00.000Z";

  async function trackerWithRuns(
    runs: {
      trigger?: "scheduled" | "manual";
      status?: "failed" | "completed";
      hoursAgo: number;
    }[],
  ) {
    await dueTracker("project", false);
    const tracker = await repo.getTracker("project");
    if (!tracker) throw new Error("no tracker");
    await repo.updateTracker(tracker.id, { nextCheckAt: later });
    for (const run of runs) {
      const id = crypto.randomUUID();
      const at = new Date(Date.now() - run.hoursAgo * 3_600_000).toISOString();
      await repo.createRun(
        {
          id,
          trackerId: tracker.id,
          projectId: "project",
          trigger: run.trigger ?? "scheduled",
          locationCode: 2840,
          languageCode: "en",
          createdAt: at,
        },
        [],
      );
      await repo.updateRun(id, {
        status: run.status ?? "failed",
        completedAt: at,
      });
    }
    return tracker.id;
  }

  it("retries after the wait without moving the schedule", async () => {
    await trackerWithRuns([{ hoursAgo: 2 }]);

    await runScheduledAiVisibility();

    const runs = await repo.listRuns("project");
    expect(runs).toHaveLength(2);
    expect(runs[0]).toMatchObject({ trigger: "scheduled", status: "queued" });
    expect((await repo.getTracker("project"))?.nextCheckAt).toBe(later);
  });

  it("waits for the delay before retrying", async () => {
    await trackerWithRuns([{ hoursAgo: 0.5 }]);
    await runScheduledAiVisibility();
    expect(await repo.listRuns("project")).toHaveLength(1);
  });

  it("does not retry when a newer run exists", async () => {
    await trackerWithRuns([
      { hoursAgo: 3 },
      { trigger: "manual", status: "completed", hoursAgo: 2 },
    ]);
    await runScheduledAiVisibility();
    expect(await repo.listRuns("project")).toHaveLength(2);
  });

  it("gives up after three retries and says so on the tracker", async () => {
    await trackerWithRuns([
      { hoursAgo: 20 },
      { hoursAgo: 15 },
      { hoursAgo: 14 },
      { hoursAgo: 13 },
    ]);
    await runScheduledAiVisibility();
    expect(await repo.listRuns("project")).toHaveLength(4);
    expect((await repo.getTracker("project"))?.lastSkipReason).toMatch(
      /failed repeatedly/,
    );
  });
});
