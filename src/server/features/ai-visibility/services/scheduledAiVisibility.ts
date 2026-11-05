import { takeWhile } from "remeda";
import { AppError } from "@/server/lib/errors";
import { pruneAiVisibility } from "./aiVisibilityRetention";
import { AiVisibilityRepository as repo } from "../repositories/AiVisibilityRepository";
import { AiVisibilityError } from "./aiVisibilityErrors";
import { activeAiPrompts, trackerEngines } from "./aiVisibilityConfiguration";
import { startRun } from "./aiVisibilityRuns";
import { computeNextCheckAt } from "@/shared/rank-tracking";

// Answers admitted per tick. Like rank tracking's task-unit budget, it keeps
// task_get polling under DataForSEO's 2,000 requests a minute; the first start
// of a tick is always admitted so a large tracker never starves. Trackers past
// the budget stay due for the next tick, oldest first.
const SCHEDULED_ANSWER_BUDGET = 1000;
const TICK_DEADLINE_MS = 2 * 60_000;
// Million Searches: a scheduled run that fails entirely is retried after these
// waits, since the next scheduled check may be a month away. Runs that got
// some answers ("partial") are kept as they are.
const HOUR_MS = 3_600_000;
const RETRY_DELAYS_MS = [HOUR_MS, 4 * HOUR_MS, 12 * HOUR_MS];
const RETRY_WINDOW_MS = 48 * HOUR_MS;
const RETRIES_EXHAUSTED =
  "The scheduled check failed repeatedly. Use Run now to try again.";

/** Starts a new run for trackers whose latest run is a failed scheduled one. */
async function retryFailedScheduledRuns(deadline: number) {
  const since = new Date(Date.now() - RETRY_WINDOW_MS).toISOString();
  for (const {
    tracker,
    organizationId,
  } of await repo.listTrackersWithFailedScheduledRuns(since)) {
    if (Date.now() >= deadline) break;
    try {
      // Newest first. Any newer run, such as a manual one, ends the chain.
      const runs = await repo.listRuns(tracker.projectId, 5);
      const failed = takeWhile(
        runs,
        (run) =>
          run.trigger === "scheduled" &&
          run.status === "failed" &&
          run.createdAt > since,
      );
      const latest = failed[0];
      if (!latest) continue;
      const delay = RETRY_DELAYS_MS[failed.length - 1];
      if (delay === undefined) {
        if (tracker.lastSkipReason !== RETRIES_EXHAUSTED)
          await repo.updateTracker(tracker.id, {
            lastSkipReason: RETRIES_EXHAUSTED,
          });
        continue;
      }
      const failedAt = Date.parse(latest.completedAt ?? latest.createdAt);
      if (Date.now() - failedAt < delay) continue;
      const config = await repo.getConfiguration(tracker.projectId);
      if (!config) continue;
      await startRun(config, "scheduled", {
        organizationId,
        userId: "system",
        userEmail: "system@openseo.so",
        projectId: tracker.projectId,
      });
    } catch (error) {
      if (!(error instanceof AiVisibilityError))
        console.error("[ai-visibility] scheduled retry failed to start", {
          trackerId: tracker.id,
          error,
        });
    }
  }
}

/** Cron body: start a check for every due tracker. */
export async function runScheduledAiVisibility() {
  try {
    await pruneAiVisibility();
  } catch (error) {
    console.error("[ai-visibility] retention sweep failed", error);
  }
  const deadline = Date.now() + TICK_DEADLINE_MS;
  let started = 0;
  let answersStarted = 0;
  for (const { tracker, organizationId } of await repo.listDue(
    new Date().toISOString(),
  )) {
    if (Date.now() >= deadline) break;
    // Unreachable: the due query only returns trackers with a next check.
    if (!tracker.nextCheckAt) continue;
    const observedNextCheckAt = tracker.nextCheckAt;
    try {
      const config = await repo.getConfiguration(tracker.projectId);
      if (!config) continue;
      const answers =
        activeAiPrompts(config).length * trackerEngines(tracker).length;
      if (started > 0 && answersStarted + answers > SCHEDULED_ANSWER_BUDGET)
        break;
      // Advance the schedule before starting, so a tracker that fails or is
      // busy moves on instead of staying due and crowding out the rest.
      const claimed = await repo.claimDueTracker({
        trackerId: tracker.id,
        observedNextCheckAt,
        values: {
          nextCheckAt: computeNextCheckAt(
            tracker.scheduleInterval,
            observedNextCheckAt,
          ),
          lastSkipReason: null,
        },
      });
      if (!claimed) continue;
      // Always queued: a baseline collects live only when a user starts it
      // (onboarding or turning on the schedule) and waits for the answers.
      await startRun(config, "scheduled", {
        organizationId,
        userId: "system",
        userEmail: "system@openseo.so",
        projectId: tracker.projectId,
      });
      started++;
      answersStarted += answers;
    } catch (error) {
      // startRun records a credits skip on the tracker.
      if (error instanceof AppError && error.code === "INSUFFICIENT_CREDITS")
        continue;
      if (!(error instanceof AiVisibilityError))
        console.error("[ai-visibility] scheduled check failed to start", {
          trackerId: tracker.id,
          error,
        });
      await repo
        .updateTracker(tracker.id, {
          lastSkipReason:
            error instanceof AiVisibilityError
              ? error.message
              : "The scheduled check could not start.",
        })
        .catch(() => undefined);
    }
  }
  await retryFailedScheduledRuns(deadline);
}
