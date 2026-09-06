// ==================== RF: RESUMEN FINAL DEL RENDIMIENTO ESTUDIANTIL (formato EMG) ====================
// Constantes del formato oficial del Ministerio de Educación, decodificadas verbatim de las
// hojas "RF 1°".."RF 5°" del Excel "Control de Alumnos UENCC 2021-2022". El módulo RF NO agrega
// data: consulta por los 5 parámetros (año escolar activo, tipo de evaluación, mes y año,
// grado, sección) y cuadra la data existente del sistema en el formato.

// --- Grados (un formato por grado) ---
export const GRADOS_RF = ['1', '2', '3', '4', '5'] as const;

// --- I. Tipo de Evaluación (lista cerrada PROFESORES EVAL) ---
export const TIPOS_EVAL = [
  'NO CURSANTE',
  'PENDIENTE',
  'EQUIVALENCIA',
  'QUEDADA',
  'TRANSFERENCIA',
  'FINAL',
  'REVISIÓN',
] as const;
export type TipoEval = (typeof TIPOS_EVAL)[number];

// --- I. Mes y Año (lista cerrada MESANO, 12 valores del año 2021-2022) ---
export const MESES_ANIO = [
  'SEPTIEMBRE - 2021',
  'OCTUBRE - 2021',
  'NOVIEMBRE - 2021',
  'DICIEMBRE - 2021',
  'ENERO - 2022',
  'FEBRERO - 2022',
  'MARZO - 2022',
  'ABRIL - 2022',
  'MAYO - 2022',
  'JUNIO - 2022',
  'JULIO - 2022',
  'AGOSTO - 2022',
] as const;

// --- I. Sección (lista cerrada SECCION: A..I + U con dos variantes) ---
// U(EQV) = RÉGIMEN DE EQUIVALENCIA -> sección "U" del sistema; se imprime "U"
// U(MP)  = MATERIA PENDIENTE      -> sección "MP" del sistema; se imprime "U."
export const SECCIONES_RF = [
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'U(EQV)', 'U(MP)',
] as const;
export type SeccionRF = (typeof SECCIONES_RF)[number];

export function codigoSeccionDe(sec: string): string {
  if (sec === 'U(EQV)') return 'U';
  if (sec === 'U(MP)') return 'MP';
  return sec;
}
export function displaySeccionDe(sec: string): string {
  if (sec === 'U(EQV)') return 'U';
  if (sec === 'U(MP)') return 'U.';
  return sec;
}

