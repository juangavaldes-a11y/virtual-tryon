const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const MAX_BYTES = 8 * 1024 * 1024;
const CATEGORIES = ['upper_body', 'lower_body', 'dresses'];

// Gateway to the self-hosted GPU service (tryon-service/). Note: text fields (category)
// must be sent before the files in the multipart body.
module.exports = {
  friendlyName: 'Generate try-on',
  files: ['person', 'garment'],
  inputs: {
    category: { type: 'string', isIn: CATEGORIES, required: true },
    person: { type: 'ref', required: true },
    garment: { type: 'ref', required: true },
  },
  exits: {
    success: {},
    badRequest: { responseType: 'badRequest' },
    unavailable: { statusCode: 503 },
  },

  fn: async function ({ category, person, garment }) {
    const dir = path.resolve(sails.config.appPath, '.tmp', 'tryon');
    fs.mkdirSync(dir, { recursive: true });
    const save = (stream) => sails.uploadOne(stream, {
      dirname: dir,
      maxBytes: MAX_BYTES,
      saveAs: (file, cb) => cb(null, crypto.randomUUID()),
    });

    const saved = [];
    try {
      // Skipper streams must be consumed concurrently, not one after the other.
      const results = await Promise.allSettled([save(person), save(garment)]);
      for (const r of results) if (r.status === 'fulfilled' && r.value) saved.push(r.value.fd);
      const failed = results.find((r) => r.status === 'rejected');
      if (failed) throw { badRequest: failed.reason.message };
      if (saved.length !== 2) throw { badRequest: 'Both person and garment images are required.' };

      const form = new FormData();
      form.append('category', category);
      form.append('person', new Blob([fs.readFileSync(saved[0])]), 'person.png');
      form.append('garment', new Blob([fs.readFileSync(saved[1])]), 'garment.png');

      let res;
      try {
        res = await fetch((process.env.TRYON_URL || 'http://localhost:8000') + '/tryon', {
          method: 'POST',
          body: form,
          signal: AbortSignal.timeout(180000),
        });
      } catch (err) {
        sails.log.error('Try-on service unreachable:', err.message);
        throw 'unavailable';
      }
      if (!res.ok) {
        sails.log.warn('Try-on service error', res.status, await res.text());
        throw res.status === 400 ? { badRequest: 'The images could not be processed.' } : 'unavailable';
      }
      this.res.type('image/png');
      return this.res.send(Buffer.from(await res.arrayBuffer()));
    } finally {
      for (const f of saved) fs.rm(f, { force: true }, () => {});
    }
  },
};
