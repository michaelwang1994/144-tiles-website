#!/usr/bin/env node
import 'dotenv/config';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { handPatterns } from '../src/points-calculator.ts';

const DEFAULT_SHEET_URL =
  'https://docs.google.com/spreadsheets/d/1RJFXWZpxsY4qlKa8rtcaiEcOR0Mu3ICXCGMTdBzMs3Y/edit?gid=1723316171';

const EMAIL_FROM = process.env.EMAIL_FROM || 'michael@144tiles.com';
const EMAIL_SUBJECT =
  process.env.EMAIL_SUBJECT || 'Your 144 Tiles Mahjong Tournament Receipt';
const EMAIL_HOST = process.env.EMAIL_HOST;
const EMAIL_PORT = Number(process.env.EMAIL_PORT || 587);
const EMAIL_SECURE = process.env.EMAIL_SECURE === 'true';
const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;

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

function parseFilterDate(value: string): Date | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  // YYYY-MM-DD
  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const d = new Date(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3]));
    return Number.isNaN(d.getTime()) ? null : d;
  }

  // M/D/YYYY or MM/DD/YYYY
  const usFullMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (usFullMatch) {
    const d = new Date(Number(usFullMatch[3]), Number(usFullMatch[1]) - 1, Number(usFullMatch[2]));
    return Number.isNaN(d.getTime()) ? null : d;
  }

  // M/D or MM/DD — assume current year
  const usShortMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})$/);
  if (usShortMatch) {
    const now = new Date();
    const d = new Date(now.getFullYear(), Number(usShortMatch[1]) - 1, Number(usShortMatch[2]));
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const d = new Date(trimmed);
  return Number.isNaN(d.getTime()) ? null : d;
}

function submissionTimestamp(s: Submission): number {
  if (!s.timestamp) return 0;
  const d = new Date(String(s.timestamp));
  return Number.isNaN(d.getTime()) ? 0 : d.getTime();
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

const RECEIPT_CSS = `
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
`;

function receiptFor(email: string, group: Submission[], logoUri: string, date?: string): string {
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
  const hasPoints = totalFan > 0 || totalPoints > 0;
  const betterLuckMessage = `<div class="no-hand-message">Better luck next time! Auntie is still proud of you.</div>`;

  const handItems = hasHands
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
    : '';

  const items = hasHands
    ? (hasPoints ? '' : betterLuckMessage) + handItems
    : betterLuckMessage;

  const logoImg = logoUri
    ? `<img class="receipt-logo" src="${logoUri}" alt="144 Tiles logo">`
    : '';

  return `
    <section class="receipt">
      <header class="receipt-header">
        ${logoImg}
        <h1>144 Tiles Mahjong Club</h1>
        <p>All Levels Mahjong Tournament @ Gangnam Market ${date ? escapeHtml(date) : '8/24'}</p>
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

      ${hasHands && hasPoints && commonPattern ? `
      <div class="receipt-common">
        <p><strong>Most common hand pattern</strong> (${commonCount}×)</p>
        <p class="common-pattern">${escapeHtml(commonPattern)}</p>
      </div>` : ''}

      <footer class="receipt-footer">
        <p>Thank you for playing!</p>
      </footer>
    </section>`;
}

function emailTemplate(receiptSection: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(EMAIL_SUBJECT)}</title>
<style>${RECEIPT_CSS}</style>
</head>
<body>
${receiptSection}
</body>
</html>`;
}

function aggregateTemplate(receiptSections: string[]): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Mahjong Hand Receipts</title>
<style>${RECEIPT_CSS}</style>
</head>
<body>
${receiptSections.join('\n')}
</body>
</html>`;
}

function parseSheetArg(
  arg: string
): { id: string; gid?: string; fvid?: string } | null {
  if (!arg) return null;

  const urlMatch = arg.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  if (urlMatch) {
    const id = urlMatch[1]!;
    const gidMatch = arg.match(/[?&]gid=([0-9]+)/);
    const fvidMatch = arg.match(/[?&]fvid=([0-9]+)/);
    return {
      id,
      gid: gidMatch?.[1],
      fvid: fvidMatch?.[1],
    };
  }

  if (/^[a-zA-Z0-9_-]{20,}$/.test(arg)) {
    return { id: arg };
  }

  return null;
}

