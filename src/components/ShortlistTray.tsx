import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, ChevronUp, Download, Trash2, X } from 'lucide-react';
import { common, flags, stationSignal, tray } from '../content';
import { evInPeriod, mixOf, summaryOf, useData } from '../lib/data';
import { GROUPS, type Group } from '../types';
import { fmtDec, fmtInt, fmtPct } from '../lib/format';
import { actions, useStore } from '../lib/store';
import type { Dataset } from '../types';
import { FlagBadges, PinMark, usePrefersReducedMotion } from './ui';
import { toast } from './overlay';
import { dur, ease } from '../lib/motion';

function topRto(d: Dataset, s: string) {
  const r = d.rto.filter((x) => x.state_name === s).sort((a, b) => b.last12m - a.last12m)[0];
  return r ? `${r.office_name} (${r.office_code})` : null;
}

/** Station-type signal for a state, from whole-fleet shares against India's (same rule as the Vehicle mix view). */
function signalOf(d: Dataset, s: string) {
  const full = (x: ReturnType<typeof mixOf>) => (x && GROUPS.every((g) => x.shares[g] !== null) ? (x.shares as Record<Group, number>) : null);
  const india = full(mixOf(d, 'All India'));
  if (!india) return null;
  return stationSignal({ state: s, s: full(mixOf(d, s)), india }).rule;
}

