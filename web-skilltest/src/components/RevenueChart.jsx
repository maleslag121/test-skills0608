import { formatCurrency } from '../utils/format.js';

export default function RevenueChart({ data }) {
  const max = Math.max(...data.map((d) => d.value));
  const padding = { top: 20, right: 12, bottom: 32, left: 12 };
  const width = 100;
  const height = 60;
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const points = data.map((d, i) => {
    const x = padding.left + (i / (data.length - 1)) * chartW;
    const y = padding.top + chartH - (d.value / max) * chartH;
    return { x, y, ...d };
  });

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${padding.top + chartH} L ${points[0].x} ${padding.top + chartH} Z`;

  return (
    <section className="panel revenue-chart">
      <header className="panel__header">
        <h2 className="panel__title">营收趋势</h2>
        <span className="panel__subtitle">实时累计</span>
      </header>
      <div className="revenue-chart__body">
        <svg
          className="revenue-chart__svg"
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="none"
          role="img"
          aria-label="营收趋势折线图"
        >
          <defs>
            <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.35" />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0.25, 0.5, 0.75].map((pct) => (
            <line
              key={pct}
              x1={padding.left}
              y1={padding.top + chartH * (1 - pct)}
              x2={width - padding.right}
              y2={padding.top + chartH * (1 - pct)}
              className="revenue-chart__grid"
            />
          ))}
          <path d={areaPath} fill="url(#areaGrad)" />
          <path d={linePath} className="revenue-chart__line" fill="none" />
          {points.map((p) => (
            <circle key={p.time} cx={p.x} cy={p.y} r="1.2" className="revenue-chart__dot" />
          ))}
        </svg>
        <div className="revenue-chart__labels">
          {data.map((d) => (
            <span key={d.time} className="revenue-chart__label">
              {d.time}
            </span>
          ))}
        </div>
        <div className="revenue-chart__peak">
          <span className="revenue-chart__peak-label">峰值</span>
          <span className="revenue-chart__peak-value">
            ¥{formatCurrency(data[data.length - 1].value)}
          </span>
        </div>
      </div>
    </section>
  );
}
