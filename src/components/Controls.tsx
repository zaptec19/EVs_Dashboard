import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Moon, RotateCcw, Search, Share2, Sun, X } from 'lucide-react';
import { controls, header } from '../content';
import { allStateNames, useData } from '../lib/data';
import { fmtMonth } from '../lib/format';
import { actions, getState, setState, useStore, hashFor } from '../lib/store';
import { flags } from '../content';
import { toast } from './overlay';

// ------------------------------------------------------------------ header
/** Carbon top nav (48px app bar) with the page title block under it. */
export function Header() {
  return (
    <>
      <header className="appbar">
        {/* the product name; the page h1 below carries it for assistive tech */}
        <span className="appbar-name" aria-hidden>{header.title}</span>
        <div className="appbar-actions">
          <ShareButton />
          <ThemeToggle />
        </div>
      </header>
      <div className="titleblock">
        <h1>{header.title}</h1>
        <p>{header.subtitle}</p>
      </div>
    </>
  );
}

export function ShareButton() {
  const share = async () => {
    const url = window.location.href.split('#')[0] + hashFor(getState());
    try {
      await navigator.clipboard.writeText(url);
      toast(controls.shareCopied);
    } catch {
      toast(controls.shareFailed);
    }
  };
  return (
    <button className="btn btn-tertiary" onClick={share}>
      <Share2 size={16} aria-hidden /> {controls.share}
    </button>
  );
}

