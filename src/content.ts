// ALL user-facing text lives here. Every entry is a draft written only from facts in
// data/cleaned/cleaning_log.md and the pipeline's printed outputs.
// Numbers are never typed in here: functions receive values computed from the data files.
// Placeholders in [SQUARE BRACKETS?] must be filled by Vishwa; see PLACEHOLDERS at the bottom.
import type { Group } from './types';
import { fmtInt, fmtPct, fmtDec, fmtMonth, fmtRange } from './lib/format';

// DRAFT: Vishwa to rewrite
export const header = {
  title: 'EV Charging Site-Planning Dashboard',
  subtitle: 'Where is EV demand outrunning public charging in India, and what kind of charging does that demand need?',
  themeToLight: 'Switch to light theme',
  themeToDark: 'Switch to dark theme',
  skipLink: 'Skip to dashboard',
};

// DRAFT: Vishwa to rewrite
/** The one-sentence finding at the top of the page. Every value is passed in, computed from the data files. */
export const lede = {
  india: (n: number, india: string, a: { name: string; v: string }, b: { name: string; v: string }) =>
    `Across the ${n} states with both a demand figure and a charger count, India has ${india} EVs per public charger. The widest gaps are in ${a.name} (${a.v}) and ${b.name} (${b.v}).`,
  state: (s: string, v: string, ratio: string, rank: number, n: number) =>
    `${s} has ${v} EVs per public charger, ${ratio} the India figure, and ranks #${rank} of ${n} (1 = widest gap).`,
  heading: 'Finding',
  howToRead: 'How to read these figures',
  /** g is unsigned; the verb carries the direction, so a fall never reads as "grew −25%". */
  growth: (g: string, fell: boolean, india: string) => ` Its EV registrations ${fell ? 'fell' : 'grew'} ${g} in the last 12 months (India: ${india}).`,
  noGranular: (s: string, alt: string | null) =>
    `${s} has no RTO-level registration data in the source, so it is not ranked against the charger snapshot.${alt ? ` On the 2019 to 2026 source it has ${alt} EVs per public charger.` : ''}`,
  noCharger: (s: string) => `${s} has no public charger count in the snapshot, so EVs per charger cannot be computed for it.`,
  ratio: (r: string) => `${r}×`,
};

// DRAFT: Vishwa to rewrite
export const controls = {
  stateLabel: 'State or UT',
  statePlaceholder: 'All India',
  stateAllIndia: 'All India',
  stateNoMatch: (q: string) => `No state or UT matches "${q}"`,
  periodLabel: 'Period',
  periodFrom: 'From',
  periodTo: 'To',
  reset: 'Reset',
  resetDone: 'Back to All India and the full period. The shortlist was cleared.',
  share: 'Share link',
  shareCopied: 'Link copied. Anyone with it sees this exact view.',
  shareFailed: 'The link could not be copied automatically. Copy it from the address bar instead.',
  breadcrumb: (place: string, from: string, to: string) => `Showing: ${place} · ${fmtRange(from, to)}`,
  escHint: 'Esc clears the selection',
};

// DRAFT: Vishwa to rewrite
export const common = {
  viewTable: 'View data table',
  hideTable: 'Hide data table',
  info: 'How to read this view',
  pin: (s: string) => `Pin ${s} to the shortlist`,
  unpin: (s: string) => `Unpin ${s}`,
  pinsFull: (s: string) => `The shortlist holds 5 states. Unpin one to add ${s}.`,
  pinned: (s: string) => `${s} pinned to the shortlist`,
  unpinned: (s: string) => `${s} removed from the shortlist`,
  missing: 'Not available',
  loading: 'Loading registration and charger data',
  errorTitle: 'The dashboard could not load its data',
  errorBody: (file: string) => `The file "${file}" did not load, so nothing is shown rather than a partial or wrong picture. Check your connection, then reload the page.`,
  retry: 'Reload',
  viewError: (v: string) => `The "${v}" view hit an error, so it is hidden rather than showing something wrong. The other views still work. Reload the page to try again.`,
};

