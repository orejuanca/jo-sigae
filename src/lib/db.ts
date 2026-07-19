// Re-exportar la BD vigente como `db` para compatibilidad
// con rutas que no necesitan selección de plan (CE, layouts, etc.)
export { dbVigente as db } from './db-helper'