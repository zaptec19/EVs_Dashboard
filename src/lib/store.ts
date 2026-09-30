// One global store for every linked view. All shareable state is mirrored in the URL hash.
import { useSyncExternalStore } from 'react';

export type MapMetric = 'growth' | 'period' | 'share';
export type GapSource = 'aligned' | 'current';
export type SplitSource = 'fy_file' | 'category_fuel';
export type TrendMode = 'count' | 'share';
export type RtoSort = 'last12' | 'full';
export type FyMode = 'count' | 'share';
export type Theme = 'light' | 'dark';

export interface AppState {
  selected: string | null;
  hovered: string | null;
  pins: string[];
  /** Colour/shape slot per pinned state, kept stable while other pins come and go. */
  pinSlots: Record<string, number>;
  metric: MapMetric;
  period: [string, string];
  gapSource: GapSource;
  hideFlagged: boolean;
  split: SplitSource;
  trendMode: TrendMode;
  rtoSort: RtoSort;
  fyMode: FyMode;
  theme: Theme;
}

export const MAX_PINS = 5;

let bounds: [string, string] = ['2019-01', '2024-05'];
let validStates = new Set<string>();

function initialTheme(): Theme {
  const t = document.documentElement.getAttribute('data-theme');
  return t === 'dark' ? 'dark' : 'light';
}

export function defaults(): Omit<AppState, 'theme' | 'hovered'> {
  return {
    selected: null,
    pins: [],
    pinSlots: {},
    metric: 'growth',
    period: [...bounds] as [string, string],
    gapSource: 'aligned',
    hideFlagged: false,
    split: 'fy_file',
    trendMode: 'count',
    rtoSort: 'last12',
    fyMode: 'count',
  };
}

let state: AppState = { ...defaults(), hovered: null, theme: initialTheme() };
const listeners = new Set<() => void>();

export function getState() {
  return state;
}

export function setState(patch: Partial<AppState> | ((s: AppState) => Partial<AppState>)) {
  const p = typeof patch === 'function' ? patch(state) : patch;
  const next = { ...state, ...p };
  const changed = (Object.keys(p) as (keyof AppState)[]).some((k) => next[k] !== state[k]);
  if (!changed) return;
  state = next;
  if (Object.keys(p).some((k) => k !== 'hovered' && k !== 'theme')) writeHash();
  listeners.forEach((l) => l());
}

export function useStore<T>(sel: (s: AppState) => T): T {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => sel(state),
  );
}

// ---------------------------------------------------------------- actions
export const actions = {
  select(name: string | null) {
    setState({ selected: name });
  },
  hover(name: string | null) {
    setState({ hovered: name });
  },
  togglePin(name: string): 'pinned' | 'unpinned' | 'full' {
    const pins = state.pins;
    if (pins.includes(name)) {
      const pinSlots = { ...state.pinSlots };
      delete pinSlots[name];
      setState({ pins: pins.filter((p) => p !== name), pinSlots });
      return 'unpinned';
    }
    if (pins.length >= MAX_PINS) return 'full';
    const used = new Set(Object.values(state.pinSlots));
    let slot = 0;
    while (used.has(slot)) slot++;
    setState({ pins: [...pins, name], pinSlots: { ...state.pinSlots, [name]: slot } });
    return 'pinned';
  },
  clearPins() {
    setState({ pins: [], pinSlots: {} });
  },
  reset() {
    setState({ ...defaults(), hovered: null });
  },
};

// ---------------------------------------------------------------- URL hash
// #s=Assam&p=Bihar:0|Assam:1&m=growth&from=2019-01&to=2024-05&gap=aligned&hf=1&split=fy_file&tm=count&rs=last12&fm=share
const ENUMS = {
  m: ['growth', 'period', 'share'],
  gap: ['aligned', 'current'],
  split: ['fy_file', 'category_fuel'],
  tm: ['count', 'share'],
  rs: ['last12', 'full'],
  fm: ['count', 'share'],
} as const;

