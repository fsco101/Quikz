import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { ArrowRight, Lightbulb, Sparkles, X } from 'lucide-react';
import { BookMascot, MascotMood } from './BookMascot.js';
import { PaigeRole, tipsFor } from './paigeTips.js';

type Props = { context: string; role?: PaigeRole };

const PREF_KEY = 'quikz-paige-hidden';
const SEEN_KEY = 'quikz-paige-seen';

const read = (store: () => Storage, key: string) => { try { return store().getItem(key); } catch { return null; } };
const write = (store: () => Storage, key: string, value: string | null) => {
  try { if (value === null) store().removeItem(key); else store().setItem(key, value); } catch { /* storage unavailable */ }
};

/**
 * Paige floats in the corner of every page with tips for the current page
 * and general “aha” learning facts.
 */
export function PaigeGuide({ context, role }: Props) {
  const tips = useMemo(() => tipsFor(context, role), [context, role]);
  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const [peek, setPeek] = useState(false);
  const [hidden, setHidden] = useState(() => read(() => localStorage, PREF_KEY) === '1');
  const [scrolledIn, setScrolledIn] = useState(context !== 'home');
  const toggleRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  // Each new page starts at its own first tip, with a short non-blocking “psst” once per session.
  const hiddenRef = useRef(hidden);
  hiddenRef.current = hidden;
  useEffect(() => {
    setIndex(0);
    setOpen(false);
    setPeek(false);
    if (hiddenRef.current || context === 'home') return;
    const seen = () => (read(() => sessionStorage, SEEN_KEY) ?? '').split(',').filter(Boolean);
    if (seen().includes(context)) return;
    let hide = 0;
    const show = window.setTimeout(() => {
      if (hiddenRef.current) return;
      write(() => sessionStorage, SEEN_KEY, [...seen(), context].join(','));
      setPeek(true);
      hide = window.setTimeout(() => setPeek(false), 6000);
    }, 1400);
    return () => { window.clearTimeout(show); window.clearTimeout(hide); };
  }, [context]);

  // On the landing page the hero already has Paige, so the corner Paige waits until you scroll past it.
  useEffect(() => {
    if (context !== 'home') { setScrolledIn(true); return; }
    const check = () => setScrolledIn(window.scrollY > 640);
    check();
    window.addEventListener('scroll', check, { passive: true });
    return () => window.removeEventListener('scroll', check);
  }, [context]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') { setOpen(false); toggleRef.current?.focus(); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  if (!tips.length) return null;
  const current = tips[index % tips.length];
  const isAha = current.kind === 'aha';
  const mood: MascotMood = open ? (isAha ? 'cheer' : 'happy') : peek ? 'wave' : 'happy';

  if (hidden) {
    return <button type="button" className="paige-tab" onClick={() => { setHidden(false); write(() => localStorage, PREF_KEY, null); setOpen(true); }} aria-label="Show Paige, your study buddy">
      <BookMascot mood="wink" />
    </button>;
  }

  return <aside className={`paige-guide ${scrolledIn ? 'is-in' : ''}`} aria-label="Paige, your study buddy">
    {open && <div className="paige-panel" id={panelId} role="dialog" aria-label={isAha ? 'Aha moment from Paige' : 'Study tip from Paige'}>
      <div className="paige-panel-top">
        <span className={`paige-kind ${isAha ? 'is-aha' : ''}`}>{isAha ? <Sparkles size={14} aria-hidden="true" /> : <Lightbulb size={14} aria-hidden="true" />}{isAha ? 'Aha moment' : 'Study tip'}</span>
        <span className="paige-count">{(index % tips.length) + 1} / {tips.length}</span>
        <button type="button" className="paige-close" onClick={() => { setOpen(false); toggleRef.current?.focus(); }} aria-label="Close tips"><X size={16} /></button>
      </div>
      <p className="paige-text" aria-live="polite" key={index}>{current.text}</p>
      <div className="paige-actions">
        <button type="button" className="paige-next" onClick={() => setIndex((i) => i + 1)}>{tips[(index + 1) % tips.length].kind === 'aha' ? 'Show me an aha' : 'Another tip'} <ArrowRight size={15} aria-hidden="true" /></button>
        <button type="button" className="paige-hide" onClick={() => { setOpen(false); setHidden(true); write(() => localStorage, PREF_KEY, '1'); }}>Hide Paige</button>
      </div>
    </div>}
    {peek && !open && <p className="paige-peek" aria-hidden="true">Psst! I’ve got a tip for this page.</p>}
    <button ref={toggleRef} type="button" className="paige-toggle" aria-expanded={open} aria-controls={open ? panelId : undefined}
      aria-label={open ? 'Close Paige’s tips' : 'Get a study tip from Paige'} onClick={() => { setPeek(false); setOpen((o) => !o); }}>
      <BookMascot mood={mood} />
      {peek && !open && <span className="paige-dot" aria-hidden="true" />}
    </button>
  </aside>;
}
