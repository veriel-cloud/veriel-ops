interface DataPoint {
  label: string;
  coverage: number;
}

interface CoverageChartProps {
  data: DataPoint[];
  threshold?: number;
}

export function CoverageChart({ data, threshold = 80 }: CoverageChartProps) {
  if (data.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-[13px] text-[var(--color-text-quaternary)]">No coverage data available</p>
      </div>
    );
  }

  const width = 500;
  const height = 200;
  const padding = { top: 20, right: 20, bottom: 30, left: 40 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const maxY = 100;
  const points = data.map((d, i) => ({
    x: padding.left + (data.length === 1 ? chartW / 2 : (i / (data.length - 1)) * chartW),
    y: padding.top + chartH - (d.coverage / maxY) * chartH,
    ...d,
  }));

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const areaPath = `${linePath} L${points[points.length - 1].x},${padding.top + chartH} L${points[0].x},${padding.top + chartH} Z`;
  const thresholdY = padding.top + chartH - (threshold / maxY) * chartH;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
      {/* Grid lines */}
      {[0, 25, 50, 75, 100].map((v) => {
        const y = padding.top + chartH - (v / maxY) * chartH;
        return (
          <g key={v}>
            <line x1={padding.left} x2={width - padding.right} y1={y} y2={y} stroke="var(--color-border)" strokeWidth="0.5" />
            <text x={padding.left - 6} y={y + 3} textAnchor="end" fill="var(--color-text-quaternary)" fontSize="9">
              {v}%
            </text>
          </g>
        );
      })}

      {/* Threshold line */}
      <line
        x1={padding.left}
        x2={width - padding.right}
        y1={thresholdY}
        y2={thresholdY}
        stroke="var(--color-error)"
        strokeWidth="1"
        strokeDasharray="4 3"
        opacity="0.5"
      />
      <text x={width - padding.right + 4} y={thresholdY + 3} fill="var(--color-error-text)" fontSize="8" opacity="0.7">
        min
      </text>

      {/* Area */}
      <path d={areaPath} fill="var(--color-accent)" opacity="0.08" />

      {/* Line */}
      <path d={linePath} fill="none" stroke="var(--color-accent)" strokeWidth="1.5" />

      {/* Points */}
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="3" fill="var(--color-bg-secondary)" stroke="var(--color-accent)" strokeWidth="1.5" />
          {data.length <= 10 && (
            <text x={p.x} y={padding.top + chartH + 16} textAnchor="middle" fill="var(--color-text-quaternary)" fontSize="8">
              {p.label}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}
