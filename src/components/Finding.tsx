import { useEffect, useRef } from 'react';
import { lede } from '../content';
import { summaryOf, useData } from '../lib/data';
import { fmtDec, fmtPct } from '../lib/format';
import { useStore } from '../lib/store';
import { SectionLink } from './ui';

/** The answer first: one computed sentence about the gap, for All India or the selected state. */
export function Finding() {
  const d = useData();
  const selected = useStore((s) => s.selected);
  const nat = d.national;
  const row = selected ? summaryOf(d, selected) : undefined;
  const india = nat.ev_per_charger_aligned;

  let text: string;
  if (!selected || !row) {
    const top = d.summary
      .filter((r) => r.rank_aligned !== null)
      .sort((a, b) => (a.rank_aligned as number) - (b.rank_aligned as number));
    const [a, b] = top;
    text = lede.india(
      nat.states_ranked,
      fmtDec(india, 1),
      { name: a.state_name, v: fmtDec(a.ev_per_charger_aligned, 1) },
      { name: b.state_name, v: fmtDec(b.ev_per_charger_aligned, 1) },
    );
  } else if (row.data_flag === 'no_granular_demand') {
    text = lede.noGranular(selected, row.ev_per_charger_2019_2026 === null ? null : fmtDec(row.ev_per_charger_2019_2026, 1));
  } else if (row.ev_per_charger_aligned === null || row.rank_aligned === null) {
    text = lede.noCharger(selected);
  } else {
    const ratio = india ? row.ev_per_charger_aligned / india : null;
    text = lede.state(selected, fmtDec(row.ev_per_charger_aligned, 1), ratio === null ? '—' : lede.ratio(fmtDec(ratio, 2)), row.rank_aligned, nat.states_ranked);
    if (row.growth_pct !== null) text += lede.growth(fmtPct(Math.abs(row.growth_pct), 1), row.growth_pct < 0, fmtPct(nat.growth_pct, 1, true));
  }

  // the swap animation runs when the answer changes, never on first paint, so the text is always visible by default
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
  }, []);
  const swap = mounted.current;

  return (
    <section className="finding-block" aria-labelledby="finding-h">
      <h2 id="finding-h" className="sr-only">{lede.heading}</h2>
      <div aria-live="polite">
        <p key={text} className={`finding${swap ? ' finding-swap' : ''}`} data-testid="finding">{text}</p>
      </div>
      <SectionLink className="finding-link" to="how-to-read">{lede.howToRead}</SectionLink>
    </section>
  );
}
