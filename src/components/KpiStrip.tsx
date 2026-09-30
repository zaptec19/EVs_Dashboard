import type { ReactNode } from 'react';
import { kpi, flags, howToRead } from '../content';
import { evInPeriod, isSmallBase, summaryOf, useData } from '../lib/data';
import { fmtDec, fmtInt, fmtPct, fmtRange } from '../lib/format';
import { useStore } from '../lib/store';
import { FlagBadge, InfoPopover } from './ui';

/** Figures show at their value straight away: nothing counts up, so a returning reader reads immediately. */
function Tile({ label, help, value, format, na, cmp, testId, children }: {
  label: string; help?: string; value: number | null; format: (n: number) => string;
  na?: ReactNode; cmp?: ReactNode; testId: string; children?: ReactNode;
}) {
  return (
    <div className="card kpi">
      <div className="kpi-label">
        <span>{label}</span>
        {help && <InfoPopover text={help} label={`${label}: definition`} />}
      </div>
      {value === null ? (
        <div className="kpi-value na" data-testid={testId} data-value="">{na}</div>
      ) : (
        <div className="kpi-value" data-testid={testId} data-value={value}>
          <span key={format(value)} className="kpi-tick">{format(value)}</span>
        </div>
      )}
      {cmp && <div className="kpi-cmp">{cmp}</div>}
      {children}
    </div>
  );
}

/** A one-line scale: the state's value as a dot, India as a tick, so "153.3" is read against something. */
function IndiaScale({ state, value, india }: { state: string; value: number; india: number }) {
  const max = Math.max(value, india) * 1.15;
  return (
    <div className="kpi-scale" role="img" aria-label={kpi.scaleAria(state, fmtDec(value, 1), fmtDec(india, 1))}>
      <span className="kpi-scale-track" />
      <span className="kpi-scale-india" style={{ left: `${(india / max) * 100}%` }}><span>India</span></span>
      <span className="kpi-scale-state" style={{ left: `${(value / max) * 100}%` }} />
    </div>
  );
}

export function KpiStrip() {
  const d = useData();
  const selected = useStore((s) => s.selected);
  const period = useStore((s) => s.period);
  const m = d.meta;
  const nat = d.national;
  const row = selected ? summaryOf(d, selected) : undefined;
  const indiaPeriod = evInPeriod(d, null, period[0], period[1]);
  const statePeriod = selected ? evInPeriod(d, selected, period[0], period[1]) : indiaPeriod;
  const isState = !!selected && !!row;
  const noGranular = isState && row!.data_flag === 'no_granular_demand';

  const pctOf = (a: number | null, b: number | null) => (a === null || b === null || b === 0 ? null : (a / b) * 100);

  const evNa = noGranular ? (
    <>
      {kpi.noGranular(selected!)}
      <div className="kpi-cmp">{kpi.alt2026(fmtInt(row!.ev_cum_2019_2026))}</div>
    </>
  ) : kpi.noCharger;

  const growth = isState ? row!.growth_pct : nat.growth_pct;
  const growthNa = noGranular ? kpi.noGranular(selected!) : kpi.notComputablePrior0;

  // the lead figure: EVs per public charger, read against India, with the rank folded in
  const epc = isState ? row!.ev_per_charger_aligned : nat.ev_per_charger_aligned;
  const india = nat.ev_per_charger_aligned;
  let epcNa: ReactNode = kpi.noCharger;
  if (noGranular) {
    epcNa = (
      <>
        {kpi.noGranular(selected!)}
        <div className="kpi-cmp">{kpi.epcAlt2026(fmtDec(row!.ev_per_charger_2019_2026, 1))}</div>
      </>
    );
  }
  const rank = isState ? row!.rank_aligned : null;
  const ratio = isState && epc !== null && india ? epc / india : null;

  const chargers = isState ? row!.public_chargers : nat.public_chargers;
  // definitions from "How to read this", shown beside the figure they define
  const defs = Object.fromEntries(
    howToRead.items({ l12: fmtRange(m.last12_from, m.last12_to), p12: fmtRange(m.prior12_from, m.prior12_to), aligned: fmtRange(m.granular_from, m.granular_to) }).map((it) => [it.h, it.p]),
  );

  return (
    <>
      <div className="kpis" role="region" aria-label="Key figures">
        <Tile
          testId="kpi-epc"
          label={kpi.epc}
          help={defs['EVs per public charger']}
          value={epc}
          format={(n) => fmtDec(n, 1)}
          na={epcNa}
          cmp={isState ? (ratio !== null ? kpi.ratioToIndia(`${fmtDec(ratio, 2)}×`, fmtDec(india, 1)) : undefined) : kpi.indiaEpcNote(nat.states_in_epc_aligned)}
        >
          {isState && epc !== null && india !== null && <IndiaScale state={selected!} value={epc} india={india} />}
          {/* when the state has no figure, the tile already says why; the rank line stays silent rather than repeat it */}
          <div className="kpi-rank" hidden={rank === null && isState}>
            <span data-testid="kpi-rank" data-value={rank ?? ''}>
              {rank !== null ? kpi.rankLine(rank, nat.states_ranked) : isState ? '' : kpi.rankNone}
            </span>
          </div>
        </Tile>
        <Tile
          testId="kpi-ev-period"
          label={kpi.evPeriod}
          help={`${defs['EVs registered in period']} ${defs['Chargeable EV']}`}
          value={statePeriod}
          format={fmtInt}
          na={evNa}
          cmp={isState && statePeriod !== null ? kpi.shareOfIndia(fmtPct(pctOf(statePeriod, indiaPeriod))) + ` · ${kpi.indiaCompare(fmtInt(indiaPeriod))}` : undefined}
        />
        <Tile
          testId="kpi-growth"
          label={kpi.growth}
          help={defs['Growth']}
          value={growth}
          format={(n) => fmtPct(n, 1, true)}
          na={growthNa}
          cmp={
            <>
              {isState && kpi.indiaCompare(fmtPct(nat.growth_pct, 1, true))}
              {isState && isSmallBase(d, row!) && <div>{flags.small_base.label}: {flags.small_base.long}</div>}
            </>
          }
        />
        <Tile
          testId="kpi-chargers"
          label={kpi.chargers}
          value={chargers}
          format={fmtInt}
          na={kpi.noCharger}
          cmp={isState && chargers !== null ? `${kpi.shareOfIndia(fmtPct(pctOf(chargers, nat.public_chargers)))} · ${kpi.indiaCompare(fmtInt(nat.public_chargers))}` : undefined}
        />
      </div>
      {isState && row!.data_flags.length > 0 && (
        <div className="flag-notes" role="note" data-testid="state-flags">
          <strong>{kpi.flagsHeading(selected!)}</strong>
          {row!.data_flags.map((f) => (
            <span key={f}><FlagBadge flag={f} /> {flags[f].long}</span>
          ))}
        </div>
      )}
    </>
  );
}