export function hashFor(s: AppState): string {
  const d = defaults();
  const q = new URLSearchParams();
  if (s.selected) q.set('s', s.selected);
  // pins are written in slot order so a shared link reproduces the same colours and shapes
  if (s.pins.length) q.set('p', [...s.pins].sort((a, b) => s.pinSlots[a] - s.pinSlots[b]).map((p) => `${p}:${s.pinSlots[p]}`).join('|'));
  if (s.metric !== d.metric) q.set('m', s.metric);
  if (s.period[0] !== d.period[0]) q.set('from', s.period[0]);
  if (s.period[1] !== d.period[1]) q.set('to', s.period[1]);
  if (s.gapSource !== d.gapSource) q.set('gap', s.gapSource);
  if (s.hideFlagged) q.set('hf', '1');
  if (s.split !== d.split) q.set('split', s.split);
  if (s.trendMode !== d.trendMode) q.set('tm', s.trendMode);
  if (s.rtoSort !== d.rtoSort) q.set('rs', s.rtoSort);
  if (s.fyMode !== d.fyMode) q.set('fm', s.fyMode);
  // keep the separators readable in shared links: #s=Assam&p=Bihar:0|Assam:1
  const str = q.toString().replace(/%3A/gi, ':').replace(/%7C/gi, '|');
  return str ? `#${str}` : '';
}

let writing = false;
function writeHash() {
  const h = hashFor(state);
  if (h === window.location.hash || (h === '' && window.location.hash === '')) return;
  writing = true;
  history.replaceState(null, '', h ? h : window.location.pathname + window.location.search);
  writing = false;
}

function pick<T extends string>(v: string | null, allowed: readonly T[], fallback: T): T {
  return v && (allowed as readonly string[]).includes(v) ? (v as T) : fallback;
}

function parseHash(): Partial<AppState> {
  const q = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const d = defaults();
  const okMonth = (m: string | null) => (m && /^\d{4}-\d{2}$/.test(m) && m >= bounds[0] && m <= bounds[1] ? m : null);
  let from = okMonth(q.get('from')) ?? d.period[0];
  let to = okMonth(q.get('to')) ?? d.period[1];
  if (from > to) [from, to] = [to, from];
  const sel = q.get('s');
  const pinSlots: Record<string, number> = {};
  const usedSlots = new Set<number>();
  for (const token of (q.get('p') ?? '').split('|')) {
    const [name, slotStr] = token.split(':');
    const slot = Number(slotStr);
    if (!validStates.has(name) || name in pinSlots || Object.keys(pinSlots).length >= MAX_PINS) continue;
    const ok = Number.isInteger(slot) && slot >= 0 && slot < MAX_PINS && !usedSlots.has(slot);
    let s = ok ? slot : 0;
    while (usedSlots.has(s)) s++;
    pinSlots[name] = s;
    usedSlots.add(s);
  }
  return {
    selected: sel && validStates.has(sel) ? sel : null,
    pins: Object.keys(pinSlots),
    pinSlots,
    metric: pick(q.get('m'), ENUMS.m, d.metric),
    period: [from, to],
    gapSource: pick(q.get('gap'), ENUMS.gap, d.gapSource),
    hideFlagged: q.get('hf') === '1',
    split: pick(q.get('split'), ENUMS.split, d.split),
    trendMode: pick(q.get('tm'), ENUMS.tm, d.trendMode),
    rtoSort: pick(q.get('rs'), ENUMS.rs, d.rtoSort),
    fyMode: pick(q.get('fm'), ENUMS.fm, d.fyMode),
  };
}

/** Called once data has loaded, so the hash can be validated against real states and months. */
export function initFromHash(periodBounds: [string, string], states: string[]) {
  bounds = periodBounds;
  validStates = new Set(states);
  state = { ...state, ...defaults(), ...parseHash() };
  listeners.forEach((l) => l());
  window.addEventListener('hashchange', () => {
    if (writing) return;
    state = { ...state, ...parseHash() };
    listeners.forEach((l) => l());
  });
}

export function periodBounds() {
  return bounds;
}
