// A virtual model that garments are placed on.
module.exports = {
  attributes: {
    name: { type: 'string', required: true },
    bodyType: { type: 'string', isIn: ['slim', 'regular', 'curvy', 'custom'], defaultsTo: 'regular' },
    imageUrl: { type: 'string', required: true },
  },
};
