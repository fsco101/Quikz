import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, ArrowUpRight } from 'lucide-react';
import { api } from '../../services/api.js';

type Cover = { id: string; code: string; title: string; byline: string };
type Props = { onOpen: () => void };

const samples: Cover[] = [
  { id: 's1', code: 'ART 101', title: 'The Art of Learning', byline: 'Sample subject' },
  { id: 's2', code: 'SCI 110', title: 'Curious Science', byline: 'Sample subject' },
  { id: 's3', code: 'MTH 120', title: 'Patterns & Numbers', byline: 'Sample subject' },
  { id: 's4', code: 'LIT 105', title: 'Stories That Stay', byline: 'Sample subject' },
  { id: 's5', code: 'CS 101', title: 'Thinking in Code', byline: 'Sample subject' },
];

const palettes = [
  ['#d9cff6', '#f4f0ff', '#b6a5ec', '#8f78de', '#6651c9'],
  ['#f6e6c8', '#fffaf0', '#ebcf98', '#d6ad62', '#b48733'],
  ['#cfeadf', '#f2fbf7', '#a3d6c1', '#6fb49a', '#3f8c72'],
  ['#d6e3fb', '#f3f7ff', '#a9c2f2', '#7799e3', '#4a6fcc'],
  ['#f5d6df', '#fff5f8', '#eaaabd', '#d77c99', '#b24f72'],
];

function CoverArt({ index }: { index: number }) {
  const [top, bottom, hill1, hill2, hill3] = palettes[index % palettes.length];
  const sun = [[84, 28], [36, 30], [92, 40], [58, 22], [30, 38]][index % 5];
  return <svg viewBox="0 0 120 120" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
    <defs><linearGradient id={`cover-sky-${index}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={top} /><stop offset="1" stopColor={bottom} /></linearGradient></defs>
    <rect width="120" height="120" fill={`url(#cover-sky-${index})`} />
    <circle cx={sun[0]} cy={sun[1]} r="16" fill="#fff" opacity=".35" /><circle cx={sun[0]} cy={sun[1]} r="9" fill="#fff" opacity=".95" />
    <path d="M0 78Q26 54 52 72T120 64V120H0Z" fill={hill1} />
    <path d="M0 92Q32 70 64 88T120 80V120H0Z" fill={hill2} />
    <path d="M0 104Q40 88 80 100T120 96V120H0Z" fill={hill3} />
  </svg>;
}

/** 3D coverflow of public subjects. Click, arrow keys, or swipe to browse. */
export function SubjectCoverflow({ onOpen }: Props) {
  const [covers, setCovers] = useState<Cover[]>(samples);
  const [isSample, setIsSample] = useState(true);
  const [active, setActive] = useState(2);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const swipe = useRef<number | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    api.getSubjects(controller.signal).then(({ subjects }) => {
      if (controller.signal.aborted || !Array.isArray(subjects) || subjects.length < 3) return;
      const real = subjects.slice(0, 7).map((s) => ({ id: String(s._id), code: String(s.code), title: String(s.name), byline: s.facultyName ? `${s.facultyName} · ${s.yearLevel}` : String(s.yearLevel ?? '') }));
      setCovers(real);
      setIsSample(false);
      setActive(Math.floor(real.length / 2));
    }).catch(() => { /* Keep the sample covers when the catalog is unavailable. */ });
    return () => controller.abort();
  }, []);

  const select = (next: number, focus = false) => {
    const clamped = Math.max(0, Math.min(covers.length - 1, next));
    setActive(clamped);
    if (focus) buttons.current[clamped]?.focus({ preventScroll: true });
  };
  const current = covers[active];

  return <div className="coverflow">
    <div className="coverflow-stage" role="group" aria-roledescription="carousel" aria-label="Featured subjects"
      onKeyDown={(event) => { const step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0; if (!step) return; event.preventDefault(); select(active + step, true); }}
      onPointerDown={(event) => { if (event.pointerType !== 'mouse') swipe.current = event.clientX; }}
      onPointerUp={(event) => { if (swipe.current === null) return; const dx = event.clientX - swipe.current; swipe.current = null; if (Math.abs(dx) > 40) select(active + (dx < 0 ? 1 : -1)); }}
      onPointerCancel={() => { swipe.current = null; }}>
      {covers.map((cover, i) => {
        const d = i - active;
        const side = Math.sign(d);
        const abs = Math.abs(d);
        const transform = `translateX(${side * (abs ? 74 + (abs - 1) * 28 : 0)}%) translateZ(${abs ? -120 - abs * 40 : 40}px) rotateY(${-side * (abs ? 58 : 0)}deg)`;
        return <button key={cover.id} ref={(node) => { buttons.current[i] = node; }} type="button" className="coverflow-cover"
          aria-pressed={d === 0} tabIndex={d === 0 ? 0 : -1} aria-label={`${cover.code}: ${cover.title}${d === 0 ? ', open the subject catalog' : ''}`}
          style={{ transform, zIndex: 10 - abs, opacity: abs > 2 ? 0 : 1 }}
          onClick={() => (d === 0 ? onOpen() : select(i))}>
          <CoverArt index={i} />
          <span className="coverflow-code">{cover.code}</span>
          {d === 0 && <span className="coverflow-open" aria-hidden="true"><ArrowUpRight size={16} /></span>}
        </button>;
      })}
    </div>
    <div className="coverflow-meta">
      <button type="button" className="coverflow-nav" onClick={() => select(active - 1)} disabled={active === 0} aria-label="Previous subject"><ArrowLeft size={17} /></button>
      <div className="coverflow-caption" aria-live="polite" key={current.id}><strong>{current.title}</strong><span>{current.byline}</span></div>
      <button type="button" className="coverflow-nav" onClick={() => select(active + 1)} disabled={active === covers.length - 1} aria-label="Next subject"><ArrowRight size={17} /></button>
    </div>
    {isSample && <p className="coverflow-note">Illustrative covers. Open the catalog to see every subject.</p>}
  </div>;
}
