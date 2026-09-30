import { useEffect, useMemo, useRef, useState } from 'react';
import { LayoutGroup, motion } from 'framer-motion';
import { ArrowUp, TriangleAlert } from 'lucide-react';
import { flags, kpi, v3 } from '../content';
import { useData } from '../lib/data';
import { fmtDec, fmtInt, fmtPct, fmtRange } from '../lib/format';
import { actions, setState, useStore, type GapSource } from '../lib/store';
import type { StateSummary } from '../types';
import { Card, FlagBadges, flagLabels, PinButton, Segmented, StateMarker, useMediaQuery, usePrefersReducedMotion } from '../components/ui';
import { dur, ease } from '../lib/motion';

function valueOf(r: StateSummary, src: GapSource) {
  return src === 'aligned' ? r.ev_per_charger_aligned : r.ev_per_charger_2019_2026;
}
function evsOf(r: StateSummary, src: GapSource) {
  return src === 'aligned' ? r.ev_cum_aligned : r.ev_cum_2019_2026;
}
function reasonOf(r: StateSummary, src: GapSource) {
  if (r.public_chargers === null) return kpi.noCharger;
  if (src === 'aligned' && r.data_flag === 'no_granular_demand') return flags.no_granular_demand.long;
  return '';
}

export function GapRanking({ index }: { index: number }) {
  const d = useData();
  const src = useStore((s) => s.gapSource);
  const hideFlagged = useStore((s) => s.hideFlagged);
  const selected = useStore((s) => s.selected);
  const hovered = useStore((s) => s.hovered);
  const reduced = usePrefersReducedMotion();
  const listRef = useRef<HTMLDivElement>(null);
  const m = d.meta;
  const [sort, setSort] = useState<'gap' | 'growth'>('gap');
  const [scrolled, setScrolled] = useState(false);
  const phone = useMediaQuery('(max-width: 671px)');
  const [showAll, setShowAll] = useState(false);
  const TOP_N = 10;

  const { ranked, unranked } = useMemo(() => {
    const pool = d.summary.filter((r) => !hideFlagged || r.data_flag === 'ok');
    const ranked = pool.filter((r) => valueOf(r, src) !== null).sort((a, b) => valueOf(b, src)! - valueOf(a, src)!);
    const unranked = pool.filter((r) => valueOf(r, src) === null).sort((a, b) => a.state_name.localeCompare(b.state_name));
    return { ranked, unranked };
  }, [d, src, hideFlagged]);
  const max = Math.max(...ranked.map((r) => valueOf(r, src)!), 1);
  // rank is always the gap rank; the sort only changes the order rows are shown in
  const gapRank = new Map(ranked.map((r, i) => [r.state_name, i + 1]));
  const ordered = sort === 'gap' ? ranked : [...ranked].sort((a, b) => (b.growth_pct ?? -Infinity) - (a.growth_pct ?? -Infinity));
  // on a phone, the top 10 plus the selected state, unless the reader asks for all
  const capped = phone && !showAll;
  const shown = capped ? ordered.filter((r, i) => i < TOP_N || r.state_name === selected) : ordered;
  const india = src === 'aligned' ? d.national.ev_per_charger_aligned : d.national.ev_per_charger_2019_2026;
  const srcLabel = v3.sources[src === 'aligned' ? 'aligned' : 'current'];

  // keep the selected row in view when it is selected elsewhere (map, combobox, mix),
  // and again whenever the list changes size (on load it settles to the map card's height after first paint)
  useEffect(() => {
    const list = listRef.current;
    if (!list || !selected) return;
    const keepInView = (smooth: boolean) => {
      const el = list.querySelector<HTMLElement>(`[data-state="${CSS.escape(selected)}"]`);
      if (!el) return;
      const top = el.getBoundingClientRect().top - list.getBoundingClientRect().top + list.scrollTop;
      if (top < list.scrollTop || top + el.offsetHeight > list.scrollTop + list.clientHeight) {
        list.scrollTo({ top: top - 8, behavior: smooth && !reduced ? 'smooth' : 'auto' });
      }
    };
    keepInView(true);
    const ro = new ResizeObserver(() => keepInView(false));
    ro.observe(list);
    return () => ro.disconnect();
  }, [selected, reduced]);

  const table = (
    <table className="data">
      <caption>{v3.tableCaption(srcLabel)}</caption>
      <thead><tr><th scope="col">State</th><th scope="col">Rank</th><th scope="col">{v3.cols.epc}</th><th scope="col">{v3.cols.evs}</th><th scope="col">{v3.cols.chargers}</th><th scope="col">{v3.cols.growth}</th><th scope="col">Flag</th></tr></thead>
      <tbody>
        {[...ranked, ...unranked].map((r, i) => (
          <tr key={r.state_name}>
            <th scope="row">{r.state_name}</th><td>{valueOf(r, src) === null ? '—' : i + 1}</td><td>{valueOf(r, src) === null ? reasonOf(r, src) : fmtDec(valueOf(r, src), 1)}</td>
            <td>{fmtInt(evsOf(r, src))}</td><td>{fmtInt(r.public_chargers)}</td><td>{fmtPct(r.growth_pct, 1, true)}</td><td>{flagLabels(r.data_flags)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  return (
    <Card
      index={index}
      className="col-4"
      primary
      title={v3.title}
      subtitle={v3.subtitle}
      info={v3.info}
      table={table}
      footer={
        <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
          {src === 'aligned' ? kpi.epcWindow(m.granular_from, m.granular_to) : v3.footerCurrent(m.fuel_state_end_month)}
          {' · '}{v3.growthWindow(fmtRange(m.last12_from, m.last12_to))}
        </span>
      }
    >
      <div className="gap-tools">
        <Segmented<GapSource>
          label="Demand source"
          value={src}
          onChange={(v) => setState({ gapSource: v })}
          options={[{ value: 'aligned', label: v3.sources.aligned }, { value: 'current', label: v3.sources.current }]}
        />
        <Segmented<'gap' | 'growth'>
          label={v3.sortLabel}
          value={sort}
          onChange={setSort}
          options={[{ value: 'gap', label: v3.sorts.gap }, { value: 'growth', label: v3.sorts.growth }]}
        />
        <label className="check">
          <input type="checkbox" checked={hideFlagged} onChange={(e) => setState({ hideFlagged: e.target.checked })} />
          {v3.hideFlagged}
        </label>
      </div>
      <p className="gap-legend">
        <span className="gap-legend-bar" aria-hidden /> {v3.cols.epc} <span className="gap-legend-tick" aria-hidden /> {v3.indiaTick} {fmtDec(india, 0)}
      </p>
      {src === 'current' && (
        <div className="warn" role="note">
          <TriangleAlert size={16} aria-hidden style={{ flex: 'none', marginTop: 2 }} />
          <span>{v3.currentWarning}</span>
        </div>
      )}
      {scrolled && !phone && (
        <button className="btn btn-ghost btn-sm gap-top" onClick={() => listRef.current?.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' })}>
          <ArrowUp size={16} aria-hidden /> {v3.jumpTop}
        </button>
      )}
      <div
        className="gap-list"
        ref={listRef}
        onScroll={(e) => setScrolled((e.target as HTMLElement).scrollTop > 40)}
        role="list"
        aria-label={v3.aria(srcLabel, ranked.slice(0, 3).map((r) => `${r.state_name} ${fmtDec(valueOf(r, src), 0)}`), fmtDec(india, 1))}
        onMouseLeave={() => actions.hover(null)}
      >
        <LayoutGroup>
          {shown.map((r) => {
            const v = valueOf(r, src)!;
            const i = gapRank.get(r.state_name)! - 1;
            const isSel = r.state_name === selected;
            return (
              <motion.div
                layout={reduced ? false : 'position'}
                transition={{ duration: dur.slow01, ease: ease.standard }}
                key={r.state_name}
                data-state={r.state_name}
                role="listitem"
                className={`gap-row ${isSel ? 'selected' : ''} ${hovered === r.state_name ? 'hovered' : ''}`}
                onMouseEnter={() => actions.hover(r.state_name)}
              >
                <button
                  className="gap-main"
                  aria-pressed={isSel}
                  aria-label={v3.rowLabel(i + 1, r.state_name, fmtDec(v, 0), fmtInt(evsOf(r, src)), fmtInt(r.public_chargers), r.growth_pct === null ? '—' : fmtPct(r.growth_pct, 1, true), r.data_flags.map((f) => flags[f].label).join(', '))}
                  onClick={() => actions.select(isSel ? null : r.state_name)}
                  data-testid={`gap-row-${r.state_name}`}
                >
                  <span className="gap-name"><span className="gap-rank">{i + 1}</span><StateMarker state={r.state_name} /><span>{r.state_name}</span></span>
                  <span className="gap-bar-wrap" aria-hidden>
                    {india !== null && <span className="gap-india" style={{ left: `${(india / max) * 100}%` }} />}
                    <motion.span
                      className="gap-bar"
                      style={{ display: 'block', width: '100%', transformOrigin: '0 50%', background: r.data_flag === 'ok' ? 'var(--bar)' : 'var(--bar-muted)' }}
                      initial={reduced ? false : { scaleX: 0 }}
                      animate={{ scaleX: v / max }}
                      transition={{ duration: dur.slow01, ease: ease.standard }}
                    />
                  </span>
                  <span className="gap-val">{fmtDec(v, 0)}</span>
                  <span className="gap-meta">
                    <span>{v3.cols.evs} {fmtInt(evsOf(r, src))}</span>
                    <span>{v3.cols.chargers} {fmtInt(r.public_chargers)}</span>
                    <span>{v3.cols.growth} {r.growth_pct === null ? '—' : fmtPct(r.growth_pct, 1, true)}</span>
                    <FlagBadges flags={r.data_flags} />
                  </span>
                </button>
                <PinButton state={r.state_name} />
              </motion.div>
            );
          })}
          {phone && ordered.length > TOP_N && (
            <div role="listitem" className="gap-more">
              <button className="btn btn-ghost" onClick={() => setShowAll((v) => !v)} aria-expanded={showAll}>
                {showAll ? v3.showTop(TOP_N) : v3.showAll(ordered.length)}
              </button>
            </div>
          )}
          <motion.div layout={reduced ? false : 'position'} className="gap-row india-row" role="listitem">
            <div className="gap-main" style={{ cursor: 'default' }}>
              <span className="gap-name"><span className="gap-rank" />{v3.indiaRow}</span>
              <span className="gap-bar-wrap" aria-hidden>
                <span className="gap-bar" style={{ display: 'block', width: `${((india ?? 0) / max) * 100}%`, background: 'var(--text-2)' }} />
              </span>
              <span className="gap-val">{fmtDec(india, 0)}</span>
              <span className="gap-meta">{kpi.indiaEpcNote(src === 'aligned' ? d.national.states_in_epc_aligned : d.national.states_in_epc_2019_2026)}</span>
            </div>
          </motion.div>
          {unranked.length > 0 && (
            <motion.div layout={reduced ? false : 'position'} role="listitem">
              <div className="list-subhead">{v3.unavailableHeading}</div>
              {unranked.map((r) => {
                const isSel = r.state_name === selected;
                return (
                  <div key={r.state_name} data-state={r.state_name} className={`gap-row ${isSel ? 'selected' : ''} ${hovered === r.state_name ? 'hovered' : ''}`} onMouseEnter={() => actions.hover(r.state_name)}>
                    <button
                      className="gap-main"
                      aria-pressed={isSel}
                      aria-label={v3.rowLabelUnranked(r.state_name, reasonOf(r, src))}
                      onClick={() => actions.select(isSel ? null : r.state_name)}
                      data-testid={`gap-row-${r.state_name}`}
                    >
                      <span className="gap-name"><span className="gap-rank">–</span><StateMarker state={r.state_name} />{r.state_name}</span>
                      <span className="gap-meta gap-reason">{reasonOf(r, src)}</span>
                      <span className="gap-meta">
                        <span>{v3.cols.evs} {fmtInt(evsOf(r, src))}</span>
                        <span>{v3.cols.chargers} {fmtInt(r.public_chargers)}</span>
                        <FlagBadges flags={r.data_flags} />
                      </span>
                    </button>
                    <PinButton state={r.state_name} />
                  </div>
                );
              })}
            </motion.div>
          )}
        </LayoutGroup>
      </div>
    </Card>
  );
}