function parseTsv(tsv: string): { headers: string[]; rows: string[][] } {
  const lines = tsv
    .replace(/\r\n/g, '\n')
    .split('\n')
    .filter((line) => line.trim() !== '');

  if (lines.length === 0) {
    return { headers: [], rows: [] };
  }

  const headers = lines[0]!.split('\t').map((h) => h.trim());
  const rows = lines.slice(1).map((line) => {
    const cells = line.split('\t');
    while (cells.length < headers.length) {
      cells.push('');
    }
    return cells.slice(0, headers.length).map((c) => c.trim());
  });

  return { headers, rows };
}

function indexOfHeader(headers: string[], candidates: string[]): number {
  const lowerHeaders = headers.map((h) => h.toLowerCase());
  for (const candidate of candidates) {
    const idx = lowerHeaders.indexOf(candidate.toLowerCase());
    if (idx !== -1) return idx;
  }
  return -1;
}

function firstNonEmpty(row: string[], indices: number[]): string | undefined {
  for (const idx of indices) {
    const value = row[idx];
    if (value && value.trim() !== '') return value.trim();
  }
  return undefined;
}

function rowToSubmission(
  row: string[],
  idx: Record<string, number | number[]>
): Submission | null {
  const email =
    (row[idx.emailReceipt as number] ?? '').trim() ||
    (row[idx.emailAddress as number] ?? '').trim();
  if (!email) return null;

  const checkedConditionsRaw = row[idx.checkedConditions as number] ?? '';
  const checkedConditions = checkedConditionsRaw
    ? checkedConditionsRaw.split(/,\s*/).filter(Boolean)
    : [];

  const nameIndices = Array.isArray(idx.name) ? idx.name : [idx.name as number];

  return {
    timestamp: row[idx.timestamp as number] || undefined,
    email,
    name: firstNonEmpty(row, nameIndices),
    totalPoints: row[idx.totalPoints as number] || undefined,
    totalFan: row[idx.totalFan as number] || undefined,
    totalTiles: row[idx.totalTiles as number] || undefined,
    tableWind: row[idx.tableWind as number] || undefined,
    seatWind: row[idx.seatWind as number] || undefined,
    checkedConditions,
    tiles: row[idx.hand as number] || undefined,
  };
}

