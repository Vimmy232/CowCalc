import fs from 'node:fs/promises';

const source = JSON.parse(await fs.readFile('public/data/Research_Stats.json', 'utf8'));
const output = JSON.parse(await fs.readFile('public/data/Research_DailyCosts.json', 'utf8'));

const rows = source.rows.map((row) => Object.fromEntries(
  source.headers.map((header, index) => [header, row[index]])
));

const cases = [
  ['Militia', 'Ally', 1],
  ['Infantry', 'Axis', 7],
  ['Aircraft Carrier', 'Ally', 6],
  ['Tactical Bomber', 'Pan-Asian', 7],
  ['Transport Ship', 'Axis', 4],
];

const failures = [];

for (const [name, faction, tier] of cases) {
  const src = rows.find((row) => row.Name === name && row.Faction === faction && Number(row.Tier) === tier);
  const out = output.units?.[name]?.[faction]?.find((entry) => entry.tier === tier);

  if (!src) {
    failures.push(`missing source ${name} ${faction} T${tier}`);
    continue;
  }

  if (!out) {
    failures.push(`missing output ${name} ${faction} T${tier}`);
    continue;
  }

  const expected = {
    dayAvailable: Number(src['Day Available']),
    minBuildTimeHours: Number(src['Min Build Time (hrs)']),
    dailyCosts: {
      Money: Number(src.Money),
      Food: Number(src.Food),
      Steel: Number(src.Steel),
      Fuel: Number(src.Fuel),
    },
  };

  const actual = {
    dayAvailable: out.dayAvailable,
    minBuildTimeHours: out.minBuildTimeHours,
    dailyCosts: out.dailyCosts,
  };

  if (JSON.stringify(expected) !== JSON.stringify(actual)) {
    failures.push(`${name} ${faction} T${tier} mismatch\nexpected=${JSON.stringify(expected)}\nactual=${JSON.stringify(actual)}`);
  } else {
    console.log(`OK ${name} ${faction} T${tier}`);
  }
}

if (failures.length) {
  console.error(failures.join('\n\n'));
  process.exitCode = 1;
} else {
  console.log(`Validated ${cases.length} example units successfully.`);
}