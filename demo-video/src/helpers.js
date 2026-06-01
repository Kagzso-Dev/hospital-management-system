import { interpolate } from 'remotion';

export const fi = (f, s = 0, d = 20) =>
  interpolate(f, [s, s + d], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

export const su = (f, s = 0, d = 20, dist = 30) =>
  interpolate(f, [s, s + d], [dist, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

export const fo = (f, end, d = 20) =>
  interpolate(f, [end - d, end], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

export const C = {
  bg:     '#0d1117',
  card:   'rgba(255,255,255,0.06)',
  border: 'rgba(255,255,255,0.1)',
  text:   'rgba(255,255,255,0.92)',
  muted:  'rgba(255,255,255,0.50)',
  indigo: '#6366f1',
  blue:   '#3b82f6',
  cyan:   '#06b6d4',
  green:  '#10b981',
  amber:  '#f59e0b',
  purple: '#8b5cf6',
  red:    '#ef4444',
};

export const FONT = "'Segoe UI Variable', 'Segoe UI', system-ui, -apple-system, sans-serif";

export const card = (extra = {}) => ({
  background: C.card,
  border: `1px solid ${C.border}`,
  borderRadius: 16,
  ...extra,
});
