# EV Charging Site-Planning Dashboard (v2)

DESG 317 Assignment 3. A static dashboard that answers one question:

> Where is EV demand outrunning public charging in India, and what kind of charging does that demand need?

It reasons in four layers (demand, supply, gap, vehicle mix) across five views: a national context
strip, state growth (map + trend), an RTO drill-down, a gap ranking and a vehicle-mix view, plus the
three required panels ("How to read this", "What this doesn't show", "Where this came from").
Every view is linked through one store that is mirrored in the URL hash, so any view can be shared
by copying the link. Pinned states can be exported as CSV.

Stack: Vite, React 18, TypeScript, D3 (scales, geo, shapes), Framer Motion, CSS custom properties.
No backend.

## Folder map

```
data/
  original/            raw source files as downloaded (PDF reports are git-ignored, see below)
  cleaned/             outputs of clean_ev_data.py, incl. cleaning_log.md and verification_table.md
  clean_ev_data.py     the cleaning pipeline (Phase 1)
  geo/                 India GeoJSON (DataMeet, CC BY 4.0) + SOURCE.md
scripts/
  build-data.mjs       npm run data: CSV -> public/data/*.json, downloadable copies, GeoJSON name check
  check-contrast.mjs   npm run contrast: WCAG checks for every token pair in both themes
  verify-site.mjs      npm run verify: Playwright check of rendered KPIs + screenshots
src/
  content.ts           ALL user-facing text (drafts, marked "DRAFT: Vishwa to rewrite")
  tokens.css           colour tokens, light + dark
  lib/                 store (URL hash), data loading + derivations, formatting, encodings
  views/               the five views
  components/          controls, KPI strip, panels, tray, tooltip/toast, shared UI
deploy/github-pages.yml  workflow template (copy to the repo root to use)
screenshots/           light/dark at 1440 and 390 px, contrast report
```

## Regenerate the data

Requires Python 3.10+ (standard library only) and Node 18+.

```bash
python3 data/clean_ev_data.py
```

This reads `data/original/`, writes every cleaned CSV, `cleaning_log.md` and
`verification_table.md` to `data/cleaned/`, and prints the verification table. It asserts that
Pune 2019-11 and 2022-10 survive the outlier rule.

```bash
npm run data
```

This converts the cleaned CSVs to JSON in `public/data/`, copies the cleaned CSVs and
`cleaning_log.md` to `public/data/downloads/` (linked from the "Where this came from" panel), writes
the GeoJSON, and **fails if any state name does not match the GeoJSON exactly**.

## Run, build, check

```bash
npm install
```

```bash
npm run dev
```

```bash
npm run build
```

```bash
npm run contrast
```

```bash
npm run verify
```

`npm run signals` prints which station-type signal rule (from `src/content.ts`) every state lands
in, with its 3W and Cars/LMV shares and ratios to India.

`npm run verify` builds nothing itself: run `npm run build` first. It serves `dist/` with
`vite preview`, reads the rendered KPI values for All India, Maharashtra, Assam and Telangana,
recomputes them from `data/cleaned/*.csv`, asserts they match, checks the error state, and saves
screenshots to `screenshots/`. The first run may need `npx playwright install chromium`.

## Deploy to Vercel

`vercel.json` pins the settings, so importing the GitHub repository needs no configuration:
Vercel runs `npm ci` and `npm run build` and serves `dist/`. The generated data in `public/data/` is
committed, so the build does not need Python. Every push to `main` then redeploys.

1. At vercel.com, choose **Add New… > Project** and import `zaptec19/EVs_Dashboard`.
2. Leave the detected settings as they are (Framework: Vite) and choose **Deploy**.

## Deploy to GitHub Pages

`vite.config.ts` uses `base: './'` and all state lives in the URL hash, so the built `dist/` works
from any sub-path. Two options:

1. **GitHub Actions**: copy `deploy/github-pages.yml` to `.github/workflows/` at the repository
   root, then set Settings > Pages > Source to "GitHub Actions". It runs `npm ci`, `npm run data`,
   `npm run contrast` and `npm run build` in this folder and publishes `dist/`.
2. **gh-pages branch**: `npm run deploy` builds and pushes `dist/` to the `gh-pages` branch of the
   current repository (then pick that branch in Settings > Pages).

## Notes

- The reference PDFs in `data/original/` (JMK Research, IEMI 2025, RMI–NITI; about 33 MB) are not
  read by the pipeline and are git-ignored. Keep them locally.
- Numbers on the page are computed from the files in `public/data/`; nothing is typed in by hand.
  Missing values are blank in the CSVs and shown as "not available" on the page, never 0.
- Every `[PLACEHOLDER?]` in `src/content.ts` is listed in `PLACEHOLDERS` at the bottom of that file
  and shows highlighted on the page until it is filled.
