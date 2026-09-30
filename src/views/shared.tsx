import { motion } from 'framer-motion';
import { signalRatioText, v4 } from '../content';
import { GROUP_INK, GROUP_VAR } from '../lib/encodings';
import { fmtPct } from '../lib/format';
import { GROUPS, type Group } from '../types';
import type { MixShares } from '../lib/data';
import { hideTip, showTip } from '../components/overlay';
import { usePrefersReducedMotion, useWidth } from '../components/ui';
import { dur, ease } from '../lib/motion';

/** 100% stacked bar. Segments animate their widths; wide segments carry direct labels. */
/** When `india` is given (state rows), segment tooltips also show the ratio to India, e.g. "3W share 7.4%, 2.3x India". */
export function MixBar({ shares, height = 22, title, india }: { shares: MixShares; height?: number; title: string; india?: Record<Group, number> }) {
  const reduced = usePrefersReducedMotion();
  const [ref, width] = useWidth<HTMLDivElement>();
  // direct label only where it fits: "2W 74%" if room, else "74%", else nothing (tooltip + table still carry it)
  const labelFor = (g: string, w: number) => {
    const px = (w / 100) * width;
    const full = `${g} ${fmtPct(w, 0)}`;
    if (px >= full.length * 7 + 12) return full;
    if (px >= fmtPct(w, 0).length * 7 + 12) return fmtPct(w, 0);
    return null;
  };
  let acc = 0;
  const segs = GROUPS.map((g) => {
    const v = shares[g] ?? 0;
    const seg = { g, x: acc, w: v };
    acc += v;
    return seg;
  });
  return (
    <div
      ref={ref}
      style={{ position: 'relative', height, display: 'flex', width: '100%', gap: 0 }}
      onMouseLeave={hideTip}
    >
      {segs.map((s) => (
        <motion.div
          key={s.g}
          initial={reduced ? false : { width: 0 }}
          animate={{ width: `${s.w}%` }}
          transition={{ duration: reduced ? 0 : dur.slow01, ease: ease.standard }}
          style={{
            height,
            background: GROUP_VAR[s.g],
            // 2px surface gap between fills
            boxShadow: 'inset -2px 0 0 var(--card)',
            display: 'flex',
            alignItems: 'center',
            overflow: 'hidden',
            flex: 'none',
          }}
          onMouseMove={(e) =>
            showTip(e, (
              <>
                <div className="tt-title">{title}</div>
                <div className="tt-row"><span>{v4.groupLabels[s.g]}</span><span>{fmtPct(shares[s.g])}</span></div>
                {india && india[s.g] > 0 && <div>{signalRatioText(s.g, shares[s.g], (shares[s.g] ?? 0) / india[s.g])}</div>}
              </>
            ))
          }
        >
          {labelFor(s.g, s.w) && (
            <span style={{ color: GROUP_INK[s.g], fontSize: 12, fontWeight: 600, paddingLeft: 6, whiteSpace: 'nowrap' }} aria-hidden>
              {labelFor(s.g, s.w)}
            </span>
          )}
        </motion.div>
      ))}
    </div>
  );
}

export function SplitBar({ label, shares }: { label: string; shares: MixShares }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 4, display: 'flex', justifyContent: 'space-between', gap: 8 }}>
        <span>{label}</span>
        <span>2W {fmtPct(shares['2W'])} · 3W {fmtPct(shares['3W'])}</span>
      </div>
      <MixBar shares={shares} height={18} title={label} />
    </div>
  );
}
