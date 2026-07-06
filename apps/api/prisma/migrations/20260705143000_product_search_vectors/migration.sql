CREATE TABLE IF NOT EXISTS "product_search_vectors" (
  "id" TEXT NOT NULL,
  "product_id" TEXT NOT NULL,
  "main_category_id" TEXT,
  "category_id" TEXT,
  "product_type_id" TEXT,
  "brand_id" TEXT,
  "brand_model_id" TEXT,
  "searchable_text" TEXT NOT NULL,
  "tokens" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "product_search_vectors_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "product_search_vectors_product_id_key" ON "product_search_vectors"("product_id");
CREATE INDEX IF NOT EXISTS "product_search_vectors_main_category_id_idx" ON "product_search_vectors"("main_category_id");
CREATE INDEX IF NOT EXISTS "product_search_vectors_category_id_idx" ON "product_search_vectors"("category_id");
CREATE INDEX IF NOT EXISTS "product_search_vectors_product_type_id_idx" ON "product_search_vectors"("product_type_id");
CREATE INDEX IF NOT EXISTS "product_search_vectors_brand_id_idx" ON "product_search_vectors"("brand_id");
CREATE INDEX IF NOT EXISTS "product_search_vectors_brand_model_id_idx" ON "product_search_vectors"("brand_model_id");
CREATE INDEX IF NOT EXISTS "product_search_vectors_tokens_idx" ON "product_search_vectors" USING GIN ("tokens");

ALTER TABLE "product_search_vectors"
  ADD CONSTRAINT "product_search_vectors_product_id_fkey"
  FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