// DRAFT: Vishwa to rewrite
export const flags: Record<string, { label: string; long: string }> = {
  ok: { label: 'OK', long: 'No data caveat for this state.' },
  no_granular_demand: {
    label: 'No RTO-level data',
    long: 'No RTO-level registration rows exist in the source for this state. This is a reporting gap, not zero demand.',
  },
  no_charger_data: {
    label: 'No charger count',
    long: 'The charger file has no entry for this state, so EVs per charger cannot be computed.',
  },
  small_base: {
    label: 'Small base',
    long: 'Fewer than 500 chargeable EVs were registered in the prior 12 months, so growth percentages swing widely.',
  },
};

// DRAFT: Vishwa to rewrite
export const kpi = {
  evPeriod: 'EVs registered in period',
  growth: 'Growth, last 12 months vs prior 12',
  chargers: 'Public chargers',
  epc: 'EVs per public charger',
  rank: 'National rank, EVs per charger',
  indiaCompare: (v: string) => `India: ${v}`,
  flagsHeading: (s: string) => `Data notes for ${s}:`,
  shareOfIndia: (pct: string) => `${pct} of India`,
  rankNone: 'Select a state to see its rank',
  ratioToIndia: (r: string, india: string) => `${r} the India figure (${india})`,
  rankLine: (rank: number, n: number) => `Rank #${rank} of ${n} · 1 = widest gap`,
  scaleAria: (s: string, v: string, india: string) => `${s} ${v} against India ${india}`,
  noGranular: (s: string) => `No RTO-level registration data in the source for ${s}.`,
  alt2026: (v: string) => `2019 to 2026 source: ${v} chargeable EVs (end month not stated)`,
  epcAlt2026: (v: string) => `2019 to 2026 source: ${v} per charger`,
  noCharger: 'Not available: no charger count in source',
  notComputablePrior0: 'Not computable: no EVs in the prior 12 months',
  epcWindow: (from: string, to: string) => `EVs registered ${fmtRange(from, to)} ÷ public chargers`,
  indiaEpcNote: (n: number) => `India figure uses the ${n} states that have both a demand figure and a charger count.`,
};

// ------------------------------------------------------------------ View 1
// DRAFT: Vishwa to rewrite
export const v1 = {
  title: 'National context',
  scope: 'National, all states',
  subtitle: (first: string, last: string) => `EV registrations per financial year, ${first} to ${last}, by vehicle type (national annual file)`,
  info: 'Each bar is one financial year of national EV registrations from the national annual file, split by vehicle type. Use it for the long-run shape and the mode split, not for exact counts: it counts fewer EVs than Vahan’s own registrations. This strip is not filtered by the state selector or period slider. FY2025 runs past May 2024, where the state-level data ends.',
  statTotal: (fy: string) => `EVs in ${fy} (annual file)`,
  stat2w: (fy: string) => `Two-wheeler share, ${fy} (annual file)`,
  statGrowth: (a: string, b: string) => `Growth ${a} to ${b}, chargeable EVs (Vahan registrations, cleaned)`,
  fyCaption: (a: { fy: string; file: string; vahan: string }, b: { fy: string; file: string; vahan: string }) =>
    `This national summary counts fewer EVs than Vahan’s own registrations: ${a.fy} ${a.file} vs ${a.vahan} in Vahan; ${b.fy} ${b.file} vs ${b.vahan}. The file does not state which fuel tags it counts as EV.`,
  beyondWindow: 'After May 2024',
  modeLabel: 'National chart measure',
  modes: { count: 'Count', share: 'Share %' },
  disagreeTitle: 'Sources disagree on the three-wheeler share',
  disagreeInfo: (a: string, b: string) =>
    `Two national files split EVs by vehicle type differently. The annual file covers one financial year (${a}) and does not document which fuel tags its "EV" includes. category-fuel.csv covers 2019 to 2026 cumulatively (${b}) and counts the three chargeable tags. Different windows and definitions mean neither can be reconciled with the other from these files, so both are shown.`,
  splitLabelFy: (fy: string) => `Annual file, ${fy}`,
  splitLabelCf: '2019 to 2026 cumulative',
  aria: (first: string, last: string, lastTotal: number, share2w: number | null, growth: string) =>
    `Stacked bar chart of national EV registrations by vehicle type from ${first} to ${last}, from the national annual file. ${last} had ${fmtInt(lastTotal)} EV registrations; two-wheelers were ${fmtPct(share2w)} of them. From Vahan's own registrations, chargeable EVs grew ${growth}.`,
  tableCaption: 'National EV registrations by financial year and vehicle type (annual file)',
  compareCaption: 'Annual file EV total vs Vahan chargeable-EV registrations, complete financial years',
};

