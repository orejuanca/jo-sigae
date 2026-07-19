const pg = require('pg')

const BD2_URL = 'postgresql://neondb_owner:npg_2FaJNBinevR4@ep-old-glade-ajurc8zh.c-3.us-east-2.aws.neon.tech/bd2?sslmode=require'

async function main() {
  const client = new pg.Client({ connectionString: BD2_URL })
  try {
    await client.connect()
    console.log('✅ Conectado a BD2')

    // Verificar tablas existentes
    const res = await client.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' ORDER BY table_name
    `)
    console.log('Tablas en BD2:', res.rows.map(r => r.table_name))

    if (res.rows.length === 0) {
      console.log('\nBD2 está vacía. Creando tablas...')
      // Crear todas las tablas del schema de Prisma
      await client.query(`
        CREATE TABLE "Student" (
          "id" TEXT NOT NULL,
          "cedula" TEXT NOT NULL,
          "fechaNacimiento" TEXT,
          "apellidos" TEXT NOT NULL,
          "nombres" TEXT NOT NULL,
          "pais" TEXT NOT NULL DEFAULT 'VENEZUELA',
          "estado" TEXT NOT NULL DEFAULT '',
          "municipio" TEXT NOT NULL DEFAULT '',
          "seccion" TEXT NOT NULL DEFAULT '',
          "plan" TEXT NOT NULL DEFAULT 'derogado',
          "rawData" TEXT NOT NULL DEFAULT '{}',
          "certDraft" TEXT,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "Student_pkey" PRIMARY KEY ("id")
        )
      `)
      console.log('✅ Tabla Student creada')

      await client.query(`
        CREATE TABLE "Certification" (
          "id" TEXT NOT NULL,
          "studentId" TEXT NOT NULL,
          "tipo" TEXT NOT NULL DEFAULT 'certificacion',
          "numero" TEXT NOT NULL DEFAULT '',
          "fechaEmision" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "datos" TEXT NOT NULL DEFAULT '{}',
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "Certification_pkey" PRIMARY KEY ("id")
        )
      `)
      console.log('✅ Tabla Certification creada')

      await client.query(`
        CREATE TABLE "BoletaNota" (
          "id" TEXT NOT NULL,
          "studentId" TEXT NOT NULL,
          "anioEscolar" TEXT NOT NULL,
          "grado" TEXT NOT NULL,
          "seccion" TEXT NOT NULL,
          "materia" TEXT NOT NULL,
          "lapso1" TEXT,
          "lapso2" TEXT,
          "lapso3" TEXT,
          "revision" TEXT,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "BoletaNota_pkey" PRIMARY KEY ("id")
        )
      `)
      console.log('✅ Tabla BoletaNota creada')

      await client.query(`
        CREATE TABLE "BoletaExtra" (
          "id" TEXT NOT NULL,
          "studentId" TEXT NOT NULL,
          "anioEscolar" TEXT NOT NULL,
          "grado" TEXT NOT NULL,
          "seccion" TEXT NOT NULL,
          "grupo1" TEXT,
          "grupo2" TEXT,
          "grupo3" TEXT,
          "grupo4" TEXT,
          "observacion" TEXT,
          "obsBoletin" TEXT,
          "materiaPendiente1" TEXT,
          "materiaPendiente2" TEXT,
          "mp1m1" TEXT,
          "mp1m2" TEXT,
          "mp1m3" TEXT,
          "mp1m4" TEXT,
          "mp2m1" TEXT,
          "mp2m2" TEXT,
          "mp2m3" TEXT,
          "mp2m4" TEXT,
          "pl1" TEXT,
          "pl2" TEXT,
          "pl3" TEXT,
          "pl4" TEXT,
          "pl5" TEXT,
          "scoreCA" TEXT,
          "scoreILE" TEXT,
          "scoreMA" TEXT,
          "scoreEF" TEXT,
          "scoreAP" TEXT,
          "scoreCN" TEXT,
          "scoreGHC" TEXT,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "BoletaExtra_pkey" PRIMARY KEY ("id")
        )
      `)
      console.log('✅ Tabla BoletaExtra creada')

      await client.query(`
        CREATE TABLE "CertLayout" (
          "id" TEXT NOT NULL,
          "nombre" TEXT NOT NULL,
          "datos" TEXT NOT NULL,
          "activo" BOOLEAN NOT NULL DEFAULT true,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "CertLayout_pkey" PRIMARY KEY ("id")
        )
      `)
      console.log('✅ Tabla CertLayout creada')

      await client.query(`
        CREATE TABLE "CentroEscolar" (
          "id" TEXT NOT NULL,
          "codigo" TEXT NOT NULL,
          "nombre" TEXT NOT NULL,
          "localidad" TEXT NOT NULL DEFAULT '',
          "estado" TEXT NOT NULL DEFAULT '',
          "municipio" TEXT NOT NULL DEFAULT '',
          "activo" BOOLEAN NOT NULL DEFAULT true,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "CentroEscolar_pkey" PRIMARY KEY ("id")
        )
      `)
      console.log('✅ Tabla CentroEscolar creada')

      // Crear constraints UNIQUE
      await client.query(`ALTER TABLE "Student" ADD CONSTRAINT "Student_cedula_key" UNIQUE ("cedula")`)
      await client.query(`ALTER TABLE "Certification" ADD CONSTRAINT "Certification_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE`)
      await client.query(`ALTER TABLE "BoletaNota" ADD CONSTRAINT "BoletaNota_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE`)
      await client.query(`ALTER TABLE "BoletaNota" ADD CONSTRAINT "BoletaNota_studentId_anioEscolar_grado_seccion_materia_key" UNIQUE ("studentId", "anioEscolar", "grado", "seccion", "materia")`)
      await client.query(`ALTER TABLE "BoletaExtra" ADD CONSTRAINT "BoletaExtra_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE`)
      await client.query(`ALTER TABLE "BoletaExtra" ADD CONSTRAINT "BoletaExtra_studentId_anioEscolar_grado_seccion_key" UNIQUE ("studentId", "anioEscolar", "grado", "seccion")`)
      await client.query(`ALTER TABLE "CentroEscolar" ADD CONSTRAINT "CentroEscolar_codigo_key" UNIQUE ("codigo")`)
      console.log('✅ Constraints creados')

      // Crear índices
      await client.query(`CREATE INDEX "Student_cedula_idx" ON "Student"("cedula")`)
      await client.query(`CREATE INDEX "Student_apellidos_idx" ON "Student"("apellidos")`)
      await client.query(`CREATE INDEX "Student_nombres_idx" ON "Student"("nombres")`)
      await client.query(`CREATE INDEX "Certification_studentId_idx" ON "Certification"("studentId")`)
      await client.query(`CREATE INDEX "Certification_tipo_idx" ON "Certification"("tipo")`)
      await client.query(`CREATE INDEX "BoletaNota_studentId_idx" ON "BoletaNota"("studentId")`)
      await client.query(`CREATE INDEX "BoletaNota_anioEscolar_grado_seccion_idx" ON "BoletaNota"("anioEscolar", "grado", "seccion")`)
      await client.query(`CREATE INDEX "BoletaExtra_anioEscolar_grado_seccion_idx" ON "BoletaExtra"("anioEscolar", "grado", "seccion")`)
      await client.query(`CREATE INDEX "CertLayout_nombre_idx" ON "CertLayout"("nombre")`)
      await client.query(`CREATE INDEX "CentroEscolar_codigo_idx" ON "CentroEscolar"("codigo")`)
      await client.query(`CREATE INDEX "CentroEscolar_nombre_idx" ON "CentroEscolar"("nombre")`)
      console.log('✅ Índices creados')

      // Crear tabla _prisma_migrations para que Prisma no se queje
      await client.query(`
        CREATE TABLE "_prisma_migrations" (
          "id" VARCHAR(36) NOT NULL,
          "checksum" VARCHAR(64) NOT NULL,
          "finished_at" TIMESTAMPTZ,
          "migration_name" VARCHAR(255) NOT NULL,
          "logs" TEXT,
          "rolled_back_at" TIMESTAMPTZ,
          "started_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "applied_steps_count" INTEGER NOT NULL DEFAULT 0,
          CONSTRAINT "_prisma_migrations_pkey" PRIMARY KEY ("id")
        )
      `)
      console.log('✅ Tabla _prisma_migrations creada')

      console.log('\n🎉 BD2 completamente configurada con todas las tablas!')

      // Verificar
      const res2 = await client.query(`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name`)
      console.log('Tablas finales:', res2.rows.map(r => r.table_name))

    } else {
      console.log('\nBD2 ya tiene tablas. Verificando estructura...')
      // Listar columnas de Student
      const cols = await client.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'Student' ORDER BY ordinal_position`)
      console.log('Columnas de Student:', cols.rows.map(r => r.column_name))
    }

  } catch (err) {
    console.error('❌ Error:', err.message)
    console.error(err.stack)
  } finally {
    await client.end()
  }
}

main()