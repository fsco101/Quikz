import { Fragment } from 'react';

type Props = { label: string; rows: string[][] };

const Star = () => <svg className="marquee-star" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 1l2.2 8.8L23 12l-8.8 2.2L12 23l-2.2-8.8L1 12l8.8-2.2z" /></svg>;

/** Two-row ticker moving in opposite directions. Collapses to a static list under reduced motion. */
export function Marquee({ label, rows }: Props) {
  return <section className="landing-marquee" aria-label={label}>
    {rows.map((items, row) => <div key={row} className={`marquee-row marquee-row-${row + 1}`}>
      <div className="marquee-track">
        {[0, 1, 2, 3].map((copy) => <ul key={copy} className="marquee-group" aria-hidden={copy > 0 || undefined}>
          {items.map((item) => <Fragment key={item}><li>{item}</li><li className="marquee-sep" aria-hidden="true"><Star /></li></Fragment>)}
        </ul>)}
      </div>
    </div>)}
  </section>;
}
