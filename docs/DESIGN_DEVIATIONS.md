# Deviations from docs/DESIGN.md

`docs/DESIGN.md` is an analysis of IBM's **marketing** site (ibm.com), built on the Carbon Design System.
This dashboard is a **product / data surface**, so it uses the file's foundations (type, colour, spacing,
shape, elevation, inputs, tabs, buttons) and Carbon's published product tokens where the file is silent.
Every rule in the file that the dashboard deliberately does not follow is listed here with the reason.

Exact Carbon values come from the official packages, not from memory:
`@carbon/themes` (White and Gray 100 themes, button / notification / tag tokens), `@carbon/colors`
(data ramps), `@carbon/motion` (durations, easings), and the categorical palette published in
`@carbon/charts` (`scss/_color-palette.scss`, v1.27.20; read from the package, not installed).
`scripts/carbon-tokens.mjs` (`npm run tokens`) generates `src/tokens.css` and `src/lib/motion.ts` from them.

Contrast figures are WCAG 2.x ratios, computed by `scripts/check-contrast.mjs` (`npm run contrast`).

## 1. Page-level marketing patterns not used

| Rule in DESIGN.md | Why it is not followed |
|---|---|
| `display-xl` 76px and `display-lg` 60px headlines | A dashboard has no hero. The page title uses `display-md` 42px / 300 (28px / 300 below 672px). |
| `hero-card`, `product-card`, `cta-banner` (full-bleed blue panel) | There is no marketing hero, product showcase or call-to-action on a data tool. A blue banner would also spend the one accent colour on decoration. |
| `customer-logo-tile` and the logo marquee | No customer logos. |
| Charcoal `footer` (`inverse-canvas`) | The page ends on its data sources panel. An inverted footer would add a dark band with nothing to say. |
| `newsletter-input` | No newsletter. |
| Soft blue hero gradient ("Decorative Depth") | Decoration only, and no hero. |
| "Page rhythm: utility bar → top nav → hero → feature card grid → logo marquee → …" | The dashboard keeps its own view order: top nav → title → controls → finding → key figures → views → notes. |
| `spacing.section` 96px between sections | The file's own rule: "Content is dense by design". Views separate by the grid gutter (16 / 32px), 1px hairlines and surface-1 bands, not by 96px gaps. |
| "Card grids are 4-up at desktop" | Views keep their existing proportions (2/3 + 1/3, halves, full width), snapped to Carbon's 16-column grid (11 + 5, 8 + 8, 16). |

## 2. Typography

| Rule | Deviation and reason |
|---|---|
| "No mono on marketing surfaces (Plex Mono … lives in product surfaces only)" | **IBM Plex Mono 400 is used** for axis ticks and data-table numbers. This is a product surface, where Carbon itself uses Plex Mono for code and tabular data. It keeps digit columns aligned and separates machine values from prose. |
| Display type "scales 76px → ~32px on mobile" | The title (`display-md` 42px) scales to **28px / 300 below 672px**. 28px is not on the file's ramp. It is the smallest size where weight 300 stays legible (the dashboard's rule: weight 300 only at 28px and above), and at 390px wide a 32px title wraps to three lines. |
| Display type on phones | **KPI values and the finding also step down below 672px**: KPI values 32px → **28px / 300**, the finding 32px / 300 → **20px / 400** (`subhead`). Same reason as the title: weight 300 only at 28px and above, and a 32px figure in a half-width phone tile wraps. |
| `headline` 32px at weight **400** | KPI values use **32px at weight 300**. The light weight reads as a figure rather than a heading, and 300 at 32px meets the "300 only at 28px and above" rule. |
| (no rule for a page-level answer) | The computed **finding sentence uses `headline` 32px / 300**, below the 42px title but above every view title. The page's answer should outrank its section labels (design critique, 30 Sep). |
| `card-title` 24px for card titles | View and panel titles use `subhead` **20px / 400**, as the dashboard brief specifies. At 24px, eight titles plus KPI figures compete with the charts. |
| Default body is `body` 16px | Default text is `body-sm` **14px** / 400, letter-spacing 0.16px. The dashboard is dense; 16px body doubles panel lengths. `body` 16px is used for the phone subtitle and finding. |
| `body-sm` line-height 1.29 | 1.29 is used for single-line UI text (labels, tabs, list rows, captions under one line). **Multi-line prose (panel definitions, captions that wrap, popovers) uses 1.43**, Carbon's `body-01` line height, because 1.29 is too tight to read over several lines at 14px. |
| Eyebrow typography ("View 2", sentence case 14px) | **Not added.** No view on the page has an eyebrow or a "View N" label. Adding one would change `content.ts` copy, which this pass does not touch. |
| Captions at `caption` 12px | Chart captions, legends and panel body are **14px** (`body-sm`), as the dashboard brief specifies. 12px `caption` is kept for meta text: KPI labels, list-row metadata, tooltips and axis ticks. Nothing is smaller than 12px. |

