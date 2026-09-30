import { useEffect, useMemo, useRef } from 'react';
import * as d3 from 'd3';
import { AnimatePresence, motion } from 'framer-motion';
import { flags, v2, whereFrom } from '../content';
import { evInPeriod, isSmallBase, monthlySeries, summaryOf, useData, type SeriesPoint } from '../lib/data';
import { PIN_COLOR, PIN_DASH, SEQ_BINS, SEQ_VAR, symbolPath } from '../lib/encodings';
import { fmtCompact, fmtDec, fmtInt, fmtMonth, fmtPct, fmtRange } from '../lib/format';
import { actions, setState, useStore, type MapMetric } from '../lib/store';
import type { Dataset } from '../types';
import { Card, flagLabels, Segmented, useWidth, usePrefersReducedMotion } from '../components/ui';
import { hideTip, showTip } from '../components/overlay';
import { dur, ease } from '../lib/motion';

// ------------------------------------------------------------------ values
function metricValue(d: Dataset, name: string, metric: MapMetric, period: [string, string]): number | null {
  const r = summaryOf(d, name);
  if (!r) return null;
  if (metric === 'growth') return r.growth_pct;
  if (metric === 'share') return r.ev_share_last12m_pct;
  return evInPeriod(d, name, period[0], period[1]);
}

function fmtMetric(metric: MapMetric, v: number | null) {
  if (metric === 'growth') return fmtPct(v, 1, true);
  if (metric === 'share') return fmtPct(v, 2);
  return fmtInt(v);
}
function fmtMetricShort(metric: MapMetric, v: number) {
  if (metric === 'growth') return v === 0 ? '0%' : fmtPct(v, 0, true);
  if (metric === 'share') return fmtPct(v, 0);
  return v === 0 ? '0' : fmtCompact(v);
}

/**
 * Five equal, closed bins for every metric, so every interval on the key is the same size.
 * They start at a round number at or below the smallest value and end at or above the largest, with a round
 * width (1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6 or 8 × a power of ten): the smallest such width that covers the range.
 * "EVs registered in period" follows the slider, so its bins are recomputed as the period changes.
 */
function binBreaks(nums: number[], floor = -Infinity): { start: number; step: number } {
  const lo = Math.min(0, d3.min(nums) ?? 0);
  const hi = d3.max(nums) ?? 1;
  const raw = (hi - lo) / SEQ_BINS || 1;
  const mag = 10 ** Math.floor(Math.log10(raw));
  for (const k of [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10, 12, 15, 20]) {
    const step = k * mag;
    // growth cannot fall below −100%, so its scale never starts lower than that
    const start = Math.max(floor, Math.floor(lo / step) * step);
    if (start + SEQ_BINS * step >= hi) return { start, step };
  }
  return { start: lo, step: raw };
}

export function StateGrowth({ index }: { index: number }) {
  const d = useData();
  const metric = useStore((s) => s.metric);
  const period = useStore((s) => s.period);
  const m = d.meta;
  const values = useMemo(() => new Map(d.summary.map((r) => [r.state_name, metricValue(d, r.state_name, metric, period)])), [d, metric, period]);
  const ranked = [...values.entries()].filter(([, v]) => v !== null).sort((a, b) => (b[1] as number) - (a[1] as number));

  const metricName = v2.metrics[metric];
  const table = (
    <table className="data">
      <caption>{v2.mapTableCaption(metricName)}</caption>
      <thead><tr><th scope="col">State</th><th scope="col">{metricName}</th><th scope="col">Flag</th></tr></thead>
      <tbody>
        {d.summary.map((r) => (
          <tr key={r.state_name}><th scope="row">{r.state_name}</th><td>{fmtMetric(metric, values.get(r.state_name) ?? null)}</td><td>{flagLabels(r.data_flags)}</td></tr>
        ))}
      </tbody>
    </table>
  );

  return (
    <Card
      index={index}
      className="col-8"
      primary
      title={v2.title}
      subtitle={v2.subtitle}
      info={v2.info}
      table={table}
      tools={
        <Segmented<MapMetric>
          label="Map metric"
          value={metric}
          onChange={(v) => setState({ metric: v })}
          options={(['growth', 'period', 'share'] as MapMetric[]).map((k) => ({ value: k, label: v2.metrics[k] }))}
        />
      }
      footer={
        <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
          {metric === 'growth' && v2.metricLong.growth(fmtRange(m.last12_from, m.last12_to), fmtRange(m.prior12_from, m.prior12_to))}
          {metric === 'share' && v2.metricLong.share(fmtRange(m.last12_from, m.last12_to))}
          {metric === 'period' && v2.metricLong.period(fmtRange(period[0], period[1]))}
        </span>
      }
    >
      <div className="view2">
        <GrowthMap values={values} metric={metric} ariaTop={ranked.slice(0, 3).map(([n, v]) => `${n} (${fmtMetric(metric, v)})`)} />
        <TrendChart />
      </div>
    </Card>
  );
}

