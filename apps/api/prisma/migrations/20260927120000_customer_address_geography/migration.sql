CREATE TABLE "address_provinces" (
  "id" SMALLINT NOT NULL,
  "name" VARCHAR(64) NOT NULL,
  "display_order" SMALLINT NOT NULL,
  "center_latitude" DECIMAL(9,6) NOT NULL,
  "center_longitude" DECIMAL(9,6) NOT NULL,
  CONSTRAINT "address_provinces_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "address_districts" (
  "id" INTEGER NOT NULL,
  "province_id" SMALLINT NOT NULL,
  "name" VARCHAR(128) NOT NULL,
  "postal_code" VARCHAR(16),
  CONSTRAINT "address_districts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "address_neighborhoods" (
  "id" INTEGER NOT NULL,
  "district_id" INTEGER NOT NULL,
  "name" VARCHAR(128) NOT NULL,
  "postal_code" VARCHAR(16),
  CONSTRAINT "address_neighborhoods_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "address_provinces_name_key" ON "address_provinces"("name");
CREATE UNIQUE INDEX "address_districts_id_province_id_key" ON "address_districts"("id", "province_id");
CREATE UNIQUE INDEX "address_districts_province_id_name_key" ON "address_districts"("province_id", "name");
CREATE INDEX "address_districts_province_id_idx" ON "address_districts"("province_id");
CREATE UNIQUE INDEX "address_neighborhoods_id_district_id_key" ON "address_neighborhoods"("id", "district_id");
CREATE UNIQUE INDEX "address_neighborhoods_district_id_name_key" ON "address_neighborhoods"("district_id", "name");
CREATE INDEX "address_neighborhoods_district_id_idx" ON "address_neighborhoods"("district_id");

ALTER TABLE "addresses"
  ADD COLUMN "province_id" SMALLINT,
  ADD COLUMN "district_id" INTEGER,
  ADD COLUMN "neighborhood_id" INTEGER,
  ADD COLUMN "avenue" VARCHAR(255),
  ADD COLUMN "floor" VARCHAR(32),
  ADD COLUMN "apartment_number" VARCHAR(32),
  ADD CONSTRAINT "addresses_geography_complete_check"
    CHECK (
      ("province_id" IS NULL AND "district_id" IS NULL AND "neighborhood_id" IS NULL)
      OR
      ("province_id" IS NOT NULL AND "district_id" IS NOT NULL AND "neighborhood_id" IS NOT NULL)
    );

ALTER TABLE "address_districts"
  ADD CONSTRAINT "address_districts_province_id_fkey"
  FOREIGN KEY ("province_id") REFERENCES "address_provinces"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "address_neighborhoods"
  ADD CONSTRAINT "address_neighborhoods_district_id_fkey"
  FOREIGN KEY ("district_id") REFERENCES "address_districts"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "addresses"
  ADD CONSTRAINT "addresses_province_id_fkey"
  FOREIGN KEY ("province_id") REFERENCES "address_provinces"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "addresses_district_id_province_id_fkey"
  FOREIGN KEY ("district_id", "province_id") REFERENCES "address_districts"("id", "province_id")
  ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "addresses_neighborhood_id_district_id_fkey"
  FOREIGN KEY ("neighborhood_id", "district_id") REFERENCES "address_neighborhoods"("id", "district_id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "addresses_province_id_district_id_neighborhood_id_idx"
  ON "addresses"("province_id", "district_id", "neighborhood_id");
