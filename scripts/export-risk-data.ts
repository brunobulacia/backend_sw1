import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
  const rows = await prisma.mLSprintRiskPrediction.findMany({
    select: {
      riskLevel: true,
      committedEffort: true,
      teamCapacity: true,
      historicalVelocity: true,
      factors: true,
    },
  });

  const outPath = path.join(__dirname, 'risk_data.csv');
  const header = [
    'committedEffort',
    'teamCapacity',
    'historicalVelocity',
    'missedStories',
    'teamChanges',
    'bugsOpen',
    'riskLevel',
  ];
  const lines = [header.join(',')];

  for (const row of rows) {
    const f = (row.factors || {}) as any;
    const line = [
      row.committedEffort ?? '',
      row.teamCapacity ?? '',
      row.historicalVelocity ?? '',
      f.missedStories ?? 0,
      f.teamChanges ?? 0,
      f.bugsOpen ?? 0,
      row.riskLevel, // LOW / MEDIUM / HIGH
    ].join(',');
    lines.push(line);
  }

  fs.writeFileSync(outPath, lines.join('\n'), 'utf8');
  console.log('✅ risk_data.csv generado en', outPath);
}

main().finally(() => prisma.$disconnect());
