// A clothing item in the catalog. imageUrl should be a transparent PNG/WebP of the garment.
module.exports = {
  attributes: {
    name: { type: 'string', required: true },
    category: { type: 'string', isIn: ['top', 'bottom', 'dress', 'outerwear', 'accessory'], defaultsTo: 'top' },
    price: { type: 'number', defaultsTo: 0 },
    imageUrl: { type: 'string', required: true },
  },
};
