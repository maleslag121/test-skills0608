import { formatCurrency } from '../utils/format.js';

export default function StoreRanking({ stores }) {
  return (
    <section className="panel store-ranking">
      <header className="panel__header">
        <h2 className="panel__title">门店排行</h2>
        <span className="panel__subtitle">TOP 5</span>
      </header>
      <div className="store-ranking__table-wrap">
        <table className="store-ranking__table">
          <thead>
            <tr>
              <th>排名</th>
              <th>门店</th>
              <th>营业额</th>
              <th>订单</th>
              <th>同比</th>
            </tr>
          </thead>
          <tbody>
            {stores.map((store) => (
              <tr key={store.name}>
                <td>
                  <span className={`store-ranking__rank rank-${store.rank}`}>{store.rank}</span>
                </td>
                <td className="store-ranking__name">{store.name}</td>
                <td>¥{formatCurrency(store.revenue)}</td>
                <td>{store.orders}</td>
                <td>
                  <span className={store.growth >= 0 ? 'growth-up' : 'growth-down'}>
                    {store.growth >= 0 ? '+' : ''}
                    {store.growth}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
