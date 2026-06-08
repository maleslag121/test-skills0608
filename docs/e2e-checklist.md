# 端到端部署验证清单

本地验证已通过（`bash deploy/scripts/validate-local.sh`）。完成以下步骤即可完成生产部署：

## 前置条件

- [ ] 阿里云 ECS 已创建，安全组放行 22、80、443
- [ ] SSH 密钥对已配置

## ECS 初始化（一次性）

```bash
scp -r deploy/ user@<ECS_IP>:/tmp/kaifa-deploy
ssh user@<ECS_IP>
sudo bash /tmp/kaifa-deploy/server/bootstrap-ecs.sh
sudo mkdir -p /var/www/kaifa-workflow/{releases,shared/logs}
sudo cp .env.example /var/www/kaifa-workflow/shared/.env  # 按需编辑
sudo bash /tmp/kaifa-deploy/scripts/allocate-port.sh kaifa-workflow
sudo bash /tmp/kaifa-deploy/scripts/setup-nginx.sh kaifa-workflow 3001 _ /var/www/kaifa-workflow
```

## GitHub 配置

- [ ] 创建 GitHub 仓库
- [ ] 配置 Secrets（见 [github-secrets.md](./github-secrets.md)）
- [ ] 推送代码：

```bash
git remote add origin git@github.com:<owner>/kaifa-workflow.git
git push -u origin main
```

## 验证

- [ ] GitHub Actions `CI/CD` workflow 全部绿色
- [ ] 访问 `http://<ECS_IP>:3001/health` 返回 `{"status":"ok",...}`
- [ ] 访问 `http://<ECS_IP>` 看到前端页面（若已配置 Nginx）

## 多项目验证

- [ ] 第二个项目使用不同 `app_port`（如 3002）
- [ ] `ports.json` 正确记录两个项目
- [ ] 重复部署同一项目不会端口冲突