// ------------------------------------------------------------------ map
function GrowthMap({ values, metric, ariaTop }: { values: Map<string, number | null>; metric: MapMetric; ariaTop: string[] }) {
  const d = useData();
  const [ref, width] = useWidth<HTMLDivElement>();
  const selected = useStore((s) => s.selected);
  const hovered = useStore((s) => s.hovered);
  const pinSlots = useStore((s) => s.pinSlots);
  const h = Math.round(Math.min(width * 1.08, 520));
  const { path, features, centroid } = useMemo(() => {
    const proj = d3.geoMercator().fitExtent([[4, 4], [Math.max(10, width - 4), Math.max(10, h - 4)]], d.geo);
    const path = d3.geoPath(proj);
    const centroid = new Map(d.geo.features.map((f) => [f.properties.name, path.centroid(f)]));
    return { path, features: d.geo.features, centroid };
  }, [d, width, h]);

  // On the growth tab, small-base states (under 500 EVs the year before) are kept off the colour scale:
  // a jump from 50 to 450 EVs reads as +800% and would stretch the scale past every state that matters.
  // They get their own dotted fill instead; their values stay in the tooltip and the data table.
  const offScale = (n: string) => metric === 'growth' && !!summaryOf(d, n) && isSmallBase(d, summaryOf(d, n)!);
  const nums = [...values.entries()].filter(([n, v]) => v !== null && !offScale(n)).map(([, v]) => v as number);
  const { start, step } = binBreaks(nums, metric === 'growth' ? -100 : -Infinity);
  const breaks = d3.range(1, SEQ_BINS).map((k) => start + k * step);
  const scale = d3.scaleThreshold<number, number>().domain(breaks).range(d3.range(SEQ_BINS));
  const f = (v: number) => fmtMetricShort(metric, v);
  const binLabel = (i: number) => v2.binRange(f(start + i * step), f(start + (i + 1) * step));
  const flagOf = (n: string) => summaryOf(d, n)?.data_flag;
  const fill = (n: string) => {
    if (flagOf(n) === 'no_granular_demand') return 'url(#hatch)';
    if (offScale(n)) return 'url(#offscale)';
    const v = values.get(n);
    return v === null || v === undefined ? 'var(--nodata)' : SEQ_VAR(scale(v));
  };

  const order = [...features].sort((a, b) => {
    const rank = (n: string) => (n === selected ? 3 : n === hovered ? 2 : pinSlots[n] !== undefined ? 1 : 0);
    return rank(a.properties.name) - rank(b.properties.name);
  });

  const tg = centroid.get('Telangana');
  const lk = centroid.get('Lakshadweep');

  return (
    <div>
      <div className="chart" ref={ref} onMouseLeave={() => { hideTip(); actions.hover(null); }}>
        {width > 0 && (
          <svg width={width} height={h} role="img" aria-label={v2.mapAria(v2.metrics[metric], ariaTop, ariaTop.length)}>
            <defs>
              <pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <rect width="6" height="6" style={{ fill: 'var(--nodata)' }} />
                <line x1="0" y1="0" x2="0" y2="6" style={{ stroke: 'var(--hatch)', strokeWidth: 2 }} />
              </pattern>
              <pattern id="offscale" width="5" height="5" patternUnits="userSpaceOnUse">
                <rect width="5" height="5" style={{ fill: 'var(--nodata)' }} />
                <circle cx="2.5" cy="2.5" r="1.1" style={{ fill: 'var(--hatch)' }} />
              </pattern>
            </defs>
            {order.map((f) => {
              const n = f.properties.name;
              const isSel = n === selected;
              const isHov = n === hovered;
              const slot = pinSlots[n];
              const dim = selected && !isSel ? 0.35 : 1;
              return (
                <path
                  key={n}
                  className="map-state"
                  d={path(f) ?? ''}
                  style={{
                    fill: fill(n),
                    stroke: isSel ? 'var(--hairline-strong)' : slot !== undefined ? PIN_COLOR(slot) : isHov ? 'var(--text)' : 'var(--card)',
                    strokeWidth: isSel ? 2 : slot !== undefined || isHov ? 2 : 0.75,
                    opacity: isHov ? 1 : dim,
                  }}
                  onClick={() => actions.select(isSel ? null : n)}
                  onMouseEnter={() => actions.hover(n)}
                  onMouseMove={(e) => {
                    const fl = flagOf(n);
                    showTip(e, (
                      <>
                        <div className="tt-title">{n}</div>
                        <div className="tt-row"><span>{v2.metrics[metric]}</span><span>{fl === 'no_granular_demand' ? v2.legendHatch : fmtMetric(metric, values.get(n) ?? null)}</span></div>
                        {(summaryOf(d, n)?.data_flags ?? []).map((f) => <div key={f} style={{ marginTop: 4 }}><strong>{flags[f].label}:</strong> {flags[f].long}</div>)}
                      </>
                    ));
                  }}
                />
              );
            })}
            {/* small-base markers: dashed ring */}
            {d.summary.filter((r) => isSmallBase(d, r)).map((r) => {
              const c = centroid.get(r.state_name);
              if (!c) return null;
              return <circle key={r.state_name} cx={c[0]} cy={c[1]} r={6} pointerEvents="none" style={{ fill: 'none', stroke: 'var(--text)', strokeWidth: 1.5, strokeDasharray: '2 2' }} />;
            })}
            {/* pinned-state shape markers */}
            {Object.entries(pinSlots).map(([n, slot]) => {
              const c = centroid.get(n);
              if (!c) return null;
              return <path key={n} d={symbolPath(slot, 90)} transform={`translate(${c[0]},${c[1]})`} pointerEvents="none" style={{ fill: PIN_COLOR(slot), stroke: 'var(--card)', strokeWidth: 1.5 }} />;
            })}
            {/* labels for the demand-side reporting gaps */}
            {tg && (
              <g pointerEvents="none">
                {/* labelled off the landmass on a leader, so it never reads as describing a neighbouring (selected) state */}
                <line x1={tg[0]} y1={tg[1]} x2={tg[0] + 30} y2={tg[1] + 26} style={{ stroke: 'var(--text)', strokeWidth: 1 }} />
                <circle cx={tg[0]} cy={tg[1]} r={2.5} style={{ fill: 'var(--text)' }} />
                <text y={tg[1] + 30} style={{ fill: 'var(--text)', fontWeight: 600, paintOrder: 'stroke', stroke: 'var(--card)', strokeWidth: 3 }}>
                  <tspan x={tg[0] + 33} dy="0">Telangana:</tspan>
                  <tspan x={tg[0] + 33} dy="1.2em">{v2.mapLabelNoData}</tspan>
                </text>
              </g>
            )}
            {lk && (
              <g pointerEvents="none">
                <circle cx={lk[0]} cy={lk[1]} r={9} style={{ fill: 'none', stroke: 'var(--hatch)', strokeWidth: 1.5 }} />
                <text y={lk[1] - 34} style={{ fill: 'var(--text)', fontWeight: 600, paintOrder: 'stroke', stroke: 'var(--card)', strokeWidth: 3 }}>
                  <tspan x={Math.max(2, lk[0] - 10)} dy="0">Lakshadweep:</tspan>
                  <tspan x={Math.max(2, lk[0] - 10)} dy="1.2em">{v2.mapLabelNoData}</tspan>
                </text>
              </g>
            )}
          </svg>
        )}
      </div>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={metric}
          className="legend"
          style={{ marginTop: 8 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: dur.moderate01, ease: ease.standard }}
        >
          <span className="legend-item" style={{ fontWeight: 600, color: 'var(--text)' }}>{v2.metrics[metric]}</span>
          {d3.range(SEQ_BINS).map((i) => (
            <span key={i} className="legend-item"><span className="swatch" style={{ background: SEQ_VAR(i) }} />{binLabel(i)}</span>
          ))}
        </motion.div>
      </AnimatePresence>
      <div className="legend" style={{ marginTop: 6 }}>
        <span className="legend-item">
          <svg width="12" height="12" aria-hidden><rect width="12" height="12" rx="3" fill="url(#hatch)" /></svg>
          {v2.legendHatch}
        </span>
        <span className="legend-item">
          <svg width="14" height="14" aria-hidden><circle cx="7" cy="7" r="5.5" style={{ fill: 'none', stroke: 'var(--text)', strokeWidth: 1.5, strokeDasharray: '2 2' }} /></svg>
          {v2.legendSmallBase}
        </span>
        {metric === 'growth' && (
          <span className="legend-item">
            <svg width="12" height="12" aria-hidden><rect width="12" height="12" fill="url(#offscale)" /></svg>
            {v2.legendOffScale}
          </span>
        )}
        <span className="legend-item"><span className="swatch" style={{ background: 'var(--nodata)', border: '1px solid var(--border-strong)' }} />{v2.legendNoValue}</span>
      </div>
      <p className="caption" style={{ marginTop: 6 }}>
        <a href={whereFrom.mapAttribution.link} target="_blank" rel="noreferrer">{whereFrom.mapAttribution.short}</a>
      </p>
    </div>
  );
}

