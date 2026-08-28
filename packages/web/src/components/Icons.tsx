/**
 * Drafting symbols, authored as SVG on one 1.5px stroke at 16px.
 * Unicode glyphs are not an icon system.
 */
const S = { fill: "none", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

const Svg = (p: { children: React.ReactNode; size?: number; label?: string }) => (
  <svg width={p.size ?? 16} height={p.size ?? 16} viewBox="0 0 16 16"
       role={p.label ? "img" : "presentation"} aria-label={p.label} aria-hidden={p.label ? undefined : true}>
    {p.children}
  </svg>
);

/** dimension line with two arrowheads — the sheet's own mark */
export const IconDimension = (p: { size?: number }) => (
  <Svg size={p.size}><g {...S}><path d="M2 8h12M2 5v6M14 5v6M4.5 6.5 2 8l2.5 1.5M11.5 6.5 14 8l-2.5 1.5" /></g></Svg>
);
export const IconLayers = (p: { size?: number }) => (
  <Svg size={p.size}><g {...S}><path d="M8 2 2 5l6 3 6-3-6-3ZM2 8.5l6 3 6-3M2 11.5l6 3 6-3" /></g></Svg>
);
export const IconPart = (p: { size?: number }) => (
  <Svg size={p.size}><g {...S}><rect x="2" y="4.5" width="12" height="7" /><path d="M5.5 4.5v7" /></g></Svg>
);
export const IconGhost = (p: { size?: number }) => (
  <Svg size={p.size}><g {...S}><rect x="2" y="4.5" width="12" height="7" strokeDasharray="2 2" /></g></Svg>
);
export const IconUndo = (p: { size?: number }) => (
  <Svg size={p.size}><g {...S}><path d="M3 8h7a3 3 0 0 1 0 6H7M3 8l3-3M3 8l3 3" /></g></Svg>
);
export const IconRedo = (p: { size?: number }) => (
  <Svg size={p.size}><g {...S}><path d="M13 8H6a3 3 0 0 0 0 6h3M13 8l-3-3M13 8l-3 3" /></g></Svg>
);
export const IconCopy = (p: { size?: number }) => (
  <Svg size={p.size}><g {...S}><rect x="5.5" y="5.5" width="8" height="8" /><path d="M10.5 5.5v-3h-8v8h3" /></g></Svg>
);
export const IconDownload = (p: { size?: number }) => (
  <Svg size={p.size}><g {...S}><path d="M8 2v8M5 7.5 8 10.5l3-3M2.5 13.5h11" /></g></Svg>
);
export const IconTrash = (p: { size?: number }) => (
  <Svg size={p.size}><g {...S}><path d="M3 4.5h10M6.5 4.5V3h3v1.5M4.5 4.5l.7 9h5.6l.7-9" /></g></Svg>
);
export const IconLocked = (p: { size?: number }) => (
  <Svg size={p.size}><g {...S}><rect x="3.5" y="7" width="9" height="6.5" /><path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" /></g></Svg>
);
