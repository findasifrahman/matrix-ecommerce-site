# Matrix recommendation engine

This repo is prepared for a scikit-learn recommendation worker.

## Data collected

- `recommendation_events`: raw browsing and buying signals such as search, product click, product view, add to cart, buy now, and purchase.
- `recommendation_model_versions`: one row per training run.
- `product_recommendations`: model output rows for global homepage recommendations and product-detail "similar product" recommendations.

Existing historical `orders` and `order_items` are also used as purchase signals during training.

## Public read endpoints

- `GET /api/public/recommendations/global?limit=12`
- `GET /api/public/recommendations/product/:externalId?limit=12`

## Public event endpoint

- `POST /api/public/recommendation-events`

The frontend sends non-blocking events for search, category view, product click, product view, add to cart, buy now, and checkout purchase.

## Local run

```bash
pnpm --filter @matrix-ecommerce/api db:push
python -m venv .venv-recommender
.venv-recommender\Scripts\activate
pip install -r apps/recommender/requirements.txt
python apps/recommender/train_recommendations.py
```

Required environment variable:

```bash
DATABASE_URL=postgresql://...
```

Optional variables:

```bash
RECOMMENDER_MODEL_NAME=matrix-product-recommender
RECOMMENDER_TOP_K=12
RECOMMENDER_MIN_EVENTS=2
```

## Railway background worker

Create a separate Railway service from the same GitHub repo.

Recommended service settings:

- Root directory: `/apps/recommender`
- Config as Code file path: `/apps/recommender/railway.toml`
- Build command: leave empty, or use `python -m pip install --upgrade pip && pip install -r requirements.txt`
- Start command: leave empty, or use `python train_recommendations.py`
- Environment: copy the same `DATABASE_URL` used by the API service

Important: do not let this recommender service use the repository root `/railway.toml`.
The root config is only for the Node API/frontend services and will try to run `pnpm`.

For scheduled training, use one of these:

1. Railway Cron, if enabled on your project, with the same start command.
2. A tiny always-on worker process that sleeps and runs the script periodically.
3. A GitHub Actions schedule that connects to the Railway/Postgres database and runs the script.

For production, daily or every 6 hours is enough at first. Do not train inside the API web server request path.
