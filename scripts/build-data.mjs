// npm run data
// Converts every cleaned CSV in data/cleaned/ to JSON in public/data/, copies the
// cleaned CSVs + cleaning_log.md to public/data/downloads/ for users, and writes the
// India GeoJSON. Fails if any state name in the data does not match the GeoJSON exactly.
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { csvParse } from 'd3-dsv';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CLEANED = join(ROOT, 'data', 'cleaned');
const OUT = join(ROOT, 'public', 'data');
const DL = join(OUT, 'downloads');
mkdirSync(DL, { recursive: true });

const read = (f) => csvParse(readFileSync(join(CLEANED, f), 'utf8'));
// Blank cells stay null (missing), never 0.
const num = (v) => (v === undefined || v === null || v.trim() === '' ? null : Number(v));
const write = (name, obj) => {
  writeFileSync(join(OUT, name), JSON.stringify(obj));
  console.log(`wrote public/data/${name}`);
};

// --- GeoJSON: DataMeet States/Admin2, two recorded renames (see public/data/geo_SOURCE.md)
const GEO_RENAMES = {
  'Andaman & Nicobar': 'Andaman & Nicobar Islands',
  'Jammu & Kashmir': 'Jammu and Kashmir',
};
const geo = JSON.parse(readFileSync(join(ROOT, 'data', 'geo', 'datameet_states_admin2_simplified.geojson'), 'utf8'));
for (const f of geo.features) {
  const raw = f.properties.ST_NM;
  f.properties = { name: GEO_RENAMES[raw] ?? raw };
}
// d3-geo expects exterior rings clockwise (the reverse of RFC 7946, which mapshaper writes).
// Reverse any polygon whose exterior ring is counter-clockwise, otherwise d3 fills the whole globe.
const signedArea = (ring) => ring.reduce((a, [x1, y1], i) => {
  const [x2, y2] = ring[(i + 1) % ring.length];
  return a + (x1 * y2 - x2 * y1);
}, 0) / 2;
const fixPolygon = (poly) => (signedArea(poly[0]) > 0 ? poly.map((r) => [...r].reverse()) : poly);
let rewound = 0;
for (const f of geo.features) {
  const g = f.geometry;
  if (g.type === 'Polygon') { const p = fixPolygon(g.coordinates); if (p !== g.coordinates) rewound++; g.coordinates = p; }
  if (g.type === 'MultiPolygon') g.coordinates = g.coordinates.map((poly) => { const p = fixPolygon(poly); if (p !== poly) rewound++; return p; });
}
console.log(`GeoJSON: ${rewound} polygons rewound to clockwise for d3-geo`);
const geoNames = new Set(geo.features.map((f) => f.properties.name));
// written as .json, not .geojson: static servers (vite preview, most CDNs) only gzip common types,
// and application/geo+json is not one of them (276 KB raw vs 86 KB gzipped)
write('india_states.json', geo);

// --- state summary
const summaryCols = ['ev_cum_aligned', 'ev_cum_2019_2026', 'ev_last12m', 'ev_prior12m', 'growth_pct',
  'ev_share_last12m_pct', 'public_chargers', 'ev_per_charger_aligned', 'ev_per_charger_2019_2026',
  'rank_aligned', 'rank_2019_2026'];
const summary = read('state_summary.csv').map((r) => {
  // data_flag = primary flag (colour/hatching); data_flags = every flag that applies
  const o = { state_name: r.state_name, data_flag: r.data_flag, data_flags: r.data_flags === 'ok' ? [] : r.data_flags.split('|') };
  for (const c of summaryCols) o[c] = num(r[c]);
  return o;
});
write('state_summary.json', summary);

const natRaw = read('national_summary.csv')[0];
const national = { ...natRaw };
for (const c of [...summaryCols.filter((c) => !c.startsWith('rank')), 'states_in_epc_aligned', 'states_in_epc_2019_2026', 'states_ranked'])
  national[c] = num(natRaw[c]);
national.epc_aligned_excludes = natRaw.epc_aligned_excludes ? natRaw.epc_aligned_excludes.split('; ') : [];
national.epc_2019_2026_excludes = natRaw.epc_2019_2026_excludes ? natRaw.epc_2019_2026_excludes.split('; ') : [];
write('national_summary.json', national);

