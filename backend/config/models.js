module.exports.models = {
  schema: true,
  // 'alter' auto-migrates tables in development; production must use 'safe' and real migrations.
  migrate: process.env.NODE_ENV === 'production' ? 'safe' : 'alter',
  attributes: {
    createdAt: { type: 'number', autoCreatedAt: true },
    updatedAt: { type: 'number', autoUpdatedAt: true },
    id: { type: 'number', autoIncrement: true },
  },
  dataEncryptionKeys: {
    default: 'dev-only-key-change-me-in-production=',
  },
  cascadeOnDestroy: true,
};