async function fetchSubmissionsFromSheet(
  sheetId: string,
  gid?: string,
  fvid?: string
): Promise<Submission[]> {
  const params = new URLSearchParams({ format: 'tsv', id: sheetId });
  if (gid) params.set('gid', gid);
  if (fvid) params.set('fvid', fvid);

  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/export?${params.toString()}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch sheet: ${res.status} ${res.statusText}`);
  }

  const tsv = await res.text();
  const { headers, rows } = parseTsv(tsv);

  if (headers.length === 0) {
    throw new Error('Sheet has no headers');
  }

  function allHeaderIndices(candidates: string[]): number[] {
    const lowerCandidates = candidates.map((c) => c.toLowerCase());
    return headers
      .map((h, i) => ({ h: h.toLowerCase(), i }))
      .filter(({ h }) => lowerCandidates.includes(h))
      .map(({ i }) => i);
  }

  const idx = {
    timestamp: indexOfHeader(headers, ['Timestamp']),
    emailAddress: indexOfHeader(headers, ['Email Address']),
    emailReceipt: indexOfHeader(headers, ['Email?', 'Email']),
    name: allHeaderIndices(['What is your name?', 'Name']),
    totalPoints: indexOfHeader(headers, ['Total Points']),
    totalFan: indexOfHeader(headers, ['Total Fan']),
    totalTiles: indexOfHeader(headers, ['Total Tiles']),
    tableWind: indexOfHeader(headers, ['Table Wind']),
    seatWind: indexOfHeader(headers, ['Seat Wind']),
    checkedConditions: indexOfHeader(headers, ['Checked Conditions']),
    hand: indexOfHeader(headers, ['Hand', 'Tiles']),
  };

  const submissions: Submission[] = [];
  for (const row of rows) {
    const submission = rowToSubmission(row, idx);
    if (submission) submissions.push(submission);
  }

  return submissions;
}

async function loadSubmissions(source: string): Promise<Submission[]> {
  const sheet = parseSheetArg(source);
  if (sheet) {
    return fetchSubmissionsFromSheet(sheet.id, sheet.gid, sheet.fvid);
  }

  const inputPath = resolve(source);
  if (!existsSync(inputPath)) {
    console.error(`Input file not found: ${inputPath}`);
    process.exit(1);
  }

  const raw = await readFile(inputPath, 'utf8');
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    console.error('Input must be an array of submissions');
    process.exit(1);
  }
  return parsed as Submission[];
}

function parseFlagValue(flag: string): string | undefined {
  const prefix = `--${flag}=`;
  const arg = process.argv.find((a) => a.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : undefined;
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const sendFlag = process.argv.includes('--send');
  const date = parseFlagValue('date');
  const filterDate = date ? parseFilterDate(date) : null;
  if (date && !filterDate) {
    console.error(`Invalid date: ${date}. Use MM/DD, MM/DD/YYYY, or YYYY-MM-DD.`);
    process.exit(1);
  }
  const positional = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  const source = positional[0] ?? DEFAULT_SHEET_URL;
  const outputPath = resolve(positional[1] ?? 'output/receipts.html');

  const sheetSource = parseSheetArg(source) !== null;
  const shouldSend = (sheetSource || sendFlag) && !dryRun;

  let submissions = await loadSubmissions(source);

  if (!Array.isArray(submissions)) {
    console.error('Input must be an array of submissions');
    process.exit(1);
  }

  if (filterDate) {
    const beforeCount = submissions.length;
    const cutoff = filterDate.getTime();
    submissions = submissions.filter((s) => submissionTimestamp(s) >= cutoff);
    console.log(`Filtered by date ${date}: ${submissions.length} of ${beforeCount} submission(s) on or after ${filterDate.toLocaleDateString('en-US')}.`);
  }

  const groups = new Map<string, Submission[]>();
  submissions.forEach((s, index) => {
    const email = String(s.email ?? '').trim().toLowerCase() || `unknown-${index}`;
    if (!groups.has(email)) groups.set(email, []);
    groups.get(email)!.push(s);
  });

  let logoBase64 = '';
  let logoBuffer: Buffer | undefined;
  try {
    logoBuffer = await readFile(logoPath);
    logoBase64 = `data:image/png;base64,${logoBuffer.toString('base64')}`;
  } catch {
    // Logo is optional; receipts will render without it.
  }

  let transporter: Transporter | undefined;
  if (shouldSend) {
    if (!EMAIL_HOST || !EMAIL_USER || !EMAIL_PASS) {
      console.error(
        'Email credentials are not configured. Set EMAIL_HOST, EMAIL_USER, and EMAIL_PASS in your environment.\n' +
          'Use --dry-run to generate the receipt HTML without sending emails.'
      );
      process.exit(1);
    }

    transporter = nodemailer.createTransport({
      host: EMAIL_HOST,
      port: EMAIL_PORT,
      secure: EMAIL_SECURE,
      auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASS,
      },
    });

    await transporter.verify();
  }

  const receiptSections: string[] = [];
  for (const [email, group] of groups) {
    const aggregateSection = receiptFor(email, group, logoBase64, date);
    receiptSections.push(aggregateSection);

    if (shouldSend) {
      if (!email.includes('@')) {
        console.log(`Skipping ${email}: no valid email address`);
        continue;
      }

      const emailSection = receiptFor(email, group, 'cid:logo', date);
      const html = emailTemplate(emailSection);
      const attachments = logoBuffer
        ? [
            {
              filename: 'logo.png',
              content: logoBuffer,
              cid: 'logo',
            },
          ]
        : [];

      try {
        const info = await transporter!.sendMail({
          from: EMAIL_FROM,
          to: email,
          subject: EMAIL_SUBJECT,
          html,
          attachments,
        });
        console.log(`Sent receipt to ${email} (${info.messageId})`);
      } catch (err) {
        console.error(`Failed to send receipt to ${email}:`, err);
      }
    }
  }

  const html = aggregateTemplate(receiptSections);
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, html, 'utf8');

  console.log(`Wrote ${receiptSections.length} receipt(s) to ${outputPath}`);

  if (!shouldSend) {
    console.log('Email sending skipped. Use --send or provide a Google Sheet URL to send receipts.');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
