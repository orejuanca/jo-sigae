const pg = require('pg')

const BD2_URL = 'postgresql://neondb_owner:npg_2FaJNBinevR4@ep-old-glade-ajurc8zh.c-3.us-east-2.aws.neon.tech/bd2?sslmode=require'
const BD1_URL = 'postgresql://neondb_owner:npg_2FaJNBinevR4@ep-old-glade-ajurc8zh.c-3.us-east-2.aws.neon.tech/neondb?sslmode=require'

async function checkDB(name, url) {
  const client = new pg.Client({ connectionString: url })
  try {
    await client.connect()
    console.log(`\n=== ${name} ===`)
    
    const tables = await client.query(`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name`)
    console.log('Tablas:', tables.rows.map(r => r.table_name))
    
    if (tables.rows.some(r => r.table_name === 'Student')) {
      const cnt = await client.query('SELECT COUNT(*) as cnt FROM "Student"')
      console.log('Estudiantes:', cnt.rows[0].cnt)
    } else {
      console.log('No hay tabla Student')
    }
  } catch (err) {
    console.error(`Error en ${name}:`, err.message)
  } finally {
    await client.end()
  }
}

async function main() {
  await checkDB('BD (neondb)', BD1_URL)
  await checkDB('BD2 (bd2)', BD2_URL)
}

main()