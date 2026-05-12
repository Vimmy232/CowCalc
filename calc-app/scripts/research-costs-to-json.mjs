import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const defaultInputPath = path.join(projectRoot, 'public', 'data', 'Research_Stats.json');
const defaultOutputPath = path.join(projectRoot, 'public', 'data', 'Research_DailyCosts.json');

function parseArgs(argv) {
  const args = { input: null, output: defaultOutputPath, stdin: false, overwrite: true };

  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    if (arg === '--stdin') {
      args.stdin = true;
      continue;
    }
    if (arg === '--no-overwrite') {
      args.overwrite = false;
      continue;
    }
    if (arg === '--input' || arg === '-i') {
      args.input = argv[++index] || null;
      continue;
    }
    if (arg === '--output' || arg === '-o') {
      args.output = argv[++index] || defaultOutputPath;
      continue;
    }
  }

  return args;
}

function normalizeHeader(header) {
  return String(header || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

function parseDelimitedRows(text) {
  const trimmed = String(text || '').trim();
  if (!trimmed) return [];

  const lines = trimmed.split(/\r?\n/).filter(Boolean);
  if (lines.length === 0) return [];

  const delimiter = lines[0].includes('\t') ? '\t' : ',';
  const headers = lines.shift().split(delimiter).map((header) => header.trim());
  const normalizedHeaders = headers.map(normalizeHeader);

  return lines.map((line) => {
    const values = line.split(delimiter);
    const row = {};

    normalizedHeaders.forEach((header, index) => {
      row[header] = (values[index] ?? '').trim();
    });

    return row;
  });
}

function readSourceRows(rawText) {
  const trimmed = String(rawText || '').trim();
  if (!trimmed) return [];

  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) return parsed;
    if (Array.isArray(parsed.rows) && Array.isArray(parsed.headers)) {
      return parsed.rows.map((row) => {
        const mapped = {};
        parsed.headers.forEach((header, index) => {
          mapped[normalizeHeader(header)] = row[index];
        });
        return mapped;
      });
    }
    return [];
  }

  return parseDelimitedRows(trimmed);
}

function getValue(row, ...candidates) {
  if (!row) return '';
  for (const candidate of candidates) {
    if (candidate in row && row[candidate] !== '') return row[candidate];
  }
  return '';
}

function toNumber(value, fallback = 0) {
  const parsed = Number.parseFloat(String(value ?? '').replace(/,/g, ''));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toTier(value) {
  const parsed = Number.parseInt(String(value ?? '').trim(), 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function buildGroupedResearch(rows) {
  const grouped = {};

  rows.forEach((row) => {
    const name = String(getValue(row, 'name')).trim();
    const faction = String(getValue(row, 'faction')).trim();
    const tier = toTier(getValue(row, 'tier'));

    if (!name || !faction || tier === null) return;

    const money = toNumber(getValue(row, 'money', 'dailymoney', 'dailycostmoney', 'm'));
    const food = toNumber(getValue(row, 'food', 'dailyfood', 'dailycostfood', 'f'));
    const steel = toNumber(getValue(row, 'steel', 'dailysteel', 'dailycoststeel', 's'));
    const fuel = toNumber(getValue(row, 'fuel', 'dailyfuel', 'dailycostfuel', 'u'));

    const dayAvailable = toTier(getValue(row, 'dayavailable', 'availableon', 'day'));
    const minBuildTimeHours = toNumber(getValue(row, 'minbuildtimehrs', 'minbuildtime', 'buildtimehours', 'buildtime'));

    if (!grouped[name]) grouped[name] = {};
    if (!grouped[name][faction]) grouped[name][faction] = [];

    grouped[name][faction].push({
      tier,
      ...(dayAvailable === null ? {} : { dayAvailable }),
      ...(Number.isFinite(minBuildTimeHours) && minBuildTimeHours > 0 ? { minBuildTimeHours } : {}),
      dailyCosts: {
        Money: money,
        Food: food,
        Steel: steel,
        Fuel: fuel,
      },
    });
  });

  for (const name of Object.keys(grouped)) {
    for (const faction of Object.keys(grouped[name])) {
      grouped[name][faction].sort((left, right) => left.tier - right.tier);
    }
  }

  return grouped;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (!args.overwrite) {
    try {
      await fs.access(args.output);
      throw new Error(`Refusing to overwrite existing file: ${args.output}`);
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error;
    }
  }

  const rawText = args.stdin
    ? await fs.readFile(0, 'utf8')
    : await fs.readFile(args.input || defaultInputPath, 'utf8');

  const rows = readSourceRows(rawText);
  const grouped = buildGroupedResearch(rows);

  const output = {
    source: args.stdin ? 'stdin' : path.relative(projectRoot, args.input || defaultInputPath).replace(/\\/g, '/'),
    generatedAt: new Date().toISOString(),
    units: grouped,
  };

  const json = `${JSON.stringify(output, null, 2)}\n`;

  await fs.mkdir(path.dirname(args.output), { recursive: true });
  await fs.writeFile(args.output, json, 'utf8');

  process.stdout.write(`Wrote ${Object.keys(grouped).length} unit entries to ${path.relative(projectRoot, args.output).replace(/\\/g, '/')}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});