import { readFileSync } from 'fs';
import { join } from 'path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface StudentRecord {
  CEDULA: string;
  FECHA: string;
  APELLIDOS: string;
  NOMBRES: string;
  PAIS: string;
  ESTADO: string;
  MUNICIPIO: string;
  [key: string]: unknown;
}

async function seedStudents(filePath: string, plan: string) {
  const rawData = readFileSync(filePath, 'utf-8');
  const records: StudentRecord[] = JSON.parse(rawData);

  console.log(`Seeding ${records.length} students from ${plan}...`);

  let count = 0;
  for (const record of records) {
    if (!record.CEDULA || record.CEDULA.trim() === '') continue;

    const cedula = record.CEDULA.trim();
    const apellidos = (record.APELLIDOS || '').trim();
    const nombres = (record.NOMBRES || '').trim();

    if (!apellidos && !nombres) continue;

    try {
      await prisma.student.upsert({
        where: { cedula },
        create: {
          cedula,
          fechaNacimiento: record.FECHA || null,
          apellidos,
          nombres,
          pais: (record.PAIS || 'VENEZUELA').trim(),
          estado: (record.ESTADO || '').trim(),
          municipio: (record.MUNICIPIO || '').trim(),
          plan,
          rawData: JSON.stringify(record),
        },
        update: {
          fechaNacimiento: record.FECHA || null,
          apellidos,
          nombres,
          pais: (record.PAIS || 'VENEZUELA').trim(),
          estado: (record.ESTADO || '').trim(),
          municipio: (record.MUNICIPIO || '').trim(),
          plan,
          rawData: JSON.stringify(record),
        },
      });
      count++;
    } catch (error) {
      console.error(`Error inserting student ${cedula}:`, error);
    }

    if (count % 500 === 0) {
      console.log(`  Progress: ${count} students...`);
    }
  }

  console.log(`  Seeded ${count} students from ${plan}`);
  return count;
}

async function main() {
  console.log('Starting database seed...');
  
  // Clear existing data
  console.log('Clearing existing data...');
  await prisma.certification.deleteMany();
  await prisma.student.deleteMany();

  const dbPath = join(process.cwd(), 'db');

  // Seed plan vigente
  const vigentePath = join(dbPath, 'students_bd.json');
  let totalVigente = 0;
  try {
    totalVigente = await seedStudents(vigentePath, 'vigente');
  } catch (error) {
    console.error('Error seeding vigente:', error);
  }

  // Seed plan derogado
  const derogadoPath = join(dbPath, 'students_bd2.json');
  let totalDerogado = 0;
  try {
    totalDerogado = await seedStudents(derogadoPath, 'derogado');
  } catch (error) {
    console.error('Error seeding derogado:', error);
  }

  console.log(`\nSeed completed!`);
  console.log(`  Total students seeded: ${totalVigente + totalDerogado}`);
  console.log(`  Plan vigente: ${totalVigente}`);
  console.log(`  Plan derogado: ${totalDerogado}`);
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