// ------------------------------------------------------------------ trend
const toDate = (ym: string) => new Date(Number(ym.slice(0, 4)), Number(ym.slice(5, 7)) - 1, 1);

interface Line { key: string; label: string; points: SeriesPoint[]; color: string; dash: string; width: number; opacity: number }

function TrendChart() {
  const d = useData();
  const [ref, width] = useWidth<HTMLDivElement>();
  const selected = useStore((s) => s.selected);
  const pins = useStore((s) => s.pins);
  const pinSlots = useStore((s) => s.pinSlots);
  const mode = useStore((s) => s.trendMode);
  const period = useStore((s) => s.period);
  const reduced = usePrefersReducedMotion();
  const brushRef = useRef<SVGGElement>(null);
  const crossRef = useRef<SVGLineElement>(null);
  const m = d.meta;
  const months = d.stateMonth.months;
  const place = selected ?? 'All India';
  const noData = selected && !(selected in d.stateMonth.ev);

  const lines: Line[] = useMemo(() => {
    const out: Line[] = [];
    const india = monthlySeries(d, null, mode)!;
    if (selected && mode === 'share') out.push({ key: 'india', label: v2.trendIndiaRef, points: india, color: 'var(--ref)', dash: '4 3', width: 1.5, opacity: 0.8 });
    for (const p of [...pins].sort((a, b) => pinSlots[a] - pinSlots[b])) {
      if (p === selected) continue;
      const s = monthlySeries(d, p, mode);
      if (s) out.push({ key: p, label: p, points: s, color: PIN_COLOR(pinSlots[p]), dash: PIN_DASH[pinSlots[p]], width: 2, opacity: 1 });
    }
    if (selected) {
      const s = monthlySeries(d, selected, mode);
      if (s) out.push({ key: selected, label: selected, points: s, color: 'var(--text)', dash: 'none', width: 2.5, opacity: 1 });
    } else {
      out.push({ key: 'india-main', label: 'All India', points: india, color: 'var(--text)', dash: 'none', width: 2.5, opacity: 1 });
    }
    return out;
  }, [d, selected, pins, pinSlots, mode]);

  const h = 300;
  const mg = { t: 24, r: 12, b: 28, l: 48 };
  const iw = Math.max(0, width - mg.l - mg.r);
  const ih = h - mg.t - mg.b;
  const x = d3.scaleTime().domain([toDate(months[0]), toDate(months[months.length - 1])]).range([0, iw]);
  const ymax = d3.max(lines, (l) => d3.max(l.points, (p) => p.value ?? 0)) ?? 1;
  const y = d3.scaleLinear().domain([0, ymax || 1]).nice().range([ih, 0]);
  const lineGen = d3.line<SeriesPoint>().defined((p) => p.value !== null).x((p) => x(toDate(p.month))).y((p) => y(p.value ?? 0));
  const fmtY = (v: number) => (mode === 'share' ? `${fmtDec(v, v < 10 ? 1 : 0)}%` : fmtCompact(v));

  // brush: sets the global period
  useEffect(() => {
    if (!brushRef.current || iw <= 0 || noData) return;
    const g = d3.select(brushRef.current);
    const snap = (px: number) => d3.minIndex(months, (mm) => Math.abs(x(toDate(mm)) - px));
    const brush = d3.brushX().extent([[0, 0], [iw, ih]]).on('end', (ev) => {
      if (!ev.sourceEvent) return;
      if (!ev.selection) {
        setState({ period: [months[0], months[months.length - 1]] });
        return;
      }
      const [a, b] = ev.selection as [number, number];
      setState({ period: [months[snap(a)], months[snap(b)]] });
    });
    g.call(brush);
    g.select('.selection').style('fill', 'var(--brush)').style('stroke', 'var(--accent)').style('stroke-width', '1');
    g.select('.overlay').attr('aria-hidden', 'true');
    const full = period[0] === months[0] && period[1] === months[months.length - 1];
    g.call(brush.move, full ? null : [x(toDate(period[0])), x(toDate(period[1]))]);
    // crosshair tooltip on the brush overlay
    g.on('mousemove.tip', (ev: MouseEvent) => {
      const [px] = d3.pointer(ev, brushRef.current);
      const i = snap(px);
      if (crossRef.current) {
        crossRef.current.setAttribute('x1', String(x(toDate(months[i]))));
        crossRef.current.setAttribute('x2', String(x(toDate(months[i]))));
        crossRef.current.style.opacity = '1';
      }
      showTip(ev, (
        <>
          <div className="tt-title">{fmtMonth(months[i])}</div>
          {[...lines].reverse().map((l) => (
            <div key={l.key} className="tt-row"><span>{l.label}</span><span>{l.points[i].value === null ? '—' : mode === 'share' ? fmtPct(l.points[i].value, 2) : fmtInt(l.points[i].value)}</span></div>
          ))}
        </>
      ));
    }).on('mouseleave.tip', () => {
      hideTip();
      if (crossRef.current) crossRef.current.style.opacity = '0';
    });
    return () => {
      g.on('.brush', null).on('mousemove.tip', null).on('mouseleave.tip', null);
    };
  }, [iw, ih, months, period, lines, mode, noData, x]);

  // the last line is the main one (selected state, or India); with a no-data selection it may not exist
  const main = lines.length ? lines[lines.length - 1] : null;
  const vals = main ? main.points.filter((p) => p.value !== null) : [];
  const peak = vals.length ? vals.reduce((a, b) => ((b.value as number) > (a.value as number) ? b : a)) : null;
  const aria = v2.trendAria(place, mode === 'count' ? 'chargeable EV registrations' : 'EV share of registrations', months[0], months[months.length - 1], vals[0]?.value ?? null, vals[vals.length - 1]?.value ?? null, peak ? fmtMonth(peak.month) : 'none');

  const band = (from: string, to: string, label: string, short: string, fillVar: string) => {
    const x0 = x(toDate(from));
    const x1 = Math.min(iw, x(d3.timeMonth.offset(toDate(to), 1)));
    // full label only when it fits inside the band, so the two labels never collide
    const text = x1 - x0 >= label.length * 6.5 + 6 ? label : short;
    return (
      <g pointerEvents="none">
        <rect x={x0} width={x1 - x0} y={0} height={ih} style={{ fill: fillVar }} />
        <text x={(x0 + x1) / 2} y={-8} textAnchor="middle" style={{ fill: 'var(--text-2)' }}>{text}</text>
      </g>
    );
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
        <div style={{ fontWeight: 600, fontSize: 14 }}>{v2.trendTitle(place)}</div>
        <Segmented<'count' | 'share'>
          label="Trend measure"
          value={mode}
          onChange={(v) => setState({ trendMode: v })}
          options={[{ value: 'count', label: v2.trendModes.count }, { value: 'share', label: v2.trendModes.share }]}
        />
      </div>
      {noData ? (
        <div className="empty" role="status">{v2.noTrend(selected!)}</div>
      ) : (
        <div className="chart" ref={ref}>
          {width > 0 && (
            <svg width={width} height={h} role="img" aria-label={aria}>
              <g transform={`translate(${mg.l},${mg.t})`}>
                {band(m.prior12_from, m.prior12_to, v2.bandPrior, v2.bandPriorShort, 'var(--band)')}
                {band(m.last12_from, m.last12_to, v2.bandLast, v2.bandLastShort, 'var(--band-2)')}
                {y.ticks(4).map((t) => (
                  <g key={t} transform={`translate(0,${y(t)})`}>
                    <line x2={iw} style={{ stroke: 'var(--grid)' }} />
                    <text className="tick" x={-8} dy="0.32em" textAnchor="end">{fmtY(t)}</text>
                  </g>
                ))}
                <line x1={0} x2={iw} y1={ih} y2={ih} style={{ stroke: 'var(--axis)' }} />
                {x.ticks(iw < 360 ? 3 : 6).map((t) => (
                  <text className="tick" key={+t} x={x(t)} y={ih + 18} textAnchor="middle">{d3.timeFormat('%Y')(t)}</text>
                ))}
                {lines.map((l) => (
                  <motion.path
                    key={l.key}
                    initial={reduced ? false : { pathLength: 0, d: lineGen(l.points) ?? '' }}
                    animate={{ pathLength: 1, d: lineGen(l.points) ?? '' }}
                    transition={{ pathLength: { duration: dur.slow01, ease: ease.entrance }, d: { duration: dur.slow01, ease: ease.standard } }}
                    style={{ fill: 'none', stroke: l.color, strokeWidth: l.width, strokeDasharray: l.dash === 'none' ? undefined : l.dash, opacity: l.opacity }}
                    pointerEvents="none"
                  />
                ))}
                {/* end-of-line shape markers for pinned states */}
                {lines.filter((l) => pinSlots[l.key] !== undefined).map((l) => {
                  const lastP = [...l.points].reverse().find((p) => p.value !== null);
                  if (!lastP) return null;
                  return <path key={l.key} d={symbolPath(pinSlots[l.key], 56)} transform={`translate(${x(toDate(lastP.month))},${y(lastP.value!)})`} style={{ fill: l.color, stroke: 'var(--card)', strokeWidth: 1 }} pointerEvents="none" />;
                })}
                <line ref={crossRef} y1={0} y2={ih} style={{ stroke: 'var(--axis)', opacity: 0 }} pointerEvents="none" />
                <g ref={brushRef} />
              </g>
            </svg>
          )}
          <div className="legend" style={{ marginTop: 4 }}>
            {[...lines].reverse().map((l) => (
              <span key={l.key} className="legend-item">
                <svg width="24" height="10" aria-hidden>
                  <line x1="0" x2="24" y1="5" y2="5" style={{ stroke: l.color, strokeWidth: l.width, strokeDasharray: l.dash === 'none' ? undefined : l.dash, opacity: l.opacity }} />
                  {pinSlots[l.key] !== undefined && <path d={symbolPath(pinSlots[l.key], 40)} transform="translate(12,5)" style={{ fill: l.color }} />}
                </svg>
                {l.label}
              </span>
            ))}
          </div>
          <p className="caption">
            {v2.brushHint}. {selected && mode === 'count' ? v2.trendIndiaCountNote : ''}
          </p>
        </div>
      )}
    </div>
  );
}
