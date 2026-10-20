module.exports = {
  models: { migrate: 'safe' },
  security: { cors: { allowOrigins: (process.env.CORS_ORIGINS || '').split(',') } },
  port: process.env.PORT || 1337,
  log: { level: 'warn' },
};
