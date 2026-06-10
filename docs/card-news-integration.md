# Card News Admin Integration

## Goal

발행된 기사만 카드뉴스 제작 대상으로 사용한다. 기존 수집, 요약, 검수, 발행 흐름은 변경하지 않는다.

## Admin Environment

```env
CARD_RENDER_API_BASE_URL=https://YOUR_FASTAPI_RENDER_SERVER
CARD_RENDER_API_KEY=shared-secret-between-admin-and-fastapi
```

`CARD_RENDER_API_KEY` 값은 FastAPI 서버의 `INTERNAL_API_KEY`와 같아야 한다.

## Flow

1. 관리자가 `/admin`에서 `published` 탭을 연다.
2. 발행 기사 카드에서 `카드뉴스` 버튼을 누른다.
3. 어드민 서버가 `POST /api/admin/card-news-draft`를 호출한다.
4. 어드민 서버가 FastAPI `POST /card/draft`를 호출해 카드뉴스 JSON을 받는다.
5. 관리자가 카드뉴스 JSON을 확인하거나 수정한다.
6. 관리자가 이미지 URL을 입력하거나 이미지 파일을 업로드한다.
7. 어드민 서버가 `POST /api/admin/card-news-render`를 호출한다.
8. 어드민 서버가 FastAPI `POST /card/render` 또는 `POST /card/render-upload`를 호출한다.
9. FastAPI가 `cardnews.zip`을 반환한다.
10. 브라우저가 ZIP을 다운로드한다.

## FastAPI Endpoints

```text
POST /card/draft
POST /card/render
POST /card/render-upload
```

`/card/render-upload` ZIP contents:

```text
1p.png
2p.png
manifest.json
```

## Instagram Publishing

The render job keeps PNG files for preview/download and uploads JPEG
derivatives under `instagram/` for Instagram Content Publishing. Admin stores
those JPEG assets in `card_news_publications.instagram_pages`.

Admin server environment:

```env
INSTAGRAM_IG_USER_ID=17841400000000000
INSTAGRAM_ACCESS_TOKEN=long-lived-instagram-or-page-token
INSTAGRAM_GRAPH_API_VERSION=v25.0
```

`INSTAGRAM_ACCESS_TOKEN` is a server-only secret and must never be exposed to
the browser. New card news must be generated after this change to receive
`instagram_pages`; older rows only have PNG preview pages.

Before production use, run:

```text
supabase/migrations/20260610_instagram_publication_fields.sql
```

Optional render server settings:

```env
INSTAGRAM_JPEG_QUALITY=95
INSTAGRAM_JPEG_MAX_BYTES=8388608
```

## Current Local Test Checkpoint

Status as of 2026-06-10:

- Admin feature branch is `feature/instagram-publishing` in
  `C:\Users\juns0720\Desktop\epl\admin-instagram-publishing`.
- Render feature branch is `feature/instagram-publishing` in
  `C:\Users\juns0720\Desktop\epl\auto-create-card-news-instagram`.
- Supabase migration `supabase/migrations/20260610_instagram_publication_fields.sql`
  has been applied manually through SQL Editor.
- Another local test session is using port `3100`, so Instagram admin local test
  should use port `3101`.

Local env files should be named `.env.local`. The Vite admin app and FastAPI
render service do not automatically load `local.env`.

Run the render server locally on port `8001`:

```powershell
cd C:\Users\juns0720\Desktop\epl\auto-create-card-news-instagram
uvicorn app.main:app --reload --host 127.0.0.1 --port 8001
```

Render `.env.local` must include the existing R2 settings and the internal API
key. Instagram access token values are not required on the render service.

```env
INTERNAL_API_KEY=shared-secret-between-admin-and-fastapi
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET=...
R2_PUBLIC_BASE_URL=https://...
INSTAGRAM_JPEG_QUALITY=95
INSTAGRAM_JPEG_MAX_BYTES=8388608
```

Run the admin local server on port `3101`:

```powershell
cd C:\Users\juns0720\Desktop\epl\admin-instagram-publishing
npm run build
$env:PORT=3101
node scripts\local-admin-server.js
```

Admin `.env.local` must point to the local render server and include the
Instagram Graph API credentials:

```env
CARD_RENDER_API_BASE_URL=http://127.0.0.1:8001
CARD_RENDER_API_KEY=shared-secret-between-admin-and-fastapi
INSTAGRAM_IG_USER_ID=17841400000000000
INSTAGRAM_ACCESS_TOKEN=long-lived-instagram-or-page-token
INSTAGRAM_GRAPH_API_VERSION=v25.0
```

Test flow:

1. Open `http://localhost:3101/admin`.
2. Enter `ADMIN_TOKEN`.
3. Generate a new card news item. Existing rows may not have `instagram_pages`.
4. Confirm that the generated card news item shows a JPEG preview link.
5. Write the caption and click the Instagram publish button.
6. Confirm Supabase has `instagram_status = published` and an
   `instagram_permalink`.

## Notes

- MVP는 ZIP 다운로드 제공까지 구현한다.
- Supabase Storage 또는 S3 저장은 다음 단계로 확장한다.
- 실패해도 원문 기사, 기존 요약, 발행 상태는 삭제하거나 덮어쓰지 않는다.
