#!/usr/bin/env node
/**
 * 检测项目实际使用的数据存储方式，供部署时决定如何同步数据。
 * 输出 JSON 到 stdout。
 */
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = process.argv[2] || process.cwd();

function readText(path) {
  try {
    return readFileSync(path, 'utf8');
  } catch {
    return '';
  }
}

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return null;
  }
}

function findFiles(base, patterns, maxDepth = 3, depth = 0) {
  const found = [];
  if (!existsSync(base) || depth > maxDepth) return found;
  for (const name of readdirSync(base)) {
    if (name === 'node_modules' || name === '.git' || name === 'dist') continue;
    const full = join(base, name);
    let st;
    try {
      st = statSync(full);
    } catch {
      continue;
    }
    const rel = relative(root, full);
    if (st.isFile()) {
      for (const p of patterns) {
        if (p.test(name) || p.test(rel)) {
          found.push(rel);
          break;
        }
      }
    } else if (st.isDirectory()) {
      found.push(...findFiles(full, patterns, maxDepth, depth + 1));
    }
  }
  return found;
}

const signals = [];
const pkg = readJson(join(root, 'package.json')) || {};
const deps = { ...pkg.dependencies, ...pkg.devDependencies };
const reqTxt = readText(join(root, 'requirements.txt'));
const envExample = readText(join(root, '.env.example'));
const envLocal = existsSync(join(root, '.env')) ? readText(join(root, '.env')) : '';
const prismaSchema = readText(join(root, 'prisma/schema.prisma'));

// Prisma
const prismaProvider = prismaSchema.match(/provider\s*=\s*"(\w+)"/)?.[1];
if (prismaProvider) {
  signals.push({ type: prismaProvider, source: 'prisma/schema.prisma', weight: 5 });
}

// package.json 依赖
const depMap = [
  ['sqlite', ['better-sqlite3', 'sqlite3', '@libsql/client']],
  ['postgres', ['pg', '@prisma/client', 'postgres']],
  ['mysql', ['mysql2', 'mysql']],
  ['mongodb', ['mongodb', 'mongoose']],
  ['redis', ['redis', 'ioredis']],
  ['files', ['lowdb', 'node-json-db']],
];
for (const [type, names] of depMap) {
  if (names.some((n) => deps[n])) {
    signals.push({ type, source: 'package.json', weight: 4 });
  }
}

// Python
if (/sqlite/i.test(reqTxt)) signals.push({ type: 'sqlite', source: 'requirements.txt', weight: 4 });
if (/psycopg|asyncpg|sqlalchemy.*postgres/i.test(reqTxt)) signals.push({ type: 'postgres', source: 'requirements.txt', weight: 4 });
if (/pymysql|mysqlclient/i.test(reqTxt)) signals.push({ type: 'mysql', source: 'requirements.txt', weight: 4 });
if (/pymongo|motor/i.test(reqTxt)) signals.push({ type: 'mongodb', source: 'requirements.txt', weight: 4 });

// DATABASE_URL
for (const text of [envExample, envLocal]) {
  const url = text.match(/DATABASE_URL\s*=\s*(\S+)/)?.[1] || '';
  if (/sqlite/i.test(url)) signals.push({ type: 'sqlite', source: '.env', weight: 6, url });
  else if (/postgres/i.test(url)) signals.push({ type: 'postgres', source: '.env', weight: 6, url });
  else if (/mysql/i.test(url)) signals.push({ type: 'mysql', source: '.env', weight: 6, url });
  else if (/mongodb/i.test(url)) signals.push({ type: 'mongodb', source: '.env', weight: 6, url });
}

// 本地 SQLite 文件
const sqliteFiles = findFiles(root, [/\.(db|sqlite|sqlite3)$/i]).filter(
  (p) => !p.includes('node_modules')
);
if (sqliteFiles.length) {
  signals.push({ type: 'sqlite', source: 'filesystem', weight: 7, paths: sqliteFiles });
}

// JSON / 文件型数据目录
const dataDirs = ['data', 'db', 'database', 'storage', 'uploads', 'seed'].filter((d) =>
  existsSync(join(root, d))
);
if (dataDirs.length) {
  signals.push({ type: 'files', source: 'filesystem', weight: 3, paths: dataDirs });
}

// 汇总得分
const scores = {};
for (const s of signals) {
  scores[s.type] = (scores[s.type] || 0) + s.weight;
}

const ranked = Object.entries(scores).sort((a, b) => b[1] - a[1]);
const primary = ranked[0]?.[0] || 'none';

function buildRecommendation(type) {
  switch (type) {
    case 'sqlite': {
      const path =
        sqliteFiles[0] ||
        envExample.match(/file:(\.\/?[^\s"']+)/)?.[1]?.replace(/^\.\//, '') ||
        'data/app.db';
      return {
        strategy: 'sqlite',
        local_path: path,
        remote_path: 'shared/data.db',
        note: '拷贝本地 SQLite 文件到 ECS shared/，不经过 Git',
      };
    }
    case 'files':
      return {
        strategy: 'files',
        local_paths: dataDirs.length ? dataDirs : ['data'],
        remote_path: 'shared/data',
        note: 'rsync 本地数据目录到 ECS shared/data/',
      };
    case 'postgres':
    case 'mysql':
    case 'mongodb': {
      const url = signals.find((s) => s.url)?.url || '';
      const isLocal = /localhost|127\.0\.0\.1/.test(url);
      return {
        strategy: isLocal ? `${type}-dump` : 'env-only',
        env_file: '.env',
        remote_env: 'shared/.env',
        note: isLocal
          ? '本地数据库：导出 dump 后上传并在 ECS 恢复（需本机有 dump 工具）'
          : '远程数据库（RDS 等）：只同步 .env 连接串，数据已在云端，无需拷贝文件',
      };
    }
    case 'redis':
      return {
        strategy: 'env-only',
        env_file: '.env',
        remote_env: 'shared/.env',
        note: 'Redis 为远程服务，同步 .env 配置即可',
      };
    default:
      return {
        strategy: 'none',
        note: '未检测到需同步的本地数据，仅部署代码',
      };
  }
}

const recommendation = buildRecommendation(primary);

console.log(
  JSON.stringify(
    {
      primary,
      scores,
      signals,
      recommendation,
    },
    null,
    2
  )
);
