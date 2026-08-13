// fix-cert-view-final.cjs — REESCRIBE enrichedDisplayData correctamente
// Ejecutar: node fix-cert-view-final.cjs
const fs = require('fs');
const filePath = 'src/app/cert-view/page.tsx';
const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);

// Encontrar inicio y fin del useMemo enrichedDisplayData
let startLine = -1, endLine = -1, braceCount = 0, foundStart = false;

for (let i = 0; i < lines.length; i++) {
  if (!foundStart && lines[i].includes('enrichedDisplayData = useMemo')) {
    foundStart = true;
    startLine = i;
    braceCount = 0;
  }
  if (foundStart) {
    for (const ch of lines[i]) {
      if (ch === '(' || ch === '{' || ch === '[') braceCount++;
      if (ch === ')' || ch === '}' || ch === ']') braceCount--;
    }
    if (braceCount <= 0 && i > startLine + 2) {
      endLine = i;
      break;
    }
  }
}

if (startLine === -1 || endLine === -1) {
  console.log('ERROR: No se encontro el useMemo enrichedDisplayData');
  process.exit(1);
}

console.log('Reemplazando lineas ' + (startLine+1) + ' a ' + (endLine+1));

const indent = '  ';
const newBlock = [
  `${indent}// Enrich displayData: overlay dashboard bindings (Z4/AH4/Z6/Z7) + rawDataMap literals`,
  `${indent}const enrichedDisplayData = useMemo(() => {`,
  `${indent}  if (!displayData) return displayData`,
  `${indent}  const data = { ...displayData }`,
  `${indent}  // Overlay valores del dashboard (fecha, lugar, director) siempre que ya cargaron`,
  `${indent}  if (dash.loaded) {`,
  `${indent}    data.lugar = dash.lugarExpedicion`,
  `${indent}    data.fechaExpedicion = dash.fechaExpedicion`,
  `${indent}    data.director = { apellidosNombres: dash.directorNombre, cedula: dash.directorCedula }`,
  `${indent}    if (data.rawDataMap) {`,
  `${indent}      data.rawDataMap = { ...data.rawDataMap }`,
  `${indent}      if (dash.lugarExpedicion) data.rawDataMap['EXPEDICION.LUGAR'] = dash.lugarExpedicion`,
  `${indent}      if (dash.fechaExpedicion) data.rawDataMap['EXPEDICION.FECHA'] = dash.fechaExpedicion`,
  `${indent}      data.rawDataMap['DIRECTOR.NOMBRE'] = dash.directorNombre`,
  `${indent}      data.rawDataMap['DIRECTOR.CEDULA'] = dash.directorCedula`,
  `${indent}    }`,
  `${indent}  }`,
  `${indent}  if (!rawDataFlat) return data`,
  `${indent}  const cals = { ...data.calificaciones }`,
  `${indent}  const YEAR_TO_NUM: Record<string, number> = {`,
  `${indent}    'Primer Año': 1, 'Segundo Año': 2, 'Tercer Año': 3, 'Cuarto Año': 4, 'Quinto Año': 5,`,
  `${indent}  }`,
  `${indent}  const CODES: Record<number, string[]> = {`,
  `${indent}    1: ['CA','IN','MA','EN','HV','EFC','GG','EA','EF','EPT'],`,
  `${indent}    2: ['CA','IN','MA','EPS','CB','HV','HU','EA','EF','ET'],`,
  `${indent}    3: ['CA','IN','MA','CB','FI','QU','HVCB','GV','EF','ET'],`,
  `${indent}    4: ['CA','MA','HC','IN','EF','FI','QU','BI','DT','FIL','IPM'],`,
  `${indent}    5: ['IN','EF','GEV','CA','MA','FI','QU','BI','CT','IPM'],`,
  `${indent}  }`,
  `${indent}  for (const [yearName, yearCals] of Object.entries(cals)) {`,
  `${indent}    const yNum = YEAR_TO_NUM[yearName]`,
  `${indent}    if (!yNum) continue`,
  `${indent}    const codes = CODES[yNum]`,
  `${indent}    if (!codes) continue`,
  `${indent}    for (let i = 0; i < yearCals.length; i++) {`,
  `${indent}      const cal = yearCals[i]`,
  `${indent}      const code = codes[i]`,
  `${indent}      if (!code) continue`,
  `${indent}      if (!cal.nota) {`,
  `${indent}        const rn = rawDataFlat[\`NOTA.\${code}.\${yNum}\`]`,
  `${indent}        if (rn) cal.nota = rn`,
  `${indent}      }`,
  `${indent}      if (!cal.literal) {`,
  `${indent}        const rl = rawDataFlat[\`LITERAL.\${code}.\${yNum}\`]`,
  `${indent}        if (rl) cal.literal = rl`,
  `${indent}        else if (cal.nota) cal.literal = notaEnLetras(cal.nota)`,
  `${indent}      }`,
  `${indent}    }`,
  `${indent}  }`,
  `${indent}  data.calificaciones = cals`,
  `${indent}  data.rawDataMap = rawDataFlat`,
  `${indent}  return data`,
  `${indent}}, [displayData, rawDataFlat, dash.loaded, dash.lugarExpedicion, dash.fechaExpedicion, dash.directorNombre, dash.directorCedula])`,
];

const newLines = [...lines.slice(0, startLine), ...newBlock, ...lines.slice(endLine + 1)];
fs.writeFileSync(filePath, newLines.join('\n'), 'utf8');
console.log('OK. Archivo reescrito correctamente.');
console.log('Ejecuta: git add . && git commit -m "fix: cert-view enrichedDisplayData corregido" && git push');
