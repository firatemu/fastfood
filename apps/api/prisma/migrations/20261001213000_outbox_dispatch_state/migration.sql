-- Durable outbox dispatch state (document 17 §4).
--
-- The outbox row now carries the bookkeeping a consumer needs in order to
-- drain it safely:
--   * `next_attempt_at`  — retry backoff, so a failed delivery is not retried
--                          in a hot loop,
--   * `locked_at`        — the consumer lease; an expired lease lets another
--   * `locked_by`          consumer recover an event abandoned mid-dispatch,
--   * `dead_lettered_at` — set once the retry budget is spent, after which the
--                          row stops being claimed.
--
-- `attempts`, `last_attempt_at` and `last_error` already exist on the model but
-- were never written by any code path; the consumer now maintains them.

-- AlterTable
ALTER TABLE "outbox_events" ADD COLUMN     "dead_lettered_at" TIMESTAMPTZ(6),
ADD COLUMN     "locked_at" TIMESTAMPTZ(6),
ADD COLUMN     "locked_by" VARCHAR(128),
ADD COLUMN     "next_attempt_at" TIMESTAMPTZ(6);

-- CreateIndex
CREATE INDEX "outbox_events_dispatch_idx" ON "outbox_events"("published_at", "dead_lettered_at", "next_attempt_at", "created_at");
