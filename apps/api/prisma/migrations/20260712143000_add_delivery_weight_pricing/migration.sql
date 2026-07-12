ALTER TABLE "shipping_charges"
  ADD COLUMN IF NOT EXISTS "per_kg_charge" DOUBLE PRECISION NOT NULL DEFAULT 30;

DELETE FROM "shipping_charges"
WHERE "delivery_area" = 'inside_dhaka'
  AND EXISTS (
    SELECT 1 FROM "shipping_charges" legacy
    WHERE LOWER(REPLACE(legacy."delivery_area", ' ', '_')) = 'inside_dhaka'
      AND legacy."delivery_area" <> 'inside_dhaka'
  );

UPDATE "shipping_charges"
SET "delivery_area" = 'inside_dhaka',
    "cost" = 50,
    "per_kg_charge" = COALESCE("per_kg_charge", 30),
    "is_active" = true,
    "updated_at" = NOW()
WHERE LOWER(REPLACE("delivery_area", ' ', '_')) = 'inside_dhaka';

UPDATE "shipping_charges"
SET "cost" = 100,
    "per_kg_charge" = COALESCE("per_kg_charge", 30),
    "is_active" = true,
    "updated_at" = NOW()
WHERE "delivery_area" = 'outside_dhaka';

INSERT INTO "shipping_charges" ("id", "delivery_area", "cost", "per_kg_charge", "is_active", "created_at", "updated_at")
VALUES
  ('11111111-1111-4111-8111-111111111111', 'inside_dhaka', 50, 30, true, NOW(), NOW()),
  ('22222222-2222-4222-8222-222222222222', 'outside_dhaka', 100, 30, true, NOW(), NOW())
ON CONFLICT ("delivery_area") DO UPDATE
SET
  "per_kg_charge" = COALESCE("shipping_charges"."per_kg_charge", EXCLUDED."per_kg_charge"),
  "is_active" = true,
  "updated_at" = NOW();
