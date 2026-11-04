import { Children, ReactNode, useEffect, useRef } from 'react';

type Props = {
  children: ReactNode;
  className?: string;
  label?: string;
  /** Fires with the index of the top-most pinned card as the reader scrolls. */
  onActiveChange?: (index: number) => void;
};

const BASE_TOP = 96;
const STEP = 16;

/**
 * Cards pin one after another, each a little lower than the last. Cards that are
 * being covered scale down slightly. Only `transform` is animated.
 */
export function StickyStack({ children, className = '', label, onActiveChange }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const activeRef = useRef(-1);
  const onActiveRef = useRef(onActiveChange);
  onActiveRef.current = onActiveChange;

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const cards = [...root.querySelectorAll<HTMLElement>(':scope > .stack-card')];
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let frame = 0;

    const update = () => {
      frame = 0;
      const tops = cards.map((card) => card.getBoundingClientRect().top);
      if (!reduced) {
        const coverage = cards.map((card, i) => {
          if (i === cards.length - 1) return 0;
          const gap = tops[i + 1] - tops[i] - STEP;
          return Math.max(0, Math.min(1, 1 - gap / card.offsetHeight));
        });
        let sum = 0;
        for (let i = cards.length - 1; i >= 0; i--) {
          sum += coverage[i];
          cards[i].style.transform = sum ? `scale(${(1 - 0.05 * sum).toFixed(4)})` : '';
        }
      }
      let active = 0;
      tops.forEach((top, i) => { if (top <= BASE_TOP + i * STEP + 40) active = i; });
      if (active !== activeRef.current) { activeRef.current = active; onActiveRef.current?.(active); }
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };

    update();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    return () => { cancelAnimationFrame(frame); window.removeEventListener('scroll', schedule); window.removeEventListener('resize', schedule); };
  }, []);

  return <div ref={ref} className={`sticky-stack ${className}`} role={label ? 'list' : undefined} aria-label={label}>
    {Children.map(children, (child, i) => <div className="stack-card" role={label ? 'listitem' : undefined} style={{ '--i': i } as React.CSSProperties}>{child}</div>)}
    <div className="stack-tail" aria-hidden="true" />
  </div>;
}
