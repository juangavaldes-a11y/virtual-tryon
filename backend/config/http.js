const express = require('express');
const path = require('path');

module.exports.http = {
  middleware: {
    // Serve uploaded garment / model images from /uploads.
    uploads: express().use('/uploads', express.static(path.resolve(__dirname, '../uploads'), { maxAge: '1d' })),

    order: ['cookieParser', 'uploads', 'bodyParser', 'compress', 'router', 'www', 'favicon'],
  },
};
