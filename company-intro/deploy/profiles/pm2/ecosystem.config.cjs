const path = require('path');

const appName = process.env.DEPLOY_APP_NAME || process.env.APP_NAME || 'company-intro';
const appPort = Number(process.env.DEPLOY_APP_PORT || process.env.PORT || 3009);
const appDir = path.resolve(__dirname, '../../..');
const deployRoot = process.env.DEPLOY_PATH || path.join(appDir, '../..');

module.exports = {
  apps: [
    {
      name: appName,
      cwd: appDir,
      script: 'server/index.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: appPort,
        APP_NAME: appName,
        HOST: '0.0.0.0',
      },
      max_memory_restart: '128M',
      error_file: path.join(deployRoot, 'shared/logs/error.log'),
      out_file: path.join(deployRoot, 'shared/logs/out.log'),
      merge_logs: true,
      time: true,
    },
  ],
};
