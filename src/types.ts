export type Group = '2W' | '3W' | 'Cars/LMV' | 'Commercial' | 'Other';
export const GROUPS: Group[] = ['2W', '3W', 'Cars/LMV', 'Commercial', 'Other'];

export type DataFlag = 'ok' | 'no_granular_demand' | 'no_charger_data' | 'small_base';

export interface StateSummary {
  state_name: string;
  ev_cum_aligned: number | null;
  ev_cum_2019_2026: number | null;
  ev_last12m: number | null;
  ev_prior12m: number | null;
  growth_pct: number | null;
  ev_share_last12m_pct: number | null;
  public_chargers: number | null;
  ev_per_charger_aligned: number | null;
  ev_per_charger_2019_2026: number | null;
  rank_aligned: number | null;
  rank_2019_2026: number | null;
  /** primary flag, used for colour and hatching */
  data_flag: DataFlag;
  /** every flag that applies (empty = ok) */
  data_flags: Exclude<DataFlag, 'ok'>[];
}

export interface NationalSummary extends Omit<StateSummary, 'data_flag' | 'data_flags' | 'rank_aligned' | 'rank_2019_2026'> {
  states_in_epc_aligned: number;
  states_in_epc_2019_2026: number;
  epc_aligned_excludes: string[];
  epc_2019_2026_excludes: string[];
  states_ranked: number;
}

export interface StateMonth {
  months: string[];
  states: string[];
  ev: Record<string, (number | null)[]>;
  total: Record<string, (number | null)[]>;
}

export interface RtoRow { state_name: string; office_name: string; office_code: string; total: number; last12m: number }
export interface MixRow { state_name: string; group: Group; registrations: number; share_pct: number | null }
export interface FyRow { fy: string; group: Group; ev: number }
export interface SplitRow { source: 'fy_file' | 'category_fuel'; window: string; group: Group; ev: number; share_pct: number }
export interface CleaningStat {
  file: string; rule: 'v2' | 'v3'; blocks_dropped: number; rows_dropped: number;
  pct_rows: number; pct_naive_volume: number; source_rows: number; kept_rows: number;
}
export interface SourceMeta {
  granular_from: string; granular_to: string; last12_from: string; last12_to: string;
  prior12_from: string; prior12_to: string; small_base_threshold: string;
  fuel_state_title: string; fuel_state_end_month: string;
  category_fuel_title: string; category_fuel_end_month: string;
  fy_first: string; fy_last: string;
  excluded_office: string; excluded_office_months: string; excluded_office_ev_removed: string; excluded_office_ev_all: string;
  generated: string;
}

export interface FyCompare { fy: string; fy_file_ev: number; vahan_ev: number; ratio: number }

export interface Dataset {
  summary: StateSummary[];
  national: NationalSummary;
  stateMonth: StateMonth;
  rto: RtoRow[];
  mix: MixRow[];
  fy: FyRow[];
  split: SplitRow[];
  stats: CleaningStat[];
  fyCompare: FyCompare[];
  meta: SourceMeta;
  geo: GeoJSON.FeatureCollection<GeoJSON.Geometry, { name: string }>;
}
