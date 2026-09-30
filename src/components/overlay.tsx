// A single shared tooltip and a toast region, driven by tiny module-level stores.
import { useSyncExternalStore, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { dur, ease } from '../lib/motion';

// ------------------------------------------------------------------ tooltip
interface Tip { x: number; y: number; content: ReactNode }
let tip: Tip | null = null;
const tipListeners = new Set<() => void>();
const emitTip = () => tipListeners.forEach((l) => l());

export function showTip(e: { clientX: number; clientY: number }, content: ReactNode) {
  tip = { x: e.clientX, y: e.clientY, content };
  emitTip();
}
export function hideTip() {
  if (!tip) return;
  tip = null;
  emitTip();
}

export function TooltipLayer() {
  const t = useSyncExternalStore(
    (cb) => { tipListeners.add(cb); return () => tipListeners.delete(cb); },
    () => tip,
  );
  const vw = window.innerWidth;
  const left = t ? Math.min(t.x + 14, vw - 292) : 0;
  const top = t ? t.y + 14 : 0;
  return (
    <AnimatePresence>
      {t && (
        <motion.div
          className="tooltip"
          role="presentation"
          style={{ left: Math.max(8, left), top }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: dur.fast02, ease: ease.standard }}
        >
          {t.content}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ------------------------------------------------------------------ toasts
interface ToastItem { id: number; text: string }
let toasts: ToastItem[] = [];
let nextId = 1;
const toastListeners = new Set<() => void>();
const emitToast = () => toastListeners.forEach((l) => l());

export function toast(text: string) {
  const id = nextId++;
  toasts = [...toasts.slice(-2), { id, text }];
  emitToast();
  window.setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== id);
    emitToast();
  }, 2600);
}

export function ToastRegion() {
  const list = useSyncExternalStore(
    (cb) => { toastListeners.add(cb); return () => toastListeners.delete(cb); },
    () => toasts,
  );
  return (
    <div className="toast-region" role="status" aria-live="polite">
      <AnimatePresence>
        {list.map((t) => (
          <motion.div
            key={t.id}
            className="toast"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: dur.moderate01, ease: ease.standard }}
          >
            {t.text}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
