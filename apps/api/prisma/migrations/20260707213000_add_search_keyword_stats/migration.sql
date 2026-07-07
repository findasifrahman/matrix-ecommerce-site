CREATE TABLE "public"."search_keyword_stats" (
    "id" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,
    "normalized_key" TEXT NOT NULL,
    "search_count" INTEGER NOT NULL DEFAULT 1,
    "result_count_sum" INTEGER NOT NULL DEFAULT 0,
    "last_result_count" INTEGER NOT NULL DEFAULT 0,
    "last_searched_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "search_keyword_stats_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "search_keyword_stats_normalized_key_key" ON "public"."search_keyword_stats"("normalized_key");
CREATE INDEX "search_keyword_stats_search_count_last_searched_at_idx" ON "public"."search_keyword_stats"("search_count", "last_searched_at");
CREATE INDEX "search_keyword_stats_last_searched_at_idx" ON "public"."search_keyword_stats"("last_searched_at");