// --- IV. Áreas de Formación por grado (orden EXACTO del formato) ---
// letras = OC/PGCRP (se muestran con letras A/B/C/D y EX; el pie las cuenta distinto)
export const AREAS_POR_GRADO: Record<string, { codigo: string; nombre: string; letras: boolean; etiquetaV?: string }[]> = {
  '1': [
    { codigo: 'CA', nombre: 'Castellano', letras: false },
    { codigo: 'ILE', nombre: 'Inglés y otras Lenguas Extranjeras', letras: false },
    { codigo: 'MA', nombre: 'Matemáticas', letras: false },
    { codigo: 'EF', nombre: 'Educación Física', letras: false },
    { codigo: 'AP', nombre: 'Arte y Patrimonio', letras: false },
    { codigo: 'CN', nombre: 'Ciencias Naturales', letras: false },
    { codigo: 'GHC', nombre: 'Geografía, Historia y Ciudadanía', letras: false },
    { codigo: 'OC', nombre: 'Orientación y Convivencia', letras: true },
    { codigo: 'PGCRP', nombre: 'Participación en Grupos de Creación, Recreación y Producción', letras: true },
  ],
  '2': [
    { codigo: 'CA', nombre: 'Castellano', letras: false },
    { codigo: 'ILE', nombre: 'Inglés y otras Lenguas Extranjeras', letras: false },
    { codigo: 'MA', nombre: 'Matemáticas', letras: false },
    { codigo: 'EF', nombre: 'Educación Física', letras: false },
    { codigo: 'AP', nombre: 'Arte y Patrimonio', letras: false },
    { codigo: 'CN', nombre: 'Ciencias Naturales', letras: false },
    { codigo: 'GHC', nombre: 'Geografía, Historia y Ciudadanía', letras: false },
    { codigo: 'OC', nombre: 'Orientación y Convivencia', letras: true },
    { codigo: 'PGCRP', nombre: 'Participación en Grupos de Creación, Recreación y Producción', letras: true },
  ],
  '3': [
    { codigo: 'CA', nombre: 'Castellano', letras: false },
    { codigo: 'ILE', nombre: 'Inglés y otras Lenguas Extranjeras', letras: false },
    { codigo: 'MA', nombre: 'Matemáticas', letras: false },
    { codigo: 'EF', nombre: 'Educación Física', letras: false },
    { codigo: 'FI', nombre: 'Física', letras: false },
    { codigo: 'QU', nombre: 'Química', letras: false },
    { codigo: 'BI', nombre: 'Biología', letras: false },
    { codigo: 'GHC', nombre: 'Geografía, Historia y Ciudadanía', letras: false },
    { codigo: 'OC', nombre: 'Orientación y Convivencia', letras: true },
    { codigo: 'PGCRP', nombre: 'Participación en Grupos de Creación, Recreación y Producción', letras: true },
  ],
  '4': [
    { codigo: 'CA', nombre: 'Castellano', letras: false },
    { codigo: 'ILE', nombre: 'Inglés y otras Lenguas Extranjeras', letras: false },
    { codigo: 'MA', nombre: 'Matemáticas', letras: false },
    { codigo: 'EF', nombre: 'Educación Física', letras: false },
    { codigo: 'FI', nombre: 'Física', letras: false },
    { codigo: 'QU', nombre: 'Química', letras: false },
    { codigo: 'BI', nombre: 'Biología', letras: false },
    { codigo: 'GHC', nombre: 'Geografía, Historia y Ciudadanía', letras: false },
    { codigo: 'FSN', nombre: 'Formación para la Soberanía Nacional', letras: false, etiquetaV: 'FS' },
    { codigo: 'OC', nombre: 'Orientación y Convivencia', letras: true },
    { codigo: 'PGCRP', nombre: 'Participación en Grupos de Creación, Recreación y Producción', letras: true },
  ],
  '5': [
    { codigo: 'CA', nombre: 'Castellano', letras: false },
    { codigo: 'ILE', nombre: 'Inglés y otras Lenguas Extranjeras', letras: false },
    { codigo: 'MA', nombre: 'Matemáticas', letras: false },
    { codigo: 'EF', nombre: 'Educación Física', letras: false },
    { codigo: 'FI', nombre: 'Física', letras: false },
    { codigo: 'QU', nombre: 'Química', letras: false },
    { codigo: 'BI', nombre: 'Biología', letras: false },
    { codigo: 'CT', nombre: 'Ciencias de la Tierra', letras: false },
    { codigo: 'GHC', nombre: 'Geografía, Historia y Ciudadanía', letras: false },
    { codigo: 'FSN', nombre: 'Formación para la Soberanía Nacional', letras: false, etiquetaV: 'FS' },
    { codigo: 'OC', nombre: 'Orientación y Convivencia', letras: true },
    { codigo: 'PGCRP', nombre: 'Participación en Grupos de Creación, Recreación y Producción', letras: true },
  ],
};

// --- VI. Identificación del Curso ---
export const ANIO_CURSADO: Record<string, string> = {
  '1': 'PRIMERO', '2': 'SEGUNDO', '3': 'TERCERO', '4': 'CUARTO', '5': 'QUINTO',
};
export const PLAN_ESTUDIO = 'EDUCACIÓN MEDIA GENERAL';
export const CODIGO_PLAN = '31059';

// --- II. Datos de la Institución (verbatim del formato: PROFESORES BR4/BP6/BQ6/BP8/BR8/BQ8/BP2/BQ2) ---
export const INSTITUCION = {
  codigo: 'OD16751520',
  denominacion: 'U E N CREACION CUA',
  direccion: 'URB. JOSE DE SAN MARTIN, SECTOR LOS BLOQUES, NVA. CUA',
  telefono: '(0239) 7163530',
  municipio: 'RAFAEL URDANETA',
  entidadFederal: 'MIRANDA',
  director: 'PAREDES HURTADO, RAQUEL',
  cedulaDirector: 'V 6419439',
};

