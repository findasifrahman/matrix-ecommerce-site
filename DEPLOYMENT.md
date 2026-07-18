# Matrix Ecommerce Deployment

This repo is a pnpm workspace monorepo:

- Backend: `apps/api`
- Frontend: `apps/web`

Both services can be deployed on Railway from the same GitHub repo.

## Recommended Railway model

This repo is a shared monorepo, and both services can stay on Root Directory `/`.

Railway is currently reading a root config file for deploy commands, so this repo now includes a root dispatcher file:

- [railway.toml](/C:/Users/asif/Desktop/matrix_ecommerce/railway.toml)

That file chooses backend or frontend commands automatically from:

- `RAILWAY_SERVICE_NAME`, or
- `APP_KIND` if you set it manually in Railway variables

Supported values:

- backend service name contains `backend` or `api`
- frontend service name contains `frontend` or `web`

If your Railway service names are unusual, set:

```env
APP_KIND=backend
```

or:

```env
APP_KIND=frontend
```

This avoids Railpack trying to auto-detect a root start command.

## Important backend boot fix

The old startup path used:

```bash
pnpm db:patch:prod
```

That path is not safe for a fresh Railway PostgreSQL database. It can fail with Prisma `P1014` because it assumes older tables already exist.

The backend Railway service now uses:

```bash
pnpm --filter @matrix-ecommerce/api start:railway
```

That script runs:

```bash
pnpm db:push:deploy
pnpm start
```

So the current schema is pushed directly on deploy.

## Railway project structure

Create one Railway project with:

1. A `backend` service
2. A `frontend` service
3. A PostgreSQL service

Both app services should point to the same GitHub repo.

## Backend service setup

### Service settings

Use these values in Railway:

- Root Directory: `/`
- Public Networking: enabled
- Config as Code file path: `/railway.toml`

If your service name does not clearly include `backend` or `api`, add:

- `APP_KIND=backend`

The root dispatcher maps the backend to:

```bash
pnpm --filter @matrix-ecommerce/api db:generate && pnpm --filter @matrix-ecommerce/api build
pnpm --filter @matrix-ecommerce/api start:railway
```

### Backend environment variables

Use [apps/api/.env.example](/C:/Users/asif/Desktop/matrix_ecommerce/apps/api/.env.example) as the template.

Minimum recommended production variables:

```env
DATABASE_URL=postgresql://...
NODE_ENV=production
APP_BASE_URL=https://your-frontend-service.up.railway.app
WEB_APP_URL=https://your-frontend-service.up.railway.app
API_BASE_URL=https://your-backend-service.up.railway.app
ALLOWED_ORIGINS=https://your-frontend-service.up.railway.app
JWT_ACCESS_SECRET=replace-with-a-long-random-secret
JWT_REFRESH_SECRET=replace-with-a-second-long-random-secret
JWT_ACCESS_EXPIRES=12h
JWT_REFRESH_EXPIRES=14d
```

Optional variables only if you use those features:

```env
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=https://bridgechina-production.up.railway.app/api/auth/google/callback

SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=

R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=
R2_ENDPOINT=
R2_PUBLIC_BASE_URL=

CLOUDFLARE_TURNSTILE_SECRET=
SMS_BD_API_KEY=
SMS_BD_TIMEOUT_MS=10000
WECOM_GROUP_BOT_WEBHOOK_URL=
```

### Backend database notes

Railway will inject `DATABASE_URL` if you connect the PostgreSQL service reference correctly.

The backend start script already runs:

```bash
pnpm --filter @matrix-ecommerce/api db:push:deploy
```

If you want seed data once, run this manually in the backend Railway shell:

```bash
pnpm --filter @matrix-ecommerce/api db:seed
```

Do not run this in production:

```bash
pnpm --filter @matrix-ecommerce/api db:migrate
```

That script uses `--force-reset`.

## Frontend service setup

### Service settings

Use these values in Railway:

- Root Directory: `/`
- Public Networking: enabled
- Config as Code file path: `/railway.toml`

If your service name does not clearly include `frontend` or `web`, add:

- `APP_KIND=frontend`

The root dispatcher maps the frontend to:

```bash
pnpm --filter @matrix-ecommerce/web build
bash apps/web/start.sh
```

### Frontend environment variables

Use [apps/web/.env.example](/C:/Users/asif/Desktop/matrix_ecommerce/apps/web/.env.example).

Required:

```env
VITE_API_URL=https://your-backend-service.up.railway.app
```

Optional:

```env
VITE_TURNSTILE_SITE_KEY=
```

Notes:

- `VITE_API_URL` should be the backend base URL.
- The frontend already normalizes a trailing `/api`, so the plain domain is cleaner.

## Recommended Railway dashboard setup

For both services:

1. Connect the same GitHub repo.
2. Keep Root Directory as `/`.
3. Use Config as Code file path `/railway.toml`.
4. Generate a public domain for each service.
5. Leave restart policy as `ON_FAILURE`.
6. If a service name does not include `backend` or `frontend`, set `APP_KIND` explicitly.

If the deploy page shows values coming from `/railway.toml`, that is now expected.

Helpful watch paths:

- Backend: `/apps/api/**` and `/packages/**`
- Frontend: `/apps/web/**` and `/packages/**`

## Deployment order

### 1. Deploy the backend service first

After deploy, test:

```text
https://your-backend-service.up.railway.app/health
```

### 2. Put the backend public URL into the frontend service

Set:

```env
VITE_API_URL=https://your-backend-service.up.railway.app
```

Then redeploy the frontend.

### 3. Put the frontend public URL back into the backend service

Update:

```env
APP_BASE_URL=https://your-frontend-service.up.railway.app
WEB_APP_URL=https://your-frontend-service.up.railway.app
ALLOWED_ORIGINS=https://your-frontend-service.up.railway.app
```

Then redeploy the backend again.

## Production safety notes

- `db:patch:prod` is a legacy patch chain and should not be your Railway boot path on a fresh database.
- `db:migrate` is destructive in this repo and should not be used on production Railway.
- `db:push:deploy` is the correct bootstrapping path for the current backend.

## Local verification commands

Backend Prisma client:

```bash
pnpm db:generate
```

Backend build:

```bash
pnpm build:api
```

Frontend build:

```bash
pnpm build:web
```

Full build:

```bash
pnpm build
```

## Security note

Your local API env file may contain real secrets. Do not paste that file directly into Railway. Create fresh production secrets instead.
