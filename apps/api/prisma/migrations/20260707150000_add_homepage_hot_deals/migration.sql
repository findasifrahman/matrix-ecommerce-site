CREATE TABLE IF NOT EXISTS "homepage_hot_deals" (
  "id" TEXT NOT NULL,
  "product_id" TEXT NOT NULL,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "homepage_hot_deals_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "homepage_hot_deals_product_id_key"
  ON "homepage_hot_deals"("product_id");

CREATE INDEX IF NOT EXISTS "homepage_hot_deals_is_active_sort_order_idx"
  ON "homepage_hot_deals"("is_active", "sort_order");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'homepage_hot_deals_product_id_fkey'
      AND table_name = 'homepage_hot_deals'
  ) THEN
    ALTER TABLE "homepage_hot_deals"
      ADD CONSTRAINT "homepage_hot_deals_product_id_fkey"
      FOREIGN KEY ("product_id") REFERENCES "products"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