// --- state x month, compact
const sm = read('state_month_ev_demand.csv');
const months = [...new Set(sm.map((r) => r.date.slice(0, 7)))].sort();
const smStates = [...new Set(sm.map((r) => r.state_name))].sort();
const ev = {}, total = {};
for (const s of smStates) { ev[s] = months.map(() => null); total[s] = months.map(() => null); }
for (const r of sm) {
  const i = months.indexOf(r.date.slice(0, 7));
  ev[r.state_name][i] = num(r.chargeable_ev_registrations);
  total[r.state_name][i] = num(r.total_registrations);
}
write('state_month.json', { months, states: smStates, ev, total });

write('rto.json', read('rto_ev_demand_cumulative.csv').map((r) => ({
  state_name: r.state_name, office_name: r.office_name, office_code: r.office_code,
  total: num(r.chargeable_ev_registrations_total), last12m: num(r.chargeable_ev_registrations_last12m),
})));

write('fleet_mix.json', read('state_fleet_mix.csv').map((r) => ({
  state_name: r.state_name, group: r.group, registrations: num(r.registrations), share_pct: num(r.share_pct),
})));

write('national_fy_by_group.json', read('national_fy_ev_by_group.csv').map((r) => ({
  fy: r.fy, group: r.group, ev: num(r.ev_registrations),
})));

write('national_ev_split.json', read('national_ev_split.csv').map((r) => ({
  source: r.source, window: r.window, group: r.group, ev: num(r.ev_registrations), share_pct: num(r.share_pct),
})));

write('cleaning_stats.json', read('cleaning_stats.csv').map((r) => ({
  file: r.file, rule: r.rule, blocks_dropped: num(r.blocks_dropped), rows_dropped: num(r.rows_dropped),
  pct_rows: num(r.pct_rows), pct_naive_volume: num(r.pct_naive_volume), source_rows: num(r.source_rows),
  kept_rows: num(r.kept_rows),
})));

write('fy_file_vs_vahan.json', read('fy_file_vs_vahan.csv').map((r) => ({
  fy: r.fy, fy_file_ev: num(r.fy_file_ev), vahan_ev: num(r.vahan_chargeable_ev), ratio: num(r.ratio_fy_file_to_vahan),
})));

const meta = Object.fromEntries(read('source_meta.csv').map((r) => [r.key, r.value]));
meta.generated = new Date().toLocaleDateString('en-CA'); // local YYYY-MM-DD
write('source_meta.json', meta);

write('chargers.json', read('charging_stations_by_state.csv').map((r) => ({
  state_name: r.state_name, chargers: num(r.operational_public_chargers),
})));

// --- downloads for users
// Only cleaned outputs and the cleaning log are downloadable. Raw source files (data/original/,
// including the 63 MB granular CSV and the PDFs) are never copied into public/ or the build.
const downloads = readdirSync(CLEANED).filter((f) => f.endsWith('.csv') || f === 'cleaning_log.md');
const rawNames = new Set(readdirSync(join(ROOT, 'data', 'original')));
const leaked = downloads.filter((f) => rawNames.has(f));
if (leaked.length) { console.error(`FAIL: raw source files would be published: ${leaked.join(', ')}`); process.exit(1); }
for (const f of downloads) copyFileSync(join(CLEANED, f), join(DL, f));
console.log(`copied ${downloads.length} files to public/data/downloads/`);

// --- exact name check against the GeoJSON
const dataNames = new Set([
  ...summary.map((r) => r.state_name),
  ...smStates,
  ...read('state_fleet_mix.csv').map((r) => r.state_name).filter((s) => s !== 'All India'),
  ...read('charging_stations_by_state.csv').map((r) => r.state_name),
  ...read('rto_ev_demand_cumulative.csv').map((r) => r.state_name),
]);
const unmatchedData = [...dataNames].filter((s) => !geoNames.has(s)).sort();
const unmatchedGeo = [...geoNames].filter((s) => !dataNames.has(s)).sort();
console.log(`\nState names in data: ${dataNames.size}; GeoJSON features: ${geoNames.size}`);
console.log(`Data names not in GeoJSON: ${unmatchedData.length ? unmatchedData.join(', ') : 'none'}`);
console.log(`GeoJSON names with no data: ${unmatchedGeo.length ? unmatchedGeo.join(', ') : 'none'}`);
if (unmatchedData.length || unmatchedGeo.length) {
  console.error('FAIL: state names do not match the GeoJSON exactly.');
  process.exit(1);
}
console.log('OK: every state name matches the GeoJSON exactly.');
