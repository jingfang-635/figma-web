/** Visual-gate freeze: sample data + no motion, so SSIM is not wrecked by live numbers. */

export function isVisualGate(): boolean {
  if (typeof window === 'undefined') return false;
  const q = new URLSearchParams(window.location.search);
  if (q.get('visualGate') === '1') return true;
  return import.meta.env.VITE_VISUAL_GATE === '1';
}

export function applyVisualGateClass(): void {
  if (!isVisualGate()) return;
  document.documentElement.classList.add('visual-gate');
}
