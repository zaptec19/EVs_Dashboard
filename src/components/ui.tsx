import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Info, Pin, PinOff, Table2, TriangleAlert } from 'lucide-react';
import { common, flags as flagText } from '../content';
import { symbolPath, PIN_COLOR } from '../lib/encodings';
import { actions, useStore } from '../lib/store';
import { toast } from './overlay';
import { dur, ease } from '../lib/motion';

// ------------------------------------------------------------------ Card
interface CardProps {
  id?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  scope?: string;
  info?: string;
  tools?: ReactNode;
  children: ReactNode;
  /** A real <table> revealed by "View data table". */
  table?: ReactNode;
  footer?: ReactNode;
  className?: string;
  index?: number;
  /** The views that answer the question (map, gap ranking) carry a larger title than the context views. */
  primary?: boolean;
}

export function Card({ id, title, subtitle, scope, info, tools, children, table, footer, className = '', primary = false }: CardProps) {
  const [showTable, setShowTable] = useState(false);
  const tableId = useId();
  const headingId = useId();
  return (
    <section
      id={id}
      className={`card ${primary ? 'card-primary ' : ''}${className}`}
      aria-labelledby={headingId}
    >
      <div className="card-head">
        <div>
          <div className="card-title">
            <h2 id={headingId}>{title}</h2>
            {scope && <span className="scope-tag">{scope}</span>}
            {info && <InfoPopover text={info} label={`${common.info}: ${typeof title === 'string' ? title : ''}`} />}
          </div>
          {subtitle && <p className="card-sub">{subtitle}</p>}
        </div>
        {tools && <div className="card-tools">{tools}</div>}
      </div>
      {children}
      {(table || footer) && (
        <div className="card-foot">
          <div>{footer}</div>
          {table && (
            <button className="link-btn btn-ghost" aria-expanded={showTable} aria-controls={tableId} onClick={() => setShowTable((v) => !v)}>
              <Table2 size={14} aria-hidden /> {showTable ? common.hideTable : common.viewTable}
            </button>
          )}
        </div>
      )}
      {table && (
        <div id={tableId} hidden={!showTable}>
          {showTable && <div className="table-wrap">{table}</div>}
        </div>
      )}
    </section>
  );
}

// ------------------------------------------------------------------ Info popover
export function InfoPopover({ text, label, align = 'left' }: { text: ReactNode; label: string; align?: 'left' | 'right' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const popId = useId();
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey, true);
    };
  }, [open]);
  return (
    <div className="info" ref={ref}>
      <button className="info-btn btn-ghost" aria-label={label} aria-expanded={open} aria-controls={popId} onClick={() => setOpen((v) => !v)}>
        <Info size={16} aria-hidden />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            id={popId}
            role="note"
            className={`info-pop ${align}`}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: dur.fast02, ease: ease.standard }}
          >
            {text}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ------------------------------------------------------------------ Segmented toggle
