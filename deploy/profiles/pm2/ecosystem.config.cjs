const path = require('path');

const appName = process.env.DEPLOY_APP_NAME || process.env.APP_NAME || 'kaifa-workflow';
const appPort = Number(process.env.DEPLOY_APP_PORT || process.env.PORT || 3001);
const deployRoot = process.env.DEPLOY_PATH || '/var/www/kaifa-workflow';
const currentDir = path.join(deployRoot, 'current');

module.exports = {
  apps: [
    {
      name: appName,
      cwd: currentDir,
      script: 'apps/backend/dist/index.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: appPort,
        APP_NAME: appName,
        HOST: '0.0.0.0',
      },
      max_memory_restart: '512M',
      error_file: path.join(deployRoot, 'shared/logs/error.log'),
      out_file: path.join(deployRoot, 'shared/logs/out.log'),
      merge_logs: true,
      time: true,
    },
  ],
};
