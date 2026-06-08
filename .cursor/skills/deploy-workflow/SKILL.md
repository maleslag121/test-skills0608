---
name: deploy-workflow
description: >-
  本地验收通过后，自动 commit、push 到 GitHub main，并监控 GitHub Actions CI/CD
  部署结果。当用户说「验收通过」「可以部署」「发布到生产」时使用。
---

# Deploy Workflow Skill

本地开发验收通过后，编排 Git 提交、push 和 CI 监控，完成自动化部署触发。

## 触发条件

用户明确表示本地验收通过，例如：
- 「验收通过，部署」
- 「可以发布了」
- 「push 到生产」

**不要**在用户未验收时自动 push。

## 执行步骤

复制并跟踪进度：

```
部署进度：
- [ ] 1. 本地预检（test + build）
- [ ] 2. 审查 git diff（确认无 .env / 密钥）
- [ ] 3. 用户确认后 commit
- [ ] 4. push 到 origin main
- [ ] 5. 监控 GitHub Actions
- [ ] 6. 汇报部署结果
```

### 1. 本地预检

```bash
npm ci
npm run lint
npm run test
npm run build
```

任一失败则停止，修复后再继续。

### 2. 审查变更

```bash
git status
git diff
git diff --cached
```

**必须拒绝提交**若 diff 中包含：
- `.env` 文件
- 私钥、API Key、密码
- `node_modules/`

### 3. Commit

按仓库现有风格撰写 commit message（1-2 句，说明 why）。

```bash
git add -A
git commit -m "$(cat <<'EOF'
你的 commit message

EOF
)"
```

### 4. Push

```bash
git push origin main
```

若 remote 未配置，提示用户先：
```bash
git remote add origin git@github.com:<owner>/<repo>.git
```

### 5. 监控 CI

使用 `gh` CLI（参考 github skill）：

```bash
gh run list --limit 3
gh run watch
```

失败时：
```bash
gh run view --log-failed
```

### 6. 汇报

向用户汇报：
- Commit SHA
- GitHub Actions run URL
- 部署端口（从 `.deploy/config.yml` 的 `app_port`）
- 访问方式：`http://<ECS_HOST>:<app_port>` 或 Nginx 域名
- 健康检查 URL

## 多项目注意

- 每个项目的 `app_name` 和 `app_port` 在 `.deploy/config.yml` 中必须唯一
- 新项目首次上服务器需先运行 `allocate-port.sh` 和 `bootstrap-ecs.sh`
- 多个 GitHub 仓库共用同一套 `ECS_*` Secrets

## 回滚

若部署后有问题：

```bash
# SSH 到 ECS，切换上一版本
ln -sfn /var/www/<app>/releases/<previous-sha> /var/www/<app>/current
pm2 reload <app_name>
```

或在 GitHub Actions 手动 Run workflow 部署指定 commit。