export function Segmented<T extends string>({
  label, value, options, onChange,
}: { label: string; value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const onKey = (e: React.KeyboardEvent, i: number) => {
    const d = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    const n = (i + d + options.length) % options.length;
    onChange(options[n].value);
    refs.current[n]?.focus();
  };
  return (
    <div className="seg" role="radiogroup" aria-label={label}>
      {options.map((o, i) => (
        <button
          key={o.value}
          ref={(el) => (refs.current[i] = el)}
          role="radio"
          aria-checked={value === o.value}
          tabIndex={value === o.value ? 0 : -1}
          onClick={() => onChange(o.value)}
          onKeyDown={(e) => onKey(e, i)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ------------------------------------------------------------------ Pins
export function PinMark({ slot, size = 12, title }: { slot: number; size?: number; title?: string }) {
  const s = size;
  return (
    <svg width={s} height={s} viewBox={`${-s / 2} ${-s / 2} ${s} ${s}`} aria-hidden={title ? undefined : true} role={title ? 'img' : undefined} style={{ flex: 'none' }}>
      {title && <title>{title}</title>}
      <path d={symbolPath(slot, s * s * 0.5)} style={{ fill: PIN_COLOR(slot) }} />
    </svg>
  );
}

export function PinButton({ state }: { state: string }) {
  const pinned = useStore((s) => s.pins.includes(state));
  return (
    <button
      className="pin-btn"
      aria-pressed={pinned}
      aria-label={pinned ? common.unpin(state) : common.pin(state)}
      title={pinned ? common.unpin(state) : common.pin(state)}
      onClick={(e) => {
        e.stopPropagation();
        const r = actions.togglePin(state);
        if (r === 'full') toast(common.pinsFull(state));
        else toast(r === 'pinned' ? common.pinned(state) : common.unpinned(state));
      }}
    >
      {pinned ? <PinOff size={16} aria-hidden /> : <Pin size={16} aria-hidden />}
    </button>
  );
}

/** Colour + shape marker for a pinned state, or nothing. */
export function StateMarker({ state }: { state: string }) {
  const slot = useStore((s) => s.pinSlots[state]);
  if (slot === undefined) return null;
  return <PinMark slot={slot} title={`Pinned`} />;
}

// ------------------------------------------------------------------ Flags
export function FlagBadge({ flag }: { flag: string }) {
  if (flag === 'ok') return null;
  const t = flagText[flag];
  // small base is a caution (warning-yellow badge with an icon); the reporting gaps are neutral tags
  const warn = flag === 'small_base';
  return (
    <span className={`badge ${warn ? 'badge-warn' : 'badge-neutral'}`} title={t.long}>
      {warn && <TriangleAlert size={12} aria-hidden />}
      {t.label}
    </span>
  );
}

/** Every flag that applies to a state (not just the primary one). */
export function FlagBadges({ flags }: { flags: string[] }) {
  return <>{flags.map((f) => <FlagBadge key={f} flag={f} />)}</>;
}

export const flagLabels = (flags: string[]) => (flags.length ? flags.map((f) => flagText[f].label).join(', ') : flagText.ok.label);

// ------------------------------------------------------------------ size hook
/** Callback ref + measured content width; survives the element remounting. */
export function useWidth<T extends HTMLElement>(): [(el: T | null) => void, number] {
  const [w, setW] = useState(0);
  const ro = useRef<ResizeObserver | null>(null);
  const ref = useCallback((el: T | null) => {
    // React calls this with null on unmount, which is where the observer is released.
    ro.current?.disconnect();
    ro.current = null;
    if (!el) return;
    setW(Math.floor(el.getBoundingClientRect().width));
    ro.current = new ResizeObserver((entries) => setW(Math.floor(entries[0].contentRect.width)));
    ro.current.observe(el);
  }, []);
  return [ref, w];
}

export function usePrefersReducedMotion() {
  const [r, setR] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const f = () => setR(mq.matches);
    mq.addEventListener('change', f);
    return () => mq.removeEventListener('change', f);
  }, []);
  return r;
}

/** True while the media query matches (e.g. the Carbon sm breakpoint). */
export function useMediaQuery(q: string) {
  const [m, setM] = useState(() => window.matchMedia(q).matches);
  useEffect(() => {
    const mq = window.matchMedia(q);
    const f = () => setM(mq.matches);
    mq.addEventListener('change', f);
    return () => mq.removeEventListener('change', f);
  }, [q]);
  return m;
}

/** In-page link that scrolls to a section (opening it if collapsed) without touching the URL hash,
 *  because the hash carries the dashboard's state and a fragment like #how-to-read would reset it. */
export function SectionLink({ to, className, children }: { to: string; className?: string; children: ReactNode }) {
  return (
    <a
      href={`#${to}`}
      className={className}
      onClick={(e) => {
        e.preventDefault();
        const el = document.getElementById(to);
        if (!el) return;
        const det = el.querySelector('details');
        if (det) det.open = true;
        el.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
        (el.querySelector('summary, h2') as HTMLElement | null)?.focus({ preventScroll: true });
      }}
    >
      {children}
    </a>
  );
}
