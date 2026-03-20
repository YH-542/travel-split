const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db/database');

const router = express.Router();

// GET /api/events - List all events
router.get('/', (req, res) => {
  const db = getDb();
  const events = db.prepare(`
    SELECT e.*, 
      (SELECT COUNT(*) FROM members m WHERE m.event_id = e.id) as member_count,
      (SELECT COALESCE(SUM(p.amount), 0) FROM payments p WHERE p.event_id = e.id) as total_amount
    FROM events e
    ORDER BY e.created_at DESC
  `).all();
  res.json(events);
});

// POST /api/events - Create event
router.post('/', (req, res) => {
  const { name, image_url } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'イベント名を入力してください' });
  }
  const id = uuidv4();
  const db = getDb();
  db.prepare('INSERT INTO events (id, name, image_url) VALUES (?, ?, ?)').run(id, name.trim(), image_url || '');
  const event = db.prepare('SELECT * FROM events WHERE id = ?').get(id);
  res.status(201).json(event);
});

// GET /api/events/:id - Get event detail
router.get('/:id', (req, res) => {
  const db = getDb();
  const event = db.prepare('SELECT * FROM events WHERE id = ?').get(req.params.id);
  if (!event) {
    return res.status(404).json({ error: 'イベントが見つかりません' });
  }
  const members = db.prepare('SELECT * FROM members WHERE event_id = ? ORDER BY created_at ASC').all(req.params.id);
  const payments = db.prepare(`
    SELECT p.*, m.name as payer_name
    FROM payments p
    JOIN members m ON p.payer_id = m.id
    WHERE p.event_id = ?
    ORDER BY p.created_at DESC
  `).all(req.params.id);

  // Get splits for each payment
  for (const payment of payments) {
    payment.splits = db.prepare(`
      SELECT ps.*, m.name as member_name
      FROM payment_splits ps
      JOIN members m ON ps.member_id = m.id
      WHERE ps.payment_id = ?
    `).all(payment.id);
  }

  res.json({ ...event, members, payments });
});

// PUT /api/events/:id - Update event
router.put('/:id', (req, res) => {
  const { name, image_url } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'イベント名を入力してください' });
  }
  const db = getDb();
  if (image_url !== undefined) {
    db.prepare('UPDATE events SET name = ?, image_url = ? WHERE id = ?').run(name.trim(), image_url, req.params.id);
  } else {
    db.prepare('UPDATE events SET name = ? WHERE id = ?').run(name.trim(), req.params.id);
  }
  const event = db.prepare('SELECT * FROM events WHERE id = ?').get(req.params.id);
  if (!event) {
    return res.status(404).json({ error: 'イベントが見つかりません' });
  }
  res.json(event);
});

// DELETE /api/events/:id - Delete event
router.delete('/:id', (req, res) => {
  const db = getDb();
  const result = db.prepare('DELETE FROM events WHERE id = ?').run(req.params.id);
  if (result.changes === 0) {
    return res.status(404).json({ error: 'イベントが見つかりません' });
  }
  res.status(204).send();
});

module.exports = router;
