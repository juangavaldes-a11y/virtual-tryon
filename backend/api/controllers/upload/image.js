const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const MAX_BYTES = 8 * 1024 * 1024;

// Detect the real image type from the file header instead of trusting the client's content-type.
function detectExt(fd) {
  const h = Buffer.alloc(12);
  const handle = fs.openSync(fd, 'r');
  try { fs.readSync(handle, h, 0, 12, 0); } finally { fs.closeSync(handle); }
  if (h.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return '.png';
  if (h[0] === 0xff && h[1] === 0xd8 && h[2] === 0xff) return '.jpg';
  if (h.toString('ascii', 0, 4) === 'RIFF' && h.toString('ascii', 8, 12) === 'WEBP') return '.webp';
  return null;
}

module.exports = {
  friendlyName: 'Upload image',
  description: 'Store a garment or model image and return its public URL.',

  files: ['image'],
  inputs: { image: { type: 'ref', required: true } },

  exits: {
    success: {},
    badRequest: { responseType: 'badRequest' },
  },

  fn: async function ({ image }) {
    const dir = path.resolve(sails.config.appPath, 'uploads');
    let saved;
    try {
      saved = await sails.uploadOne(image, {
        dirname: dir,
        maxBytes: MAX_BYTES,
        saveAs: (file, cb) => cb(null, crypto.randomUUID() + '.upload'),
      });
    } catch (err) {
      throw { badRequest: err.message };
    }
    if (!saved) throw { badRequest: 'No file received.' };

    const ext = detectExt(saved.fd);
    if (!ext) {
      fs.unlinkSync(saved.fd);
      throw { badRequest: 'Only PNG, JPEG or WebP images are allowed.' };
    }
    const finalName = path.basename(saved.fd, '.upload') + ext;
    fs.renameSync(saved.fd, path.join(dir, finalName));
    return { url: '/uploads/' + finalName };
  },
};
