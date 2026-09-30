// npm run signals
// Prints which station-type signal rule every state lands in, using the SAME rules the page uses
// (src/content.ts). Shares are computed from data/cleaned/state_fleet_mix.csv registrations; the
// national shares are that file's computed "All India" rows.
import { readFileSync } from 'node:fs';
import { csvParse } from 'd3-dsv';
import { stationSignal, SIGNAL_RATIO_THRESHOLD } from '../src/content';
import { GROUPS, type Group } from '../src/types';

const rows = csvParse(readFileSync('data/cleaned/state_fleet_mix.csv', 'utf8'));
const summary = csvParse(readFileSync('data/cleaned/state_summary.csv', 'utf8'));

function sharesOf(state: string): Record<Group, number> | null {
  const rs = rows.filter((r) => r.state_name === state);
  const total = rs.reduce((a, r) => a + Number(r.registrations), 0);
  if (!rs.length || total === 0) return null;
  return Object.fromEntries(GROUPS.map((g) => [g, (Number(rs.find((r) => r.group === g)?.registrations ?? 0) / total) * 100])) as Record<Group, number>;
}

const india = sharesOf('All India')!;
const pct = (v: number | null) => (v === null ? '—' : `${v.toFixed(1)}%`);
const x = (v: number | null) => (v === null ? '—' : `${v.toFixed(2)}x`);
console.log(`National whole-fleet shares (All India rows): 3W ${pct(india['3W'])}, Cars/LMV ${pct(india['Cars/LMV'])}, 2W ${pct(india['2W'])}`);
console.log(`Threshold: ratio >= ${SIGNAL_RATIO_THRESHOLD}\n`);

const out = summary.map((r) => {
  const s = sharesOf(r.state_name!);
  const res = stationSignal({ state: r.state_name!, s, india });
  return { state: r.state_name!, rule: res.rule.id, s3: s?.['3W'] ?? null, r3: res.ratio3w, sc: s?.['Cars/LMV'] ?? null, rc: res.ratioCar };
});
console.log('State'.padEnd(42) + 'Rule'.padEnd(10) + '3W share'.padStart(9) + '3W ratio'.padStart(10) + 'Car share'.padStart(11) + 'Car ratio'.padStart(11));
for (const o of out) {
  console.log(o.state.padEnd(42) + o.rule.padEnd(10) + pct(o.s3).padStart(9) + x(o.r3).padStart(10) + pct(o.sc).padStart(11) + x(o.rc).padStart(11));
}
const counts: Record<string, number> = {};
for (const o of out) counts[o.rule] = (counts[o.rule] ?? 0) + 1;
console.log('\n' + Object.entries(counts).map(([k, v]) => `${k}: ${v}`).join(', '));