// --- Geometría del formato (px naturales por columna lógica, MDW 5.5) y escala Excel ---
// id = [N°, Cédula, Apellidos, Nombres, Lugar, EF, SEXO, DÍA, MES, AÑO]
export const GEOMETRIA: Record<string, { id: number[]; areas: number[]; grupo: number; escala: number }> = {
  '1': { id: [22, 124, 150, 157, 117, 24, 20, 24, 29, 39], areas: [28, 28, 28, 28, 28, 28, 33, 24, 36], grupo: 91, escala: 74 },
  '2': { id: [22, 124, 150, 157, 117, 24, 20, 24, 29, 39], areas: [28, 28, 28, 28, 28, 28, 32, 24, 36], grupo: 91, escala: 74 },
  '3': { id: [22, 124, 150, 157, 117, 24, 20, 24, 28, 39], areas: [28, 28, 28, 28, 28, 28, 28, 51, 36, 31], grupo: 61, escala: 71 },
  '4': { id: [22, 124, 150, 157, 117, 24, 20, 24, 29, 39], areas: [28, 28, 28, 28, 28, 28, 28, 55, 24, 36, 31], grupo: 61, escala: 70 },
  '5': { id: [22, 124, 150, 157, 117, 24, 20, 24, 28, 39], areas: [28, 28, 28, 28, 28, 28, 28, 24, 29, 29, 24, 36], grupo: 91, escala: 67 },
};

// --- Reglas del formato ---
// Máximo de alumnos por hoja (desborde => nueva hoja con el mismo formato 01..35)
export const MAX_ALUMNOS_HOJA = 35;

// Cédula LEGAL = V + hasta 9 dígitos (ej. "V 32787155"). Los alumnos SIN cédula legal
// (cédula escolar V+11 dígitos, ej. "V10817928482", o sin cédula) van en PLANILLAS APARTE.
export function esCedulaLegal(cedula: string): boolean {
  const digitos = (cedula || '').replace(/[^0-9]/g, '');
  return digitos.length >= 6 && digitos.length <= 9;
}

// Mes y Año -> momento de la Materia Pendiente (1M OCT, 2M DIC, 3M ENE, 4M JUN)
export function mesAMomento(mes: string): number | null {
  if (mes === 'OCTUBRE - 2021') return 1;
  if (mes === 'DICIEMBRE - 2021') return 2;
  if (mes === 'ENERO - 2022') return 3;
  if (mes === 'JUNIO - 2022') return 4;
  return null;
}

// Números de slot del formato: siempre 01..35 (dos dígitos), en todas las hojas
export function pad2(n: number): string {
  return n < 10 ? '0' + n : String(n);
}

// ==================== VII. OBSERVACIONES ====================
// La sección VII del formato EMG NO va en blanco: las fórmulas del Excel (N68/A69 de
// cada hoja RF) la llenan con VLOOKUP directo a las sábanas de notas:
//   · tipo REVISIÓN          -> hojas NR {g}°  (celdas C{48k} / A{48k+1})
//   · cualquier otro tipo    -> hojas NL {g}°  (celdas C{48k} / A{48k+1})
//   · sección U. (MP)        -> bloque "Notas de Materia Pendiente" de NL {g}° y la celda
//                               depende del MES: OCTUBRE -> C528/A529, DICIEMBRE -> C530/A531,
//                               ENERO -> C532/A533, JUNIO -> C534/A535; otro mes -> "*"
// donde k = posición de la sección (A=1 ... U=10). Cuando el docente no anotó nada,
// la celda de la sábana contiene "*" y el formato imprime ese "*" (convención de la sábana).
// Data transcrita VERBATIM de las sábanas NL 1°..5° y NR 1°..5° del Excel 2021-2022
// (todas las segundas líneas A{48k+1} del legacy son "*").
export const ANO_ESCOLAR_LEGACY = '2021 - 2022';

type ParObs = [string, string]; // [línea 1 (col C), línea 2 (col A)]
const STAR: ParObs = ['*', '*'];

