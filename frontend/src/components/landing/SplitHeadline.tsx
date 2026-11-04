import { useEffect, useRef } from 'react';

type Line = { text: string; accent?: string };
type Props = { id?: string; lines: Line[]; className?: string };

/**
 * Headline whose letters rise out of an invisible mask when it scrolls into view.
 * Each word is its own mask so the effect survives line wrapping on small screens.
 */
export function SplitHeadline({ id, lines, className = '' }: Props) {
  const ref = useRef<HTMLHeadingElement>(null);
  const label = lines.map((line) => line.text + (line.accent ?? '')).join(' ');

  useEffect(() => {
    const heading = ref.current;
    if (!heading) return;
    if (!('IntersectionObserver' in window)) { heading.classList.add('is-revealed'); return; }
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) { heading.classList.add('is-revealed'); observer.disconnect(); }
    }, { threshold: 0.4 });
    observer.observe(heading);
    return () => observer.disconnect();
  }, []);

  let index = 0;
  const words = (text: string) => text.split(' ').filter(Boolean).map((word, w, all) => <span key={`${word}-${w}`} className="split-word">
    <span className="split-mask">{[...word].map((char) => <span key={index} className="split-char" style={{ '--i': index++ } as React.CSSProperties}>{char}</span>)}</span>
    {w < all.length - 1 || text.endsWith(' ') ? ' ' : ''}
  </span>);

  return <h1 id={id} ref={ref} className={`split-headline ${className}`} aria-label={label}>
    {lines.map((line) => <span key={line.text + line.accent} className="split-line" aria-hidden="true">
      {words(line.text)}
      {line.accent && <span className="split-accent">{words(line.accent)}</span>}
    </span>)}
  </h1>;
}
