import { Layers } from "lucide-react";

export function Brand({ onClick, light = false }: { onClick?: () => void; light?: boolean }) {
  const content = <><span className="brand-mark"><Layers size={23} strokeWidth={2.3} aria-hidden="true" /></span><span>Quikz<span className="brand-dot">.</span></span></>;
  return onClick
    ? <button className={`brand ${light ? "brand-light" : ""}`} onClick={onClick} aria-label="Quikz home">{content}</button>
    : <div className={`brand ${light ? "brand-light" : ""}`}>{content}</div>;
}
