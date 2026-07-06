# Matrix Ecommerce Deployment

This repo is a pnpm monorepo:

- Backend: `apps/api`
- Frontend: `apps/web`

Use Railway for the backend and Vercel for the frontend.

## Important fix already applied

Railway was failing because startup ran:

- `pnpm db:patch:prod`

That command assumes old legacy tables already exist. On a fresh Railway database, it crashes with:

- `P1014 The underlying table for model cart_items does not exist`

The deploy config now uses:

- `pnpm --filter @matrix-ecommerce/api start:railway`

And that runs:

- `pnpm db:push`
- `pnpm start`

So Railway now syncs the current Prisma schema directly instead of replaying old patch scripts.

## Backend on Railway

### 1. Create the Railway service

Create one Railway project for the API and attach a PostgreSQL database.

Point the service at the repository root, not `apps/api`.

Railway will read:

- [railway.json](/C:/Users/asif/Desktop/matrix_ecommerce/railway.json)

### 2. Railway build and start commands

These are already defined in `railway.json`:

Build:

```bash
pnpm install --frozen-lockfile && pnpm --filter @matrix-ecommerce/api db:generate && pnpm --filter @matrix-ecommerce/api build
```

Start:

```bash
pnpm --filter @matrix-ecommerce/api start:railway
```

### 3. Railway backend environment variables

Use [apps/api/.env.example](/C:/Users/asif/Desktop/matrix_ecommerce/apps/api/.env.example) as the template.

Minimum required:

```env
DATABASE_URL=postgresql://...
NODE_ENV=production
APP_BASE_URL=https://your-frontend-domain.vercel.app
WEB_APP_URL=https://your-frontend-domain.vercel.app
API_BASE_URL=https://your-backend-domain.up.railway.app
ALLOWED_ORIGINS=https://your-frontend-domain.vercel.app,https://www.yourdomain.com
JWT_ACCESS_SECRET=long-random-secret
JWT_REFRESH_SECRET=another-long-random-secret
JWT_ACCESS_EXPIRES=12h
JWT_REFRESH_EXPIRES=14d
```

Recommended optional variables:

```env
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=https://your-backend-domain.up.railway.app/api/auth/google/callback

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

### 4. Railway database initialization

On deploy, the backend start command runs:

```bash
pnpm --filter @matrix-ecommerce/api db:push:deploy
```

through `start:railway`, which keeps the database schema synced to the current Prisma schema.

If you want seed data once, run this manually in Railway shell:

```bash
pnpm --filter @matrix-ecommerce/api db:seed
```

Do not run `db:migrate` in production here. In this repo it uses `--force-reset`, which will wipe the database.

### 5. Railway public URL

After Railway deploys, copy the public domain, for example:

```text
https://matrix-ecommerce-api.up.railway.app
```

Use that exact backend base URL in:

- `API_BASE_URL` on Railway
- `VITE_API_URL` on Vercel

## Frontend on Vercel

### 1. Vercel project root

Set the Vercel project root to the repository root:

```text
.
```

This is important.

If you set the Vercel root to `apps/web`, Vercel often loses the workspace context and the configured output path no longer matches the monorepo build.

### 2. Vercel config

Vercel uses:

- [vercel.json](/C:/Users/asif/Desktop/matrix_ecommerce/vercel.json)

Current settings:

- install command: `pnpm install --frozen-lockfile`
- build command: `pnpm build:web`
- output directory: `apps/web/dist`

If Vercel says it cannot find `dist`, the usual cause is that the project root is wrong in the Vercel dashboard.

### 3. Frontend environment variables

Use [apps/web/.env.example](/C:/Users/asif/Desktop/matrix_ecommerce/apps/web/.env.example).

Required:

```env
VITE_API_URL=https://your-backend-domain.up.railway.app
```

Optional:

```env
VITE_TURNSTILE_SITE_KEY=
```

Notes:

- `VITE_API_URL` should be the backend base URL.
- Do not add `/api` at the end unless you intentionally want it. The app already appends API paths.

Good:

```env
VITE_API_URL=https://matrix-ecommerce-api.up.railway.app
```

Also acceptable:

```env
VITE_API_URL=https://matrix-ecommerce-api.up.railway.app/api
```

The frontend strips a trailing `/api`, but the cleaner value is the plain domain.

## Suggested deployment order

### 1. Deploy backend first on Railway

Set all backend env vars, deploy, then confirm:

```text
GET https://your-backend-domain.up.railway.app/health
```

It should return status JSON.

### 2. Deploy frontend on Vercel

Set:

```env
VITE_API_URL=https://your-backend-domain.up.railway.app
```

Then redeploy.

### 3. Update backend CORS/auth URLs

Once Vercel gives the final frontend URL, make sure Railway has:

```env
APP_BASE_URL=https://your-frontend-domain.vercel.app
WEB_APP_URL=https://your-frontend-domain.vercel.app
ALLOWED_ORIGINS=https://your-frontend-domain.vercel.app,https://www.yourdomain.com
```

Then redeploy Railway once more.

## Production safety notes

- `db:migrate` in this repo is destructive for dev resets. Do not use it on Railway production.
- `db:patch:prod` is for legacy incremental patching and should not be used for a fresh Railway deployment.
- `db:push` is the correct deploy path for the current matrix-ecommerce schema on a fresh hosted database.

## Commands you can run locally to verify

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

Your local `apps/api/.env` currently contains real-looking secrets. Rotate them before public deployment and do not copy that file directly into Railway.
