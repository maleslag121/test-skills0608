const PERIOD_RANGES = {
  today: {
    currentStart: "datetime('now', 'localtime', 'start of day')",
    currentEnd: "datetime('now', 'localtime', '+1 day', 'start of day')",
    prevStart: "datetime('now', 'localtime', '-1 day', 'start of day')",
    prevEnd: "datetime('now', 'localtime', 'start of day')",
    trendSql: `
      SELECT strftime('%H:00', order_time) AS label,
             ROUND(SUM(order_amount), 2) AS value
      FROM orders
      WHERE pay_status = 'paid'
        AND order_time >= datetime('now', 'localtime', 'start of day')
        AND order_time < datetime('now', 'localtime', '+1 day', 'start of day')
      GROUP BY strftime('%H', order_time)
      ORDER BY label
    `,
    trendCumulative: true,
  },
  week: {
    currentStart: "datetime('now', 'localtime', '-7 days', 'start of day')",
    currentEnd: "datetime('now', 'localtime', '+1 day', 'start of day')",
    prevStart: "datetime('now', 'localtime', '-14 days', 'start of day')",
    prevEnd: "datetime('now', 'localtime', '-7 days', 'start of day')",
    trendSql: `
      SELECT strftime('%m-%d', order_time) AS label,
             date(order_time) AS sort_key,
             ROUND(SUM(order_amount), 2) AS value
      FROM orders
      WHERE pay_status = 'paid'
        AND order_time >= datetime('now', 'localtime', '-7 days', 'start of day')
        AND order_time < datetime('now', 'localtime', '+1 day', 'start of day')
      GROUP BY sort_key
      ORDER BY sort_key
    `,
    trendCumulative: false,
  },
  month: {
    currentStart: "datetime('now', 'localtime', 'start of month')",
    currentEnd: "datetime('now', 'localtime', 'start of month', '+1 month')",
    prevStart: "datetime('now', 'localtime', 'start of month', '-1 month')",
    prevEnd: "datetime('now', 'localtime', 'start of month')",
    trendSql: `
      SELECT '第' || ((CAST(strftime('%d', order_time) AS INTEGER) - 1) / 7 + 1) || '周' AS label,
             ((CAST(strftime('%d', order_time) AS INTEGER) - 1) / 7 + 1) AS sort_key,
             ROUND(SUM(order_amount), 2) AS value
      FROM orders
      WHERE pay_status = 'paid'
        AND order_time >= datetime('now', 'localtime', 'start of month')
        AND order_time < datetime('now', 'localtime', 'start of month', '+1 month')
      GROUP BY sort_key
      ORDER BY sort_key
    `,
    trendCumulative: false,
  },
  year: {
    currentStart: "datetime('now', 'localtime', 'start of year')",
    currentEnd: "datetime('now', 'localtime', 'start of year', '+1 year')",
    prevStart: "datetime('now', 'localtime', 'start of year', '-1 year')",
    prevEnd: "datetime('now', 'localtime', 'start of year')",
    trendSql: `
      SELECT CAST(strftime('%m', order_time) AS INTEGER) || '月' AS label,
             CAST(strftime('%m', order_time) AS INTEGER) AS sort_key,
             ROUND(SUM(order_amount), 2) AS value
      FROM orders
      WHERE pay_status = 'paid'
        AND order_time >= datetime('now', 'localtime', 'start of year')
        AND order_time < datetime('now', 'localtime', 'start of year', '+1 year')
      GROUP BY sort_key
      ORDER BY sort_key
    `,
    trendCumulative: false,
  },
};

