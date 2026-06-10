# Card News Preview And Render Sync Rules

This is the required checklist for keeping card news admin previews and actual
rendered PNG output aligned.
Read it before changing card news UI, layout, fonts, spacing, text, images,
pagination, payloads, or templates.

## Core Rule

- Every card news preview change must be reflected in the actual render output.
- Every actual render change must be reflected in the admin preview.
- If a change is intentionally one-sided, document the `preview-only` or
  `render-only` reason.
- Never finish a task with preview output and rendered PNG output visibly
  different unless the user explicitly asked for that difference.

## Repos To Check

Admin preview side:

- Repo: `C:\Users\juns0720\Desktop\epl\admin`
- Branch: `develop`
- Main preview file: `src/epl/AdminDashboard.jsx`
- Related admin API files: `api/_handlers/admin/*`

Actual render side:

- Repo: `C:\Users\juns0720\Desktop\epl\auto-create-card-news`
- Branch: `main`
- Render schema: `app/schemas/render.py`
- Render builders: `app/services/renderer.py`, `app/services/render_jobs.py`
- HTML/CSS templates: `app/render/templates/*`

## What Must Stay In Sync

- Template ids and content type routing.
- Payload field names and fallback behavior.
- Page count and pagination rules.
- Background image selection.
- Text content and text omission rules.
- Font family, font size, line-height, weight, letter-spacing.
- Absolute coordinates, width, height, gaps, alignment, z-order.
- Conditional layout branches such as today vs weekly or fixtures vs results.
- Country/team name shortening and font scaling rules.
- Generated page navigation assumptions.

## Required Workflow

1. Identify the local preview component in the admin repo.
2. Identify the corresponding render template and render helper in the card render repo.
3. Apply visual/layout changes to both sides in the same task.
4. Keep constants and coordinates intentionally matched. If the code cannot share constants across repos, copy the exact values and mention why.
5. Avoid broad search-and-replace for coordinates or CSS `top/left` values. Check the exact selector or JSX element before editing.
6. Update render tests or fixtures when HTML structure, schema, or expected output changes.
7. Run verification before committing.

## Verification Checklist

For admin changes:

```powershell
cd C:\Users\juns0720\Desktop\epl\admin
npm run build
```

For card render changes:

```powershell
cd C:\Users\juns0720\Desktop\epl\auto-create-card-news
python -m unittest discover -s tests
```

For render-sensitive visual changes:

- Generate a sample ZIP/PNG through the render service code without starting the FastAPI server.
- Open at least one generated PNG and visually compare it with the admin preview.
- Check the exact area changed, not only whether the render succeeds.

## Common Pitfalls

- React preview and Playwright HTML render can differ in font baseline, line-height, and flex alignment.
- A value that looks centered in preview may need a different CSS target in the render template.
- Similar selectors can exist for today fixtures, weekly fixtures, today results, and weekly results. Edit only the intended template.
- If score or label text is split into multiple visual pieces in Figma, do not collapse it into one string unless spacing has been rechecked in the generated PNG.
- When changing one side after a bug report, first inspect why the other side did not match; do not blindly copy the same patch.

## Commit And Push Reminder

- Admin repo changes are committed and pushed to `origin develop`.
- Card render repo changes are committed and pushed to `origin main`.
- Do not include unrelated untracked or user-created files in either commit.