// ------------------------------------------------------------------ View 2
// DRAFT: Vishwa to rewrite
export const v2 = {
  title: 'State growth',
  subtitle: 'Where EV registrations are growing, and how fast',
  info: 'Darker (light theme) or brighter (dark theme) states have higher values. Growth and EV share use fixed 12-month windows; "EVs registered in period" follows the period slider. Click a state to select it; drag across the trend chart to change the period.',
  metrics: {
    growth: 'Growth, last 12 months vs prior 12',
    period: 'EVs registered in period',
    share: 'EV share of new registrations',
  },
  metricLong: {
    growth: (a: string, b: string) => `Chargeable EVs registered ${a} compared with ${b}`,
    period: (a: string) => `Chargeable EVs registered ${a}`,
    share: (a: string) => `Chargeable EVs as a share of all vehicle registrations, ${a}`,
  },
  binRange: (a: string, b: string) => `${a} to ${b}`,
  legendHatch: 'No RTO-level data',
  legendSmallBase: 'Small base (<500 EVs in prior 12 months)',
  legendNoValue: 'Not computable',
  legendOffScale: 'Small base: growth left off the scale (value on hover)',
  mapLabelNoData: 'No RTO-level data',
  trendTitle: (place: string) => `Monthly EV registrations, ${place}`,
  trendModes: { count: 'Count', share: 'EV share %' },
  trendIndiaRef: 'All India, for reference',
  trendIndiaCountNote: 'In Count mode the India line is hidden when a state is selected, because the two are not on a comparable scale. Switch to EV share % to compare with India.',
  bandPrior: 'Prior 12 months',
  bandLast: 'Last 12 months',
  bandPriorShort: 'Prior',
  bandLastShort: 'Last',
  brushHint: 'Drag across the chart to set the period',
  noTrend: (s: string) => `No RTO-level registration data in the source for ${s}. This is a reporting gap, not zero demand.`,
  mapAria: (metric: string, top: string[], n: number) =>
    `Map of India's states coloured by ${metric}. Highest ${n}: ${top.join(', ')}. Telangana and Lakshadweep are hatched because the source has no RTO-level data for them.`,
  trendAria: (place: string, mode: string, from: string, to: string, first: number | null, last: number | null, peak: string) =>
    `Line chart of monthly ${mode} for ${place} from ${fmtMonth(from)} to ${fmtMonth(to)}. It moves from ${first === null ? 'no data' : fmtDec(first, first < 100 ? 1 : 0)} to ${last === null ? 'no data' : fmtDec(last, last < 100 ? 1 : 0)}; the peak month is ${peak}.`,
  mapTableCaption: (metric: string) => `States by ${metric}`,
  trendTableCaption: (place: string) => `Monthly chargeable EV registrations and EV share, ${place}`,
};

// ------------------------------------------------------------------ RTO drill-down
// DRAFT: Vishwa to rewrite
export const rto = {
  title: (place: string | null) => (place ? `Top RTOs in ${place}` : 'Top RTOs nationally'),
  subtitle: 'Chargeable EV registrations by Regional Transport Office',
  info: 'Each bar is one RTO. The darker part is the last 12 months, the lighter part is everything earlier in the window. Select a state to see its own RTOs.',
  caption: 'RTO data has no vehicle-type split and no charger counts, so this ranks demand only.',
  sorts: { last12: 'Last 12 months', full: 'Full window' },
  valueLast12: (last: string, total: string) => `${last} of ${total}`,
  legendLast: (a: string) => `Last 12 months (${a})`,
  legendEarlier: (a: string) => `Earlier (${a})`,
  empty: (s: string) => `No RTO-level registration data in the source for ${s}. This is a reporting gap, not zero demand.`,
  aria: (place: string, top: string, total: number, n: number) =>
    `Bar chart of the top ${n} RTOs ${place} by chargeable EV registrations. The largest is ${top} with ${fmtInt(total)}.`,
  tableCaption: (place: string) => `Top RTOs ${place}`,
};

