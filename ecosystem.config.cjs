module.exports = {
  apps: [
    {
      name: 'apex-logistics-v2',
      script: 'server.mjs',
      instances: 'max',
      exec_mode: 'cluster',
      env_production: {
        NODE_ENV: 'production',
        PORT: 4000
      }
    }
  ]
};
