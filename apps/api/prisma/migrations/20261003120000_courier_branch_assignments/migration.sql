-- Explicit courier ↔ branch membership (document 15 §delivery, document 31
-- §identity and authorization).
--
-- Until now a courier's branch was *inferred* from delivery history
-- (`deliveries.branch_id` / `delivery_assignments`). That guess had three
-- consequences the operations surface cannot accept:
--   * a brand new courier belonged to no branch until they happened to
--     receive a job, so a branch manager could not roster their own team,
--   * a courier who stopped working for a branch stayed listed for it,
--   * the roster shown in the admin UI was a by-product of past orders
--     rather than a record anybody could edit.
--
-- `courier_branches` makes the link a first-class record written when an
-- administrator declares a courier for a branch. It is a join table (not a
-- column on `courier_profiles`) because a courier may serve several branches.

-- AlterEnum
ALTER TYPE "identifier_type" ADD VALUE 'COURIER_USERNAME';

-- CreateTable
CREATE TABLE "courier_branches" (
    "courier_id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "assigned_by_user_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "courier_branches_pkey" PRIMARY KEY ("courier_id", "branch_id")
);

-- CreateIndex
CREATE INDEX "courier_branches_branch_id_idx" ON "courier_branches"("branch_id");

-- CreateIndex
CREATE INDEX "courier_branches_assigned_by_user_id_idx" ON "courier_branches"("assigned_by_user_id");

-- AddForeignKey
ALTER TABLE "courier_branches" ADD CONSTRAINT "courier_branches_courier_id_fkey" FOREIGN KEY ("courier_id") REFERENCES "courier_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "courier_branches" ADD CONSTRAINT "courier_branches_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "courier_branches" ADD CONSTRAINT "courier_branches_assigned_by_user_id_fkey" FOREIGN KEY ("assigned_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Backfill. Every branch a courier already worked for becomes an explicit
-- assignment so nothing is lost when the history-based guess is retired. The
-- historical guess carries no actor, so the courier's own user row is recorded
-- as the assigning actor; `users` is joined explicitly because
-- `courier_profiles.user_id` is not a foreign key.
INSERT INTO "courier_branches" ("courier_id", "branch_id", "is_primary", "assigned_by_user_id")
SELECT cp."id", pairs."branch_id", false, u."id"
FROM (
    SELECT DISTINCT "courier_id", "branch_id"
    FROM (
        SELECT d."courier_id", d."branch_id"
        FROM "deliveries" d
        WHERE d."courier_id" IS NOT NULL
        UNION
        SELECT da."courier_id", d."branch_id"
        FROM "delivery_assignments" da
        JOIN "deliveries" d ON d."id" = da."delivery_id"
    ) AS history
) AS pairs
JOIN "courier_profiles" cp ON cp."id" = pairs."courier_id"
JOIN "users" u ON u."id" = cp."user_id"
ON CONFLICT DO NOTHING;
