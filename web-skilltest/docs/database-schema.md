# 营业数据报表 · 数据库设计说明

数据库文件：`data/business.db`（SQLite 3，本地持久化）

## 表关系

```
stores ─────┐
categories ─┼──► orders ◄── customers
channels ───┘
```

展板 KPI、趋势、排行均从 `orders` 表聚合，关联维度表 `stores`、`categories`、`channels`。

---

## 1. stores（门店表）

| 表头 | 字段名 | 类型 | 必填 | 填写示例 | 说明 |
|------|--------|------|------|----------|------|
| 主键 ID | id | INTEGER | 是 | 1 | 自增主键 |
| 门店编码 | store_code | TEXT | 是 | SH-JAS-001 | 唯一编码 |
| 门店名称 | store_name | TEXT | 是 | 静安寺旗舰店 | 展示名称 |
| 所在城市 | city | TEXT | 是 | 上海 | 城市 |
| 所在区县 | district | TEXT | 是 | 静安区 | 区县 |
| 详细地址 | address | TEXT | 是 | 南京西路1788号 | 完整地址 |
| 开业日期 | opened_at | TEXT | 是 | 2019-03-15 | YYYY-MM-DD |
| 营业状态 | status | TEXT | 是 | active | active / closed |
| 创建时间 | created_at | TEXT | 是 | 2025-06-09 10:30:00 | 入库时间 |

**种子数据**：8 家上海门店

---

## 2. categories（品类表）

| 表头 | 字段名 | 类型 | 必填 | 填写示例 | 说明 |
|------|--------|------|------|----------|------|
| 主键 ID | id | INTEGER | 是 | 1 | 自增主键 |
| 品类编码 | category_code | TEXT | 是 | CAT-FOOD | 唯一编码 |
| 品类名称 | category_name | TEXT | 是 | 餐饮 | 展示名称 |
| 排序 | sort_order | INTEGER | 是 | 1 | 越小越靠前 |
| 创建时间 | created_at | TEXT | 是 | 2025-06-09 10:30:00 | 入库时间 |

**种子数据**：餐饮、零售、服务、其他

---

## 3. channels（渠道表）

| 表头 | 字段名 | 类型 | 必填 | 填写示例 | 说明 |
|------|--------|------|------|----------|------|
| 主键 ID | id | INTEGER | 是 | 1 | 自增主键 |
| 渠道编码 | channel_code | TEXT | 是 | CH-OFFLINE | 唯一编码 |
| 渠道名称 | channel_name | TEXT | 是 | 门店 | 展示名称 |
| 图表颜色 | color | TEXT | 是 | #00c9a7 | 前端色值 |
| 排序 | sort_order | INTEGER | 是 | 1 | 展示顺序 |
| 创建时间 | created_at | TEXT | 是 | 2025-06-09 10:30:00 | 入库时间 |

**种子数据**：门店(55%)、外卖(30%)、线上(15%)

---

## 4. customers（客户表）

| 表头 | 字段名 | 类型 | 必填 | 填写示例 | 说明 |
|------|--------|------|------|----------|------|
| 主键 ID | id | INTEGER | 是 | 1001 | 自增主键 |
| 客户编号 | customer_no | TEXT | 是 | C20250609001 | 唯一编号 |
| 客户姓名 | customer_name | TEXT | 是 | 张* | 脱敏姓名 |
| 手机号（脱敏） | phone_masked | TEXT | 是 | 138****5678 | 中间四位隐藏 |
| 性别 | gender | TEXT | 否 | M | M/F/U |
| 注册时间 | registered_at | TEXT | 是 | 2025-06-09 09:15:00 | 首次注册 |
| 首单门店 ID | first_order_store_id | INTEGER | 否 | 1 | 关联 stores.id |
| 创建时间 | created_at | TEXT | 是 | 2025-06-09 10:30:00 | 入库时间 |

**种子数据**：约 3,200 名客户，注册时间分布在过去 400 天内

---

## 5. orders（订单表）★ 核心

| 表头 | 字段名 | 类型 | 必填 | 填写示例 | 说明 |
|------|--------|------|------|----------|------|
| 主键 ID | id | INTEGER | 是 | 50001 | 自增主键 |
| 订单号 | order_no | TEXT | 是 | ORD202506091030001 | 唯一订单号 |
| 门店 ID | store_id | INTEGER | 是 | 1 | 关联 stores.id |
| 品类 ID | category_id | INTEGER | 是 | 1 | 关联 categories.id |
| 渠道 ID | channel_id | INTEGER | 是 | 1 | 关联 channels.id |
| 客户 ID | customer_id | INTEGER | 否 | 1001 | 散客可为空 |
| 订单金额（元） | order_amount | REAL | 是 | 128.50 | 实付金额 |
| 下单时间 | order_time | TEXT | 是 | 2025-06-09 12:35:18 | YYYY-MM-DD HH:MM:SS |
| 支付状态 | pay_status | TEXT | 是 | paid | paid / refunded |
| 创建时间 | created_at | TEXT | 是 | 2025-06-09 12:35:20 | 入库时间 |

**种子数据**：约 18,000 笔订单，覆盖过去 400 天，含工作日/周末、午晚高峰等规律

---

## API 接口

| 接口 | 说明 |
|------|------|
| `GET /api/dashboard?period=today\|week\|month\|year` | 展板聚合数据 |
| `GET /api/schema` | 数据字典 + 各表预览 |
| `GET /api/stats` | 数据库记录统计 |
| `GET /health` | 健康检查 |

## 常用命令

```bash
npm run dev:server   # 启动 API（端口 3002）
npm run dev          # 启动前端（代理 /api → 3002）
npm run db:seed      # 清空并重新生成种子数据
```
