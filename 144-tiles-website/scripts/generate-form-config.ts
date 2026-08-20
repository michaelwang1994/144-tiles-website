#!/usr/bin/env node
/**
 * Fetches the public Google Form and writes the entry IDs to
 * src/generated-google-form-config.json. Run at build time so the deployed
 * app always has the latest field mapping.
 *
 * Usage:
 *   npx tsx scripts/generate-form-config.ts <formId>
 */

import { writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const DEFAULT_FORM_ID = '1oFNiYSsM3UuEWGS2b8lqvgriWaA4sC90dB7sg4j571w';
const OUTPUT_PATH = resolve('src/generated-google-form-config.json');

interface FormConfig {
  formId: string;
  entries: Record<string, string>;
}

async function main() {
  const formId = process.argv[2] ?? DEFAULT_FORM_ID;
  const url = `https://docs.google.com/forms/d/${formId}/viewform`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch form: ${res.status} ${res.statusText}`);
  }

  const html = await res.text();

  const loadDataMatch = html.match(/FB_PUBLIC_LOAD_DATA_ = (\[.*?\]);\s*<\/script>/s);
  if (!loadDataMatch) {
    throw new Error('Could not find FB_PUBLIC_LOAD_DATA_ in form HTML.');
  }

  const loadData = new Function('return ' + loadDataMatch[1])() as unknown[];
  const questions = (loadData[1] as unknown[])[1] as unknown[] | undefined;
  if (!Array.isArray(questions)) {
    throw new Error('Could not parse questions from form data.');
  }

  // Map question titles to their input entry IDs.
  // In FB_PUBLIC_LOAD_DATA_, each question has an outer ID (question[0]) and
  // an input entry ID inside question[4][0][0]. Google Form prefill URLs use
  // the input entry ID (the number after "entry." in a pre-filled link).
  const titleToEntry: Record<string, string> = {};
  let emailEntryId = '';
  for (const q of questions) {
    const question = q as unknown[];
    const title = String(question[1] ?? '');
    const choices = question[4] as unknown[] | undefined;
    if (!title || !Array.isArray(choices) || choices.length === 0) continue;

    const first = choices[0] as unknown[];
    if (!Array.isArray(first) || first.length === 0) continue;

    const inputEntryId = String(first[0] ?? '');
    if (!inputEntryId) continue;

    titleToEntry[title] = inputEntryId;
    if (/email/i.test(title)) {
      emailEntryId = inputEntryId;
    }
  }

  const config: FormConfig = {
    formId,
    entries: {
      // If the form has a regular "Email" question, use its input entry ID.
      // If it uses "Collect email addresses" instead, set this to "emailAddress".
      email: emailEntryId || 'emailAddress',
      name: titleToEntry['What is your name?'] ?? '',
      totalFan: titleToEntry['Total Fan'] ?? '',
      totalPoints: titleToEntry['Total Points'] ?? '',
      totalTiles: titleToEntry['Total Tiles'] ?? '',
      tiles: titleToEntry['Tiles'] || titleToEntry['Hand'] || '',
      checkedConditions: titleToEntry['Checked Conditions'] ?? '',
      pungs: '',
      chows: '',
      kongs: '',
      tableWind: titleToEntry['Table Wind'] ?? '',
      seatWind: titleToEntry['Seat Wind'] ?? '',
    },
  };

  await mkdir(dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(OUTPUT_PATH, JSON.stringify(config, null, 2) + '\n', 'utf8');

  console.log(`Wrote form config to ${OUTPUT_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