function csvCell(v: unknown) {
  const s = v === null || v === undefined ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function exportShortlistCsv(d: Dataset, pins: string[], period: [string, string]) {
  const generated = new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
  const cols = [
    'state_name', 'data_flag_primary', 'data_flags_all', 'data_flag_notes', 'ev_in_period', 'period_from', 'period_to',
    'ev_cum_aligned_2019-01_to_2024-05', 'ev_last12m_2023-06_to_2024-05', 'ev_prior12m_2022-06_to_2023-05', 'growth_pct',
    'ev_share_last12m_pct', 'public_chargers', 'ev_per_charger_aligned', 'rank_aligned',
    'ev_cum_2019_2026', 'ev_per_charger_2019_2026', 'top_rto_last12m', 'station_signal_whole_fleet',
  ];
  const rows = pins.map((p) => {
    const r = summaryOf(d, p)!;
    return [
      p, r.data_flag, r.data_flags.join('|') || 'ok', r.data_flags.map((f) => flags[f].long).join(' '), evInPeriod(d, p, period[0], period[1]), period[0], period[1],
      r.ev_cum_aligned, r.ev_last12m, r.ev_prior12m, r.growth_pct, r.ev_share_last12m_pct, r.public_chargers,
      r.ev_per_charger_aligned, r.rank_aligned, r.ev_cum_2019_2026, r.ev_per_charger_2019_2026, topRto(d, p), signalOf(d, p)?.label ?? '',
    ];
  });
  const lines = [
    `# ${tray.csvNote(generated, period[0], period[1])}`,
    cols.join(','),
    ...rows.map((r) => r.map(csvCell).join(',')),
  ];
  const blob = new Blob([lines.join('\n') + '\n'], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ev-charging-shortlist-${new Date().toLocaleDateString('en-CA')}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function ShortlistTray() {
  const d = useData();
  const pins = useStore((s) => s.pins);
  const pinSlots = useStore((s) => s.pinSlots);
  const period = useStore((s) => s.period);
  const reduced = usePrefersReducedMotion();
  const ordered = [...pins].sort((a, b) => pinSlots[a] - pinSlots[b]);
  // the tray starts as one compact row of chips, so it never takes over the working viewport
  const [open, setOpen] = useState(false);
  // the page keeps room for the tray at its current height, so nothing ends up hidden under it
  const measure = useCallback((el: HTMLElement | null) => {
    if (!el) return;
    const ro = new ResizeObserver(() => document.documentElement.style.setProperty('--tray-h', `${Math.ceil(el.getBoundingClientRect().height)}px`));
    ro.observe(el);
  }, []);
  useEffect(() => {
    if (!pins.length) document.documentElement.style.setProperty('--tray-h', '0px');
  }, [pins.length]);
  return (
    <AnimatePresence>
      {pins.length > 0 && (
        <motion.aside
          className="tray"
          aria-label="Shortlist of pinned states"
          initial={reduced ? false : { y: '100%' }}
          animate={{ y: 0 }}
          exit={reduced ? { opacity: 0 } : { y: '100%', transition: { duration: dur.moderate02, ease: ease.exit } }}
          transition={{ duration: dur.moderate02, ease: ease.entrance }}
        >
          <div className="tray-inner" ref={measure}>
            <div className="tray-head">
              <h2>
                <button className="tray-toggle" aria-expanded={open} aria-controls="tray-cards" onClick={() => setOpen((v) => !v)}>
                  {open ? <ChevronDown size={16} aria-hidden /> : <ChevronUp size={16} aria-hidden />}
                  {tray.title(pins.length)}
                  <span className="sr-only">: {open ? tray.collapse : tray.expand}</span>
                </button>
              </h2>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-sm btn-primary" onClick={() => { exportShortlistCsv(d, ordered, period); toast(tray.exported); }}>
                  <Download size={14} aria-hidden /> {tray.export}
                </button>
                <button className="btn btn-sm btn-ghost" onClick={() => { actions.clearPins(); toast(tray.cleared); }}>
                  <Trash2 size={14} aria-hidden /> {tray.clear}
                </button>
              </div>
            </div>
            {!open && (
              <motion.ul
                className="tray-chips"
                aria-label={tray.title(pins.length)}
                initial={reduced ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: dur.moderate01, ease: ease.standard }}
              >
                {ordered.map((p) => {
                  const r = summaryOf(d, p)!;
                  return (
                    <li key={p}>
                      <button className="tray-chip" onClick={() => actions.select(p)}>
                        <PinMark slot={pinSlots[p]} /> <span className="tray-chip-name">{p}</span>
                        <span className="tray-chip-v">{r.ev_per_charger_aligned === null ? common.missing : tray.chipValue(fmtDec(r.ev_per_charger_aligned, 1))}</span>
                      </button>
                    </li>
                  );
                })}
              </motion.ul>
            )}
            <motion.div
              className="tray-cards"
              id="tray-cards"
              hidden={!open}
              initial={false}
              animate={open ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
              transition={{ duration: dur.moderate02, ease: open ? ease.entrance : ease.exit }}
            >
              {ordered.map((p) => {
                const r = summaryOf(d, p)!;
                const evp = evInPeriod(d, p, period[0], period[1]);
                const sig = signalOf(d, p);
                const noGranular = r.data_flag === 'no_granular_demand';
                return (
                  <div key={p} className="tray-card">
                    <div className="tray-card-head">
                      <button className="link-btn tray-name" onClick={() => actions.select(p)}>
                        <PinMark slot={pinSlots[p]} /> {p}
                      </button>
                      <button className="pin-btn tray-unpin" aria-label={common.unpin(p)} onClick={() => actions.togglePin(p)}>
                        <X size={14} aria-hidden />
                      </button>
                    </div>
                    <dl>
                      <dt>{tray.fields.epc}</dt><dd>{r.ev_per_charger_aligned === null ? common.missing : fmtDec(r.ev_per_charger_aligned, 1)}</dd>
                      <dt>{tray.fields.growth}</dt><dd>{fmtPct(r.growth_pct, 1, true)}</dd>
                      <dt>{tray.fields.evs}</dt><dd>{evp === null ? common.missing : fmtInt(evp)}</dd>
                      <dt>{tray.fields.chargers}</dt><dd>{r.public_chargers === null ? common.missing : fmtInt(r.public_chargers)}</dd>
                      <dt>{tray.fields.signal}</dt><dd>{sig ? sig.label : common.missing}</dd>
                    </dl>
                    {noGranular && r.ev_per_charger_2019_2026 !== null && (
                      <p className="tray-note">{tray.alt2026(fmtDec(r.ev_per_charger_2019_2026, 1))}</p>
                    )}
                    {r.data_flags.length > 0 && (
                      <div className="tray-flags"><FlagBadges flags={r.data_flags} /></div>
                    )}
                  </div>
                );
              })}
            </motion.div>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
