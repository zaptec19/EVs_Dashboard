// npm run tokens
// Writes src/tokens.css and src/lib/motion.ts from the official Carbon packages
// (@carbon/themes, @carbon/colors, @carbon/motion), so no Carbon value is typed by hand.
// Data colours: Carbon teal ramp for the choropleth and single-series bars; the vehicle-group set is taken
// from Carbon Charts' published 14-colour categorical palette (scss/_color-palette.scss, @carbon/charts 1.27),
// skipping teal (used by the ramp), red, green and blue (see docs/DESIGN_DEVIATIONS.md).
// Pinned-state colours are Okabe-Ito and stay as they were (not Carbon).
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const themes = require('@carbon/themes');
const { colors: c } = require('@carbon/colors');
const motion = require('@carbon/motion');
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const W = themes.white;
const D = themes.g100;
const btn = themes.buttonTokens;
const note = themes.notificationTokens;
const tag = themes.tagTokens;
const col = (hue, grade) => c[hue][grade];

// Carbon Charts categorical colours not yet in @carbon/colors (the charts file hard-codes these two)
const YELLOW_50 = '#b28600';
const ORANGE_70 = '#8a3800';
const YELLOW_40 = '#d2a106';
const ORANGE_60 = '#ba4e00';

const light = {
  // surfaces (Carbon White theme)
  bg: W.background,
  card: W.background, // feature-card: canvas
  'card-2': W.layer01, // surface-1: KPI tiles, bands, hover
  'surface-2': W.layerAccent01, // surface-2: table header, tags, no-data fill
  border: W.borderSubtle00, // hairline
  'border-strong': W.borderStrong01, // input bottom rule, control boundaries
  field: W.field01,
  'hairline-strong': W.textPrimary,
  // text
  text: W.textPrimary,
  'text-2': W.textSecondary,
  'text-3': W.textSecondary, // readable tertiary text uses ink-muted (text-helper #6f6f6f is only 4.5:1 on white, below it on surface-1)
  'text-disabled': '#8c8c8c', // ink-subtle from docs/DESIGN.md: disabled / decorative marks only, never readable text
  // UI accent: IBM blue is UI-only (links, focus, active tab, primary button); it never encodes data
  accent: W.linkPrimary,
  'accent-hover': W.linkPrimaryHover,
  'accent-soft': W.highlight,
  'accent-ink': W.textOnColor,
  focus: W.focus,
  'btn-primary': btn.buttonPrimary.whiteTheme,
  'btn-primary-hover': btn.buttonPrimaryHover.whiteTheme,
  'btn-primary-active': btn.buttonPrimaryActive.whiteTheme,
  'btn-tertiary': btn.buttonTertiary.whiteTheme,
  'btn-tertiary-hover': btn.buttonTertiaryHover.whiteTheme,
  'btn-tertiary-active': btn.buttonTertiaryActive.whiteTheme,
  'btn-tertiary-hover-ink': W.textOnColor,
  // status
  error: W.supportError,
  'warn-fill': W.supportWarning, // badge fill only, always with #161616 text
  'warn-fill-ink': W.textPrimary,
  'warn-bg': note.notificationBackgroundWarning.whiteTheme,
  'warn-border': W.supportWarning,
  'warn-text': W.textPrimary,
  'tag-bg': tag.tagBackgroundGray.whiteTheme,
  'tag-text': tag.tagColorGray.whiteTheme,
  // chart chrome
  grid: W.borderSubtle00,
  axis: W.borderStrong01,
  ref: W.textSecondary,
  hatch: W.textSecondary, // no-data hatch: ink-muted lines on surface-2
  nodata: W.layerAccent01,
  'tooltip-bg': W.backgroundInverse,
  'tooltip-text': W.textInverse,
  // sequential teal: lowest bin >= 3:1 on the card, darker = more
  'seq-1': col('teal', 50),
  'seq-2': col('teal', 60),
  'seq-3': col('teal', 70),
  'seq-4': col('teal', 80),
  'seq-5': col('teal', 90),
  'rto-last': col('teal', 70),
  'rto-earlier': col('teal', 50),
  bar: col('teal', 60),
  'bar-muted': W.borderStrong01,
  // vehicle groups (Carbon Charts categorical, light)
  'cat-2w': col('purple', 70),
  'cat-3w': col('cyan', 50),
  'cat-car': col('magenta', 70),
  'cat-com': YELLOW_50,
  'cat-oth': ORANGE_70,
  'cat-2w-ink': W.textOnColor,
  'cat-3w-ink': W.textPrimary,
  'cat-car-ink': W.textOnColor,
  'cat-com-ink': W.textPrimary,
  'cat-oth-ink': W.textOnColor,
  // pinned states: Okabe-Ito, unchanged
  'pin-1': '#0072b2',
  'pin-2': '#d55e00',
  'pin-3': '#00805d',
  'pin-4': '#b2508c',
  'pin-5': '#3a3a3a',
};

