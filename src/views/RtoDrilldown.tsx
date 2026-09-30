import { useMemo } from 'react';
import * as d3 from 'd3';
import { AnimatePresence, motion } from 'framer-motion';
import { rto as copy } from '../content';
import { useData } from '../lib/data';
import { fmtCompact, fmtInt, fmtRange } from '../lib/format';
import { setState, useStore, type RtoSort } from '../lib/store';
import { Card, Segmented, useWidth, usePrefersReducedMotion } from '../components/ui';
import { hideTip, showTip } from '../components/overlay';
import { dur, ease } from '../lib/motion';

const TOP_N = 10;

// ------------------------------------------------------------------ label fitting
/** Width of a label as it renders (IBM Plex Sans 12px, 0.32px tracking), so columns are sized to the real text. */
let measureCtx: CanvasRenderingContext2D | null = null;
function textWidth(text: string, weight = 400) {
  measureCtx ??= document.createElement('canvas').getContext('2d');
  if (!measureCtx) return text.length * 7;
  measureCtx.font = `${weight} 12px 'IBM Plex Sans', 'Helvetica Neue', Arial, sans-serif`;
  return measureCtx.measureText(text).width + text.length * 0.32;
}
/** Break a name into at most `maxLines` lines that fit `w`; only the last line is ever shortened, and only if it must be. */
function wrapLabel(text: string, w: number, maxLines: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let line = '';
  for (let i = 0; i < words.length; i++) {
    const next = line ? `${line} ${words[i]}` : words[i];
    if (textWidth(next) <= w || !line) {
      line = next;
      continue;
    }
    if (lines.length === maxLines - 1) {
      line = `${line} ${words.slice(i).join(' ')}`;
      break;
    }
    lines.push(line);
    line = words[i];
  }
  lines.push(line);
  const last = lines.length - 1;
  if (textWidth(lines[last]) > w) {
    let t = lines[last];
    while (t.length > 1 && textWidth(`${t}…`) > w) t = t.slice(0, -1);
    lines[last] = `${t.trimEnd()}…`;
  }
  return lines;
}