// ------------------------------------------------------------------ View 3
// DRAFT: Vishwa to rewrite
export const v3 = {
  title: 'Gap ranking',
  subtitle: 'EVs registered per public charger, by state',
  info: 'Longer bars mean more EVs per public charger: demand is further ahead of charging. Rank 1 is the widest gap. The dark tick on each bar marks the India figure. Click a row to select the state, or pin it to the shortlist. With a keyboard, these rows are the way to select states.',
  sources: {
    aligned: 'Matches charger snapshot',
    current: '2019 to 2026 (incl. Telangana)',
  },
  currentWarning: 'Demand here is about 2 years newer than the charger counts, so gaps look larger than they are.',
  hideFlagged: 'Hide states with data caveats',
  cols: { state: 'State', epc: 'EVs per charger', evs: 'EVs', chargers: 'Chargers', growth: 'Growth' },
  unavailableHeading: 'Not ranked',
  aria: (source: string, top: string[], india: string) =>
    `Ranked bar chart of EVs per public charger by state (${source}). Highest: ${top.join(', ')}. All-India figure: ${india}.`,
  tableCaption: (source: string) => `EVs per public charger by state, ${source}`,
  indiaRow: 'All India',
  sortLabel: 'Sort ranking by',
  sorts: { gap: 'EVs per charger', growth: 'Growth' },
  indiaTick: 'India',
  jumpTop: 'Back to #1',
  showAll: (n: number) => `Show all ${n}`,
  showTop: (n: number) => `Show top ${n} only`,
  rowLabel: (rank: number, s: string, v: string, evs: string, ch: string, g: string, fl: string) =>
    `${rank}. ${s}: ${v} EVs per charger. ${evs} EVs, ${ch} chargers, growth ${g}.${fl ? ` ${fl}.` : ''}`,
  rowLabelUnranked: (s: string, reason: string) => `${s}: not ranked. ${reason}`,
  footerCurrent: (end: string) => `EVs 2019 to 2026 (${end}) ÷ public chargers`,
  growthWindow: (w: string) => `Growth: ${w} vs prior 12 months`,
};

// ------------------------------------------------------------------ View 4
// DRAFT: Vishwa to rewrite
export const v4 = {
  title: 'Vehicle mix',
  subtitle: 'What kinds of vehicles are registered, which shapes what kind of station to build',
  info: 'Each bar splits registrations 100% across vehicle types. State bars are the whole registered fleet (all fuels), not EVs only, because the state-level file has no fuel split. The bottom bar is a national EV-only split for reference.',
  caption: 'State and India bars show the whole fleet (all fuels, Jan 2019 to May 2024), not EV-only. Only the reference bar is EV-only, and it is national.',
  india: 'India, whole fleet',
  refBar: 'National EV split',
  refBarLong: 'National EV split (EV only, national)',
  wholeFleet: (s: string) => `${s} (whole fleet)`,
  refSources: { fy_file: 'Annual file', category_fuel: '2019 to 2026' },
  groupLabels: { '2W': 'Two-wheelers', '3W': 'Three-wheelers', 'Cars/LMV': 'Cars / LMV', Commercial: 'Commercial', Other: 'Other' } as Record<Group, string>,
  signalHeading: 'Station-type signal',
  signalNoState: 'Select a state to see its station-type signal.',
  noMixRow: 'No vehicle-category data in the source (reporting gap, not zero)',
  signalNoMix: (s: string) => `No vehicle-category data in the source for ${s}, so no signal can be derived.`,
  aria: (rows: string) => `100% stacked bars of vehicle mix. ${rows}`,
  tableCaption: 'Vehicle mix, share of registrations by vehicle type',
};

/**
 * Station-type signal rules. Each state's WHOLE-FLEET share of a vehicle group is divided by the
 * national share of the same group; both come from state_fleet_mix.csv (the national shares are its
 * computed "All India" rows, never typed in). Rules run in this order; the first match wins:
 *   1) 3W ratio >= 1.5       -> 3w_lean
 *   2) Cars/LMV ratio >= 1.5 -> car_lean
 *   3) otherwise             -> 2w_led
 *   4) no mix data           -> no_data   (checked before 1-3 in code, since no ratio can be computed)
 * DRAFT: Vishwa to rewrite the four guidance texts.
 */
export type SignalId = '3w_lean' | 'car_lean' | '2w_led' | 'no_data';
export const SIGNAL_RATIO_THRESHOLD = 1.5;

