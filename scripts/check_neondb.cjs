const pg = require('pg')

const DIRECT_URL = 'postgresql://neondb_owner:npg_2FaJNBinevR4@ep-old-glade-ajurc8zh.c-3.us-east-2.aws.neon.tech/neondb?sslmode=require'

async function main() {
  const client = new pg.Client({ connectionString: DIRECT_URL })
  try {
    await client.connect()
    
    // Verificar TODAS las bases de datos
    const dbs = await client.query("SELECT datname FROM pg_database WHERE datistemplate = false ORDER BY datname")
    console.log('Todas las BD:', dbs.rows.map(r => r.datname))
    
    // Verificar esquemas en neondb
    const schemas = await client.query("SELECT schema_name FROM information_schema.schemata ORDER BY schema_name")
    console.log('Esquemas en neondb:', schemas.rows.map(r => r.schema_name))
    
    // Verificar TODAS las tablas en todos los esquemas
    const tables = await client.query(`
      SELECT table_schema, table_name FROM information_schema.tables 
      WHERE table_type = 'BASE TABLE' ORDER BY table_schema, table_name
    `)
    console.log('Todas las tablas en neondb:', tables.rows.map(r => `${r.table_schema}.${r.table_name}`))
    
    // Verificar también en schema "vercel_postgres" si existe
    try {
      const vTables = await client.query(`SELECT table_name FROM information_schema.tables WHERE table_schema = 'vercel_postgres'`)
      if (vTables.rows.length > 0) {
        console.log('Tablas en vercel_postgres:', vTables.rows.map(r => r.table_name))
      }
    } catch(e) {}

  } catch (err) {
    console.error('Error:', err.message)
  } finally {
    await client.end()
  }
}

main()