## 3. Colour

| Rule | Deviation and reason |
|---|---|
| `ink-subtle` #8c8c8c for "Tertiary type … helper text, captions" | **Never used for readable text.** It is 3.36:1 on white, which fails WCAG AA (4.5:1). It is kept only as `--text-disabled` for disabled or decorative marks. |
| Carbon `text-helper` #6f6f6f as a possible secondary text colour | **Not used.** It passes on white (5.02:1) and surface-1 (4.57:1) but **fails on surface-2 #e0e0e0 (3.81:1)**, where selected rows and table headers put text. All readable secondary text uses `ink-muted` #525252. |
| `semantic-warning` #f1c21b as a warning colour | **Never used as text** (1.68:1 on white). It appears only as a **badge fill with #161616 text** (small-base badge, unfilled-placeholder highlight, "Details to fill in"). The warning notification uses Carbon's `notification-background-warning` (#fcf4d6) with ink text and a yellow 1px border. |
| `semantic-success` #24a148 | **Not used.** The data has no success state, and the brief rules out red/green data encodings. |
| `semantic-error` #da1e28 | Used **only** for error states (the load-failure and view-failure icons), never for data. |
| IBM Blue marks "links, primary CTAs, CTA banner, focus rings" | Blue is **UI-only**: links, focus, the active tab underline, the primary and tertiary buttons, the period slider range, the brush selection. **It never encodes data.** The selected state is shown with a 2px ink outline and an ink trend line, not blue. Data uses teal, the Carbon Charts categorical colours and Okabe-Ito pin colours. |
| One accent colour only | The data layer needs its own colours. These are chart colours, not brand accents, and none are IBM blue. |

### Dark theme (the file omits it; "Known Gaps")

Built from Carbon **Gray 100** (`@carbon/themes` `g100`). Each value was checked against the package.

| Brief value | Package value | Used | Note |
|---|---|---|---|
| background #161616 | `background` #161616 | #161616 | matches |
| layer-01 #262626 | `layer01` #262626 | #262626 | matches (cards) |
| layer-02 #393939 | `layer02` #393939 | #393939 | matches (KPI tiles, table header, control band) |
| text-primary #f4f4f4 | `textPrimary` #f4f4f4 | #f4f4f4 | matches |
| text-secondary #c6c6c6 | `textSecondary` #c6c6c6 | #c6c6c6 | matches |
| border-subtle #393939 | `borderSubtle00` #393939 | #393939 | matches (hairlines) |
| border-strong (value not given) | `borderStrong01` #6f6f6f | **#8d8d8d** (`borderStrong02`) | **Corrected.** #6f6f6f is only 3.01:1 on the dark field and 2.30:1 on layer-02, where the control band sits. `borderStrong02` passes (4.56:1). |
| link-primary #78a9ff | `linkPrimary` #78a9ff | #78a9ff | matches. #0f62fe as text on #161616 is 3.62:1, so dark-mode text accents (links, active tab underline, ghost buttons) use #78a9ff. |
| focus #ffffff | `focus` #ffffff | #ffffff | matches |
| button-primary #0f62fe + white text | `buttonPrimary` g100 #0f62fe | #0f62fe | matches (white text 5.00:1) |
| Tertiary button uses the primary colour (light) | `buttonTertiary` g100 **#ffffff** | #ffffff | **Following the package.** Carbon's dark tertiary button is white-bordered with white text and fills #f4f4f4 on hover. It is not blue in dark mode. |
| (not given) axis colour | `borderStrong01` #6f6f6f | **#a8a8a8** (`textHelper`) | #6f6f6f is 3.01:1 on layer-01, too marginal for axis lines; #a8a8a8 is 6.36:1. |