/** s = state shares (%), india = national shares (%), both whole fleet; s is null when the state has no mix data. */
export interface SignalInput { state: string; s: Record<Group, number> | null; india: Record<Group, number> }

export const signalRatio = (x: SignalInput, g: Group): number | null =>
  x.s && x.india[g] > 0 ? x.s[g] / x.india[g] : null;

export const stationSignalRules: { id: SignalId; label: string; test: (x: SignalInput) => boolean; guidance: string }[] = [
  {
    id: 'no_data',
    label: 'No mix data',
    test: (x) => x.s === null,
    guidance: '[STATION-TYPE GUIDANCE: NO MIX DATA?]',
  },
  {
    id: '3w_lean',
    label: 'Three-wheeler lean',
    test: (x) => (signalRatio(x, '3W') ?? 0) >= SIGNAL_RATIO_THRESHOLD,
    guidance: '[STATION-TYPE GUIDANCE: 3W LEAN?]',
  },
  {
    id: 'car_lean',
    label: 'Car / LMV lean',
    test: (x) => (signalRatio(x, 'Cars/LMV') ?? 0) >= SIGNAL_RATIO_THRESHOLD,
    guidance: '[STATION-TYPE GUIDANCE: CAR/LMV LEAN?]',
  },
  {
    id: '2w_led',
    label: 'Two-wheeler led',
    test: () => true,
    guidance: '[STATION-TYPE GUIDANCE: 2W LED?]',
  },
];

export function stationSignal(x: SignalInput) {
  const rule = stationSignalRules.find((r) => r.test(x))!;
  return { rule, ratio3w: signalRatio(x, '3W'), ratioCar: signalRatio(x, 'Cars/LMV') };
}

/** Tooltip line, e.g. "3W share 7.4%, 2.3× India". */
export const signalRatioText = (label: string, share: number | null, ratio: number | null) =>
  `${label} share ${fmtPct(share)}, ${ratio === null ? '—' : `${fmtDec(ratio, 1)}×`} India`;

export const signalCaveat = 'Based on the whole fleet, not EVs only.';

// ------------------------------------------------------------------ shortlist
// DRAFT: Vishwa to rewrite
export const tray = {
  title: (n: number) => `Shortlist (${n} of 5)`,
  export: 'Export CSV',
  clear: 'Clear',
  exported: 'Shortlist downloaded as a CSV file',
  cleared: 'Shortlist cleared',
  fields: { epc: 'EVs per charger', growth: 'Growth', evs: 'EVs in period', chargers: 'Chargers', rto: 'Top RTO', signal: 'Station signal (whole fleet)' },
  expand: 'Show shortlist',
  chipValue: (v: string) => `${v} EVs per charger`,
  collapse: 'Hide shortlist',
  alt2026: (v: string) => `2019 to 2026 source: ${v} per charger`,
  csvNote: (generated: string, from: string, to: string) =>
    `Generated ${generated} from EV Charging Site-Planning Dashboard. EVs in period = ${fmtRange(from, to)}. Aligned window (matches the charger snapshot) = Jan 2019 to May 2024. Growth = Jun 2023 to May 2024 vs Jun 2022 to May 2023. Chargers = undated public-only snapshot (secondary source). 2019 to 2026 figures from fuel-state.csv (end month not stated in source). Blank = not available in source, never zero.`,
};

