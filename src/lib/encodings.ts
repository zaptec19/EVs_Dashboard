// Identity encodings shared by every view, so a pinned state looks the same everywhere.
import * as d3 from 'd3';
import type { Group } from '../types';

/** Okabe-Ito hues (tuned per theme in tokens.css) + shape + dash, by pin slot. */
export const PIN_COLOR = (slot: number) => `var(--pin-${slot + 1})`;
export const PIN_SHAPES = [d3.symbolCircle, d3.symbolSquare, d3.symbolTriangle, d3.symbolDiamond, d3.symbolCross];
export const PIN_SHAPE_NAMES = ['circle', 'square', 'triangle', 'diamond', 'cross'];
export const PIN_DASH = ['none', '7 3', '2 3', '9 3 2 3', '4 2 1 2'];

export function symbolPath(slot: number, size = 64) {
  return d3.symbol(PIN_SHAPES[slot % PIN_SHAPES.length], size)() ?? '';
}

export const GROUP_VAR: Record<Group, string> = {
  '2W': 'var(--cat-2w)',
  '3W': 'var(--cat-3w)',
  'Cars/LMV': 'var(--cat-car)',
  Commercial: 'var(--cat-com)',
  Other: 'var(--cat-oth)',
};

export const GROUP_INK: Record<Group, string> = {
  '2W': 'var(--cat-2w-ink)',
  '3W': 'var(--cat-3w-ink)',
  'Cars/LMV': 'var(--cat-car-ink)',
  Commercial: 'var(--cat-com-ink)',
  Other: 'var(--cat-oth-ink)',
};

export const SEQ_BINS = 5;
export const SEQ_VAR = (i: number) => `var(--seq-${i + 1})`;