## 4. Data colours

| Rule | Deviation and reason |
|---|---|
| Carbon categorical palette, in order | The dashboard uses a **subset of Carbon Charts' 14-colour categorical palette**. Light: purple 70, cyan 50, magenta 70, yellow 50, orange 70. Dark: purple 60, cyan 40, magenta 40, yellow 40, orange 60. It **skips teal** (the map's sequential ramp is teal, so a teal category would read as a map value), **red and green** (the brief rules out red/green data encodings) and **blue** (dark-mode blue 50 is the same value as the dark theme's interactive blue, and IBM blue must never encode data). The subset's worst colour-blind separation is ΔE 13.0 (tritan, magenta/orange) in light and 24.4 in dark. Carbon's own first-five set scores 12.2 (protan) in light and uses teal. |
| Sequential ramp | Carbon **teal**, 5 bins. Light: teal 50 → 90 (darker = more). Dark: teal 50 → 10 (brighter = more). The lowest bin is 3.34:1 (light) and 4.53:1 (dark) against the card, so no map outlines were needed. |
| Pinned states | Kept as **Okabe-Ito**, with shapes and dashes, as instructed. Pin 1 (#0072b2 light / #56b4e9 dark) is a blue data colour, but not IBM blue, and it always travels with a circle marker and a solid line. |

## 5. Shape, elevation, components

| Rule | Deviation and reason |
|---|---|
| "No shadows" (marketing) | Carbon's product shadow (`0 2px 6px`, `shadow` token: rgba(0,0,0,0.3) White / rgba(0,0,0,0.8) Gray 100) is used **only on floating layers**: tooltips, popovers, the combobox menu, toasts and the shortlist tray. Cards, tiles and the page stay flat. |
| `rounded.none` everywhere; `rounded.sm` 4px for dropdown menus | Tooltips also take **4px**, alongside dropdown menus. Badges and tags take **2px**. Everything else is 0px. |
| Focus: "2px primary outline + 1px hairline-strong underline" | Controls use Carbon's product focus: a **2px focus-colour outline, inset (−2px) on buttons, tabs and rows**. The search field uses a **2px accent underline** on focus, without the extra 1px hairline-strong underline, because the underline is already the input's bottom rule. |
| `product-tab` padding 16px 20px | Tabs sit inside card headers, so they use **0 16px padding with a 40px minimum height (48px on touch)**. 16px 20px padding makes a 50px-tall tab row in every card. |
| `button-*` padding 12px 16px | Buttons use a **40px minimum height (48px on touch)** with 16px side padding. This is the same box as 12px/16px padding on a 14px label, but held to the touch-target rule. |
| `button-ghost`: "Plain text + chevron" | No chevron is added. Ghost buttons keep their existing icons (reset, table, info, trash). |
| `button-secondary`, `button-danger` | Not used. The dashboard has no secondary or destructive action. |
| `text-input` for "the period control's value fields" | **Not applied.** The two period values ("Jan 2019", "May 2024") are read-only labels under a two-thumb slider, not inputs. Styling them as text fields would suggest they can be typed into. |
| `utility-bar` (32px, surface-1, caption) | **Removed at the user's request (30 Sep).** It first carried a data-window line and a "Download data" link; the window is already in the "Showing" line and the key-figure labels, and the downloads are in "Where this came from". |
| `top-nav` with the product name | The app bar shows the product name at 14px / 600, and the page title (`display-md`) repeats it below. The app-bar copy is hidden from assistive tech, so it is announced once. |
| "Selected tab label … body-emphasis" | Followed (600 weight + 2px underline). The 2px underline uses the text accent token, so it is #78a9ff in dark mode. |

## 6. Motion

| Rule | Deviation and reason |
|---|---|
| Carbon productive motion tokens | All mapped from `@carbon/motion`. **Exception:** the theme-switch colour cross-fade (200ms ease-in-out) is kept exactly as built, per the brief. |
| "First-load-only stagger" | The card entrance fade and the KPI count-up were **removed in an earlier refinement pass**, because a fade-in can leave cards invisible in background tabs and headless captures. The remaining first-load stagger (RTO bars, national bars) is kept, on Carbon `slow-01` with standard easing. |
