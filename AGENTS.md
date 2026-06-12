# Admin Server Notes

This file is the first repo-local checklist for Codex when working in this
admin project.

## Branch And Push Rule

- Before starting command-based work, compare the local branch with its remote
  tracking branch. Run `git fetch --all --prune`, then check
  `git status --short --branch` and
  `git rev-list --left-right --count HEAD...@{u}`.
- If the local branch is behind the remote, pull or otherwise reconcile the
  remote updates before implementing changes. Preserve any local/user changes
  with stash or another non-destructive approach before pulling.
- Work on `develop` for this admin repo.
- Commit and push admin changes to `origin develop`.
- Do not include unrelated untracked or user-created files unless the user asks.

## Card News Work

When creating or refactoring card news, first read
`CARD_NEWS_PREVIEW_RENDER_RULES.md`. It is the required checklist for keeping
the admin live preview and actual render-server output in sync.

After that, consult `CARD_NEWS_IMPLEMENTATION.md` for the current
admin-to-render-server architecture, payload shapes, template ids, preview
behavior, and testing checklist.

## Start The Admin Server

Use PowerShell from this directory:

```powershell
cd C:\Users\juns0720\Desktop\epl\admin
npm install
npm run dev -- --host 127.0.0.1
```

Default local URLs:

- App: `http://127.0.0.1:5174/`
- Admin: `http://127.0.0.1:5174/admin`

If port `5174` is already in use, inspect it first:

```powershell
Get-NetTCPConnection -LocalPort 5174 -State Listen -ErrorAction SilentlyContinue
```

Only stop an existing process when it is clearly this admin Vite server.

## Required Local Environment

The admin server expects local secrets in `.env.local` or `.env`.
Do not print or commit secret values.

Required keys for normal admin data loading:

- `ADMIN_TOKEN`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Additional integrations may require:

- `X_BEARER_TOKEN`
- `X_API_BASE_URL`
- `OPENAI_API_KEY`
- `OPENAI_MODEL`
- `SLACK_PUBLISH_WEBHOOK_URL`
- `SLACK_REVIEW_WEBHOOK_URL`
- `CRON_SECRET`
- `CARD_RENDER_API_BASE_URL`
- `CARD_RENDER_API_KEY`

## Verify The Server

After starting or changing local API routing, run:

```powershell
npm run build
```

Then verify the local admin API returns JSON, not HTML:

```powershell
$token = (Get-Content .env.local | Where-Object { $_ -match '^ADMIN_TOKEN=' }) -replace '^ADMIN_TOKEN=', ''
Invoke-WebRequest `
  -UseBasicParsing `
  -Headers @{ 'x-admin-token' = $token.Trim('"').Trim("'") } `
  'http://127.0.0.1:5174/api/admin/items?status=review&limit=5'
```

Expected result:

- HTTP `200`
- `Content-Type` includes `application/json`
- Response JSON includes `items` and `dashboard`

If the response is `text/html`, local API routing is broken. Check
`vite.config.js`; `/api/admin/*` must route through `api/admin/[route].js`.

## Card News Server

Do not start the card news FastAPI server unless the user explicitly asks.
This admin project can call it through `CARD_RENDER_API_BASE_URL` when needed.

The separate card news repo uses:

- Directory: `C:\Users\juns0720\Desktop\epl\auto-create-card-news`
- Branch: `main`
- Push target: `origin main`