export function RtoDrilldown({ index }: { index: number }) {
  const d = useData();
  const selected = useStore((s) => s.selected);
  const sort = useStore((s) => s.rtoSort);
  const reduced = usePrefersReducedMotion();
  const [ref, width] = useWidth<HTMLDivElement>();
  const m = d.meta;
  const noData = !!selected && !(selected in d.stateMonth.ev);

  const rows = useMemo(() => {
    const pool = selected ? d.rto.filter((r) => r.state_name === selected) : d.rto;
    const key = sort === 'last12' ? 'last12m' : 'total';
    return [...pool].sort((a, b) => b[key] - a[key] || a.office_name.localeCompare(b.office_name)).slice(0, TOP_N);
  }, [d, selected, sort]);

  const placeWord = selected ? `in ${selected}` : 'nationally';
  const valueText = (r: (typeof rows)[number]) => (sort === 'last12' ? copy.valueLast12(fmtCompact(r.last12m), fmtCompact(r.total)) : fmtCompact(r.total));
  // the label column takes what the longest office name needs, up to 42% of the chart; the value column takes its widest label
  const nameMax = Math.max(0, ...rows.map((r) => textWidth(r.office_name)), ...(selected ? [] : rows.map((r) => textWidth(r.state_name))));
  const labelW = Math.round(Math.min(Math.max(nameMax + 12, 96), Math.max(96, width * 0.42)));
  const valueW = Math.ceil(Math.max(0, ...rows.map((r) => textWidth(valueText(r)))) + 8);
  // a long office name wraps to two lines; nationally the state follows on its own muted line
  const labels = rows.map((r) => {
    const office = wrapLabel(r.office_name, labelW - 12, 2);
    return selected ? { lines: office, muted: -1 } : { lines: [...office, r.state_name], muted: office.length };
  });
  const maxLines = Math.max(1, ...labels.map((l) => l.lines.length));
  const rowH = Math.max(30, maxLines * 16 + 14);
  const barH = 18;
  const h = rows.length * rowH + 8;
  const iw = Math.max(10, width - labelW - valueW);
  const x = d3.scaleLinear().domain([0, d3.max(rows, (r) => r.total) ?? 1]).range([0, iw]);
  const earlierRange = fmtRange(m.granular_from, d.stateMonth.months[d.stateMonth.months.indexOf(m.last12_from) - 1]);
  const lastRange = fmtRange(m.last12_from, m.last12_to);
  const nameOf = (r: (typeof rows)[number]) => (selected ? r.office_name : `${r.office_name} (${r.state_name})`);

  const table = (
    <table className="data">
      <caption>{copy.tableCaption(placeWord)}</caption>
      <thead><tr><th scope="col">RTO</th><th scope="col">Code</th><th scope="col">Last 12 months</th><th scope="col">Earlier</th><th scope="col">Full window</th></tr></thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.state_name + r.office_code}><th scope="row">{nameOf(r)}</th><td>{r.office_code}</td><td>{fmtInt(r.last12m)}</td><td>{fmtInt(r.total - r.last12m)}</td><td>{fmtInt(r.total)}</td></tr>
        ))}
      </tbody>
    </table>
  );

  return (
    <Card
      index={index}
      className="col-6"
      title={copy.title(selected)}
      subtitle={copy.subtitle}
      info={copy.info}
      table={noData ? undefined : table}
      tools={
        <Segmented<RtoSort>
          label="Sort RTOs by"
          value={sort}
          onChange={(v) => setState({ rtoSort: v })}
          options={[{ value: 'last12', label: copy.sorts.last12 }, { value: 'full', label: copy.sorts.full }]}
        />
      }
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={selected ?? 'india'}
          initial={reduced ? false : { opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -12, transition: { duration: dur.moderate01, ease: ease.exit } }}
          transition={{ duration: dur.moderate02, ease: ease.entrance }}
        >
          {noData ? (
            <div className="empty" role="status">{copy.empty(selected!)}</div>
          ) : (
            <>
              <div className="legend" style={{ marginBottom: 8 }}>
                <span className="legend-item"><span className="swatch" style={{ background: 'var(--rto-last)' }} />{copy.legendLast(lastRange)}</span>
                <span className="legend-item"><span className="swatch" style={{ background: 'var(--rto-earlier)' }} />{copy.legendEarlier(earlierRange)}</span>
              </div>
              <div className="chart" ref={ref} onMouseLeave={hideTip}>
                {width > 0 && rows.length > 0 && (
                  <svg width={width} height={h} role="img" aria-label={copy.aria(placeWord, nameOf(rows[0]), rows[0][sort === 'last12' ? 'last12m' : 'total'], rows.length)}>
                    {rows.map((r, i) => {
                      const earlier = r.total - r.last12m;
                      const name = nameOf(r);
                      const { lines, muted } = labels[i];
                      const barY = (rowH - barH) / 2 - 2;
                      return (
                        <g
                          key={r.state_name + r.office_code}
                          transform={`translate(0,${i * rowH + 4})`}
                          onMouseMove={(e) =>
                            showTip(e, (
                              <>
                                <div className="tt-title">{name} · {r.office_code}</div>
                                <div className="tt-row"><span>Last 12 months</span><span>{fmtInt(r.last12m)}</span></div>
                                <div className="tt-row"><span>Earlier</span><span>{fmtInt(earlier)}</span></div>
                                <div className="tt-row"><strong>Full window</strong><strong>{fmtInt(r.total)}</strong></div>
                              </>
                            ))
                          }
                        >
                          <rect x={0} y={-2} width={width} height={rowH - 2} fill="transparent" />
                          <text x={labelW - 12} y={barY + barH / 2 - ((lines.length - 1) * 16) / 2} textAnchor="end">
                            <title>{name}</title>
                            {lines.map((ln, li) => (
                              <tspan
                                key={li}
                                x={labelW - 12}
                                dy={li === 0 ? '0.32em' : 16}
                                style={{ fill: li === muted ? 'var(--text-2)' : 'var(--text)' }}
                              >
                                {ln}
                              </tspan>
                            ))}
                          </text>
                          <motion.rect
                            x={labelW}
                            y={barY}
                            height={barH}
                            initial={reduced ? false : { width: 0 }}
                            animate={{ width: x(r.last12m) }}
                            transition={{ duration: dur.slow01, ease: ease.standard, delay: reduced ? 0 : i * 0.04 }}
                            style={{ fill: 'var(--rto-last)' }}
                          />
                          <motion.rect
                            y={barY}
                            height={barH}
                            initial={reduced ? false : { x: labelW, width: 0 }}
                            animate={{ x: labelW + x(r.last12m) + (earlier > 0 ? 2 : 0), width: Math.max(0, x(earlier) - 2) }}
                            transition={{ duration: dur.slow01, ease: ease.standard, delay: reduced ? 0 : i * 0.04 }}
                            style={{ fill: 'var(--rto-earlier)' }}
                          />
                          <text x={labelW + x(r.total) + 6} y={barY + barH / 2} dy="0.32em" style={{ fill: 'var(--text-2)' }}>
                            {valueText(r)}
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                )}
              </div>
            </>
          )}
        </motion.div>
      </AnimatePresence>
      <p className="caption">{copy.caption}</p>
    </Card>
  );
}
