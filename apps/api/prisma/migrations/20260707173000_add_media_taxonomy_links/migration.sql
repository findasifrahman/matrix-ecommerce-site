ALTER TABLE "media_assets" ADD COLUMN IF NOT EXISTS "main_category_id" TEXT;
ALTER TABLE "media_assets" ADD COLUMN IF NOT EXISTS "brand_id" TEXT;
ALTER TABLE "media_assets" ADD COLUMN IF NOT EXISTS "brand_model_id" TEXT;
ALTER TABLE "media_assets" ADD COLUMN IF NOT EXISTS "product_type_id" TEXT;

CREATE INDEX IF NOT EXISTS "media_assets_main_category_id_idx" ON "media_assets"("main_category_id");
CREATE INDEX IF NOT EXISTS "media_assets_brand_id_idx" ON "media_assets"("brand_id");
CREATE INDEX IF NOT EXISTS "media_assets_brand_model_id_idx" ON "media_assets"("brand_model_id");
CREATE INDEX IF NOT EXISTS "media_assets_product_type_id_idx" ON "media_assets"("product_type_id");

ALTER TABLE "media_assets"
  ADD CONSTRAINT "media_assets_main_category_id_fkey"
  FOREIGN KEY ("main_category_id") REFERENCES "main_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "media_assets"
  ADD CONSTRAINT "media_assets_brand_id_fkey"
  FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "media_assets"
  ADD CONSTRAINT "media_assets_brand_model_id_fkey"
  FOREIGN KEY ("brand_model_id") REFERENCES "brand_models"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "media_assets"
  ADD CONSTRAINT "media_assets_product_type_id_fkey"
  FOREIGN KEY ("product_type_id") REFERENCES "product_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;
