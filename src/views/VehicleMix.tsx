import { motion } from 'framer-motion';
import { signalCaveat, signalRatioText, stationSignal, v4 } from '../content';
import { mixOf, splitOf, useData, type MixShares } from '../lib/data';
import { GROUP_VAR } from '../lib/encodings';
import { fmtPct } from '../lib/format';
import { actions, setState, useStore, type SplitSource } from '../lib/store';
import { GROUPS, type Group } from '../types';
import { Card, Segmented, StateMarker, usePrefersReducedMotion } from '../components/ui';
import { MixBar } from './shared';
import { hideTip, showTip } from '../components/overlay';

function complete(s: MixShares): Record<Group, number> | null {
  if (GROUPS.some((g) => s[g] === null)) return null;
  return s as Record<Group, number>;
}

export function VehicleMix({ index }: { index: number }) {
  const d = useData();
  const selected = useStore((s) => s.selected);
  const pins = useStore((s) => s.pins);
  const pinSlots = useStore((s) => s.pinSlots);
  const hovered = useStore((s) => s.hovered);
  const split = useStore((s) => s.split);
  const reduced = usePrefersReducedMotion();

  const india = mixOf(d, 'All India')!;
  const states = [selected, ...[...pins].sort((a, b) => pinSlots[a] - pinSlots[b])].filter((s, i, a): s is string => !!s && a.indexOf(s) === i);
  const ref = splitOf(d, split);

  // station-type signal for the selected state: ratio of its whole-fleet share to India's
  const indiaShares = complete(india.shares)!;
  const sig = selected
    ? (() => {
        const mm = mixOf(d, selected);
        const input = { state: selected, s: mm ? complete(mm.shares) : null, india: indiaShares };
        return { input, ...stationSignal(input) };
      })()
    : null;
  const ratioLines = sig && sig.input.s
    ? [
        signalRatioText('3W', sig.input.s['3W'], sig.ratio3w),
        signalRatioText('Cars/LMV', sig.input.s['Cars/LMV'], sig.ratioCar),
      ]
    : [];

  const rowsForAria = [
    `${v4.india}: ${GROUPS.map((g) => `${g} ${fmtPct(india.shares[g], 0)}`).join(', ')}.`,
    ...states.map((s) => {
      const mm = mixOf(d, s);
      return mm ? `${s}: ${GROUPS.map((g) => `${g} ${fmtPct(mm.shares[g], 0)}`).join(', ')}.` : `${s}: no data.`;
    }),
    `${v4.refBar} (${ref.window}, EV only): ${GROUPS.map((g) => `${g} ${fmtPct(ref.shares[g], 0)}`).join(', ')}.`,
  ].join(' ');

  const table = (
    <table className="data">
      <caption>{v4.tableCaption}</caption>
      <thead><tr><th scope="col">Bar</th>{GROUPS.map((g) => <th key={g} scope="col">{v4.groupLabels[g]}</th>)}</tr></thead>
      <tbody>
        <tr><th scope="row">{v4.india}</th>{GROUPS.map((g) => <td key={g}>{fmtPct(india.shares[g])}</td>)}</tr>
        {states.map((s) => {
          const mm = mixOf(d, s);
          return <tr key={s}><th scope="row">{v4.wholeFleet(s)}</th>{GROUPS.map((g) => <td key={g}>{mm ? fmtPct(mm.shares[g]) : '—'}</td>)}</tr>;
        })}
        {(['fy_file', 'category_fuel'] as SplitSource[]).map((k) => {
          const sp = splitOf(d, k);
          return <tr key={k}><th scope="row">{v4.refBar}: {sp.window}</th>{GROUPS.map((g) => <td key={g}>{fmtPct(sp.shares[g])}</td>)}</tr>;
        })}
      </tbody>
    </table>
  );

  const Row = ({ name, label }: { name: string | null; label: string }) => {
    const mm = name ? mixOf(d, name) : india;
    const isSel = !!name && name === selected;
    const content = (
      <>
        <span className="mix-label">{name && <StateMarker state={name} />}<span className="t">{label}</span></span>
        {mm ? <MixBar shares={mm.shares} title={label} india={name ? indiaShares : undefined} /> : <span style={{ fontSize: 13, color: 'var(--text-2)' }}>{v4.noMixRow}</span>}
      </>
    );
    if (!name) return <div className="mix-row">{content}</div>;
    return (
      <motion.button
        layout={reduced ? false : 'position'}
        className={`mix-row ${isSel ? 'selected' : ''} ${hovered === name ? 'hovered' : ''}`}
        aria-pressed={isSel}
        onClick={() => actions.select(isSel ? null : name)}
        onMouseEnter={() => actions.hover(name)}
        onMouseLeave={() => actions.hover(null)}
      >
        {content}
      </motion.button>
    );
  };

  return (
    <Card
      index={index}
      className="col-6"
      title={v4.title}
      subtitle={v4.subtitle}
      info={v4.info}
      table={table}
    >
      <div className="legend" style={{ marginBottom: 10 }}>
        {GROUPS.map((g) => (
          <span key={g} className="legend-item"><span className="swatch" style={{ background: GROUP_VAR[g] }} />{v4.groupLabels[g]}</span>
        ))}
      </div>
      <div role="group" aria-label={v4.aria(rowsForAria)}>
        <Row name={null} label={v4.india} />
        {states.map((s) => <Row key={s} name={s} label={s} />)}
        <hr className="mix-sep" />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap', margin: '0 6px 4px' }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)' }}>{v4.refBarLong}</span>
          <Segmented<SplitSource>
            label="National EV split source"
            value={split}
            onChange={(v) => setState({ split: v })}
            options={[{ value: 'fy_file', label: `${v4.refSources.fy_file} ${d.meta.fy_last}` }, { value: 'category_fuel', label: v4.refSources.category_fuel }]}
          />
        </div>
        <div className="mix-row">
          <span className="mix-label"><span className="t" title={ref.window}>{split === 'fy_file' ? d.meta.fy_last : v4.refSources.category_fuel}</span></span>
          <MixBar shares={ref.shares} title={`${v4.refBar}, ${ref.window}`} />
        </div>
      </div>
      <p className="caption">{v4.caption}</p>
      <div className="signal" aria-live="polite">
        <h3>{v4.signalHeading}</h3>
        {!sig ? (
          <div data-testid="station-signal">{v4.signalNoState}</div>
        ) : (
          <div
            data-testid="station-signal"
            data-rule={sig.rule.id}
            tabIndex={0}
            aria-describedby="signal-ratios"
            onMouseMove={(e) => showTip(e, (
              <>
                <div className="tt-title">{selected} · {sig.rule.label}</div>
                {ratioLines.length ? ratioLines.map((l) => <div key={l}>{l}</div>) : <div>{v4.signalNoMix(selected!)}</div>}
              </>
            ))}
            onMouseLeave={hideTip}
          >
            <span className="badge" style={{ marginRight: 8 }}>{sig.rule.label}</span>
            {sig.rule.guidance}
            <p id="signal-ratios" className="caption" style={{ marginTop: 4 }}>
              {ratioLines.length ? ratioLines.join(' · ') : v4.signalNoMix(selected!)}
            </p>
          </div>
        )}
        {selected && <p className="caption" style={{ marginTop: 4 }}>{signalCaveat}</p>}
      </div>
    </Card>
  );
}
