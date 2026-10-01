-- Distinct settlement records can share a display name inside one district.
-- Keep their stable upstream IDs so all localities remain addressable.
DROP INDEX IF EXISTS "address_neighborhoods_district_id_name_key";
