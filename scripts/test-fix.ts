import { flattenRawData } from '../src/lib/flatten-raw';
import { PrismaClient } from '../src/generated/prisma';

const p = new PrismaClient();

async function test() {
  const tests = [
    ['V-31699476', 'NOTA.MA.1', '4'],
    ['V-32257111', 'NOTA.MA.1', '10'],
    ['V-29661319', 'OBS.NOTAS.L3', ''],
    ['V-29683327', 'OBS.NOTAS.L3', ''],
    ['V-32493186', 'OBS.NOTAS.L3', ''],
  ];
  for (const [ced, field, expect] of tests) {
    const s = await p.student.findFirst({ where: { cedula: ced as string }, select: { rawData: true } });
    if (!s?.rawData || s.rawData === '{}') { console.log(ced + ': SIN DATOS'); continue; }
    const flat = flattenRawData(JSON.parse(s.rawData));
    const val = flat[field as string];
    const ok = expect === '' ? !val : val === expect;
    console.log(ced + ' ' + field + ':', JSON.stringify(val), ok ? '✅' : '❌ esperado:' + expect);
  }
  await p.disconnect();
}
test();
