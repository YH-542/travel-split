const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db/database');

const router = express.Router({ mergeParams: true });

// GET /api/events/:eventId/payments
router.get('/', (req, res) => {
  const db = getDb();
  const payments = db.prepare(`
    SELECT p.*, m.name as payer_name
    FROM payments p
    JOIN members m ON p.payer_id = m.id
    WHERE p.event_id = ?
    ORDER BY p.created_at DESC
  `).all(req.params.eventId);

  for (const payment of payments) {
    payment.splits = db.prepare(`
      SELECT ps.*, m.name as member_name
      FROM payment_splits ps
      JOIN members m ON ps.member_id = m.id
      WHERE ps.payment_id = ?
    `).all(payment.id);
  }

  res.json(payments);
});

// POST /api/events/:eventId/payments
router.post('/', (req, res) => {
  const { payer_id, amount, category, memo, splits } = req.body;

  if (!payer_id) {
    return res.status(400).json({ error: '支払者を選択してください' });
  }
  if (!amount || amount <= 0) {
    return res.status(400).json({ error: '金額を正しく入力してください' });
  }

  const db = getDb();

  // Verify event and payer exist
  const event = db.prepare('SELECT id FROM events WHERE id = ?').get(req.params.eventId);
  if (!event) {
    return res.status(404).json({ error: 'イベントが見つかりません' });
  }

  const paymentId = uuidv4();

  const insertPayment = db.transaction(() => {
    db.prepare(`
      INSERT INTO payments (id, event_id, payer_id, amount, category, memo)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(paymentId, req.params.eventId, payer_id, amount, category || 'other', memo || '');

    if (splits && splits.length > 0) {
      // Custom splits
      const insertSplit = db.prepare(
        'INSERT INTO payment_splits (id, payment_id, member_id, ratio) VALUES (?, ?, ?, ?)'
      );
      for (const split of splits) {
        insertSplit.run(uuidv4(), paymentId, split.member_id, split.ratio || 1.0);
      }
    } else {
      // Default: split equally among all members
      const members = db.prepare('SELECT id FROM members WHERE event_id = ?').all(req.params.eventId);
      const insertSplit = db.prepare(
        'INSERT INTO payment_splits (id, payment_id, member_id, ratio) VALUES (?, ?, ?, ?)'
      );
      for (const member of members) {
        insertSplit.run(uuidv4(), paymentId, member.id, 1.0);
      }
    }
  });

  insertPayment();

  // Return created payment with splits
  const payment = db.prepare(`
    SELECT p.*, m.name as payer_name
    FROM payments p
    JOIN members m ON p.payer_id = m.id
    WHERE p.id = ?
  `).get(paymentId);

  payment.splits = db.prepare(`
    SELECT ps.*, m.name as member_name
    FROM payment_splits ps
    JOIN members m ON ps.member_id = m.id
    WHERE ps.payment_id = ?
  `).all(paymentId);

  res.status(201).json(payment);
});

// PUT /api/events/:eventId/payments/:id
router.put('/:id', (req, res) => {
  const { payer_id, amount, category, memo, splits } = req.body;
  const db = getDb();

  const updatePayment = db.transaction(() => {
    const result = db.prepare(`
      UPDATE payments SET payer_id = ?, amount = ?, category = ?, memo = ?
      WHERE id = ? AND event_id = ?
    `).run(payer_id, amount, category || 'other', memo || '', req.params.id, req.params.eventId);

    if (result.changes === 0) {
      return null;
    }

    // Replace splits
    db.prepare('DELETE FROM payment_splits WHERE payment_id = ?').run(req.params.id);

    if (splits && splits.length > 0) {
      const insertSplit = db.prepare(
        'INSERT INTO payment_splits (id, payment_id, member_id, ratio) VALUES (?, ?, ?, ?)'
      );
      for (const split of splits) {
        insertSplit.run(uuidv4(), req.params.id, split.member_id, split.ratio || 1.0);
      }
    } else {
      const members = db.prepare('SELECT id FROM members WHERE event_id = ?').all(req.params.eventId);
      const insertSplit = db.prepare(
        'INSERT INTO payment_splits (id, payment_id, member_id, ratio) VALUES (?, ?, ?, ?)'
      );
      for (const member of members) {
        insertSplit.run(uuidv4(), req.params.id, member.id, 1.0);
      }
    }

    return true;
  });

  const success = updatePayment();
  if (!success) {
    return res.status(404).json({ error: '支払いが見つかりません' });
  }

  const payment = db.prepare(`
    SELECT p.*, m.name as payer_name
    FROM payments p
    JOIN members m ON p.payer_id = m.id
    WHERE p.id = ?
  `).get(req.params.id);

  payment.splits = db.prepare(`
    SELECT ps.*, m.name as member_name
    FROM payment_splits ps
    JOIN members m ON ps.member_id = m.id
    WHERE ps.payment_id = ?
  `).all(req.params.id);

  res.json(payment);
});

// DELETE /api/events/:eventId/payments/:id
router.delete('/:id', (req, res) => {
  const db = getDb();
  const result = db.prepare('DELETE FROM payments WHERE id = ? AND event_id = ?')
    .run(req.params.id, req.params.eventId);
  if (result.changes === 0) {
    return res.status(404).json({ error: '支払いが見つかりません' });
  }
  res.status(204).send();
});

module.exports = router;
