CREATE TABLE IF NOT EXISTS "shipping_charges" (
  "id" TEXT NOT NULL,
  "delivery_area" TEXT NOT NULL,
  "cost" DOUBLE PRECISION NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "shipping_charges_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "shipping_charges_delivery_area_key" ON "shipping_charges"("delivery_area");
CREATE INDEX IF NOT EXISTS "shipping_charges_is_active_idx" ON "shipping_charges"("is_active");

ALTER TABLE "orders"
  ADD COLUMN IF NOT EXISTS "payment_method" TEXT NOT NULL DEFAULT 'cash_on_delivery';
