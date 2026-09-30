// Loads every JSON file produced by `npm run data` and derives period-based figures.
// Nothing here estimates or fills in a value: missing stays null.
import { createContext, useContext } from 'react';
import type { Dataset, Group, MixRow, StateSummary } from '../types';
import { GROUPS } from '../types';

const FILES = {
  summary: 'state_summary.json',
  national: 'national_summary.json',
  stateMonth: 'state_month.json',
  rto: 'rto.json',
  mix: 'fleet_mix.json',
  fy: 'national_fy_by_group.json',
  split: 'national_ev_split.json',
  stats: 'cleaning_stats.json',
  fyCompare: 'fy_file_vs_vahan.json',
  meta: 'source_meta.json',
  geo: 'india_states.json',
} as const;

export class LoadError extends Error {
  constructor(public file: string, detail: string) {
    super(`${file}: ${detail}`);
  }
}

export async function loadDataset(): Promise<Dataset> {
  const base = `${import.meta.env.BASE_URL}data/`;
  const entries = await Promise.all(
    Object.entries(FILES).map(async ([key, file]) => {
      let res: Response;
      try {
        res = await fetch(base + file);
      } catch (e) {
        throw new LoadError(file, 'network error');
      }
      if (!res.ok) throw new LoadError(file, `HTTP ${res.status}`);
      try {
        return [key, await res.json()] as const;
      } catch {
        throw new LoadError(file, 'not valid JSON');
      }
    }),
  );
  return Object.fromEntries(entries) as unknown as Dataset;
}

export const DataContext = createContext<Dataset | null>(null);

export function useData(): Dataset {
  const d = useContext(DataContext);
  if (!d) throw new Error('useData outside provider');
  return d;
}

// ------------------------------------------------------------------ derivations
export function summaryOf(d: Dataset, name: string): StateSummary | undefined {
  return d.summary.find((r) => r.state_name === name);
}

/** Uses data_flags (all flags), so small base still shows for states whose primary flag is another caveat (e.g. Ladakh, Mizoram). */
export function isSmallBase(_d: Dataset, r: StateSummary): boolean {
  return r.data_flags.includes('small_base');
}

export function hasGranular(d: Dataset, name: string): boolean {
  return name in d.stateMonth.ev;
}

function idx(d: Dataset, ym: string) {
  return d.stateMonth.months.indexOf(ym);
}

/** Chargeable EVs registered in [from, to]. state=null -> all states. null when the state has no granular data. */
export function evInPeriod(d: Dataset, state: string | null, from: string, to: string): number | null {
  const a = idx(d, from);
  const b = idx(d, to);
  if (a < 0 || b < 0) return null;
  const states = state ? [state] : d.stateMonth.states;
  if (state && !hasGranular(d, state)) return null;
  let sum = 0;
  for (const s of states) {
    const arr = d.stateMonth.ev[s];
    for (let i = a; i <= b; i++) sum += arr[i] ?? 0; // a missing state-month is absent from the source file
  }
  return sum;
}

export interface SeriesPoint { month: string; value: number | null }

/** Monthly chargeable EVs (count) or EV share of all registrations (%). state=null -> All India. */
export function monthlySeries(d: Dataset, state: string | null, mode: 'count' | 'share'): SeriesPoint[] | null {
  if (state && !hasGranular(d, state)) return null;
  const states = state ? [state] : d.stateMonth.states;
  return d.stateMonth.months.map((m, i) => {
    let ev = 0;
    let tot = 0;
    let any = false;
    for (const s of states) {
      const e = d.stateMonth.ev[s][i];
      const t = d.stateMonth.total[s][i];
      if (e !== null) { ev += e; any = true; }
      if (t !== null) tot += t;
    }
    if (!any) return { month: m, value: null };
    if (mode === 'count') return { month: m, value: ev };
    return { month: m, value: tot > 0 ? (ev / tot) * 100 : null };
  });
}

export type MixShares = Record<Group, number | null>;

export function mixOf(d: Dataset, name: string): { shares: MixShares; total: number } | null {
  const rows: MixRow[] = d.mix.filter((r) => r.state_name === name);
  if (!rows.length) return null;
  // shares computed from raw counts (not the CSV's rounded share_pct) so the page rounds only once
  const total = rows.reduce((a, r) => a + r.registrations, 0);
  const shares = Object.fromEntries(
    GROUPS.map((g) => {
      const r = rows.find((x) => x.group === g);
      return [g, r && total > 0 ? (r.registrations / total) * 100 : null];
    }),
  ) as MixShares;
  return { shares, total };
}

export function splitOf(d: Dataset, source: 'fy_file' | 'category_fuel') {
  const rows = d.split.filter((r) => r.source === source);
  const total = rows.reduce((a, r) => a + r.ev, 0);
  return {
    window: rows[0]?.window ?? '',
    total,
    shares: Object.fromEntries(GROUPS.map((g) => {
      const r = rows.find((x) => x.group === g);
      return [g, r && total > 0 ? (r.ev / total) * 100 : null];
    })) as MixShares,
  };
}

export function allStateNames(d: Dataset): string[] {
  return d.summary.map((r) => r.state_name).sort((a, b) => a.localeCompare(b));
}
