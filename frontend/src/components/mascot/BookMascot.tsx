import './mascot.css';
import { useEffect, useRef } from 'react';

export type MascotMood = 'wave' | 'happy' | 'think' | 'cheer' | 'oops' | 'read' | 'wink';

type Props = {
  mood?: MascotMood;
  className?: string;
  /** Pupils gently follow the pointer. Skipped under reduced motion. */
  watchPointer?: boolean;
  /** Accessible description. Omit to render as decoration. */
  label?: string;
};

const mouths: Record<MascotMood, JSX.Element> = {
  wave: <path d="M70 101q12 11 24 0" />,
  happy: <path d="M68 100q14 13 28 0" />,
  read: <path d="M72 102q10 7 20 0" />,
  wink: <path d="M70 101q12 11 24 0" />,
  think: <path d="M75 104q6-3 13 0" />,
  oops: <ellipse cx="82" cy="104" rx="5" ry="6" className="mascot-mouth-fill" />,
  cheer: <g><path d="M67 98q15 20 30 0z" className="mascot-mouth-fill" /><path d="M75 108q7-5 14 0" className="mascot-tongue" /></g>,
};

/** Paige, the Quikz book mascot. An original illustration drawn in SVG. */
export function BookMascot({ mood = 'happy', className = '', watchPointer = false, label }: Props) {
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const svg = ref.current;
    if (!watchPointer || !svg || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let frame = 0;
    const onMove = (event: PointerEvent) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const box = svg.getBoundingClientRect();
        const dx = event.clientX - (box.left + box.width / 2);
        const dy = event.clientY - (box.top + box.height / 2);
        const distance = Math.hypot(dx, dy) || 1;
        const reach = Math.min(1, distance / 260) * 3.2;
        svg.style.setProperty('--look-x', `${(dx / distance) * reach}px`);
        svg.style.setProperty('--look-y', `${(dy / distance) * reach}px`);
      });
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => { cancelAnimationFrame(frame); window.removeEventListener('pointermove', onMove); };
  }, [watchPointer]);

  const armsUp = mood === 'cheer';
  const leftEyeClosed = mood === 'wink';

  return <svg ref={ref} viewBox="0 0 164 188" className={`book-mascot mood-${mood} ${className}`} role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true} focusable="false">
    <ellipse className="mascot-shadow" cx="82" cy="178" rx="44" ry="6" />
    <g className="mascot-body">
      {/* Bookmark ribbon, curling up like a little sprout */}
      <path className="mascot-ribbon" d="M98 24c2-10 9-15 17-13-6 3-8 8-7 14z" />
      {/* Feet */}
      <rect className="mascot-foot" x="52" y="160" width="20" height="11" rx="5.5" />
      <rect className="mascot-foot" x="92" y="160" width="20" height="11" rx="5.5" />
      {/* Back cover and page block */}
      <rect className="mascot-back" x="34" y="24" width="102" height="140" rx="15" />
      <rect className="mascot-pages" x="116" y="30" width="16" height="128" rx="4" />
      <path className="mascot-page-lines" d="M120 46h9M120 62h9M120 78h9M120 94h9M120 110h9M120 126h9M120 142h9" />
      {/* Front cover */}
      <rect className="mascot-cover" x="26" y="20" width="98" height="140" rx="15" />
      <path className="mascot-spine" d="M41 20h-0a15 15 0 0 0-15 15v110a15 15 0 0 0 15 15h0z" />
      <path className="mascot-band" d="M28 44h13M28 136h13" />
      <rect className="mascot-plate" x="58" y="36" width="48" height="14" rx="5" />
      <path className="mascot-plate-line" d="M66 43h32" />
      <path className="mascot-spark" d="M110 62l1.6 4.4 4.4 1.6-4.4 1.6-1.6 4.4-1.6-4.4-4.4-1.6 4.4-1.6z" />
      {/* Brows */}
      <g className="mascot-brows">
        <path d={mood === 'think' ? 'M60 66q8-7 15-2' : mood === 'oops' ? 'M61 68q7-4 14 0' : 'M61 67q7-5 14 0'} />
        <path d={mood === 'think' ? 'M89 69q7-2 14 0' : mood === 'oops' ? 'M89 68q7-4 14 0' : 'M89 67q7-5 14 0'} />
      </g>
      {/* Eyes */}
      <g className="mascot-eyes">
        {leftEyeClosed ? <path className="mascot-wink" d="M61 82q7 6 14 0" /> : <g className="mascot-eye">
          <ellipse className="mascot-eye-white" cx="68" cy="82" rx="9" ry="11" />
          <g className="mascot-pupil"><circle cx="69" cy="84" r="5.2" /><circle className="mascot-shine" cx="71" cy="81.5" r="1.7" /></g>
        </g>}
        <g className="mascot-eye">
          <ellipse className="mascot-eye-white" cx="96" cy="82" rx="9" ry="11" />
          <g className="mascot-pupil"><circle cx="97" cy="84" r="5.2" /><circle className="mascot-shine" cx="99" cy="81.5" r="1.7" /></g>
        </g>
      </g>
      <ellipse className="mascot-cheek" cx="58" cy="98" rx="6" ry="3.6" />
      <ellipse className="mascot-cheek" cx="106" cy="98" rx="6" ry="3.6" />
      <g className="mascot-mouth">{mouths[mood]}</g>
      {/* Arms */}
      <g className="mascot-arm mascot-arm-left">
        {armsUp ? <><path d="M30 104q-16-10-18-30" /><circle cx="12" cy="72" r="6" /></>
          : <><path d="M30 106q-14 10-14 26" /><circle cx="16" cy="134" r="6" /></>}
      </g>
      <g className="mascot-arm mascot-arm-right">
        {armsUp || mood === 'wave' ? <><path d="M120 104q16-10 18-30" /><circle cx="138" cy="72" r="6" /></>
          : mood === 'think' ? <><path d="M120 108q-4 10-26 6" /><circle cx="92" cy="114" r="6" /></>
          : mood === 'read' ? <><path d="M120 108q14 6 16 20" /><circle cx="136" cy="130" r="6" /></>
          : <><path d="M120 106q14 10 14 26" /><circle cx="134" cy="134" r="6" /></>}
      </g>
    </g>
  </svg>;
}
