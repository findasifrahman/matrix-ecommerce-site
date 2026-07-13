CREATE EXTENSION IF NOT EXISTS pg_trgm;

DELETE FROM product_search_vectors AS psv
WHERE NOT EXISTS (
  SELECT 1
  FROM products AS p
  WHERE p.id = psv.product_id
);

UPDATE orders AS o
SET coupon_id = NULL
WHERE coupon_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM coupons AS c
    WHERE c.id = o.coupon_id
  );

UPDATE coupons AS c
SET created_by = NULL
WHERE created_by IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM users AS u
    WHERE u.id = c.created_by
  );

WITH ranked_cart_items AS (
  SELECT
    id,
    cart_id,
    product_id,
    ROW_NUMBER() OVER (PARTITION BY cart_id, product_id ORDER BY created_at ASC, id ASC) AS rn,
    SUM(qty) OVER (PARTITION BY cart_id, product_id) AS merged_qty
  FROM cart_items
),
cart_items_to_keep AS (
  SELECT id, merged_qty
  FROM ranked_cart_items
  WHERE rn = 1
),
cart_items_to_delete AS (
  SELECT id
  FROM ranked_cart_items
  WHERE rn > 1
)
UPDATE cart_items AS ci
SET qty = keep.merged_qty
FROM cart_items_to_keep AS keep
WHERE ci.id = keep.id;

WITH ranked_cart_items AS (
  SELECT
    id,
    ROW_NUMBER() OVER (PARTITION BY cart_id, product_id ORDER BY created_at ASC, id ASC) AS rn
  FROM cart_items
)
DELETE FROM cart_items AS ci
USING ranked_cart_items AS ranked
WHERE ci.id = ranked.id
  AND ranked.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS cart_items_cart_id_product_id_key
  ON cart_items (cart_id, product_id);

CREATE INDEX IF NOT EXISTS refresh_tokens_user_id_expires_at_idx
  ON refresh_tokens (user_id, expires_at);

CREATE INDEX IF NOT EXISTS auth_email_otps_email_purpose_consumed_at_created_at_idx
  ON auth_email_otps (email, purpose, consumed_at, created_at);

CREATE INDEX IF NOT EXISTS auth_phone_otps_phone_purpose_consumed_at_created_at_idx
  ON auth_phone_otps (phone, purpose, consumed_at, created_at);

CREATE INDEX IF NOT EXISTS auth_otp_blocks_channel_identifier_blocked_until_idx
  ON auth_otp_blocks (channel, identifier, blocked_until);

CREATE INDEX IF NOT EXISTS blog_posts_status_published_at_created_at_idx
  ON blog_posts (status, published_at, created_at);

CREATE INDEX IF NOT EXISTS products_status_is_featured_created_at_idx
  ON products (status, is_featured, created_at);

CREATE INDEX IF NOT EXISTS products_status_main_category_id_is_featured_created_at_idx
  ON products (status, main_category_id, is_featured, created_at);

CREATE INDEX IF NOT EXISTS products_status_product_type_id_is_featured_created_at_idx
  ON products (status, product_type_id, is_featured, created_at);

CREATE INDEX IF NOT EXISTS products_seller_id_status_created_at_idx
  ON products (seller_id, status, created_at);

CREATE INDEX IF NOT EXISTS products_source_kind_created_at_idx
  ON products (source_kind, created_at);

CREATE INDEX IF NOT EXISTS products_external_id_idx
  ON products (external_id);

CREATE INDEX IF NOT EXISTS products_vendor_id_idx
  ON products (vendor_id);

CREATE INDEX IF NOT EXISTS products_title_trgm_idx
  ON products USING GIN (title gin_trgm_ops);

CREATE INDEX IF NOT EXISTS products_description_trgm_idx
  ON products USING GIN (description gin_trgm_ops);

CREATE INDEX IF NOT EXISTS products_brand_trgm_idx
  ON products USING GIN (brand gin_trgm_ops);

CREATE INDEX IF NOT EXISTS products_sku_trgm_idx
  ON products USING GIN (sku gin_trgm_ops);

CREATE INDEX IF NOT EXISTS search_keyword_stats_search_count_last_searched_at_last_result_count_idx
  ON search_keyword_stats (search_count, last_searched_at, last_result_count);

CREATE INDEX IF NOT EXISTS recommendation_model_versions_status_trained_at_idx
  ON recommendation_model_versions (status, trained_at);

CREATE INDEX IF NOT EXISTS product_recommendations_model_version_id_subject_type_rank_idx
  ON product_recommendations (model_version_id, subject_type, rank);

CREATE INDEX IF NOT EXISTS product_recommendations_model_version_id_subject_type_user_id_rank_idx
  ON product_recommendations (model_version_id, subject_type, user_id, rank);

CREATE INDEX IF NOT EXISTS product_recommendations_model_version_id_subject_type_anchor_product_id_rank_idx
  ON product_recommendations (model_version_id, subject_type, anchor_product_id, rank);

CREATE INDEX IF NOT EXISTS cart_items_seller_id_created_at_idx
  ON cart_items (seller_id, created_at);

CREATE INDEX IF NOT EXISTS cart_items_created_at_idx
  ON cart_items (created_at);

CREATE INDEX IF NOT EXISTS orders_user_id_created_at_idx
  ON orders (user_id, created_at);

CREATE INDEX IF NOT EXISTS orders_coupon_id_idx
  ON orders (coupon_id);

CREATE INDEX IF NOT EXISTS orders_status_created_at_idx
  ON orders (status, created_at);

CREATE INDEX IF NOT EXISTS orders_payment_status_created_at_idx
  ON orders (payment_status, created_at);

CREATE INDEX IF NOT EXISTS order_items_order_id_seller_status_idx
  ON order_items (order_id, seller_status);

CREATE INDEX IF NOT EXISTS order_items_seller_id_seller_status_created_at_idx
  ON order_items (seller_id, seller_status, created_at);

CREATE INDEX IF NOT EXISTS shipping_updates_order_id_created_at_idx
  ON shipping_updates (order_id, created_at);

CREATE INDEX IF NOT EXISTS order_status_events_order_id_created_at_idx
  ON order_status_events (order_id, created_at);

CREATE INDEX IF NOT EXISTS payment_proofs_order_id_created_at_idx
  ON payment_proofs (order_id, created_at);

CREATE INDEX IF NOT EXISTS payment_proofs_status_created_at_idx
  ON payment_proofs (status, created_at);

CREATE INDEX IF NOT EXISTS coupons_is_active_starts_at_ends_at_idx
  ON coupons (is_active, starts_at, ends_at);

CREATE INDEX IF NOT EXISTS coupon_redemptions_coupon_id_user_id_idx
  ON coupon_redemptions (coupon_id, user_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'product_search_vectors_product_id_fkey'
  ) THEN
    ALTER TABLE product_search_vectors
      ADD CONSTRAINT product_search_vectors_product_id_fkey
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'orders_coupon_id_fkey'
  ) THEN
    ALTER TABLE orders
      ADD CONSTRAINT orders_coupon_id_fkey
      FOREIGN KEY (coupon_id) REFERENCES coupons(id) ON DELETE SET NULL NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'coupons_created_by_fkey'
  ) THEN
    ALTER TABLE coupons
      ADD CONSTRAINT coupons_created_by_fkey
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'coupon_redemptions_user_id_fkey'
  ) THEN
    ALTER TABLE coupon_redemptions
      ADD CONSTRAINT coupon_redemptions_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT NOT VALID;
  END IF;
END $$;
