-- 营业数据报表 · SQLite 数据库结构
-- 数据库文件: data/business.db

CREATE TABLE IF NOT EXISTS stores (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  store_code    TEXT    NOT NULL UNIQUE,           -- 门店编码，如 SH-JAS-001
  store_name    TEXT    NOT NULL,                  -- 门店名称
  city          TEXT    NOT NULL DEFAULT '上海',   -- 所在城市
  district      TEXT    NOT NULL,                  -- 所在区县
  address       TEXT    NOT NULL,                  -- 详细地址
  opened_at     TEXT    NOT NULL,                  -- 开业日期 YYYY-MM-DD
  status        TEXT    NOT NULL DEFAULT 'active', -- active=营业中 closed=已关闭
  created_at    TEXT    NOT NULL DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS categories (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  category_code  TEXT    NOT NULL UNIQUE,          -- 品类编码，如 CAT-FOOD
  category_name  TEXT    NOT NULL,                 -- 品类名称
  sort_order     INTEGER NOT NULL DEFAULT 0,       -- 展示排序
  created_at     TEXT    NOT NULL DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS channels (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  channel_code  TEXT    NOT NULL UNIQUE,           -- 渠道编码，如 CH-OFFLINE
  channel_name  TEXT    NOT NULL,                  -- 渠道名称
  color         TEXT    NOT NULL DEFAULT '#00c9a7',-- 图表展示色值
  sort_order    INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT    NOT NULL DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS customers (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_no         TEXT    NOT NULL UNIQUE,     -- 客户编号，如 C20250609001
  customer_name       TEXT    NOT NULL,            -- 客户姓名（脱敏展示）
  phone_masked        TEXT    NOT NULL,            -- 手机号脱敏，如 138****5678
  gender              TEXT,                        -- 性别: M/F/U
  registered_at       TEXT    NOT NULL,            -- 注册时间
  first_order_store_id INTEGER,                    -- 首单门店
  created_at          TEXT    NOT NULL DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (first_order_store_id) REFERENCES stores(id)
);

CREATE TABLE IF NOT EXISTS orders (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  order_no      TEXT    NOT NULL UNIQUE,           -- 订单号，如 ORD202506091030001
  store_id      INTEGER NOT NULL,                  -- 门店 ID
  category_id   INTEGER NOT NULL,                  -- 品类 ID
  channel_id    INTEGER NOT NULL,                  -- 渠道 ID
  customer_id   INTEGER,                           -- 客户 ID，散客可为空
  order_amount  REAL    NOT NULL CHECK(order_amount > 0), -- 订单金额（元）
  order_time    TEXT    NOT NULL,                  -- 下单时间 YYYY-MM-DD HH:MM:SS
  pay_status    TEXT    NOT NULL DEFAULT 'paid',   -- paid=已支付 refunded=已退款
  created_at    TEXT    NOT NULL DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (store_id)    REFERENCES stores(id),
  FOREIGN KEY (category_id) REFERENCES categories(id),
  FOREIGN KEY (channel_id)  REFERENCES channels(id),
  FOREIGN KEY (customer_id) REFERENCES customers(id)
);

CREATE INDEX IF NOT EXISTS idx_orders_order_time   ON orders(order_time);
CREATE INDEX IF NOT EXISTS idx_orders_store_id     ON orders(store_id);
CREATE INDEX IF NOT EXISTS idx_orders_category_id  ON orders(category_id);
CREATE INDEX IF NOT EXISTS idx_orders_channel_id   ON orders(channel_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id  ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_customers_registered ON customers(registered_at);
