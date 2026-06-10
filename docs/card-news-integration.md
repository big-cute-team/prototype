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

## Notes

- MVP는 ZIP 다운로드 제공까지 구현한다.
- Supabase Storage 또는 S3 저장은 다음 단계로 확장한다.
- 실패해도 원문 기사, 기존 요약, 발행 상태는 삭제하거나 덮어쓰지 않는다.