function calcChange(current, previous) {
  if (!previous || previous === 0) {
    return current > 0 ? 100 : 0;
  }
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

function sumInRange(db, sql, startExpr, endExpr) {
  return db.prepare(`
    SELECT COALESCE(SUM(order_amount), 0) AS revenue,
           COUNT(*) AS orders
    FROM orders
    WHERE pay_status = 'paid'
      AND order_time >= ${startExpr}
      AND order_time < ${endExpr}
  `).get();
}

function countCustomersInRange(db, startExpr, endExpr) {
  return db.prepare(`
    SELECT COUNT(*) AS cnt
    FROM customers
    WHERE registered_at >= ${startExpr}
      AND registered_at < ${endExpr}
  `).get().cnt;
}

export function getDashboardData(db, period = 'today') {
  const range = PERIOD_RANGES[period] ?? PERIOD_RANGES.today;

  const current = sumInRange(db, null, range.currentStart, range.currentEnd);
  const previous = sumInRange(db, null, range.prevStart, range.prevEnd);

  const revenue = Math.round(current.revenue * 100) / 100;
  const orders = current.orders;
  const avgOrder = orders > 0 ? Math.round(revenue / orders) : 0;

  const prevRevenue = previous.revenue;
  const prevOrders = previous.orders;
  const prevAvg = prevOrders > 0 ? prevRevenue / prevOrders : 0;

  const newCustomers = countCustomersInRange(db, range.currentStart, range.currentEnd);
  const prevCustomers = countCustomersInRange(db, range.prevStart, range.prevEnd);

  const kpis = [
    {
      id: 'revenue',
      label: '营业额',
      value: revenue,
      unit: '元',
      change: calcChange(revenue, prevRevenue),
      trend: revenue >= prevRevenue ? 'up' : 'down',
    },
    {
      id: 'orders',
      label: '订单数',
      value: orders,
      unit: '笔',
      change: calcChange(orders, prevOrders),
      trend: orders >= prevOrders ? 'up' : 'down',
    },
    {
      id: 'avg',
      label: '客单价',
      value: avgOrder,
      unit: '元',
      change: calcChange(avgOrder, prevAvg),
      trend: avgOrder >= prevAvg ? 'up' : 'down',
    },
    {
      id: 'customers',
      label: '新增客户',
      value: newCustomers,
      unit: '人',
      change: calcChange(newCustomers, prevCustomers),
      trend: newCustomers >= prevCustomers ? 'up' : 'down',
    },
  ];

  let trendRows = db.prepare(range.trendSql).all();
  if (range.trendCumulative) {
    let cumulative = 0;
    trendRows = trendRows.map((row) => {
      cumulative += row.value;
      return { time: row.label, value: Math.round(cumulative * 100) / 100 };
    });
  } else {
    trendRows = trendRows.map((row) => ({
      time: row.label,
      value: row.value,
    }));
  }

  const categoryRows = db.prepare(`
    SELECT c.category_name AS name,
           ROUND(SUM(o.order_amount), 2) AS value
    FROM orders o
    JOIN categories c ON c.id = o.category_id
    WHERE o.pay_status = 'paid'
      AND o.order_time >= ${range.currentStart}
      AND o.order_time < ${range.currentEnd}
    GROUP BY c.id
    ORDER BY c.sort_order
  `).all();

  const categoryTotal = categoryRows.reduce((s, r) => s + r.value, 0) || 1;
  const categories = categoryRows.map((r) => ({
    name: r.name,
    value: r.value,
    pct: Math.round((r.value / categoryTotal) * 1000) / 10,
  }));

  const channelRows = db.prepare(`
    SELECT ch.channel_name AS name,
           ch.color,
           ROUND(SUM(o.order_amount), 2) AS value
    FROM orders o
    JOIN channels ch ON ch.id = o.channel_id
    WHERE o.pay_status = 'paid'
      AND o.order_time >= ${range.currentStart}
      AND o.order_time < ${range.currentEnd}
    GROUP BY ch.id
    ORDER BY ch.sort_order
  `).all();

  const channelTotal = channelRows.reduce((s, r) => s + r.value, 0) || 1;
  const channels = channelRows.map((r) => ({
    name: r.name,
    color: r.color,
    value: Math.round((r.value / channelTotal) * 100),
  }));

  const storeCurrent = db.prepare(`
    SELECT s.id, s.store_name AS name,
           ROUND(SUM(o.order_amount), 2) AS revenue,
           COUNT(*) AS orders
    FROM orders o
    JOIN stores s ON s.id = o.store_id
    WHERE o.pay_status = 'paid'
      AND o.order_time >= ${range.currentStart}
      AND o.order_time < ${range.currentEnd}
    GROUP BY s.id
    ORDER BY revenue DESC
    LIMIT 5
  `).all();

  const storePrevMap = Object.fromEntries(
    db.prepare(`
      SELECT s.id,
             ROUND(COALESCE(SUM(o.order_amount), 0), 2) AS revenue
      FROM stores s
      LEFT JOIN orders o ON o.store_id = s.id
        AND o.pay_status = 'paid'
        AND o.order_time >= ${range.prevStart}
        AND o.order_time < ${range.prevEnd}
      GROUP BY s.id
    `).all().map((r) => [r.id, r.revenue]),
  );

  const stores = storeCurrent.map((s, idx) => {
    const prevRev = storePrevMap[s.id] ?? 0;
    return {
      rank: idx + 1,
      name: s.name,
      revenue: s.revenue,
      orders: s.orders,
      growth: calcChange(s.revenue, prevRev),
    };
  });

  const stats = db.prepare(`
    SELECT
      (SELECT COUNT(*) FROM stores) AS store_count,
      (SELECT COUNT(*) FROM orders WHERE pay_status = 'paid') AS order_count,
      (SELECT COUNT(*) FROM customers) AS customer_count
  `).get();

  return {
    period,
    kpis,
    revenueTrend: trendRows,
    categories,
    channels,
    stores,
    meta: {
      dataSource: 'SQLite',
      updatedAt: new Date().toISOString(),
      recordCounts: stats,
    },
  };
}

export function getTablePreview(db, table, limit = 5) {
  const allowed = ['stores', 'categories', 'channels', 'customers', 'orders'];
  if (!allowed.includes(table)) return { error: 'Invalid table' };

  const rows = db.prepare(`SELECT * FROM ${table} ORDER BY id DESC LIMIT ?`).all(limit);
  const total = db.prepare(`SELECT COUNT(*) AS cnt FROM ${table}`).get().cnt;
  return { table, total, rows };
}
