module.exports.routes = {
  'POST /api/upload/image': { action: 'upload/image' },
  'POST /api/tryon': { action: 'tryon/generate' },
  'GET /api/health': (req, res) => res.json({ ok: true }),
};
