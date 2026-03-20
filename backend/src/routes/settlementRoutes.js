const express = require('express');
const { getDb } = require('../db/database');
const { calculateSettlement, generateShareText } = require('../services/settlementService');

const router = express.Router({ mergeParams: true });

// GET /api/events/:eventId/settlement
router.get('/', (req, res) => {
  const db = getDb();

  const event = db.prepare('SELECT * FROM events WHERE id = ?').get(req.params.eventId);
  if (!event) {
    return res.status(404).json({ error: 'イベントが見つかりません' });
  }

  const members = db.prepare('SELECT * FROM members WHERE event_id = ?').all(req.params.eventId);
  const payments = db.prepare('SELECT * FROM payments WHERE event_id = ?').all(req.params.eventId);

  // Attach splits to each payment
  for (const payment of payments) {
    payment.splits = db.prepare('SELECT * FROM payment_splits WHERE payment_id = ?').all(payment.id);
  }

  const result = calculateSettlement(payments, members);
  const shareText = generateShareText(event.name, result.settlements);

  res.json({
    event_name: event.name,
    ...result,
    share_text: shareText
  });
});

module.exports = router;