const OBS_NL: Record<string, Record<string, ParObs>> = {
  '1': {
    B: ['NOMBRES: N.22 SUSEJ.', '*'],
    D: ['LUGAR DE NACIMIENTO: N.11 JUAN GERMAN ROSCIO.', '*'],
    E: ['NOMBRES: N.04 MADERLEINIS.', '*'],
    'U.OCT': ['NOMBRES: N°02 ALEXANDRA.', '*'],
  },
  '2': {
    A: ['LUGAR DE NAC.:N.31 JUAN GERMAN ROSCIO.', '*'],
    C: ['NOMBRES: N.10 JOSYMAR.', '*'],
    D: ['LUGAR DE NAC.:N.15 JUAN GERMAN ROSCIO.', '*'],
    E: ['APELLIDOS: N.01 CASTELLANOS.', '*'],
    'U.ENE': ['N.01: INGRESO 11/01/2022.', '*'],
    'U.JUN': ['N.01: INGRESO 08/02/2022.', '*'],
  },
  '3': {
    B: ['NOMBRES: N.18 DEL VALLE.', '*'],
    C: ['NOMBRES: N.21 LOS ANGELES, N.26 BETANIA DE NAZARETH. LUGAR DE NAC.:N.27 JUAN ANTONIO SOTILLO, N.34 JUAN GERMAN ROSCIO.', '*'],
    D: ['LUGAR DE NAC.:N.28 JUAN GERMAN ROSCIO.', '*'],
    E: ['NOMBRES: N.05 LOS ANGELES, N.16 LEONARDO.', '*'],
    F: ['NOMBRES: N.11 ARKANGEL.', '*'],
    'U.OCT': ['LUGAR DE NACIMIENTO: N.04 LEONARDO INFANTE.', '*'],
  },
  '4': {
    D: ['NOMBRES: N. 04 JORSECK.', '*'],
  },
  '5': {
    A: ['NOMBRES: N° 12 ELIZABETH, N° 32 KARLESYEI SHAIR.', '*'],
    B: ['LUGAR DE NACIMIENTO: N.02 MONAGAS.', '*'],
    C: ['NOMBRES: N.02 NATHALY, N.16 GREGORIO.', '*'],
    D: ['NOMBRES: N.01 YOELKARLEY KAROLAYN COROMOTO', '*'],
  },
};

const OBS_NR: Record<string, Record<string, ParObs>> = {
  '2': {
    A: ['LUGAR DE NAC.: N.01 SIMON RODRIGUEZ.', '*'],
    E: ['APELLIDOS: N.01 CASTELLANOS.', '*'],
  },
  '3': {
    C: ['NOMBRES: N.01 LOS ANGELES.', '*'],
  },
  '5': {
    C: ['NOMBRES: N.01  NATHALY.', '*'],
  },
};

// Observaciones que imprime el formato para la consulta actual (5 parámetros).
// Mecánica verbatim de las fórmulas N68/A69 de las hojas RF del Excel.
export function observacionRF(grado: string, sec: string, tipo: string, mes: string): { linea1: string; linea2: string } {
  if (sec === 'U(MP)') {
    // U. = bloque MATERIA PENDIENTE: SIEMPRE consulta NL (el tramo final de las fórmulas
    // del Excel referencia NL sin importar el tipo de evaluación) y la celda depende del
    // mes (los 4 momentos del año escolar).
    if (mes === 'OCTUBRE - 2021') return parDe(OBS_NL, grado, 'U.OCT');
    if (mes === 'DICIEMBRE - 2021') return parDe(OBS_NL, grado, 'U.DIC');
    if (mes === 'ENERO - 2022') return parDe(OBS_NL, grado, 'U.ENE');
    if (mes === 'JUNIO - 2022') return parDe(OBS_NL, grado, 'U.JUN');
    return { linea1: '*', linea2: '*' };
  }
  const tabla = tipo === 'REVISIÓN' ? OBS_NR : OBS_NL; // REVISIÓN -> NR; resto -> NL
  const clave = sec === 'U(EQV)' ? 'U' : sec;
  return parDe(tabla, grado, clave);
}

function parDe(tabla: Record<string, Record<string, ParObs>>, grado: string, clave: string): { linea1: string; linea2: string } {
  const par = tabla[grado]?.[clave];
  return { linea1: par?.[0] ?? '*', linea2: par?.[1] ?? '*' };
}

// para años escolares sin sábanas legacy (distintos de 2021 - 2022): el formato muestra "*"
export const OBS_VACIAS = { linea1: '*', linea2: '*' };
