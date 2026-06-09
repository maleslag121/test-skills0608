const path = require('path');

const appName = process.env.DEPLOY_APP_NAME || process.env.APP_NAME || 'web0609-test2';
const appPort = Number(process.env.DEPLOY_APP_PORT || process.env.PORT || 3008);
const appDir = path.resolve(__dirname, '../../..');

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
      max_memory_restart: '256M',
      error_file: path.join(path.dirname(appDir), 'shared/logs/error.log'),
      out_file: path.join(path.dirname(appDir), 'shared/logs/out.log'),
      merge_logs: true,
      time: true,
    },
  ],
};
