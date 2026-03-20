const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const eventRoutes = require('./routes/eventRoutes');
const memberRoutes = require('./routes/memberRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const settlementRoutes = require('./routes/settlementRoutes');
const { closeDb } = require('./db/database');

const app = express();
const PORT = process.env.PORT || 3001;
const isProd = process.env.NODE_ENV === 'production';

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Serve uploaded images
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
app.use('/uploads', express.static(uploadsDir));

// Image upload endpoint (base64)
app.post('/api/upload', (req, res) => {
  try {
    const { image } = req.body; // base64 data URL
    if (!image) return res.status(400).json({ error: '画像データがありません' });

    const matches = image.match(/^data:image\/(png|jpe?g|webp|gif);base64,(.+)$/);
    if (!matches) return res.status(400).json({ error: '不正な画像形式です' });

    const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
    const data = Buffer.from(matches[2], 'base64');
    const filename = `${uuidv4()}.${ext}`;
    fs.writeFileSync(path.join(uploadsDir, filename), data);

    const url = `/uploads/${filename}`;
    res.json({ url });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: 'アップロードに失敗しました' });
  }
});

// API Routes
app.use('/api/events', eventRoutes);
app.use('/api/events/:eventId/members', memberRoutes);
app.use('/api/events/:eventId/payments', paymentRoutes);
app.use('/api/events/:eventId/settlement', settlementRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Production: serve frontend build
if (isProd) {
  const frontendDist = path.join(__dirname, '..', '..', 'frontend', 'dist');
  app.use(express.static(frontendDist));
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Travel Split API running on http://0.0.0.0:${PORT}${isProd ? ' (production)' : ''}`);
});

// Graceful shutdown
process.on('SIGTERM', () => { closeDb(); server.close(); });
process.on('SIGINT', () => { closeDb(); server.close(); });

module.exports = app;
