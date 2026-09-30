// Indian number formatting everywhere (en-IN: 39,66,252), compact axes as K / L / Cr.
const intFmt = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const MISSING = '—';

export function fmtInt(n: number | null | undefined): string {
  return n === null || n === undefined || Number.isNaN(n) ? MISSING : intFmt.format(Math.round(n));
}

export function fmtDec(n: number | null | undefined, digits = 1): string {
  if (n === null || n === undefined || Number.isNaN(n)) return MISSING;
  return new Intl.NumberFormat('en-IN', { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(n);
}

export function fmtPct(n: number | null | undefined, digits = 1, signed = false): string {
  if (n === null || n === undefined || Number.isNaN(n)) return MISSING;
  const s = fmtDec(Math.abs(n), digits);
  const sign = n < 0 ? '−' : signed && n > 0 ? '+' : '';
  return `${sign}${s}%`;
}

/** Compact Indian units: 950, 1.5K, 1.5L (lakh), 2.3Cr (crore). */
export function fmtCompact(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return MISSING;
  const a = Math.abs(n);
  const sign = n < 0 ? '−' : '';
  const trim = (x: number) => (x >= 100 ? x.toFixed(0) : x >= 10 ? x.toFixed(1).replace(/\.0$/, '') : x.toFixed(1).replace(/\.0$/, ''));
  if (a >= 1e7) return `${sign}${trim(a / 1e7)}Cr`;
  if (a >= 1e5) return `${sign}${trim(a / 1e5)}L`;
  if (a >= 1e3) return `${sign}${trim(a / 1e3)}K`;
  return `${sign}${trim(a)}`;
}

/** "2023-06" -> "Jun 2023" */
export function fmtMonth(ym: string): string {
  const [y, m] = ym.split('-');
  return `${MONTHS[Number(m) - 1]} ${y}`;
}

export function fmtRange(from: string, to: string): string {
  return `${fmtMonth(from)} to ${fmtMonth(to)}`;
}
