// Re-exportar la BD vigente como `prisma` para compatibilidad
export { dbVigente as prisma } from './db-helper'
export { dbVigente as default } from './db-helper'