export function ThemeToggle() {
  const theme = useStore((s) => s.theme);
  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    const root = document.documentElement;
    root.classList.add('theme-switching');
    root.setAttribute('data-theme', next);
    try {
      localStorage.setItem('evdash-theme', next);
    } catch {
      /* storage unavailable: theme still applies for this visit */
    }
    setState({ theme: next });
    window.setTimeout(() => root.classList.remove('theme-switching'), 250);
  };
  const label = theme === 'dark' ? header.themeToLight : header.themeToDark;
  return (
    <button className="icon-btn btn-ghost" onClick={toggle} aria-label={label} title={label}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={theme}
          style={{ display: 'inline-flex' }}
          initial={{ opacity: 0, rotate: -90, scale: 0.6 }}
          animate={{ opacity: 1, rotate: 0, scale: 1 }}
          exit={{ opacity: 0, rotate: 90, scale: 0.6 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
        >
          {theme === 'dark' ? <Moon size={18} aria-hidden /> : <Sun size={18} aria-hidden />}
        </motion.span>
      </AnimatePresence>
    </button>
  );
}

// ------------------------------------------------------------------ combobox
export function StateCombobox() {
  const d = useData();
  const selected = useStore((s) => s.selected);
  const names = useMemo(() => allStateNames(d), [d]);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();
  const labelId = useId();

  useEffect(() => {
    if (!open) setQuery(selected ?? '');
  }, [selected, open]);

  const options = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = [controls.stateAllIndia, ...names];
    if (!q || q === (selected ?? '').toLowerCase()) return list;
    return list.filter((n) => n.toLowerCase().includes(q));
  }, [query, names, selected]);

  const choose = (name: string) => {
    actions.select(name === controls.stateAllIndia ? null : name);
    setOpen(false);
    setQuery(name === controls.stateAllIndia ? '' : name);
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setActive((a) => Math.min(a + 1, options.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === 'Enter') {
      if (open && options[active]) {
        e.preventDefault();
        choose(options[active]);
      }
    } else if (e.key === 'Escape') {
      if (open) {
        e.stopPropagation();
        e.nativeEvent.stopImmediatePropagation();
        setOpen(false);
        setQuery(selected ?? '');
      }
    }
  };

  const flagsOf = (n: string) => d.summary.find((r) => r.state_name === n)?.data_flags ?? [];

  return (
    <div className="control">
      <span className="control-label" id={labelId}>{controls.stateLabel}</span>
      <div className="combo">
        <Search size={16} className="combo-icon" aria-hidden />
        <input
          ref={inputRef}
          role="combobox"
          aria-labelledby={labelId}
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open && options[active] ? `${listId}-${active}` : undefined}
          placeholder={controls.statePlaceholder}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setActive(0);
          }}
          onFocus={(e) => {
            e.target.select();
            setOpen(true);
            setActive(0);
          }}
          onBlur={() => window.setTimeout(() => setOpen(false), 120)}
          onKeyDown={onKey}
        />
        {selected && (
          <button className="combo-clear" aria-label={`${controls.stateAllIndia}: clear selection`} onClick={() => choose(controls.stateAllIndia)}>
            <X size={16} aria-hidden />
          </button>
        )}
        {open && (
          <ul id={listId} role="listbox" aria-labelledby={labelId} tabIndex={-1}>
            {options.length === 0 && <li aria-disabled="true">{controls.stateNoMatch(query.trim())}</li>}
            {options.map((n, i) => (
              <li
                key={n}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === active}
                onMouseDown={(e) => {
                  e.preventDefault();
                  choose(n);
                }}
                onMouseEnter={() => setActive(i)}
              >
                <span>{n}</span>
                {n !== controls.stateAllIndia && flagsOf(n).length > 0 && <span className="muted">{flagsOf(n).map((f) => flags[f].label).join(', ')}</span>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ period slider
export function PeriodSlider() {
  const d = useData();
  const months = d.stateMonth.months;
  const period = useStore((s) => s.period);
  const a = months.indexOf(period[0]);
  const b = months.indexOf(period[1]);
  const max = months.length - 1;
  const labelId = useId();
  const set = (i: number, j: number) => setState({ period: [months[Math.min(i, j)], months[Math.max(i, j)]] });
  return (
    <div className="control period">
      <span className="control-label" id={labelId}>{controls.periodLabel}</span>
      <div className="range-row">
      <span className="range-value" aria-hidden>{fmtMonth(months[a])}</span>
      <div className="range" role="group" aria-labelledby={labelId}>
        <div className="range-track" />
        <div className="range-fill" style={{ left: `${(a / max) * 100}%`, right: `${100 - (b / max) * 100}%` }} />
        <input
          type="range"
          min={0}
          max={max}
          value={a}
          aria-label={controls.periodFrom}
          aria-valuetext={fmtMonth(months[a])}
          onChange={(e) => set(Math.min(Number(e.target.value), b), b)}
        />
        <input
          type="range"
          min={0}
          max={max}
          value={b}
          aria-label={controls.periodTo}
          aria-valuetext={fmtMonth(months[b])}
          onChange={(e) => set(a, Math.max(Number(e.target.value), a))}
        />
      </div>
      <span className="range-value" aria-hidden>{fmtMonth(months[b])}</span>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ bar
export function ControlBar() {
  const selected = useStore((s) => s.selected);
  const period = useStore((s) => s.period);
  const crumb = controls.breadcrumb(selected ?? controls.stateAllIndia, period[0], period[1]);
  const [spoken, setSpoken] = useState(crumb);
  useEffect(() => {
    const t = window.setTimeout(() => setSpoken(crumb), 700);
    return () => window.clearTimeout(t);
  }, [crumb]);
  return (
    <div className="controlbar" role="region" aria-label="Dashboard controls">
      <div className="controlbar-inner">
        <StateCombobox />
        <PeriodSlider />
        <div className="control-actions">
          <span className="esc-hint">{controls.escHint}</span>
          <button className="btn btn-ghost" onClick={() => { actions.reset(); toast(controls.resetDone); }}>
            <RotateCcw size={16} aria-hidden /> {controls.reset}
          </button>
        </div>
      </div>
      {/* the selection is visible in the controls themselves; the summary is announced once the slider settles */}
      <span className="sr-only" aria-live="polite">{spoken}</span>
    </div>
  );
}