// ------------------------------------------------------------------ panels
// DRAFT: Vishwa to rewrite
export const howToRead = {
  title: 'How to read this',
  items: (w: { l12: string; p12: string; aligned: string }) => [
    { h: 'Chargeable EV', p: 'A battery-electric or plug-in hybrid vehicle: one that plugs in to charge. Strong hybrids are excluded because they never plug in. Every EV figure on this page counts chargeable EVs.' },
    { h: 'RTO', p: 'Regional Transport Office: the office where a vehicle is registered. The registration data is reported office by office.' },
    { h: 'EVs registered in period', p: 'Chargeable EVs registered in the months chosen with the period slider.' },
    { h: 'Growth', p: `Chargeable EVs registered ${w.l12} compared with ${w.p12}. The windows are fixed: the period slider does not change this figure.` },
    { h: 'EV share of new registrations', p: `Chargeable EVs as a percentage of all vehicle registrations, ${w.l12}.` },
    { h: 'EVs per public charger', p: `Chargeable EVs registered ${w.aligned}, divided by the public charger count. It counts registrations in the window, not vehicles on the road today.` },
    { h: 'Two gap sources', p: '"Matches charger snapshot" (Jan 2019 to May 2024) lines up in time with the charger counts and is the default. "2019 to 2026 (incl. Telangana)" uses a more current national file that also covers Telangana, but its demand is about two years newer than the charger counts, so gaps look larger than they are.' },
    { h: 'Hatching and markers', p: 'Hatched states have no RTO-level data in the source (a reporting gap, not zero). A dashed ring marks a small base, where growth percentages swing widely; on the growth map these states are dotted and left off the colour scale. Grey means the value cannot be computed. Map colours use five equal intervals. In the gap ranking, rank 1 is the state with the most EVs per public charger: the widest gap.' },
    { h: 'Whole fleet vs EV only', p: 'State vehicle-mix bars are the whole registered fleet (all fuels), because the state-level file has no fuel split. Only the national reference bar is EV-only.' },
    { h: 'Selecting, pinning and sharing', p: 'Click a state on the map, a row in the gap ranking or a mix bar, or use the search box, to select it; every view updates. Pin up to 5 states to compare them and export a CSV. "Share link" copies a URL that reopens this exact view. Esc clears the selection; Reset also clears the shortlist.' },
  ],
};

// DRAFT: Vishwa to rewrite
export const doesntShow = {
  title: 'What this doesn’t show',
  items: (x: {
    split: { fy: string; fy3w: number; cf3w: number };
    dropped: { blocks: number; pctRows: number; pctVol: number; catBlocks: number };
    excluded: { office: string; months: string; evRemoved: string };
    fyVsVahan: { a: { fy: string; file: string; vahan: string }; b: { fy: string; file: string; vahan: string } };
    to: string;
  }) => [
    { h: 'No EV-by-vehicle-type split below national level', p: 'Neither state nor RTO data splits EVs by vehicle type. The state mix is the whole fleet, all fuels.' },
    { h: 'National sources disagree on three-wheelers', p: `The annual file puts three-wheelers at ${fmtPct(x.split.fy3w)} of EVs in ${x.split.fy}; category-fuel.csv puts them at ${fmtPct(x.split.cf3w)} for 2019 to 2026. Both are shown; neither is treated as correct.` },
    { h: 'Demand-side and charger-side gaps', p: 'Telangana and Lakshadweep have no RTO-level registration data (a reporting gap, not zero demand). Ladakh and Mizoram have no charger count, so EVs per charger cannot be computed for them.' },
    { h: 'Where vehicles charge', p: 'Registrations are recorded at the owner’s RTO, not where the vehicle is driven or charged.' },
    { h: 'Charger detail', p: 'Chargers are one undated, public-only snapshot from a secondary source. There is no AC/DC type, power rating or utilisation, and no RTO-level charger counts.' },
    { h: 'Anything after May 2024', p: `State and RTO registration data ends ${fmtMonth(x.to)}.` },
    { h: 'Dropped corrupted data', p: `${fmtInt(x.dropped.blocks)} monthly RTO records (one office, one month) were dropped from the fuel-type file as corrupted: ${fmtDec(x.dropped.pctRows, 2)}% of rows, but ${fmtDec(x.dropped.pctVol, 1)}% of the file's raw total, because the corrupted values are huge. ${fmtInt(x.dropped.catBlocks)} were dropped from the vehicle-category file. A record is dropped if its total is over 50,000, more than 10 times the office’s median for the surrounding months, or the same inflated total repeated 3 or more months running. One office, ${x.excluded.office}, is excluded entirely (all ${x.excluded.months} months; ${x.excluded.evRemoved} chargeable EVs that the earlier rule had kept).` },
    { h: 'Exact national EV counts from the annual file', p: `The national annual file counts fewer EVs than Vahan’s own registrations (${x.fyVsVahan.a.fy}: ${x.fyVsVahan.a.file} vs ${x.fyVsVahan.a.vahan}; ${x.fyVsVahan.b.fy}: ${x.fyVsVahan.b.file} vs ${x.fyVsVahan.b.vahan}) and does not state which fuel tags it counts as EV. It is used for the long-run shape and mode split only.` },
    { h: 'Policy and readiness', p: 'No policy or readiness context (for example NITI Aayog’s India Electric Mobility Index) is scored in.' },
  ],
};

