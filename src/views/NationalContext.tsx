import { useMemo } from 'react';
import * as d3 from 'd3';
import { motion } from 'framer-motion';
import { v1, v4 } from '../content';
import { splitOf, useData } from '../lib/data';
import { GROUP_VAR } from '../lib/encodings';
import { fmtCompact, fmtDec, fmtInt, fmtPct } from '../lib/format';
import { GROUPS, type Group } from '../types';
import { Card, InfoPopover, Segmented, useWidth, usePrefersReducedMotion } from '../components/ui';
import { setState, useStore, type FyMode } from '../lib/store';
import { hideTip, showTip } from '../components/overlay';
import { SplitBar } from './shared';
import { dur, ease } from '../lib/motion';

/** The chart starts here: FY2011 to FY2018 hold a few thousand EVs a year, invisible next to FY2025's 15 lakh.
 *  They stay in the data table. */
const CHART_FROM = 'FY2019';

export function NationalContext({ index }: { index: number }) {
  const d = useData();
  const [ref, width] = useWidth<HTMLDivElement>();
  const reduced = usePrefersReducedMotion();
  const mode = useStore((s) => s.fyMode);
  const fys = useMemo(() => [...new Set(d.fy.map((r) => r.fy))], [d]);
  const byFy = useMemo(
    () => fys.map((fy) => {
      const vals = Object.fromEntries(GROUPS.map((g) => [g, d.fy.find((r) => r.fy === fy && r.group === g)?.ev ?? 0])) as Record<Group, number>;
      return { fy, ...vals, total: GROUPS.reduce((a, g) => a + vals[g], 0) };
    }),
    [d, fys],
  );
  const chartRows = byFy.filter((r) => r.fy >= CHART_FROM);
  const chartFys = chartRows.map((r) => r.fy);
  const last = byFy[byFy.length - 1];
  const share2w = last.total ? (last['2W'] / last.total) * 100 : null;
  // headline growth from granular Vahan: first and last COMPLETE financial years in the granular window
  const cmp = d.fyCompare;
  const first = cmp[0];
  const lastCmp = cmp[cmp.length - 1];
  const vahanGrowth = first && lastCmp && first.vahan_ev ? ((lastCmp.vahan_ev - first.vahan_ev) / first.vahan_ev) * 100 : null;
  const side = (r: (typeof cmp)[number]) => ({ fy: r.fy, file: fmtInt(r.fy_file_ev), vahan: fmtInt(r.vahan_ev) });
  const fyFile = splitOf(d, 'fy_file');
  const cf = splitOf(d, 'category_fuel');

  // tall enough that the thin segments (three-wheelers, cars) read as colour, not a hairline
  const h = width < 480 ? 280 : 380;
  const m = { t: 8, r: 8, b: 24, l: 44 };
  const iw = Math.max(0, width - m.l - m.r);
  const ih = h - m.t - m.b;
  const x = d3.scaleBand().domain(chartFys).range([0, iw]).padding(0.22);
  // Share %: each year scaled to 100%, so groups under 1% of EVs still get a visible band
  const plotRows = mode === 'share'
    ? chartRows.map((r) => ({ ...r, ...(Object.fromEntries(GROUPS.map((g) => [g, r.total ? (r[g] / r.total) * 100 : 0])) as Record<Group, number>), total: 100 }))
    : chartRows;
  const y = d3.scaleLinear().domain([0, mode === 'share' ? 100 : (d3.max(chartRows, (r) => r.total) ?? 1)]).nice().range([ih, 0]);
  const stack = d3.stack<(typeof byFy)[number], Group>().keys(GROUPS)(plotRows);
  const fmtTick = (t: number) => (mode === 'share' ? `${t}%` : fmtCompact(t));
  const shortFy = (fy: string) => `'${fy.slice(4)}`;
  const everyOther = iw < 520;

  const table = (
    <table className="data">
      <caption>{v1.tableCaption}</caption>
      <thead>
        <tr><th scope="col">Financial year</th>{GROUPS.map((g) => <th key={g} scope="col">{v4.groupLabels[g]}</th>)}<th scope="col">Total</th></tr>
      </thead>
      <tbody>
        {byFy.map((r) => (
          <tr key={r.fy}><th scope="row">{r.fy}</th>{GROUPS.map((g) => <td key={g}>{fmtInt(r[g])}</td>)}<td>{fmtInt(r.total)}</td></tr>
        ))}
      </tbody>
    </table>
  );
  const compareTable = (
    <table className="data">
      <caption>{v1.compareCaption}</caption>
      <thead><tr><th scope="col">Financial year</th><th scope="col">Annual file EV total</th><th scope="col">Vahan chargeable EVs</th><th scope="col">Annual file ÷ Vahan</th></tr></thead>
      <tbody>
        {cmp.map((r) => <tr key={r.fy}><th scope="row">{r.fy}</th><td>{fmtInt(r.fy_file_ev)}</td><td>{fmtInt(r.vahan_ev)}</td><td>{fmtDec(r.ratio, 2)}</td></tr>)}
      </tbody>
    </table>
  );

  return (
    <Card
      index={index}
      className="col-12"
      title={v1.title}
      scope={v1.scope}
      subtitle={v1.subtitle(chartFys[0], d.meta.fy_last)}
      info={v1.info}
      table={<>{table}{compareTable}</>}
      tools={
        <Segmented<FyMode>
          label={v1.modeLabel}
          value={mode}
          onChange={(v) => setState({ fyMode: v })}
          options={[{ value: 'count', label: v1.modes.count }, { value: 'share', label: v1.modes.share }]}
        />
      }
      footer={
        <span className="legend" aria-hidden>
          {GROUPS.map((g) => (
            <span key={g} className="legend-item"><span className="swatch" style={{ background: GROUP_VAR[g] }} />{v4.groupLabels[g]}</span>
          ))}
        </span>
      }
    >
      <div className="v1">
        <div>
          <div className="stat-row">
            <div className="stat"><div className="stat-v" data-testid="v1-total">{fmtInt(last.total)}</div><div className="stat-l">{v1.statTotal(last.fy)}</div></div>
            <div className="stat"><div className="stat-v">{fmtPct(share2w)}</div><div className="stat-l">{v1.stat2w(last.fy)}</div></div>
            <div className="stat"><div className="stat-v" data-testid="v1-vahan-growth">{fmtPct(vahanGrowth, 0, true)}</div><div className="stat-l">{v1.statGrowth(first.fy, lastCmp.fy)}</div></div>
          </div>
          <div className="chart" ref={ref}>
            {width > 0 && (
              <svg width={width} height={h} role="img" aria-label={v1.aria(chartFys[0], last.fy, last.total, share2w, `${fmtPct(vahanGrowth, 0, true)} from ${first.fy} to ${lastCmp.fy}`)}>
                <g transform={`translate(${m.l},${m.t})`}>
                  <g className="gridline">
                    {y.ticks(4).map((t) => (
                      <g key={t} transform={`translate(0,${y(t)})`}>
                        <line x2={iw} style={{ stroke: 'var(--grid)' }} />
                        <text className="tick" x={-8} dy="0.32em" textAnchor="end">{fmtTick(t)}</text>
                      </g>
                    ))}
                  </g>
                  {stack.map((layer) => (
                    <g key={layer.key}>
                      {layer.map((seg, i) => {
                        const fy = chartFys[i];
                        const y0 = y(seg[0]);
                        const y1 = y(seg[1]);
                        const hh = Math.max(0, y0 - y1 - (seg[1] > seg[0] ? 1 : 0));
                        return (
                          <motion.rect
                            key={fy}
                            x={x(fy)}
                            width={x.bandwidth()}
                            initial={reduced ? false : { y: ih, height: 0 }}
                            animate={{ y: y1, height: hh }}
                            transition={{ duration: dur.slow01, ease: ease.standard, delay: reduced ? 0 : 0.2 + i * 0.02 }}
                            style={{ fill: GROUP_VAR[layer.key as Group] }}
                          />
                        );
                      })}
                    </g>
                  ))}
                  {chartRows.map((r) => (
                    <rect
                      key={r.fy}
                      x={(x(r.fy) ?? 0) - (x.step() * x.paddingInner()) / 2}
                      width={x.step()}
                      y={0}
                      height={ih}
                      fill="transparent"
                      onMouseMove={(e) =>
                        showTip(e, (
                          <>
                            <div className="tt-title">{r.fy}{r.fy === d.meta.fy_last ? ` · ${v1.beyondWindow}` : ''}</div>
                            {GROUPS.map((g) => (
                              <div key={g} className="tt-row"><span>{v4.groupLabels[g]}</span><span>{fmtInt(r[g])} · {fmtPct(r.total ? (r[g] / r.total) * 100 : null)}</span></div>
                            ))}
                            <div className="tt-row"><strong>Total</strong><strong>{fmtInt(r.total)}</strong></div>
                          </>
                        ))
                      }
                      onMouseLeave={hideTip}
                    />
                  ))}
                  <line x1={0} x2={iw} y1={ih} y2={ih} style={{ stroke: 'var(--axis)' }} />
                  {chartFys.map((fy, i) => (
                    (!everyOther || (chartFys.length - 1 - i) % 2 === 0) && (
                      <text className="tick" key={fy} x={(x(fy) ?? 0) + x.bandwidth() / 2} y={ih + 16} textAnchor="middle">{shortFy(fy)}</text>
                    )
                  ))}
                  {/* mark the FY that runs past May 2024 */}
                  <text x={(x(last.fy) ?? 0) + x.bandwidth()} y={y(mode === 'share' ? 100 : last.total) - 6} textAnchor="end" style={{ fill: 'var(--text-2)' }}>
                    {v1.beyondWindow}
                  </text>
                </g>
              </svg>
            )}
          </div>
          <p className="caption">{v1.fyCaption(side(first), side(lastCmp))}</p>
        </div>
        <div className="callout">
          <h3>
            {v1.disagreeTitle}
            <InfoPopover align="right" label={v1.disagreeTitle} text={v1.disagreeInfo(fyFile.window, cf.window)} />
          </h3>
          <SplitBar label={v1.splitLabelFy(d.meta.fy_last)} shares={fyFile.shares} />
          <SplitBar label={v1.splitLabelCf} shares={cf.shares} />
        </div>
      </div>
    </Card>
  );
}
