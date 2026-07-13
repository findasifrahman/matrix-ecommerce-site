CREATE TABLE IF NOT EXISTS "recommendation_events" (
  "id" TEXT NOT NULL,
  "user_id" TEXT,
  "anonymous_id" TEXT,
  "session_id" TEXT,
  "product_id" TEXT,
  "event_type" TEXT NOT NULL,
  "event_weight" DOUBLE PRECISION NOT NULL DEFAULT 1,
  "source" TEXT,
  "search_query" TEXT,
  "referrer" TEXT,
  "metadata" JSONB,
  "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "recommendation_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "recommendation_model_versions" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "version" TEXT NOT NULL,
  "algorithm" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'training',
  "trained_from" TIMESTAMP(3),
  "trained_until" TIMESTAMP(3),
  "metrics" JSONB,
  "artifact_uri" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "trained_at" TIMESTAMP(3),
  CONSTRAINT "recommendation_model_versions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "product_recommendations" (
  "id" TEXT NOT NULL,
  "model_version_id" TEXT NOT NULL,
  "subject_type" TEXT NOT NULL DEFAULT 'global',
  "user_id" TEXT,
  "anchor_product_id" TEXT,
  "product_id" TEXT NOT NULL,
  "score" DOUBLE PRECISION NOT NULL,
  "rank" INTEGER NOT NULL,
  "reason" TEXT,
  "context" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "product_recommendations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "recommendation_model_versions_version_key" ON "recommendation_model_versions"("version");
CREATE INDEX IF NOT EXISTS "recommendation_model_versions_name_created_at_idx" ON "recommendation_model_versions"("name", "created_at");
CREATE INDEX IF NOT EXISTS "recommendation_model_versions_status_idx" ON "recommendation_model_versions"("status");

CREATE INDEX IF NOT EXISTS "recommendation_events_user_id_occurred_at_idx" ON "recommendation_events"("user_id", "occurred_at");
CREATE INDEX IF NOT EXISTS "recommendation_events_anonymous_id_occurred_at_idx" ON "recommendation_events"("anonymous_id", "occurred_at");
CREATE INDEX IF NOT EXISTS "recommendation_events_session_id_occurred_at_idx" ON "recommendation_events"("session_id", "occurred_at");
CREATE INDEX IF NOT EXISTS "recommendation_events_product_id_occurred_at_idx" ON "recommendation_events"("product_id", "occurred_at");
CREATE INDEX IF NOT EXISTS "recommendation_events_event_type_occurred_at_idx" ON "recommendation_events"("event_type", "occurred_at");
CREATE INDEX IF NOT EXISTS "recommendation_events_search_query_idx" ON "recommendation_events"("search_query");

CREATE UNIQUE INDEX IF NOT EXISTS "product_recommendations_model_version_id_subject_type_user_id_anchor_product_id_product_id_key"
  ON "product_recommendations"("model_version_id", "subject_type", "user_id", "anchor_product_id", "product_id");
CREATE INDEX IF NOT EXISTS "product_recommendations_subject_type_user_id_rank_idx" ON "product_recommendations"("subject_type", "user_id", "rank");
CREATE INDEX IF NOT EXISTS "product_recommendations_subject_type_anchor_product_id_rank_idx" ON "product_recommendations"("subject_type", "anchor_product_id", "rank");
CREATE INDEX IF NOT EXISTS "product_recommendations_product_id_idx" ON "product_recommendations"("product_id");

ALTER TABLE "recommendation_events"
  ADD CONSTRAINT "recommendation_events_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "recommendation_events"
  ADD CONSTRAINT "recommendation_events_product_id_fkey"
  FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "product_recommendations"
  ADD CONSTRAINT "product_recommendations_model_version_id_fkey"
  FOREIGN KEY ("model_version_id") REFERENCES "recommendation_model_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "product_recommendations"
  ADD CONSTRAINT "product_recommendations_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "product_recommendations"
  ADD CONSTRAINT "product_recommendations_anchor_product_id_fkey"
  FOREIGN KEY ("anchor_product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "product_recommendations"
  ADD CONSTRAINT "product_recommendations_product_id_fkey"
  FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
