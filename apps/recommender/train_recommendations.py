import os
import sys
import uuid
from datetime import datetime, timezone

import numpy as np
import pandas as pd
import psycopg
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity


DATABASE_URL = os.environ.get("DATABASE_URL")
MODEL_NAME = os.environ.get("RECOMMENDER_MODEL_NAME", "matrix-product-recommender")
TOP_K = int(os.environ.get("RECOMMENDER_TOP_K", "12"))
MIN_EVENTS = int(os.environ.get("RECOMMENDER_MIN_EVENTS", "2"))


def require_database_url():
    if not DATABASE_URL:
        print("DATABASE_URL is required", file=sys.stderr)
        sys.exit(1)


def fetch_dataframe(conn, sql):
    with conn.cursor() as cur:
        cur.execute(sql)
        rows = cur.fetchall()
        columns = [desc.name for desc in cur.description]
    return pd.DataFrame(rows, columns=columns)


def normalize_identifier(value):
    return str(value) if value is not None else ""


def product_text(row):
    return " ".join(
        str(row.get(col) or "")
        for col in ["title", "description", "brand", "sku", "source_kind"]
    )


def build_content_similarity(products):
    if products.empty:
        return np.zeros((0, 0))
    documents = products.apply(product_text, axis=1).tolist()
    matrix = TfidfVectorizer(stop_words="english", min_df=1).fit_transform(documents)
    return cosine_similarity(matrix)


def build_interaction_similarity(products, interactions):
    if products.empty or interactions.empty:
        return np.zeros((len(products), len(products)))

    product_ids = products["id"].map(normalize_identifier).tolist()
    interactions = interactions[interactions["product_id"].map(normalize_identifier).isin(product_ids)].copy()
    if interactions.empty:
        return np.zeros((len(products), len(products)))

    user_item = interactions.pivot_table(
        index="actor_id",
        columns="product_id",
        values="event_weight",
        aggfunc="sum",
        fill_value=0,
    )
    user_item = user_item.reindex(columns=product_ids, fill_value=0)
    return cosine_similarity(user_item.T)


def top_recommendations_for_anchor(anchor_index, product_ids, similarity, popularity, top_k):
    scores = similarity[anchor_index].copy()
    scores[anchor_index] = -1
    popularity_boost = np.array([popularity.get(pid, 0.0) for pid in product_ids], dtype=float)
    if popularity_boost.max() > 0:
        popularity_boost = popularity_boost / popularity_boost.max()
    final_scores = (scores * 0.85) + (popularity_boost * 0.15)
    order = np.argsort(final_scores)[::-1]
    rows = []
    for index in order:
        if index == anchor_index or final_scores[index] <= 0:
            continue
        rows.append((product_ids[index], float(final_scores[index])))
        if len(rows) >= top_k:
            break
    return rows


def main():
    require_database_url()
    version = datetime.now(timezone.utc).strftime("sklearn-%Y%m%d%H%M%S")
    model_id = str(uuid.uuid4())

    with psycopg.connect(DATABASE_URL) as conn:
        products = fetch_dataframe(
            conn,
            """
            SELECT id, title, description, brand, sku, source_kind, price, created_at
            FROM products
            WHERE status = 'published'
            """,
        )
        events = fetch_dataframe(
            conn,
            """
            SELECT
              COALESCE(user_id, anonymous_id, session_id) AS actor_id,
              product_id,
              event_weight,
              occurred_at
            FROM recommendation_events
            WHERE product_id IS NOT NULL
              AND COALESCE(user_id, anonymous_id, session_id) IS NOT NULL
            """,
        )
        historical_orders = fetch_dataframe(
            conn,
            """
            SELECT
              o.user_id AS actor_id,
              oi.product_id,
              8.0 * GREATEST(1, oi.qty)::DOUBLE PRECISION AS event_weight,
              oi.created_at AS occurred_at
            FROM order_items oi
            JOIN orders o ON o.id = oi.order_id
            WHERE oi.product_id IS NOT NULL
              AND o.user_id IS NOT NULL
            """,
        )

        interactions = pd.concat([events, historical_orders], ignore_index=True)
        if products.empty:
            raise RuntimeError("No published products found for recommendations")

        product_ids = products["id"].map(normalize_identifier).tolist()
        content_similarity = build_content_similarity(products)
        interaction_similarity = build_interaction_similarity(products, interactions)
        has_interactions = len(interactions) >= MIN_EVENTS
        similarity = (interaction_similarity * 0.7) + (content_similarity * 0.3) if has_interactions else content_similarity

        popularity = {}
        if not interactions.empty:
            popularity = interactions.groupby("product_id")["event_weight"].sum().to_dict()

        with conn.transaction():
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO recommendation_model_versions
                      (id, name, version, algorithm, status, trained_from, trained_until, metrics, trained_at)
                    VALUES
                      (%s, %s, %s, %s, 'completed', %s, %s, %s::jsonb, NOW())
                    """,
                    (
                        model_id,
                        MODEL_NAME,
                        version,
                        "sklearn:tfidf_cosine_plus_behavior_cosine",
                        interactions["occurred_at"].min() if not interactions.empty else None,
                        interactions["occurred_at"].max() if not interactions.empty else None,
                        pd.Series(
                            {
                                "product_count": int(len(products)),
                                "interaction_count": int(len(interactions)),
                                "top_k": TOP_K,
                                "used_behavior": bool(has_interactions),
                            }
                        ).to_json(),
                    ),
                )

                global_ranked = sorted(product_ids, key=lambda pid: popularity.get(pid, 0.0), reverse=True)
                if not any(popularity.values()):
                    global_ranked = products.sort_values("created_at", ascending=False)["id"].map(normalize_identifier).tolist()

                for rank, product_id in enumerate(global_ranked[:TOP_K], start=1):
                    cur.execute(
                        """
                        INSERT INTO product_recommendations
                          (id, model_version_id, subject_type, product_id, score, rank, reason, context)
                        VALUES (%s, %s, 'global', %s, %s, %s, %s, 'homepage')
                        """,
                        (str(uuid.uuid4()), model_id, product_id, float(popularity.get(product_id, 0.0)), rank, "Popular products"),
                    )

                for anchor_index, anchor_id in enumerate(product_ids):
                    rows = top_recommendations_for_anchor(anchor_index, product_ids, similarity, popularity, TOP_K)
                    for rank, (recommended_id, score) in enumerate(rows, start=1):
                        cur.execute(
                            """
                            INSERT INTO product_recommendations
                              (id, model_version_id, subject_type, anchor_product_id, product_id, score, rank, reason, context)
                            VALUES (%s, %s, 'product', %s, %s, %s, %s, %s, 'product_detail')
                            """,
                            (
                                str(uuid.uuid4()),
                                model_id,
                                anchor_id,
                                recommended_id,
                                score,
                                rank,
                                "Similar behavior and product content",
                            ),
                        )

        print(f"trained recommendation model {version}: products={len(products)} interactions={len(interactions)}")


if __name__ == "__main__":
    main()
