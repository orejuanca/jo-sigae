// Configuración institucional de la U.E.N. Creación Cúa
// Datos extraídos del formato oficial de Certificación de Calificaciones

export const schoolConfig = {
  // Nombre oficial
  nombre: 'U.E.N. Creación Cúa',
  nombreCompleto: 'Unidad Educativa Nacional Creación Cúa',

  // Código OD
  od: 'OD16751520',

  // Plan de estudio
  planEstudio: 'EDUCACIÓN MEDIA GENERAL',
  planCodigo: '31059',

  // Ubicación
  direccion: 'Urb. José de S. Martín — Sector Los Bloques — Nueva Cúa',
  municipio: 'Rafael Urdaneta',
  estado: 'Miranda',
  telefono: '(0239) 7163530',

  // CDCCE
  cdcceEstado: 'Miranda',

  // Director(a) - Sección VII
  director: {
    apellidosNombres: 'PAREDES HURTADO, RAQUEL',
    cedula: 'V 6419439',
  },

  // Director(a) CDCCE - Sección VIII
  directorCdcce: {
    apellidosNombres: '',
    cedula: '',
  },

  // Valor fiscal
  valorFiscal: '0,3 U.T.',
  valorFiscalTexto: 'Para su validez legal y de acuerdo al Ramo de Estampillas, al dorso de este documento se le debe colocar tres décimas de la Unidad Tributaria (0,3 U.T.)',
}

// Materias por año según el plan de Educación Media General vigente
export interface MateriaAnio {
  nombre: string
  numero: number
}

export interface PlanAnio {
  anio: string
  materias: MateriaAnio[]
}

export const planEMG: PlanAnio[] = [
  {
    anio: 'Primer Año',
    materias: [
      { nombre: 'Castellano', numero: 1 },
      { nombre: 'Inglés y otras Lenguas Extranjeras', numero: 2 },
      { nombre: 'Matemáticas', numero: 3 },
      { nombre: 'Educación Física', numero: 4 },
      { nombre: 'Arte y Patrimonio', numero: 5 },
      { nombre: 'Ciencias Naturales', numero: 6 },
      { nombre: 'Geografía, Historia y Ciudadanía', numero: 7 },
    ],
  },
  {
    anio: 'Segundo Año',
    materias: [
      { nombre: 'Castellano', numero: 1 },
      { nombre: 'Inglés y otras Lenguas Extranjeras', numero: 2 },
      { nombre: 'Matemáticas', numero: 3 },
      { nombre: 'Educación Física', numero: 4 },
      { nombre: 'Arte y Patrimonio', numero: 5 },
      { nombre: 'Ciencias Naturales', numero: 6 },
      { nombre: 'Geografía, Historia y Ciudadanía', numero: 7 },
    ],
  },
  {
    anio: 'Tercer Año',
    materias: [
      { nombre: 'Castellano', numero: 1 },
      { nombre: 'Inglés y otras Lenguas Extranjeras', numero: 2 },
      { nombre: 'Matemáticas', numero: 3 },
      { nombre: 'Educación Física', numero: 4 },
      { nombre: 'Física', numero: 5 },
      { nombre: 'Química', numero: 6 },
      { nombre: 'Biología', numero: 7 },
      { nombre: 'Geografía, Historia y Ciudadanía', numero: 8 },
    ],
  },
  {
    anio: 'Cuarto Año',
    materias: [
      { nombre: 'Castellano', numero: 1 },
      { nombre: 'Inglés y otras Lenguas Extranjeras', numero: 2 },
      { nombre: 'Matemáticas', numero: 3 },
      { nombre: 'Educación Física', numero: 4 },
      { nombre: 'Física', numero: 5 },
      { nombre: 'Química', numero: 6 },
      { nombre: 'Biología', numero: 7 },
      { nombre: 'Geografía, Historia y Ciudadanía', numero: 8 },
      { nombre: 'Formación para la Soberanía Nacional', numero: 9 },
    ],
  },
  {
    anio: 'Quinto Año',
    materias: [
      { nombre: 'Castellano', numero: 1 },
      { nombre: 'Inglés y otras Lenguas Extranjeras', numero: 2 },
      { nombre: 'Matemáticas', numero: 3 },
      { nombre: 'Educación Física', numero: 4 },
      { nombre: 'Física', numero: 5 },
      { nombre: 'Química', numero: 6 },
      { nombre: 'Biología', numero: 7 },
      { nombre: 'Ciencias de la Tierra', numero: 8 },
      { nombre: 'Geografía, Historia y Ciudadanía', numero: 9 },
      { nombre: 'Formación para la Soberanía Nacional', numero: 10 },
    ],
  },
]

// Calificaciones literales según el sistema venezolano
export const calificacionesLiterales: Record<string, string> = {
  '18-20': 'A',
  '15-17': 'B',
  '12-14': 'C',
  '10-11': 'D',
  '01-09': 'E',
}

// Convertir nota numérica a literal (A-E) — usado en boletín
export function notaToLiteral(nota: number): string {
  if (nota >= 18) return 'A'
  if (nota >= 15) return 'B'
  if (nota >= 12) return 'C'
  if (nota >= 10) return 'D'
  return 'E'
}

// Convertir nota numérica a PALABRAS — usado en certificación de calificaciones
// Ejemplo: 10 = DIEZ, 20 = VEINTE, 01 = CERO UNO
const NOTAS_EN_LETRAS: Record<number, string> = {
  1: 'CERO UNO',
  2: 'CERO DOS',
  3: 'CERO TRES',
  4: 'CERO CUATRO',
  5: 'CERO CINCO',
  6: 'CERO SEIS',
  7: 'CERO SIETE',
  8: 'CERO OCHO',
  9: 'CERO NUEVE',
  10: 'DIEZ',
  11: 'ONCE',
  12: 'DOCE',
  13: 'TRECE',
  14: 'CATORCE',
  15: 'QUINCE',
  16: 'DIECISÉIS',
  17: 'DIECISIETE',
  18: 'DIECIOCHO',
  19: 'DIECINUEVE',
  20: 'VEINTE',
}

export function notaEnLetras(nota: number | string): string {
  const raw = typeof nota === 'string' ? nota.trim() : String(nota)
  if (raw === 'IN') return 'INASISTENTE'
  if (raw === 'PE') return 'PENDIENTE'
  const n = parseInt(raw, 10)
  if (isNaN(n) || n < 1 || n > 20) return ''
  return NOTAS_EN_LETRAS[n] || raw
}

// Tipos de evaluación
export const tiposEvaluacion = ['AC', 'PR', 'AP', 'EF', 'EQ'] as const

// Formatear cédula según regla oficial:
// - Máximo 10 caracteres INCLUYENDO el espacio → lleva espacio: "V 12345678" (10 chars)
// - Más de 10 caracteres → SIN espacio: "V1234567890" (11+ chars)
export function formatCedulaFinal(raw: string): string {
  const trimmed = raw.trim().toUpperCase()
  // Separar letra del número
  const match = trimmed.match(/^([VEP])[^\d]*(\d.+)$/)
  if (!match) return trimmed
  const letter = match[1]
  const number = match[2]
  // Si letra + espacio + número <= 10 caracteres, incluir espacio
  if (letter.length + 1 + number.length <= 10) {
    return `${letter} ${number}`
  }
  // Si excede 10 caracteres, sin espacio
  return `${letter}${number}`
}
