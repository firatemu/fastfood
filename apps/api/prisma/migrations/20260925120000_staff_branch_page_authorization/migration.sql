ALTER TABLE "users"
ADD COLUMN IF NOT EXISTS "custom_permissions_enabled" BOOLEAN NOT NULL DEFAULT false;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "user_branch_scopes"
    WHERE "user_id" NOT IN (
      SELECT ur."user_id"
      FROM "user_roles" ur
      JOIN "roles" r ON r."id" = ur."role_id"
      WHERE r."code" IN ('HQ_ADMIN', 'SUPER_ADMIN')
        AND ur."revoked_at" IS NULL
    )
    GROUP BY "user_id"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Staff authorization migration requires each user to have at most one branch scope; resolve duplicate scopes before retrying.';
  END IF;

  IF EXISTS (SELECT 1 FROM "roles" WHERE "code" = 'HQ_ADMIN')
     AND EXISTS (SELECT 1 FROM "roles" WHERE "code" = 'SUPER_ADMIN') THEN
    RAISE EXCEPTION 'Both HQ_ADMIN and SUPER_ADMIN roles exist; resolve the duplicate system roles before retrying.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "user_roles" branch_admin
    JOIN "roles" branch_role ON branch_role."id" = branch_admin."role_id"
    JOIN "user_roles" super_admin ON super_admin."user_id" = branch_admin."user_id"
    JOIN "roles" super_role ON super_role."id" = super_admin."role_id"
    WHERE branch_role."code" = 'BRANCH_ADMIN'
      AND super_role."code" IN ('HQ_ADMIN', 'SUPER_ADMIN')
      AND branch_admin."revoked_at" IS NULL
      AND super_admin."revoked_at" IS NULL
      AND (branch_admin."expires_at" IS NULL OR branch_admin."expires_at" > CURRENT_TIMESTAMP)
      AND (super_admin."expires_at" IS NULL OR super_admin."expires_at" > CURRENT_TIMESTAMP)
  ) THEN
    RAISE EXCEPTION 'A staff account cannot be both Super Admin and branch administrator; resolve dual role assignments before retrying.';
  END IF;

  IF EXISTS (
    SELECT ur."user_id"
    FROM "user_roles" ur
    JOIN "roles" r ON r."id" = ur."role_id"
    JOIN "users" u ON u."id" = ur."user_id" AND u."actor_type" = 'STAFF'
    LEFT JOIN "user_branch_scopes" scopes ON scopes."user_id" = ur."user_id"
    WHERE r."code" = 'BRANCH_ADMIN'
      AND ur."revoked_at" IS NULL
      AND (ur."expires_at" IS NULL OR ur."expires_at" > CURRENT_TIMESTAMP)
    GROUP BY ur."user_id"
    HAVING COUNT(scopes."branch_id") <> 1
  ) THEN
    RAISE EXCEPTION 'Staff authorization migration requires each active BRANCH_ADMIN to have exactly one branch scope.';
  END IF;

  IF EXISTS (
    SELECT scopes."branch_id"
    FROM "user_roles" ur
    JOIN "roles" r ON r."id" = ur."role_id"
    JOIN "users" u ON u."id" = ur."user_id" AND u."actor_type" = 'STAFF'
    JOIN "user_branch_scopes" scopes ON scopes."user_id" = ur."user_id"
    WHERE r."code" = 'BRANCH_ADMIN'
      AND ur."revoked_at" IS NULL
      AND (ur."expires_at" IS NULL OR ur."expires_at" > CURRENT_TIMESTAMP)
    GROUP BY scopes."branch_id"
    HAVING COUNT(DISTINCT ur."user_id") > 1
  ) THEN
    RAISE EXCEPTION 'Staff authorization migration requires resolving duplicate BRANCH_ADMIN assignments within a branch.';
  END IF;
END $$;

DELETE FROM "user_branch_scopes"
WHERE "user_id" IN (
  SELECT ur."user_id"
  FROM "user_roles" ur
  JOIN "roles" r ON r."id" = ur."role_id"
  WHERE r."code" IN ('HQ_ADMIN', 'SUPER_ADMIN')
    AND ur."revoked_at" IS NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "user_branch_scopes_user_id_key"
ON "user_branch_scopes"("user_id");

ALTER TABLE "user_branch_scopes"
ADD CONSTRAINT "user_branch_scopes_branch_id_fkey"
FOREIGN KEY ("branch_id") REFERENCES "branches"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "user_permission_grants" (
  "user_id" UUID NOT NULL,
  "permission_id" UUID NOT NULL,
  "granted_by_user_id" UUID,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "user_permission_grants_pkey" PRIMARY KEY ("user_id", "permission_id"),
  CONSTRAINT "user_permission_grants_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "user_permission_grants_permission_id_fkey"
    FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "user_permission_grants_granted_by_user_id_fkey"
    FOREIGN KEY ("granted_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "user_permission_grants_permission_id_idx"
ON "user_permission_grants"("permission_id");

CREATE TABLE "branch_administrators" (
  "branch_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "assigned_by_user_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "branch_administrators_pkey" PRIMARY KEY ("branch_id"),
  CONSTRAINT "branch_administrators_user_id_key" UNIQUE ("user_id"),
  CONSTRAINT "branch_administrators_branch_id_fkey"
    FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "branch_administrators_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "branch_administrators_assigned_by_user_id_fkey"
    FOREIGN KEY ("assigned_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "branch_administrators_assigned_by_user_id_idx"
ON "branch_administrators"("assigned_by_user_id");

INSERT INTO "branch_administrators" (
  "branch_id", "user_id", "assigned_by_user_id", "created_at", "updated_at"
)
SELECT
  scopes."branch_id",
  ur."user_id",
  COALESCE(
    (SELECT actor."id" FROM "users" actor WHERE actor."id" = ur."granted_by_user_id"),
    ur."user_id"
  ),
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "user_roles" ur
JOIN "roles" r ON r."id" = ur."role_id"
JOIN "users" u ON u."id" = ur."user_id" AND u."actor_type" = 'STAFF'
JOIN "user_branch_scopes" scopes ON scopes."user_id" = ur."user_id"
WHERE r."code" = 'BRANCH_ADMIN'
  AND ur."revoked_at" IS NULL
  AND (ur."expires_at" IS NULL OR ur."expires_at" > CURRENT_TIMESTAMP);

UPDATE "branches"
SET "is_active" = FALSE, "is_accepting_orders" = FALSE
WHERE NOT EXISTS (
  SELECT 1
  FROM "branch_administrators" administrators
  WHERE administrators."branch_id" = "branches"."id"
);

UPDATE "roles"
SET "code" = 'SUPER_ADMIN', "name" = 'Super Admin', "updated_at" = CURRENT_TIMESTAMP
WHERE "code" = 'HQ_ADMIN';
