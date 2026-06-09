import { formatCurrency, formatNumber } from '../utils/format.js';

export default function KPICard({ kpi, index }) {
  const isRevenue = kpi.id === 'revenue';
  const displayValue = isRevenue ? formatCurrency(kpi.value) : formatNumber(kpi.value);
  const isUp = kpi.trend === 'up';

  return (
    <article className="kpi-card" style={{ '--delay': `${index * 80}ms` }}>
      <div className="kpi-card__header">
        <span className="kpi-card__label">{kpi.label}</span>
        <span className={`kpi-card__badge ${isUp ? 'up' : 'down'}`}>
          {isUp ? '↑' : '↓'} {Math.abs(kpi.change)}%
        </span>
      </div>
      <div className="kpi-card__value">
        <span className="kpi-card__number">{displayValue}</span>
        <span className="kpi-card__unit">{kpi.unit}</span>
      </div>
      <div className="kpi-card__sparkline" aria-hidden="true">
        <svg viewBox="0 0 80 24" preserveAspectRatio="none">
          <polyline
            points={
              isUp
                ? '0,20 15,16 30,18 45,10 60,12 80,4'
                : '0,6 15,10 30,8 45,14 60,12 80,18'
            }
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          />
        </svg>
      </div>
    </article>
  );
}
