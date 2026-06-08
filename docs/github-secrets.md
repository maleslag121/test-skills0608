# GitHub Secrets 配置指南

在 GitHub 仓库 **Settings → Secrets and variables → Actions** 中添加以下 Secrets。

同一台阿里云 ECS 可被多个项目共用，各仓库使用相同的 ECS 连接 Secrets，项目差异写在 `.deploy/config.yml` 中。

| Secret 名 | 必填 | 说明 | 示例 |
|-----------|------|------|------|
| `ECS_HOST` | 是 | ECS 公网 IP | `47.96.x.x` |
| `ECS_USER` | 是 | SSH 登录用户 | `root` |
| `ECS_SSH_KEY` | 是 | SSH 私钥全文（PEM 格式） | `-----BEGIN OPENSSH PRIVATE KEY-----...` |
| `ECS_PORT` | 否 | SSH 端口，默认 22 | `22` |

## 配置步骤

1. 在阿里云 ECS 控制台创建或导入 SSH 密钥对
2. 将私钥内容完整复制到 `ECS_SSH_KEY` Secret
3. 安全组放行 SSH（22）和 HTTP（80/443）
4. 在 ECS 上执行一次 `deploy/server/bootstrap-ecs.sh`
5. 为新项目分配端口并创建目录（见 README）

## 验证 Secrets 是否生效

推送代码到 `main` 后，在 GitHub Actions 页面查看 `CI/CD` workflow 运行结果。

手动触发：Actions → CI/CD → Run workflow

## 注意事项

- 不要将私钥、`.env` 文件提交到 Git 仓库
- 数据库密码等应用配置放在 ECS 的 `/var/www/<app>/shared/.env`
- 多个项目共用 `ECS_HOST` 时，每个项目的 `app_port` 必须不同
