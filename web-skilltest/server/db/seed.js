/** 伪随机数生成器（固定种子，保证每次种子数据一致） */
function mulberry32(seed) {
  return function next() {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pad(n, len = 2) {
  return String(n).padStart(len, '0');
}

function formatDateTime(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function formatDate(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

const STORES = [
  { code: 'SH-JAS-001', name: '静安寺旗舰店', district: '静安区', address: '南京西路1788号', opened: '2018-06-01' },
  { code: 'SH-LJZ-002', name: '陆家嘴中心店', district: '浦东新区', address: '世纪大道8号国金中心', opened: '2019-01-15' },
  { code: 'SH-XJH-003', name: '徐家汇广场店', district: '徐汇区', address: '虹桥路1号港汇恒隆', opened: '2019-09-20' },
  { code: 'SH-WJC-004', name: '五角场万达店', district: '杨浦区', address: '淞沪路77号万达广场', opened: '2020-03-08' },
  { code: 'SH-HQTD-005', name: '虹桥天地店', district: '闵行区', address: '申长路688号虹桥天地', opened: '2020-11-11' },
  { code: 'SH-RJ-006', name: '人民广场店', district: '黄浦区', address: '西藏中路268号来福士', opened: '2021-05-01' },
  { code: 'SH-BBL-007', name: '七宝万科店', district: '闵行区', address: '七莘路3333号万科广场', opened: '2022-02-14' },
  { code: 'SH-DLC-008', name: '打浦桥日月光店', district: '黄浦区', address: '徐家汇路618号日月光', opened: '2023-08-18' },
];

const CATEGORIES = [
  { code: 'CAT-FOOD', name: '餐饮', sort: 1, weight: 0.35, avgAmount: [45, 180] },
  { code: 'CAT-RETAIL', name: '零售', sort: 2, weight: 0.30, avgAmount: [28, 320] },
  { code: 'CAT-SERVICE', name: '服务', sort: 3, weight: 0.22, avgAmount: [80, 580] },
  { code: 'CAT-OTHER', name: '其他', sort: 4, weight: 0.13, avgAmount: [15, 95] },
];

const CHANNELS = [
  { code: 'CH-OFFLINE', name: '门店', color: '#00c9a7', sort: 1, weight: 0.55 },
  { code: 'CH-DELIVERY', name: '外卖', color: '#ff8c42', sort: 2, weight: 0.30 },
  { code: 'CH-ONLINE', name: '线上', color: '#5b8def', sort: 3, weight: 0.15 },
];

const SURNAMES = ['王', '李', '张', '刘', '陈', '杨', '赵', '黄', '周', '吴', '徐', '孙', '马', '朱', '胡'];
const GIVEN = ['伟', '芳', '娜', '敏', '静', '丽', '强', '磊', '洋', '勇', '艳', '杰', '娟', '涛', '明'];

function pickWeighted(rng, items, key = 'weight') {
  const total = items.reduce((s, i) => s + i[key], 0);
  let r = rng() * total;
  for (const item of items) {
    r -= item[key];
    if (r <= 0) return item;
  }
  return items[items.length - 1];
}

function randomAmount(rng, min, max) {
  const base = min + rng() * (max - min);
  return Math.round(base * 100) / 100;
}

export function seedDatabase(db) {
  const rng = mulberry32(20250609);
  const now = new Date();

  const insertStore = db.prepare(`
    INSERT INTO stores (store_code, store_name, city, district, address, opened_at, status)
    VALUES (@code, @name, '上海', @district, @address, @opened, 'active')
  `);
  for (const s of STORES) {
    insertStore.run(s);
  }

  const insertCategory = db.prepare(`
    INSERT INTO categories (category_code, category_name, sort_order) VALUES (@code, @name, @sort)
  `);
  for (const c of CATEGORIES) {
    insertCategory.run({ code: c.code, name: c.name, sort: c.sort });
  }

  const insertChannel = db.prepare(`
    INSERT INTO channels (channel_code, channel_name, color, sort_order) VALUES (@code, @name, @color, @sort)
  `);
  for (const ch of CHANNELS) {
    insertChannel.run({ code: ch.code, name: ch.name, color: ch.color, sort: ch.sort });
  }

  const storeRows = db.prepare('SELECT id FROM stores ORDER BY id').all();
  const categoryRows = db.prepare('SELECT id, category_name FROM categories ORDER BY id').all();
  const channelRows = db.prepare('SELECT id FROM channels ORDER BY id').all();

  const categoryMap = Object.fromEntries(
    categoryRows.map((r) => [r.category_name, r.id]),
  );
  const categoryMeta = Object.fromEntries(
    CATEGORIES.map((c) => [c.name, c]),
  );

  const insertCustomer = db.prepare(`
    INSERT INTO customers (customer_no, customer_name, phone_masked, gender, registered_at, first_order_store_id)
    VALUES (@no, @name, @phone, @gender, @registeredAt, @storeId)
  `);

  const customers = [];
  const customerCount = 3200;
  for (let i = 0; i < customerCount; i += 1) {
    const daysAgo = Math.floor(rng() * 400);
    const regDate = new Date(now);
    regDate.setDate(regDate.getDate() - daysAgo);
    regDate.setHours(8 + Math.floor(rng() * 14), Math.floor(rng() * 60), Math.floor(rng() * 60));

    const surname = SURNAMES[Math.floor(rng() * SURNAMES.length)];
    const given = GIVEN[Math.floor(rng() * GIVEN.length)];
    const phonePrefix = ['138', '139', '158', '159', '186', '187', '188'][Math.floor(rng() * 7)];
    const phoneSuffix = pad(Math.floor(rng() * 10000), 4);

    const storeId = storeRows[Math.floor(rng() * storeRows.length)].id;
    const gender = rng() > 0.5 ? 'M' : 'F';

    const result = insertCustomer.run({
      no: `C${formatDate(regDate).replace(/-/g, '')}${pad(i + 1, 4)}`,
      name: `${surname}${given.charAt(0)}*`,
      phone: `${phonePrefix}****${phoneSuffix}`,
      gender,
      registeredAt: formatDateTime(regDate),
      storeId,
    });
    customers.push({ id: result.lastInsertRowid, registeredAt: regDate });
  }

  const insertOrder = db.prepare(`
    INSERT INTO orders (order_no, store_id, category_id, channel_id, customer_id, order_amount, order_time, pay_status)
    VALUES (@orderNo, @storeId, @categoryId, @channelId, @customerId, @amount, @orderTime, 'paid')
  `);

  const seedTx = db.transaction(() => {
    let orderSeq = 1;
    // 生成过去 13 个月的订单，约 18000 笔
    for (let dayOffset = 400; dayOffset >= 0; dayOffset -= 1) {
      const date = new Date(now);
      date.setDate(date.getDate() - dayOffset);
      const dayOfWeek = date.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

      // 工作日 35-55 单，周末 55-85 单
      const baseOrders = isWeekend ? 55 + Math.floor(rng() * 30) : 35 + Math.floor(rng() * 20);
      // 近期权重略高
      const recencyBoost = dayOffset < 30 ? 1.15 : dayOffset < 90 ? 1.05 : 1;
      const dailyOrders = Math.floor(baseOrders * recencyBoost);

      for (let o = 0; o < dailyOrders; o += 1) {
        const catName = pickWeighted(rng, CATEGORIES).name;
        const catMeta = categoryMeta[catName];
        const channelIdx = pickWeighted(rng, CHANNELS.map((c, idx) => ({ ...c, idx }))).idx;

        const storeIdx = Math.floor(rng() * storeRows.length);
        const storeId = storeRows[storeIdx].id;
        const categoryId = categoryMap[catName];
        const channelId = channelRows[channelIdx].id;

        const hourWeights = [
          0.02, 0.02, 0.01, 0.01, 0.01, 0.02, 0.03, 0.04,
          0.06, 0.07, 0.08, 0.10, 0.11, 0.08, 0.06, 0.05,
          0.05, 0.06, 0.08, 0.09, 0.07, 0.04, 0.02, 0.01,
        ];
        const hour = pickWeighted(rng, hourWeights.map((w, h) => ({ h, weight: w })), 'weight').h;

        const orderDate = new Date(date);
        orderDate.setHours(hour, Math.floor(rng() * 60), Math.floor(rng() * 60));

        const hasCustomer = rng() > 0.18;
        const customerId = hasCustomer
          ? customers[Math.floor(rng() * customers.length)].id
          : null;

        const amount = randomAmount(rng, catMeta.avgAmount[0], catMeta.avgAmount[1]);
        const storeFactor = 1 + (8 - storeIdx) * 0.04;
        const finalAmount = Math.round(amount * storeFactor * 100) / 100;

        insertOrder.run({
          orderNo: `ORD${formatDate(orderDate).replace(/-/g, '')}${pad(orderSeq, 5)}`,
          storeId,
          categoryId,
          channelId,
          customerId,
          amount: finalAmount,
          orderTime: formatDateTime(orderDate),
        });
        orderSeq += 1;
      }
    }
  });

  seedTx();

  const stats = {
    stores: db.prepare('SELECT COUNT(*) AS cnt FROM stores').get().cnt,
    categories: db.prepare('SELECT COUNT(*) AS cnt FROM categories').get().cnt,
    channels: db.prepare('SELECT COUNT(*) AS cnt FROM channels').get().cnt,
    customers: db.prepare('SELECT COUNT(*) AS cnt FROM customers').get().cnt,
    orders: db.prepare('SELECT COUNT(*) AS cnt FROM orders').get().cnt,
  };

  return stats;
}

// 独立执行：npm run db:seed
if (process.argv[1]?.endsWith('seed.js')) {
  const { getDb, closeDb, getDbPath } = await import('./init.js');
  const db = getDb();
  db.exec('DELETE FROM orders; DELETE FROM customers; DELETE FROM stores; DELETE FROM categories; DELETE FROM channels;');
  const stats = seedDatabase(db);
  console.log(`数据库已重建: ${getDbPath()}`);
  console.log(JSON.stringify(stats, null, 2));
  closeDb();
}
