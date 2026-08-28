/**
 * The dimension line. Witness lines at both extremes, arrowheads turned
 * inward, the figure reading in columns with pixels subordinate -- columns
 * are the unit, pixels are only the canvas's convenience.
 */
export function Dimension({ columns, px }: { columns: number; px: number }) {
  return (
    <div className="dimension">
      <svg className="dim-svg" aria-hidden="true">
        <defs>
          <marker id="dim-a" viewBox="0 0 10 10" refX="9" refY="5"
                  markerWidth="9" markerHeight="9" orient="auto-start-reverse">
            <path d="M0 5 L10 1.5 L10 8.5 Z" fill="var(--dim)" />
          </marker>
        </defs>
        <line x1="0.5" y1="14" x2="0.5" y2="40" stroke="var(--dim)" strokeWidth="1" />
        <line x1="100%" y1="14" x2="100%" y2="40" stroke="var(--dim)" strokeWidth="1"
              transform="translate(-0.5,0)" />
        <line x1="0.5" y1="24" x2="100%" y2="24" stroke="var(--dim)" strokeWidth="1.5"
              markerStart="url(#dim-a)" markerEnd="url(#dim-a)" transform="translate(-0.5,0)" />
      </svg>
      <div className="dim-figure">
        {columns} COL <span className="px">· {Math.round(px)} px</span>
      </div>
    </div>
  );
}