const dark = {
  bg: D.background,
  card: D.layer01,
  'card-2': D.layer02,
  'surface-2': D.layer02,
  border: D.borderSubtle00,
  // border-strong-01 (#6f6f6f) is only ~2.9:1 on the dark field; border-strong-02 passes 3:1
  'border-strong': D.borderStrong02,
  field: D.field01,
  'hairline-strong': D.textPrimary,
  text: D.textPrimary,
  'text-2': D.textSecondary,
  'text-3': D.textSecondary,
  'text-disabled': D.textHelper,
  // #0f62fe as text on #161616 fails AA, so dark links / tab underlines / text accents use link-primary
  accent: D.linkPrimary,
  'accent-hover': D.linkPrimaryHover,
  'accent-soft': D.highlight,
  'accent-ink': D.textOnColor,
  focus: D.focus,
  'btn-primary': btn.buttonPrimary.g100,
  'btn-primary-hover': btn.buttonPrimaryHover.g100,
  'btn-primary-active': btn.buttonPrimaryActive.g100,
  'btn-tertiary': btn.buttonTertiary.g100,
  'btn-tertiary-hover': btn.buttonTertiaryHover.g100,
  'btn-tertiary-active': btn.buttonTertiaryActive.g100,
  'btn-tertiary-hover-ink': D.textInverse,
  error: D.supportError,
  'warn-fill': D.supportWarning,
  'warn-fill-ink': W.textPrimary,
  'warn-bg': note.notificationBackgroundWarning.g100,
  'warn-border': D.supportWarning,
  'warn-text': D.textPrimary,
  'tag-bg': tag.tagBackgroundGray.g100,
  'tag-text': tag.tagColorGray.g100,
  grid: D.borderSubtle00,
  axis: D.textHelper, // border-strong-01 (#6f6f6f) is under 3:1 on layer-01
  ref: D.textHelper,
  hatch: D.textSecondary,
  nodata: D.layer02,
  'tooltip-bg': D.backgroundInverse,
  'tooltip-text': D.textInverse,
  // brighter = more on the dark card
  'seq-1': col('teal', 50),
  'seq-2': col('teal', 40),
  'seq-3': col('teal', 30),
  'seq-4': col('teal', 20),
  'seq-5': col('teal', 10),
  'rto-last': col('teal', 30),
  'rto-earlier': col('teal', 50),
  bar: col('teal', 40),
  'bar-muted': D.textHelper,
  // vehicle groups (Carbon Charts categorical, dark)
  'cat-2w': col('purple', 60),
  'cat-3w': col('cyan', 40),
  'cat-car': col('magenta', 40),
  'cat-com': YELLOW_40,
  'cat-oth': ORANGE_60,
  'cat-2w-ink': D.textOnColor,
  'cat-3w-ink': W.textPrimary,
  'cat-car-ink': W.textPrimary,
  'cat-com-ink': W.textPrimary,
  'cat-oth-ink': D.textOnColor,
  'pin-1': '#56b4e9',
  'pin-2': '#ea6a1a',
  'pin-3': '#00a578',
  'pin-4': '#cf88c0',
  'pin-5': '#d9d9d9',
};

const rgba = (hexish, a) => {
  const h = hexish.replace('#', '');
  return `rgba(${parseInt(h.slice(0, 2), 16)}, ${parseInt(h.slice(2, 4), 16)}, ${parseInt(h.slice(4, 6), 16)}, ${a})`;
};
const extras = (t, shadow) => ({
  band: rgba(t.text, 0.05),
  'band-2': rgba(t.text, 0.09),
  brush: rgba(t.accent, 0.14),
  shadow: 'none',
  // Carbon product shadow for floating layers only (menus, tooltips, popovers, toasts, tray)
  'shadow-float': `0 2px 6px ${shadow}`,
});

const block = (vals) => Object.entries(vals).map(([k, v]) => `  --${k}: ${v};`).join('\n');

const toSec = (ms) => Number.parseInt(ms, 10);
const motionVars = {
  'duration-fast-01': motion.fast01,
  'duration-fast-02': motion.fast02,
  'duration-moderate-01': motion.moderate01,
  'duration-moderate-02': motion.moderate02,
  'duration-slow-01': motion.slow01,
  'ease-standard': motion.easings.standard.productive,
  'ease-entrance': motion.easings.entrance.productive,
  'ease-exit': motion.easings.exit.productive,
};

const css = `/* GENERATED by scripts/carbon-tokens.mjs (npm run tokens) from @carbon/themes, @carbon/colors and @carbon/motion.
   Do not edit by hand: change the script and re-run it. Checked by scripts/check-contrast.mjs in both themes. */
:root,
:root[data-theme='light'] {
  color-scheme: light;
${block(light)}
${block(extras(light, W.shadow))}
}

:root[data-theme='dark'] {
  color-scheme: dark;
${block(dark)}
${block(extras(dark, D.shadow))}
}

/* Carbon productive motion (theme-independent) */
:root {
${block(motionVars)}
}

/* Light is the default theme, including without JavaScript; dark applies only when chosen. */
`;
writeFileSync(join(ROOT, 'src', 'tokens.css'), css);

const bez = (s) => s.match(/[\d.]+/g).map(Number);
const ts = `// GENERATED by scripts/carbon-tokens.mjs from @carbon/motion. Do not edit by hand.
/** Carbon productive motion for framer-motion (seconds, cubic-bezier arrays). */
export const dur = {
  fast01: ${toSec(motion.fast01) / 1000},
  fast02: ${toSec(motion.fast02) / 1000},
  moderate01: ${toSec(motion.moderate01) / 1000},
  moderate02: ${toSec(motion.moderate02) / 1000},
  slow01: ${toSec(motion.slow01) / 1000},
} as const;

export const ease = {
  standard: [${bez(motion.easings.standard.productive).join(', ')}] as [number, number, number, number],
  entrance: [${bez(motion.easings.entrance.productive).join(', ')}] as [number, number, number, number],
  exit: [${bez(motion.easings.exit.productive).join(', ')}] as [number, number, number, number],
};
`;
writeFileSync(join(ROOT, 'src', 'lib', 'motion.ts'), ts);

console.log('light', JSON.stringify(light, null, 1));
console.log('dark', JSON.stringify(dark, null, 1));
console.log('motion', JSON.stringify(motionVars));
