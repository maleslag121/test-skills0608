# kaifa-workflow

全栈 CI/CD 流水线模板：本地开发 → GitHub Actions 自动构建 → SSH 部署到阿里云 ECS。

## 快速开始（本地）

```bash
# 安装依赖
npm install

# 启动开发（后端 3001 + 前端 5173）
npm run dev:backend   # 终端 1
npm run dev:frontend  # 终端 2

# 测试与构建
npm test
npm run build
```

访问：
- 前端：http://localhost:5173
- 健康检查：http://localhost:3001/health

## 部署流程（5 步）

```
本地开发 → 你验收 → 告诉 Agent「可以部署」→ GitHub 自动构建部署 → 打开网址确认
```

Agent 会通过 `deploy-workflow` Skill 帮你 commit、push，并监控 CI 结果。

## 项目结构

```
├── apps/frontend/          # Vite + React 前端
├── apps/backend/           # Fastify 后端（含 /health）
├── .deploy/config.yml      # 部署配置（端口、运行时、路径）
├── deploy/
│   ├── scripts/            # 部署脚本（端口检测、激活、健康检查）
│   ├── profiles/           # pm2 / docker / systemd 三套运行时
│   └── server/             # ECS 首次初始化脚本
├── .github/workflows/      # GitHub Actions CI/CD
└── .cursor/skills/         # Cursor 部署 Skill
```

## 部署配置

编辑 [`.deploy/config.yml`](.deploy/config.yml)：

```yaml
runtime: pm2              # pm2 | docker | systemd
app_name: kaifa-workflow  # 必须唯一（多项目同机）
app_port: 3001            # 本项目端口
deploy_path: /var/www/kaifa-workflow
```

### 切换运行时

| runtime | 适用场景 |
|---------|----------|
| `pm2` | Node.js 项目（默认） |
| `docker` | 需要容器隔离 |
| `systemd` | 通用后端服务 |

修改 `runtime` 后 push 到 main 即可，无需改 GitHub Actions。

## 一台 ECS 跑多个项目

每个项目靠 **目录 + 端口 + Nginx** 隔离：

| 项目 | 目录 | 端口 |
|------|------|------|
| kaifa-workflow | `/var/www/kaifa-workflow` | 3001 |
| chatbot | `/var/www/chatbot` | 3002 |

### 新项目首次上服务器

```bash
# 1. ECS 首次初始化（只需一次）
sudo bash deploy/server/bootstrap-ecs.sh

# 2. 分配端口
sudo bash deploy/scripts/allocate-port.sh my-new-app

# 3. 创建项目目录
sudo mkdir -p /var/www/my-new-app/{releases,shared/logs}
sudo cp .env.example /var/www/my-new-app/shared/.env

# 4. 配置 Nginx（可选，有域名时）
sudo bash deploy/scripts/setup-nginx.sh my-new-app 3002 my.domain.com /var/www/my-new-app
```

端口冲突会在部署前自动检测（`/var/www/.deploy-registry/ports.json`）。

## GitHub Secrets

在 GitHub 仓库 Settings → Secrets 中配置：

| Secret | 说明 |
|--------|------|
| `ECS_HOST` | ECS 公网 IP |
| `ECS_USER` | SSH 用户 |
| `ECS_SSH_KEY` | SSH 私钥 |
| `ECS_PORT` | SSH 端口（可选，默认 22） |

详细说明见 [docs/github-secrets.md](docs/github-secrets.md)。

多个 GitHub 仓库可共用同一套 ECS Secrets。

## 回滚

```bash
# SSH 到 ECS
ssh user@your-ecs-ip

# 查看历史 release
ls -lt /var/www/kaifa-workflow/releases/

# 切回上一版本
ln -sfn /var/www/kaifa-workflow/releases/<previous-sha> /var/www/kaifa-workflow/current
pm2 reload kaifa-workflow
```

## 本地验证部署脚本

```bash
bash deploy/scripts/validate-local.sh
```

## 常见问题

**Q: push 后 Actions 失败？**
→ 检查 GitHub Secrets 是否配置，ECS 是否已运行 `bootstrap-ecs.sh`

**Q: 端口冲突？**
→ 修改 `.deploy/config.yml` 中的 `app_port`，或运行 `allocate-port.sh` 分配新端口

**Q: 502 Bad Gateway？**
→ 检查 PM2 状态：`pm2 list`，查看日志：`pm2 logs kaifa-workflow`
