// fix-cert-view2.cjs — Ejecutar desde la raiz del repo: node fix-cert-view2.cjs
const fs = require('fs');
const path = require('path');

const filePath = path.join('src', 'app', 'cert-view', 'page.tsx');
if (!fs.existsSync(filePath)) { console.error('No se encontro ' + filePath); process.exit(1); }

let c = fs.readFileSync(filePath, 'utf8');

// Normalizar CRLF a LF para comparar
const cLF = c.replace(/\r\n/g, '\n');

// Buscar la linea que tiene: if (!displayData || !rawDataFlat) return displayData
// y reemplazarla junto con las 2 lineas anteriores por el bloque completo
const marker1 = 'if (!displayData || !rawDataFlat) return displayData';
const idx1 = cLF.indexOf(marker1);
if (idx1 === -1) {
  console.log('Ya esta corregido o no se encontro el marcador.');
  process.exit(0);
}

// Buscar las 2 lineas anteriores: const data = ... y const cals = ...
const before = cLF.substring(Math.max(0, idx1 - 200), idx1);
const calsMatch = before.lastIndexOf('const cals = { ...data.calificaciones }');
if (calsMatch === -1) {
  console.log('No se encontro la linea de cals.');
  process.exit(1);
}

// Encontrar el inicio del useMemo
const useMemMatch = before.lastIndexOf('const enrichedDisplayData = useMemo(() => {');
if (useMemMatch === -1) {
  console.log('No se encontro el useMemo.');
  process.exit(1);
}

const absStart = Math.max(0, idx1 - 200) + useMemMatch;
// Encontrar el inicio de la linea del comentario anterior si existe
let blockStart = absStart;
const lineBefore = cLF.lastIndexOf('//', absStart - 1);
if (lineBefore > absStart - 80) {
  const prevNewline = cLF.lastIndexOf('\n', lineBefore - 1);
  if (prevNewline > absStart - 100) blockStart = prevNewline + 1;
}

// Desde blockStart hasta despues de 'const cals = { ...data.calificaciones }' es lo que reemplazamos
const calsEndInBefore = useMemMatch + (calsMatch - (absStart - Math.max(0, idx1 - 200)));
const endOfCalsLine = cLF.indexOf('\n', calsEndInBefore) + 1;

// El texto original que vamos a reemplazar
const oldText = cLF.substring(blockStart, endOfCalsLine);

const newText = `// Enrich displayData: overlay dashboard bindings (Z4/AH4/Z6/Z7) + rawDataMap literals
  const enrichedDisplayData = useMemo(() => {
    if (!displayData) return displayData
    const data = { ...displayData }
    if (dash.loaded) {
      data.lugar = dash.lugarExpedicion
      data.fechaExpedicion = dash.fechaExpedicion
      data.director = { apellidosNombres: dash.directorNombre, cedula: dash.directorCedula }
      if (data.rawDataMap) {
        data.rawDataMap = { ...data.rawDataMap }
        if (dash.lugarExpedicion) data.rawDataMap['EXPEDICION.LUGAR'] = dash.lugarExpedicion
        if (dash.fechaExpedicion) data.rawDataMap['EXPEDICION.FECHA'] = dash.fechaExpedicion
        data.rawDataMap['DIRECTOR.NOMBRE'] = dash.directorNombre
        data.rawDataMap['DIRECTOR.CEDULA'] = dash.directorCedula
      }
    }
    if (!rawDataFlat) return data
    const cals = { ...data.calificaciones }
`;

console.log('--- Texto original ---');
console.log(oldText);
console.log('--- Fin texto original ---');

cLF_new = cLF.substring(0, blockStart) + newText + cLF.substring(endOfCalsLine);

// Verificar que dash.loaded esta en las deps
const oldDeps = '}, [displayData, rawDataFlat])';
const newDeps = '}, [displayData, rawDataFlat, dash.loaded, dash.lugarExpedicion, dash.fechaExpedicion, dash.directorNombre, dash.directorCedula])';
let final = cLF_new.replace(oldDeps, newDeps);

// Preservar CRLF original
if (c.includes('\r\n')) final = final.replace(/\n/g, '\r\n');

fs.writeFileSync(filePath, final, 'utf8');
console.log('OK: Bloque de overlay aplicado.');
console.log('Ejecuta: git add . && git commit -m "fix: cert-view overlay dashboard bindings" && git push');
