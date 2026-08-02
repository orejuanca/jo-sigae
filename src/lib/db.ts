// Re-exportar la BD compartida como `db` para compatibilidad
// con rutas que no necesitan selección de plan (CE, layouts, etc.)
export { db } from './db-helper'
