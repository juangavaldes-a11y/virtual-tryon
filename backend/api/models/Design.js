// A saved look: a model plus the garment layers placed on it.
module.exports = {
  attributes: {
    name: { type: 'string', required: true },
    mannequinUrl: { type: 'string', required: true },
    // [{ garmentId, name, src, x, y, width, height, scaleX, scaleY, rotation, opacity }]
    layers: { type: 'json', defaultsTo: [] },
  },
};
