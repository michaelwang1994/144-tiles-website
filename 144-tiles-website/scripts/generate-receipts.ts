#!/usr/bin/env node
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { handPatterns } from '../src/points-calculator.ts';

const inputPath = resolve(process.argv[2] ?? 'data/submissions.json');
const outputPath = resolve(process.argv[3] ?? 'output/receipts.html');
const logoPath = resolve('assets/logo.png');

function parseFan(value: unknown): number {
  if (typeof value === 'number') return value;
  const match = String(value).match(/\d+/);
  return match ? parseInt(match[0], 10) : 0;
}

function parsePoints(value: unknown): number {
  const n = Number(value);
  return Number.isNaN(n) ? 0 : n;
}

function formatTimestamp(value: unknown): string {
  if (!value) return '';
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' });
}

function escapeHtml(text: unknown): string {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function mode(values: unknown[]): string {
  const counts = new Map<string, number>();
  const firstIndex = new Map<string, number>();

  values.forEach((raw, index) => {
    const value = String(raw ?? 'Not provided').trim() || 'Not provided';
    if (!counts.has(value)) {
      counts.set(value, 0);
      firstIndex.set(value, index);
    }
    counts.set(value, counts.get(value)! + 1);
  });

  let bestValue = 'Not provided';
  let bestCount = -1;
  let bestIndex = Infinity;

  for (const [value, count] of counts) {
    const index = firstIndex.get(value)!;
    if (count > bestCount || (count === bestCount && index < bestIndex)) {
      bestValue = value;
      bestCount = count;
      bestIndex = index;
    }
  }

  return bestValue;
}

function getHandPatternName(s: Submission): string {
  const conditions = Array.isArray(s.checkedConditions)
    ? s.checkedConditions.map(String)
    : [String(s.checkedConditions ?? '')];

  for (const p of handPatterns) {
    if (conditions.some((c) => c.startsWith(p.name))) {
      return p.name;
    }
  }

  return 'Unknown';
}

interface Submission {
  name?: unknown;
  email?: unknown;
  totalFan?: unknown;
  totalPoints?: unknown;
  totalTiles?: unknown;
  tiles?: unknown;
  tableWind?: unknown;
  seatWind?: unknown;
  checkedConditions?: unknown[] | string;
  timestamp?: unknown;
}

function hasHandDetails(s: Submission): boolean {
  return (
    (s.tiles != null && String(s.tiles).trim() !== '') ||
    (s.totalFan != null && String(s.totalFan).trim() !== '') ||
    (s.totalPoints != null && String(s.totalPoints).trim() !== '') ||
    (s.checkedConditions != null &&
      (Array.isArray(s.checkedConditions)
        ? s.checkedConditions.length > 0
        : String(s.checkedConditions).trim() !== ''))
  );
}

function receiptFor(email: string, group: Submission[], logoUri: string): string {
  const chosenName = mode(group.map((s) => s.name));
  const hands = group.filter(hasHandDetails);
  const hasHands = hands.length > 0;

  const handKey = (s: Submission) => getHandPatternName(s);
  const handCounts = new Map<string, number>();
  hands.forEach((s) => {
    const key = handKey(s);
    handCounts.set(key, (handCounts.get(key) ?? 0) + 1);
  });

  const maxCount = handCounts.size > 0 ? Math.max(...handCounts.values()) : 0;
  const tiedPatterns = [...handCounts.entries()]
    .filter(([, count]) => count === maxCount)
    .map(([name]) => name);
  const hasTie = tiedPatterns.length > 1;

  let commonPattern = '';
  let commonCount = 0;
  if (!hasTie && maxCount > 0) {
    commonPattern = tiedPatterns[0]!;
    commonCount = maxCount;
  }

  const totalFan = hands.reduce((sum, s) => sum + parseFan(s.totalFan), 0);
  const totalPoints = hands.reduce((sum, s) => sum + parsePoints(s.totalPoints), 0);

  const items = hasHands
    ? hands
        .map((s, index) => {
          const conditions = Array.isArray(s.checkedConditions)
            ? s.checkedConditions.join(', ')
            : String(s.checkedConditions ?? '');
          const pattern = getHandPatternName(s);
          const timestamp = formatTimestamp(s.timestamp);
          const timestampHtml = timestamp
            ? ` <span class="line-timestamp">${escapeHtml(timestamp)}</span>`
            : '';

          return `
        <div class="line-item">
          <div class="line-desc">
            <div class="line-title">Hand #${index + 1}${timestampHtml}</div>
            <div class="line-pattern">${escapeHtml(pattern)}</div>
            <div class="line-tiles">${escapeHtml(s.tiles)}</div>
            <div class="line-conditions">${escapeHtml(conditions)}</div>
            <div class="line-meta">${escapeHtml(s.tableWind)} table / ${escapeHtml(s.seatWind)} seat · ${escapeHtml(s.totalTiles)} tiles</div>
          </div>
          <div class="line-values">
            <div>${parseFan(s.totalFan)} fan</div>
            <div>${parsePoints(s.totalPoints)} pts</div>
          </div>
        </div>`;
        })
        .join('\n')
    : `<div class="no-hand-message">Auntie is still proud of you. Better luck next time!</div>`;

  const logoImg = logoUri
    ? `<img class="receipt-logo" src="${logoUri}" alt="144 Tiles logo">`
    : '';

  return `
    <section class="receipt">
      <header class="receipt-header">
        ${logoImg}
        <h1>144 Tiles Mahjong Club</h1>
        <p>All Levels Mahjong Tournament @ Gangnam Market 8/24</p>
      </header>

      <div class="receipt-info">
        <p><strong>Name:</strong> ${escapeHtml(chosenName)}</p>
        <p><strong>Email:</strong> ${escapeHtml(email)}</p>
      </div>

      <div class="receipt-items">
        ${items}
      </div>

      <div class="receipt-totals">
        <div class="total-row"><span>Hands played</span><span>${hands.length}</span></div>
        <div class="total-row"><span>Total fan</span><span>${totalFan} fan</span></div>
        <div class="total-row"><span>Total points</span><span>${totalPoints}</span></div>
      </div>

      ${commonPattern ? `
      <div class="receipt-common">
        <p><strong>Most common hand pattern</strong> (${commonCount}×)</p>
        <p class="common-pattern">${escapeHtml(commonPattern)}</p>
      </div>` : ''}

      <footer class="receipt-footer">
        <p>Thank you for playing!</p>
      </footer>
    </section>`;
}

async function main() {
  if (!existsSync(inputPath)) {
    console.error(`Input file not found: ${inputPath}`);
    process.exit(1);
  }

  const raw = await readFile(inputPath, 'utf8');
  const submissions: Submission[] = JSON.parse(raw);

  if (!Array.isArray(submissions)) {
    console.error('Input must be an array of submissions');
    process.exit(1);
  }

  const groups = new Map<string, Submission[]>();
  submissions.forEach((s, index) => {
    const email = String(s.email ?? '').trim().toLowerCase() || `unknown-${index}`;
    if (!groups.has(email)) groups.set(email, []);
    groups.get(email)!.push(s);
  });

  let logoUri = '';
  try {
    const logoBuf = await readFile(logoPath);
    logoUri = `data:image/png;base64,${logoBuf.toString('base64')}`;
  } catch {
    // Logo is optional; receipts will render without it.
  }

  const receipts: string[] = [];
  for (const [email, group] of groups) {
    receipts.push(receiptFor(email, group, logoUri));
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Mahjong Hand Receipts</title>
<style>
  * { box-sizing: border-box; }
  body {
    background: #f4f1ea;
    font-family: 'Courier New', Courier, monospace;
    color: #222;
    margin: 0;
    padding: 24px;
  }
  .receipt {
    background: #fff;
    width: 420px;
    max-width: 100%;
    margin: 24px auto;
    padding: 24px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.12);
    border: 1px solid #ddd;
  }
  .receipt-header {
    text-align: center;
    border-bottom: 2px dashed #333;
    padding-bottom: 12px;
    margin-bottom: 12px;
  }
  .receipt-logo {
    display: block;
    width: 64px;
    height: auto;
    margin: 0 auto 10px;
  }
  .receipt-header h1 {
    font-size: 18px;
    margin: 0 0 4px;
    letter-spacing: 1px;
  }
  .receipt-header p {
    margin: 0;
    font-size: 12px;
    color: #555;
  }
  .receipt-info p {
    margin: 4px 0;
    font-size: 13px;
  }
  .receipt-items {
    margin: 16px 0;
  }
  .no-hand-message {
    text-align: center;
    font-style: italic;
    font-size: 13px;
    color: #555;
    padding: 24px 12px;
    border: 1px dashed #bbb;
    border-radius: 4px;
    background: #fafafa;
  }
  .line-item {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin: 10px 0;
    padding-bottom: 10px;
    border-bottom: 1px dashed #bbb;
  }
  .line-desc {
    flex: 1;
    padding-right: 10px;
  }
  .line-title {
    font-weight: bold;
    font-size: 13px;
  }
  .line-timestamp {
    font-size: 10px;
    font-weight: 400;
    color: #777;
    margin-left: 6px;
  }
  .line-pattern {
    font-size: 11px;
    font-weight: 700;
    color: #8b1a1a;
    margin: 2px 0;
  }
  .line-tiles {
    font-size: 18px;
    line-height: 1.4;
    margin: 4px 0;
    word-break: break-all;
  }
  .line-conditions {
    font-size: 10px;
    color: #555;
    line-height: 1.3;
  }
  .line-meta {
    font-size: 10px;
    color: #777;
    margin-top: 3px;
  }
  .line-values {
    text-align: right;
    font-size: 13px;
    white-space: nowrap;
  }
  .receipt-totals {
    border-top: 2px dashed #333;
    border-bottom: 2px dashed #333;
    padding: 10px 0;
    margin: 12px 0;
  }
  .total-row {
    display: flex;
    justify-content: space-between;
    font-size: 14px;
    margin: 4px 0;
  }
  .receipt-totals .total-row:last-child {
    font-weight: bold;
    font-size: 15px;
  }
  .receipt-common {
    background: #f9f9f9;
    padding: 10px;
    border-radius: 4px;
    margin-top: 12px;
    font-size: 12px;
  }
  .common-pattern {
    font-size: 14px;
    font-weight: 600;
    margin: 6px 0 0;
    color: #222;
  }
  .receipt-footer {
    text-align: center;
    margin-top: 16px;
    font-size: 11px;
    color: #666;
  }
  @media print {
    body {
      background: #fff;
      padding: 0;
    }
    .receipt {
      box-shadow: none;
      border: none;
      width: 100%;
      margin: 0;
      page-break-after: always;
    }
  }
</style>
</head>
<body>
${receipts.join('\n')}
</body>
</html>`;

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, html, 'utf8');

  console.log(`Wrote ${receipts.length} receipt(s) to ${outputPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
