// npm run verify   (run `npm run build` first)
// 1. Serves dist/ with `vite preview`.
// 2. Recomputes the KPI values for All India, Maharashtra, Assam and Telangana straight from
//    data/cleaned/*.csv (independently of the app's JSON and code), reads the rendered KPI tiles,
//    and asserts they match, including the en-IN formatting of the text.
// 3. Checks that a failed data file shows the error state instead of a partial page.
// 4. Saves light/dark screenshots at 1312 px and 390 px to screenshots/, plus a 1312 px view with a state selected and two pins.
import { spawn } from 'node:child_process';
import { readFileSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { csvParse } from 'd3-dsv';
import { chromium } from 'playwright';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 4173;
const BASE = `http://localhost:${PORT}/`;
const SHOTS = join(ROOT, 'screenshots');
mkdirSync(SHOTS, { recursive: true });

// ------------------------------------------------------------------ expected values from CSVs
const csv = (f) => csvParse(readFileSync(join(ROOT, 'data', 'cleaned', f), 'utf8'));
const sm = csv('state_month_ev_demand.csv');
const chargersCsv = csv('charging_stations_by_state.csv');
const meta = Object.fromEntries(csv('source_meta.csv').map((r) => [r.key, r.value]));
const inWin = (d, a, b) => d.slice(0, 7) >= a && d.slice(0, 7) <= b;

const chargers = Object.fromEntries(chargersCsv.map((r) => [r.state_name, Number(r.operational_public_chargers)]));
const granularStates = [...new Set(sm.map((r) => r.state_name))];
const evSum = (states, a = meta.granular_from, b = meta.granular_to) =>
  sm.filter((r) => states.includes(r.state_name) && inWin(r.date, a, b)).reduce((s, r) => s + Number(r.chargeable_ev_registrations), 0);

function expected(state) {
  const states = state ? [state] : granularStates;
  const hasGranular = !state || granularStates.includes(state);
  const evPeriod = hasGranular ? evSum(states) : null;
  const last = hasGranular ? evSum(states, meta.last12_from, meta.last12_to) : null;
  const prior = hasGranular ? evSum(states, meta.prior12_from, meta.prior12_to) : null;
  const growth = hasGranular && prior ? ((last - prior) / prior) * 100 : null;
  const ch = state ? chargers[state] ?? null : Object.values(chargers).reduce((a, b) => a + b, 0);
  // EVs per charger: for India, only states with both a demand figure and a charger count
  const both = granularStates.filter((s) => chargers[s]);
  const epcOf = (s) => evSum([s]) / chargers[s];
  const epc = state
    ? hasGranular && ch ? evSum([state]) / ch : null
    : evSum(both) / both.reduce((a, s) => a + chargers[s], 0);
  const ranking = both.map((s) => [s, epcOf(s)]).sort((a, b) => b[1] - a[1]).map(([s]) => s);
  const rank = state && ranking.includes(state) ? ranking.indexOf(state) + 1 : null;
  return { evPeriod, growth, chargers: ch, epc, rank };
}

const inr = (n) => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(Math.round(n));
const dec1 = (n) => new Intl.NumberFormat('en-IN', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(n);
const pctSigned = (n) => `${n < 0 ? '−' : n > 0 ? '+' : ''}${dec1(Math.abs(n))}%`;

// ------------------------------------------------------------------ server
function startPreview() {
  return new Promise((resolve, reject) => {
    const p = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] });
    const t = setTimeout(() => reject(new Error('vite preview did not start')), 20000);
    const onData = (b) => {
      if (String(b).includes(String(PORT))) { clearTimeout(t); resolve(p); }
    };
    p.stdout.on('data', onData);
    p.stderr.on('data', (b) => process.stderr.write(b));
  });
}

async function launch() {
  try {
    return await chromium.launch({ channel: 'chrome' });
  } catch {
    return await chromium.launch();
  }
}

