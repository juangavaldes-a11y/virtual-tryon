module.exports.datastores = {
  default: {
    adapter: 'sails-postgresql',
    url: process.env.DATABASE_URL || 'postgresql://tryon:tryon@localhost:5432/tryon',
  },
};
