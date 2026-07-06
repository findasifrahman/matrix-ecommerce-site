-- Local ecommerce taxonomy and media support.

CREATE TABLE IF NOT EXISTS "main_categories" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "description" TEXT,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "requires_brand_model" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "main_categories_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "brands" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "brands_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "main_category_brands" (
  "id" TEXT NOT NULL,
  "main_category_id" TEXT NOT NULL,
  "brand_id" TEXT NOT NULL,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "main_category_brands_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "brand_models" (
  "id" TEXT NOT NULL,
  "brand_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "brand_models_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "product_types" (
  "id" TEXT NOT NULL,
  "main_category_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "product_types_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "main_categories_slug_key" ON "main_categories"("slug");
CREATE INDEX IF NOT EXISTS "main_categories_is_active_sort_order_idx" ON "main_categories"("is_active", "sort_order");
CREATE INDEX IF NOT EXISTS "main_categories_slug_idx" ON "main_categories"("slug");

CREATE UNIQUE INDEX IF NOT EXISTS "brands_slug_key" ON "brands"("slug");
CREATE INDEX IF NOT EXISTS "brands_is_active_sort_order_idx" ON "brands"("is_active", "sort_order");
CREATE INDEX IF NOT EXISTS "brands_slug_idx" ON "brands"("slug");

CREATE UNIQUE INDEX IF NOT EXISTS "main_category_brands_main_category_id_brand_id_key" ON "main_category_brands"("main_category_id", "brand_id");
CREATE INDEX IF NOT EXISTS "main_category_brands_brand_id_idx" ON "main_category_brands"("brand_id");
CREATE INDEX IF NOT EXISTS "main_category_brands_main_category_id_sort_order_idx" ON "main_category_brands"("main_category_id", "sort_order");

CREATE UNIQUE INDEX IF NOT EXISTS "brand_models_brand_id_slug_key" ON "brand_models"("brand_id", "slug");
CREATE INDEX IF NOT EXISTS "brand_models_brand_id_is_active_sort_order_idx" ON "brand_models"("brand_id", "is_active", "sort_order");

CREATE UNIQUE INDEX IF NOT EXISTS "product_types_main_category_id_slug_key" ON "product_types"("main_category_id", "slug");
CREATE INDEX IF NOT EXISTS "product_types_main_category_id_is_active_sort_order_idx" ON "product_types"("main_category_id", "is_active", "sort_order");

ALTER TABLE "main_category_brands"
  ADD CONSTRAINT "main_category_brands_main_category_id_fkey"
  FOREIGN KEY ("main_category_id") REFERENCES "main_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "main_category_brands"
  ADD CONSTRAINT "main_category_brands_brand_id_fkey"
  FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "brand_models"
  ADD CONSTRAINT "brand_models_brand_id_fkey"
  FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "product_types"
  ADD CONSTRAINT "product_types_main_category_id_fkey"
  FOREIGN KEY ("main_category_id") REFERENCES "main_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "main_category_id" TEXT;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "brand_id" TEXT;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "brand_model_id" TEXT;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "product_type_id" TEXT;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "video_asset_id" TEXT;

CREATE INDEX IF NOT EXISTS "products_main_category_id_idx" ON "products"("main_category_id");
CREATE INDEX IF NOT EXISTS "products_brand_id_idx" ON "products"("brand_id");
CREATE INDEX IF NOT EXISTS "products_brand_model_id_idx" ON "products"("brand_model_id");
CREATE INDEX IF NOT EXISTS "products_product_type_id_idx" ON "products"("product_type_id");

ALTER TABLE "products"
  ADD CONSTRAINT "products_main_category_id_fkey"
  FOREIGN KEY ("main_category_id") REFERENCES "main_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "products"
  ADD CONSTRAINT "products_brand_id_fkey"
  FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "products"
  ADD CONSTRAINT "products_brand_model_id_fkey"
  FOREIGN KEY ("brand_model_id") REFERENCES "brand_models"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "products"
  ADD CONSTRAINT "products_product_type_id_fkey"
  FOREIGN KEY ("product_type_id") REFERENCES "product_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "products"
  ADD CONSTRAINT "products_video_asset_id_fkey"
  FOREIGN KEY ("video_asset_id") REFERENCES "media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

DROP TABLE IF EXISTS "shipping_rate_settings" CASCADE;
DROP TABLE IF EXISTS "source_markup_settings" CASCADE;
DROP TABLE IF EXISTS "moq_shopping_otapi_rule" CASCADE;
