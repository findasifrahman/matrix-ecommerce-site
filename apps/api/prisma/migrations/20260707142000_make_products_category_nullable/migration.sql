-- Align products.category_id with matrix-ecommerce taxonomy rules.
-- Products no longer require a legacy product_categories row.

ALTER TABLE "products"
  ALTER COLUMN "category_id" DROP NOT NULL;

ALTER TABLE "products"
  DROP CONSTRAINT IF EXISTS "products_category_id_fkey";

ALTER TABLE "products"
  ADD CONSTRAINT "products_category_id_fkey"
  FOREIGN KEY ("category_id") REFERENCES "product_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