// ------------------------------------------------------------------ run
const results = [];
let failures = 0;
function check(label, ok, detail) {
  results.push({ label, ok, detail });
  if (!ok) failures++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}  ${detail}`);
}

// ------------------------------------------------------------------ build contents
// Only cleaned outputs + cleaning_log.md may be published. List every dist/ file over 1 MB and make
// sure no raw source file (data/original/: the 63 MB granular CSV, PDFs, etc.) was copied in.
const walk = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)]));
const distFiles = walk(join(ROOT, 'dist'));
const big = distFiles.map((f) => [f.slice(ROOT.length + 1), statSync(f).size]).filter(([, size]) => size > 1024 * 1024);
console.log(`dist/: ${distFiles.length} files, ${(distFiles.reduce((a, f) => a + statSync(f).size, 0) / 1024 / 1024).toFixed(2)} MB total`);
console.log(`dist/ files over 1 MB: ${big.length ? big.map(([f, sz]) => `${f} (${(sz / 1024 / 1024).toFixed(2)} MB)`).join(', ') : 'none'}`);
const rawNames = new Set(readdirSync(join(ROOT, 'data', 'original')));
const leaked = distFiles.filter((f) => rawNames.has(f.split('/').pop()) || /\.pdf$/i.test(f));
check('No raw source files or PDFs in dist/', leaked.length === 0, leaked.join(', ') || 'none');
check('No dist/ file over 1 MB', big.length === 0, big.map(([f]) => f).join(', ') || 'none');

const server = await startPreview();
const browser = await launch();
try {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  const consoleErrors = [];
  page.on('console', (m) => m.type() === 'error' && consoleErrors.push(m.text()));

  // the four required states, plus Ladakh (no charger count) and Lakshadweep (no RTO data) as edge cases
  for (const state of [null, 'Maharashtra', 'Assam', 'Telangana', 'Ladakh', 'Lakshadweep']) {
    const name = state ?? 'All India';
    const hash = state ? `#s=${encodeURIComponent(state)}` : '';
    await page.goto(BASE + hash);
    await page.waitForSelector('[data-testid="kpi-ev-period"]');
    await page.waitForTimeout(300);
    const read = async (id) => page.$eval(`[data-testid="${id}"]`, (el) => ({ value: el.getAttribute('data-value'), text: el.textContent.trim() }));
    const exp = expected(state);
    const tiles = {
      ev: await read('kpi-ev-period'),
      growth: await read('kpi-growth'),
      chargers: await read('kpi-chargers'),
      epc: await read('kpi-epc'),
      rank: await read('kpi-rank'),
    };
    const num = (v) => (v === '' || v === null ? null : Number(v));
    const close = (a, b, tol) => (a === null && b === null) || (a !== null && b !== null && Math.abs(a - b) <= tol);

    check(`${name}: EVs registered (full period)`, close(num(tiles.ev.value), exp.evPeriod, 0) && (exp.evPeriod === null || tiles.ev.text === inr(exp.evPeriod)),
      `rendered "${tiles.ev.text}" vs CSV ${exp.evPeriod === null ? 'missing' : inr(exp.evPeriod)}`);
    check(`${name}: growth last 12m vs prior`, close(num(tiles.growth.value), exp.growth === null ? null : Number(exp.growth.toFixed(2)), 0.01) && (exp.growth === null || tiles.growth.text === pctSigned(exp.growth)),
      `rendered "${tiles.growth.text}" vs CSV ${exp.growth === null ? 'missing' : pctSigned(exp.growth)}`);
    check(`${name}: public chargers`, close(num(tiles.chargers.value), exp.chargers, 0) && (exp.chargers === null || tiles.chargers.text === inr(exp.chargers)),
      `rendered "${tiles.chargers.text}" vs CSV ${exp.chargers === null ? 'missing' : inr(exp.chargers)}`);
    check(`${name}: EVs per charger`, close(num(tiles.epc.value), exp.epc === null ? null : Number(exp.epc.toFixed(2)), 0.01) && (exp.epc === null || tiles.epc.text === dec1(exp.epc)),
      `rendered "${tiles.epc.text}" vs CSV ${exp.epc === null ? 'missing' : dec1(exp.epc)}`);
    check(`${name}: national rank`, close(num(tiles.rank.value), exp.rank, 0),
      `rendered "${tiles.rank.text}" vs CSV ${exp.rank === null ? 'n/a' : '#' + exp.rank}`);
    if (state === 'Telangana') {
      check('Telangana: EVs tile says reporting gap, not zero', /No RTO-level registration data/.test(tiles.ev.text) && !/^0$/.test(tiles.ev.text), `"${tiles.ev.text.slice(0, 70)}…"`);
      const trend = await page.textContent('.view2');
      check('Telangana: trend shows the reporting-gap message', /This is a reporting gap, not zero demand/.test(trend), '');
    }
  }

  // period slider affects the period KPI only
  await page.goto(BASE + '#s=Maharashtra&from=2023-06&to=2024-05');
  await page.waitForSelector('[data-testid="kpi-ev-period"]');
  await page.waitForTimeout(300);
  const l12 = await page.$eval('[data-testid="kpi-ev-period"]', (el) => el.getAttribute('data-value'));
  const expL12 = evSum(['Maharashtra'], meta.last12_from, meta.last12_to);
  check('Maharashtra: EVs in period Jun 2023 to May 2024 from the URL', Number(l12) === expL12, `rendered ${l12} vs CSV ${expL12}`);
  const epcAfter = await page.$eval('[data-testid="kpi-epc"]', (el) => el.getAttribute('data-value'));
  check('Maharashtra: EVs per charger unchanged by the period', Math.abs(Number(epcAfter) - expected('Maharashtra').epc) < 0.01, `rendered ${epcAfter}`);

  // View 1 headline growth: chargeable EVs FY2020 (Apr 2019-Mar 2020) to FY2024 (Apr 2023-Mar 2024), from the monthly CSV
  await page.goto(BASE + '#');
  await page.waitForSelector('[data-testid="v1-vahan-growth"]');
  const fyA = evSum(granularStates, '2019-04', '2020-03');
  const fyB = evSum(granularStates, '2023-04', '2024-03');
  const expGrowth = ((fyB - fyA) / fyA) * 100;
  const shownGrowth = (await page.textContent('[data-testid="v1-vahan-growth"]')).trim();
  const fmt0 = `${expGrowth < 0 ? '−' : '+'}${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(Math.abs(expGrowth))}%`;
  check('View 1: Vahan FY2020 to FY2024 growth', shownGrowth === fmt0, `rendered "${shownGrowth}" vs CSV ${fmt0} (${inr(fyA)} -> ${inr(fyB)})`);

  // every applicable flag is shown for a state, not just the primary one
  await page.goto(BASE + '#s=Ladakh');
  await page.waitForSelector('[data-testid="state-flags"]');
  const flagText = await page.textContent('[data-testid="state-flags"]');
  check('Ladakh: detail shows all flags (no charger count + small base)', /No charger count/.test(flagText) && /Small base/.test(flagText), flagText.slice(0, 90));

  check('No console errors during KPI checks', consoleErrors.length === 0, consoleErrors.join(' | '));

  // error state
  const errPage = await ctx.newPage();
  await errPage.route('**/data/state_summary.json', (r) => r.fulfill({ status: 404, body: 'missing' }));
  await errPage.goto(BASE);
  const alert = await errPage.waitForSelector('[role="alert"]', { timeout: 5000 }).then((el) => el.textContent()).catch(() => '');
  check('Error state shown when a data file fails to load', /could not load/.test(alert) && /state_summary\.json/.test(alert), alert.slice(0, 80));
  await errPage.close();
  await ctx.close();

  // screenshots
  for (const theme of ['light', 'dark']) {
    for (const width of [1312, 390]) {
      const c = await browser.newContext({ viewport: { width, height: width === 1312 ? 900 : 844 }, colorScheme: theme, reducedMotion: 'reduce', deviceScaleFactor: 1 }); // 1x: at 2x a full phone page exceeds Chrome's 16,384 px capture limit and tiles
      await c.addInitScript((t) => { try { localStorage.setItem('evdash-theme', t); } catch {} }, theme);
      const p = await c.newPage();
      // full page without pins: the fixed shortlist tray would otherwise land mid-image
      await p.goto(BASE + '#s=Maharashtra');
      await p.waitForSelector('[data-testid="kpi-ev-period"]');
      await p.waitForTimeout(800);
      const file = `dashboard-${theme}-${width}.png`;
      await p.screenshot({ path: join(SHOTS, file), fullPage: true });
      if (width === 1312) {
        // viewport shot with pins, showing the map, trend and shortlist tray together
        await p.goto(BASE + '#s=Maharashtra&p=Bihar:0|Assam:1');
        await p.waitForTimeout(600);
        await p.evaluate(() => { const el = document.querySelector('.view2'); window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 140); });
        await p.waitForTimeout(400);
        await p.screenshot({ path: join(SHOTS, `pinned-${theme}-1312.png`) });
        // the rendered map on its own (default view, nothing dimmed), to check the external boundary
        await p.goto(BASE);
        await p.waitForTimeout(600);
        const map = p.locator('.view2 .chart svg').first();
        await map.scrollIntoViewIfNeeded();
        await map.screenshot({ path: join(SHOTS, `map-boundary-${theme}.png`) });
        const attribution = await p.textContent('[data-testid="map-attribution"]');
        check(`Map attribution visible (${theme})`, /DataMeet/.test(attribution) && /CC BY 4\.0/.test(attribution) && /2026-09-30/.test(attribution), attribution.slice(0, 60));
      }
      const actualTheme = await p.evaluate(() => document.documentElement.dataset.theme);
      check(`Screenshot ${file}`, actualTheme === theme, `theme=${actualTheme}`);
      const overflow = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      check(`No horizontal scroll at ${width}px (${theme})`, overflow <= 0, `overflow ${overflow}px`);
      await c.close();
    }
  }
} finally {
  await browser.close();
  server.kill();
}

console.log(`\n${results.length - failures}/${results.length} checks passed.`);
process.exit(failures ? 1 : 0);
