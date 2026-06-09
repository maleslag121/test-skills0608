import { useEffect, useState } from 'react';
import KPICard from './components/KPICard.jsx';
import RevenueChart from './components/RevenueChart.jsx';
import CategoryBar from './components/CategoryBar.jsx';
import ChannelDonut from './components/ChannelDonut.jsx';
import StoreRanking from './components/StoreRanking.jsx';
import DataDictionary from './components/DataDictionary.jsx';
import { PERIODS } from './utils/format.js';
import { fetchDashboard } from './api/client.js';

function formatClock(date) {
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

export default function App() {
  const [period, setPeriod] = useState('today');
  const [now, setNow] = useState(() => new Date());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showDict, setShowDict] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchDashboard(period)
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [period]);

  return (
    <div className="dashboard">
      <div className="dashboard__noise" aria-hidden="true" />
      <header className="dashboard__header">
        <div className="dashboard__brand">
          <div className="dashboard__logo" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <div>
            <h1 className="dashboard__title">营业数据报表</h1>
            <p className="dashboard__subtitle">Business Intelligence Dashboard · SQLite 持久化</p>
          </div>
        </div>
        <div className="dashboard__controls">
          <nav className="period-tabs" aria-label="时间范围">
            {PERIODS.map((p) => (
              <button
                key={p.key}
                type="button"
                className={`period-tabs__btn ${period === p.key ? 'active' : ''}`}
                onClick={() => setPeriod(p.key)}
              >
                {p.label}
              </button>
            ))}
          </nav>
          <button
            type="button"
            className={`dict-toggle ${showDict ? 'active' : ''}`}
            onClick={() => setShowDict(!showDict)}
          >
            {showDict ? '收起字典' : '数据字典'}
          </button>
          <time className="dashboard__clock" dateTime={now.toISOString()}>
            {formatClock(now)}
          </time>
        </div>
      </header>

      {error && (
        <div className="dashboard__alert" role="alert">
          {error} — 请确认已启动 API 服务：<code>npm run dev:server</code>
        </div>
      )}

      {loading && !data && !error && (
        <div className="dashboard__loading">正在从数据库加载…</div>
      )}

      {data && (
        <>
          <section className="kpi-grid" aria-label="核心指标">
            {data.kpis.map((kpi, i) => (
              <KPICard key={kpi.id} kpi={kpi} index={i} />
            ))}
          </section>

          <div className="dashboard__main">
            <div className="dashboard__col dashboard__col--wide">
              <RevenueChart data={data.revenueTrend} />
              <StoreRanking stores={data.stores} />
            </div>
            <div className="dashboard__col">
              <CategoryBar categories={data.categories} />
              <ChannelDonut channels={data.channels} />
            </div>
          </div>
        </>
      )}

      {showDict && <DataDictionary />}

      <footer className="dashboard__footer">
        <span>
          数据来源：{data?.meta?.dataSource ?? 'SQLite'}
          {data?.meta?.recordCounts && (
            <> · 订单 {data.meta.recordCounts.order_count?.toLocaleString('zh-CN')} 笔</>
          )}
        </span>
        <span>web-skilltest · data/business.db</span>
      </footer>
    </div>
  );
}
