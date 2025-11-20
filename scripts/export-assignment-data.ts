import { PrismaClient, MLDataType } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
  const rows = await prisma.mLTrainingData.findMany({
    where: { dataType: MLDataType.ASSIGNMENT },
    select: {
      features: true,
      outcome: true,
      wasSuccessful: true,
    },
  });

  const outPath = path.join(__dirname, 'assignment_data.csv');
  const header = [
    'storyPriority',
    'storyBusinessValue',
    'taskEffort',
    'sprintNumber',
    'isBug',
    'developerPastTasksCompleted',
    'developerPastDefectsFixed',
    'assignedToSuggested',
    'wasSuccessful',
  ];

  const lines = [header.join(',')];

  for (const row of rows) {
    const f = row.features as any;
    const o = (row.outcome || {}) as any;

    const line = [
      f.storyPriority,
      f.storyBusinessValue,
      f.taskEffort,
      f.sprintNumber,
      f.isBug ? 1 : 0,
      f.developerPastTasksCompleted,
      f.developerPastDefectsFixed,
      o.assignedToSuggested ? 1 : 0,
      row.wasSuccessful === true ? 1 : 0,
    ].join(',');

    lines.push(line);
  }

  fs.writeFileSync(outPath, lines.join('\n'), 'utf8');
  console.log('✅ assignment_data.csv generado en', outPath);
}

main().finally(() => prisma.$disconnect());
