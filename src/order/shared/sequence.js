// Generic atomic "PREFIX-paddedNumber" sequence generator, matching the
// purchase indent module's pattern (src/purchase/indent/indent.controller.js):
// pg_advisory_xact_lock + a MAX-scan of the last row, instead of the
// reference app's client-side read-last-then-increment (race-prone) scans.
//
// Must be called with a transaction client (`tx`) — the advisory lock
// serializes concurrent callers for the given lockKey until the transaction
// commits/rolls back.
async function nextSequenceNumbers(tx, { lockKey, tableName, column, regex, prefix, pad = 0, count = 1 }) {
  await tx.$executeRawUnsafe(`SELECT pg_advisory_xact_lock(hashtext('${lockKey}'))`);

  const rows = await tx.$queryRawUnsafe(
    `SELECT "${column}" AS "val" FROM "${tableName}" WHERE "${column}" IS NOT NULL ORDER BY id DESC LIMIT 1`
  );

  let currentMax = 0;
  const match = rows[0]?.val?.match(regex);
  if (match) currentMax = parseInt(match[1], 10);

  const numbers = [];
  for (let i = 1; i <= count; i++) {
    const n = currentMax + i;
    numbers.push(`${prefix}${pad > 0 ? String(n).padStart(pad, '0') : n}`);
  }
  return numbers;
}

async function nextSequenceNumber(tx, opts) {
  const [n] = await nextSequenceNumbers(tx, { ...opts, count: 1 });
  return n;
}

module.exports = { nextSequenceNumbers, nextSequenceNumber };
