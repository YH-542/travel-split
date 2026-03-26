/**
 * Settlement calculation service for Frontend
 * Minimizes the number of transfers needed to settle all debts
 */

/**
 * Calculate what each member should pay based on payment splits
 * @param {Array} payments - Array of payment records with splits
 * @param {Array} members - Array of event members
 * @returns {Object} { balances, settlements }
 */
export function calculateSettlement(payments, members) {
  // Step 1: Calculate each member's balance
  // Positive = overpaid (should receive), Negative = underpaid (should pay)
  const balances = {};
  members.forEach(m => {
    balances[m.id] = { id: m.id, name: m.name, paid: 0, owes: 0, balance: 0 };
  });

  for (const payment of payments) {
    // Add to payer's "paid" total
    if (balances[payment.payer_id]) {
      balances[payment.payer_id].paid += payment.amount;
    }

    // Calculate how much each person owes for this payment
    const totalRatio = payment.splits?.reduce((sum, s) => sum + s.ratio, 0) || 0;
    if (totalRatio > 0 && payment.splits) {
      for (const split of payment.splits) {
        if (balances[split.member_id]) {
          const shareAmount = (split.ratio / totalRatio) * payment.amount;
          balances[split.member_id].owes += shareAmount;
        }
      }
    }
  }

  // Calculate net balance for each member
  Object.values(balances).forEach(b => {
    b.balance = Math.round((b.paid - b.owes) * 100) / 100; // Round to 2 decimal
  });

  // Step 2: Minimize transfers using greedy algorithm
  const settlements = minimizeTransfers(balances);

  return {
    balances: Object.values(balances),
    settlements
  };
}

/**
 * Greedy algorithm to minimize number of transfers
 * Matches largest creditor with largest debtor iteratively
 */
export function minimizeTransfers(balances) {
  const settlements = [];

  // Separate into creditors (positive balance) and debtors (negative balance)
  let creditors = [];
  let debtors = [];

  Object.values(balances).forEach(b => {
    if (b.balance > 0.01) {
      creditors.push({ ...b });
    } else if (b.balance < -0.01) {
      debtors.push({ ...b });
    }
  });

  // Sort: largest creditor and largest debtor first
  creditors.sort((a, b) => b.balance - a.balance);
  debtors.sort((a, b) => a.balance - b.balance); // most negative first

  while (creditors.length > 0 && debtors.length > 0) {
    const creditor = creditors[0];
    const debtor = debtors[0];

    const amount = Math.min(creditor.balance, Math.abs(debtor.balance));
    const roundedAmount = Math.round(amount);

    if (roundedAmount > 0) {
      settlements.push({
        from_id: debtor.id,
        from_name: debtor.name,
        to_id: creditor.id,
        to_name: creditor.name,
        amount: roundedAmount
      });
    }

    creditor.balance -= amount;
    debtor.balance += amount;

    // Remove settled entries
    if (Math.abs(creditor.balance) < 0.01) {
      creditors.shift();
    }
    if (Math.abs(debtor.balance) < 0.01) {
      debtors.shift();
    }

    // Re-sort for optimal matching
    creditors.sort((a, b) => b.balance - a.balance);
    debtors.sort((a, b) => a.balance - b.balance);
  }

  return settlements;
}

/**
 * Generate shareable text for settlement results
 */
export function generateShareText(eventName, settlements) {
  if (settlements.length === 0) {
    return `【${eventName}】\n精算不要です！全員均等に支払っています 🎉`;
  }

  let text = `【${eventName}】精算結果 💰\n`;
  text += `━━━━━━━━━━━━━━━\n`;
  settlements.forEach((s, i) => {
    text += `${i + 1}. ${s.from_name} → ${s.to_name}: ¥${s.amount.toLocaleString()}\n`;
  });
  text += `━━━━━━━━━━━━━━━\n`;
  text += `送金回数: ${settlements.length}回`;
  return text;
}
