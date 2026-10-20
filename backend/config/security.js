module.exports.security = {
  cors: {
    allRoutes: true,
    allowOrigins: (process.env.CORS_ORIGINS || 'http://localhost:5173').split(','),
    allowRequestHeaders: 'content-type',
  },
};
