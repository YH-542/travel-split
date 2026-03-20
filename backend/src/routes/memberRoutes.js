const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db/database');

const router = express.Router({ mergeParams: true });

// GET /api/events/:eventId/members
router.get('/', (req, res) => {
  const db = getDb();
  const members = db.prepare('SELECT * FROM members WHERE event_id = ? ORDER BY created_at ASC')
    .all(req.params.eventId);
  res.json(members);
});

// POST /api/events/:eventId/members
router.post('/', (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'メンバー名を入力してください' });
  }
  const db = getDb();
  // Check event exists
  const event = db.prepare('SELECT id FROM events WHERE id = ?').get(req.params.eventId);
  if (!event) {
    return res.status(404).json({ error: 'イベントが見つかりません' });
  }
  const id = uuidv4();
  db.prepare('INSERT INTO members (id, event_id, name) VALUES (?, ?, ?)').run(id, req.params.eventId, name.trim());
  const member = db.prepare('SELECT * FROM members WHERE id = ?').get(id);
  res.status(201).json(member);
});

// PUT /api/events/:eventId/members/:id
router.put('/:id', (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'メンバー名を入力してください' });
  }
  const db = getDb();
  const result = db.prepare('UPDATE members SET name = ? WHERE id = ? AND event_id = ?')
    .run(name.trim(), req.params.id, req.params.eventId);
  if (result.changes === 0) {
    return res.status(404).json({ error: 'メンバーが見つかりません' });
  }
  const member = db.prepare('SELECT * FROM members WHERE id = ?').get(req.params.id);
  res.json(member);
});

// DELETE /api/events/:eventId/members/:id
router.delete('/:id', (req, res) => {
  const db = getDb();
  const result = db.prepare('DELETE FROM members WHERE id = ? AND event_id = ?')
    .run(req.params.id, req.params.eventId);
  if (result.changes === 0) {
    return res.status(404).json({ error: 'メンバーが見つかりません' });
  }
  res.status(204).send();
});

module.exports = router;
