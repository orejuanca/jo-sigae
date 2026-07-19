const pg = require('pg')

// BD2 connection (the one Vercel injects as DATABASE_URL_2)
const BD2_URL = 'postgresql://neondb_owner:npg_2FaJNBinevR4@ep-old-glade-ajurc8zh.c-3.us-east-2.aws.neon.tech/bd2?sslmode=require'

async function main() {
  const client = new pg.Client({ connectionString: BD2_URL })
  try {
    await client.connect()
    console.log('✅ Conectado a BD2 (bd2)')

    const res = await client.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' ORDER BY table_name
    `)
    console.log('Tablas:', res.rows.map(r => r.table_name))

    if (res.rows.length > 0) {
      const cnt = await client.query('SELECT COUNT(*) as cnt FROM "Student"')
      console.log('Estudiantes en BD2:', cnt.rows[0].cnt)
    } else {
      console.log('BD2 no tiene tablas. Necesita setup.')
    }
  } catch (err) {
    console.error('Error:', err.message)
  } finally {
    await client.end()
  }
}

main()