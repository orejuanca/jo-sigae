const pg = require('pg')

// Conexión directa (sin pooler) para CREATE DATABASE
const DIRECT_URL = 'postgresql://neondb_owner:npg_2FaJNBinevR4@ep-old-glade-ajurc8zh.c-3.us-east-2.aws.neon.tech/neondb?sslmode=require'

async function main() {
  const client = new pg.Client({ connectionString: DIRECT_URL })
  try {
    await client.connect()
    console.log('✅ Conectado a Neon (directo)')

    // Verificar bases de datos existentes
    const res = await client.query("SELECT datname FROM pg_database WHERE datistemplate = false ORDER BY datname")
    console.log('Bases de datos existentes:', res.rows.map(r => r.datname))

    // Crear BD2
    console.log('\nCreando base de datos "bd2"...')
    await client.query('CREATE DATABASE bd2')
    console.log('✅ Base de datos "bd2" creada exitosamente!')

    // Verificar
    const res2 = await client.query("SELECT datname FROM pg_database WHERE datname = 'bd2'")
    console.log('Confirmación:', res2.rows)

  } catch (err) {
    console.error('❌ Error:', err.message)
    if (err.message.includes('already exists')) {
      console.log('La base de datos "bd2" ya existe.')
    }
  } finally {
    await client.end()
  }
}

main()