// DRAFT: Vishwa to rewrite
export interface SourceEntry {
  file: string;
  role: string;
  publisher: string;
  url: string;
  licence: string;
  accessed: string;
  window: string;
  transforms: string[];
}
export const whereFrom = {
  title: 'Where this came from',
  intro: 'Every number on this page is computed by code from the files below. Download the cleaned files and the full cleaning log to check any figure.',
  downloadsHeading: 'Download cleaned data',
  sourcesHeading: 'Source files (open a file for publisher, licence and every transformation)',
  needsDetails: 'Details to fill in',
  cols: { publisher: 'Publisher', url: 'Source URL', licence: 'Licence', accessed: 'Date accessed', window: 'Version / window', transforms: 'Transformations' },
  /** Per-file provenance. Not shown on the page (removed at the author's request); kept so it can be restored. */
  sources: (m: { fuelStateEnd: string; categoryFuelEnd: string; fyFirst: string; fyLast: string; from: string; to: string; fyGap: string }): SourceEntry[] => [
    {
      file: 'vahan-vehicle-registrations-by-fuel-type.csv',
      role: 'Demand: monthly registrations by fuel type, state and RTO (maps, trend, RTOs, gap ranking, KPIs)',
      publisher: 'Ministry of Road Transport and Highways, VAHAN (per the file’s codebook). Extract publisher: [EXTRACT PUBLISHER?]',
      url: 'Codebook source link: https://parivahan.gov.in/parivahan/ ; extraction page: https://vahan.parivahan.gov.in/vahan4dashboard/vahan/dashboardview.xhtml ; download URL: [SOURCE URL?]',
      licence: '[LICENCE?]',
      accessed: '[DATE ACCESSED?] (codebook: data retrieved 2024-06-27)',
      window: `${fmtRange(m.from, m.to)}, monthly, RTO level`,
      transforms: ['State names standardised', 'Corrupted (state, RTO, month) blocks dropped (v3 rule: block total > 50,000; or > 10× the office’s rolling ±6-month median, floored at 50; or an identical total repeated 3+ months running and > 3× the office median)', 'M-S Nandan Fitness Testing Center (Rajasthan) excluded entirely', 'Chargeable EV = Electric(Bov) + Pure Ev + Plug-In Hybrid Ev; Strong Hybrid Ev excluded', 'Aggregated to state-month and RTO totals'],
    },
    {
      file: 'vahan-vehicle-registrations-by-vehicle-category.csv',
      role: 'Vehicle mix by state (whole fleet, all fuels)',
      publisher: '[PUBLISHER?]',
      url: '[SOURCE URL?]',
      licence: '[LICENCE?]',
      accessed: '[DATE ACCESSED?]',
      window: `${fmtRange(m.from, m.to)}, monthly, RTO level`,
      transforms: ['State names standardised', 'Same v3 block outlier rule and office exclusion', 'Vahan classes grouped into 2W / 3W / Cars-LMV / Commercial / Other'],
    },
    {
      file: 'OperationalPC.csv',
      role: 'Supply: operational public chargers by state',
      publisher: 'Kaggle dataset "Detailed India EV Market Data 2001-2024" by Sai Raam (srinrealyf); its description says the figures were scraped from the Vahan4 dashboard (secondary source)',
      url: '[SOURCE URL?]',
      licence: 'Apache 2.0 (per the Kaggle dataset, as recorded in the cleaning log)',
      accessed: '[DATE ACCESSED?]',
      window: 'Undated',
      transforms: ['State names standardised'],
    },
    {
      file: 'fuel-state.csv',
      role: '"2019 to 2026" demand option in the gap ranking; only demand figure for Telangana and Lakshadweep',
      publisher: '[PUBLISHER?] (the cleaning log calls it the "TDC aggregate")',
      url: '[SOURCE URL?]',
      licence: '[LICENCE?]',
      accessed: '[DATE ACCESSED?]',
      window: `2019 to 2026 cumulative, no monthly breakdown; ${m.fuelStateEnd}`,
      transforms: ['Literal "\\n" in the title row fixed before parsing', 'ELECTRIC(BOV) + PURE EV + PLUG-IN HYBRID EV summed per state'],
    },
    {
      file: 'category-fuel.csv',
      role: 'Second national EV-by-vehicle-type split',
      publisher: '[PUBLISHER?] (TDC aggregate)',
      url: '[SOURCE URL?]',
      licence: '[LICENCE?]',
      accessed: '[DATE ACCESSED?]',
      window: `2019 to 2026 cumulative, national only; ${m.categoryFuelEnd}`,
      transforms: ['Literal "\\n" in the title row fixed', 'Three chargeable tags summed', 'Classes grouped as in the state mix'],
    },
    {
      file: 'india-vahan-registrations-by-vehicle-category-and-fuel-fy2011-fy2025.csv',
      role: 'National context strip and the FY national EV split',
      publisher: '[PUBLISHER?]',
      url: '[SOURCE URL?]',
      licence: '[LICENCE?]',
      accessed: '[DATE ACCESSED?]',
      window: `${m.fyFirst} to ${m.fyLast}, national only. Counts fewer EVs than Vahan’s own registrations in every complete year compared (${m.fyGap}); the file does not state which fuel tags it counts as EV`,
      transforms: ['FUEL_TYPE = "EV" rows only', 'MODE grouped: 2W; 3W Passenger + 3W Goods; Cars; Bus + LGV + MGV + HGV as Commercial; Others'],
    },
    {
      file: 'India state boundaries (DataMeet States/Admin2)',
      role: 'Map shapes',
      publisher: 'DataMeet India community',
      url: 'https://github.com/datameet/maps/tree/master/States',
      licence: 'CC BY 4.0',
      accessed: '2026-09-30',
      window: 'master branch at date accessed',
      transforms: ['Simplified with mapshaper 0.6 (1.5%, keep-shapes, clean; 38 sliver gaps removed, all 36 features kept)', 'Two names aligned to the data: "Andaman & Nicobar" → "Andaman & Nicobar Islands", "Jammu & Kashmir" → "Jammu and Kashmir"', 'Polygon rings reversed to the winding d3-geo expects; geometry otherwise unchanged'],
    },
  ],
  mapAttribution: {
    heading: 'Map attribution',
    text: 'India state boundaries by DataMeet India community, licensed CC BY 4.0. Accessed 2026-09-30. Modified: simplified, two state names aligned to the data, polygon winding reversed for d3-geo.',
    link: 'https://github.com/datameet/maps/tree/master/States',
    licenceLink: 'https://creativecommons.org/licenses/by/4.0/',
    short: 'Boundaries: DataMeet India community, CC BY 4.0 (modified)',
  },
  downloads: [
    { file: 'state_summary.csv', label: 'State summary (all KPIs and flags)' },
    { file: 'state_month_ev_demand.csv', label: 'State × month EV registrations' },
    { file: 'rto_ev_demand_cumulative.csv', label: 'RTO EV totals' },
    { file: 'state_fleet_mix.csv', label: 'State fleet mix by vehicle group' },
    { file: 'charging_stations_by_state.csv', label: 'Public chargers by state' },
    { file: 'national_fy_ev_by_group.csv', label: 'National EVs per FY by group' },
    { file: 'national_ev_split.csv', label: 'Both national EV splits' },
    { file: 'cleaning_log.md', label: 'Cleaning log (every drop and choice)' },
  ],
};

/** Every placeholder Vishwa must fill. Kept in sync with the strings above. */
export const PLACEHOLDERS = [
  'fuel-type file: [EXTRACT PUBLISHER?], [SOURCE URL?], [LICENCE?], [DATE ACCESSED?]',
  'vehicle-category file: [PUBLISHER?], [SOURCE URL?], [LICENCE?], [DATE ACCESSED?]',
  'OperationalPC.csv: [SOURCE URL?] (Kaggle page), [DATE ACCESSED?]',
  'fuel-state.csv: [PUBLISHER?], [SOURCE URL?], [LICENCE?], [DATE ACCESSED?]',
  'category-fuel.csv: [PUBLISHER?], [SOURCE URL?], [LICENCE?], [DATE ACCESSED?]',
  'FY2011-FY2025 national file: [PUBLISHER?], [SOURCE URL?], [LICENCE?], [DATE ACCESSED?]',
  'Station-type signal: [STATION-TYPE GUIDANCE: 3W LEAN? / CAR/LMV LEAN? / 2W LED? / NO MIX DATA?] in stationSignalRules',
];
