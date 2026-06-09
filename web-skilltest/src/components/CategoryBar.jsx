import { formatCurrency } from '../utils/format.js';

export default function CategoryBar({ categories }) {
  const max = Math.max(...categories.map((c) => c.value));

  return (
    <section className="panel category-bar">
      <header className="panel__header">
        <h2 className="panel__title">品类营收</h2>
        <span className="panel__subtitle">按业务线</span>
      </header>
      <ul className="category-bar__list">
        {categories.map((cat, i) => (
          <li key={cat.name} className="category-bar__item" style={{ '--delay': `${i * 60}ms` }}>
            <div className="category-bar__meta">
              <span className="category-bar__name">{cat.name}</span>
              <span className="category-bar__pct">{cat.pct}%</span>
            </div>
            <div className="category-bar__track">
              <div
                className="category-bar__fill"
                style={{ width: `${(cat.value / max) * 100}%` }}
              />
            </div>
            <span className="category-bar__value">¥{formatCurrency(cat.value)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
