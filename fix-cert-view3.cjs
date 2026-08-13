// fix-cert-view3.cjs — Ejecutar: node fix-cert-view3.cjs
const fs = require('fs');
const filePath = 'src/app/cert-view/page.tsx';
const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);

let changed = false;

// Buscar la linea: const data = { ...displayData }
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('const data = { ...displayData }') && !lines[i].includes('dash')) {
    // Verificar que estamos dentro del enrichedDisplayData useMemo
    let inEnriched = false;
    for (let j = i - 1; j >= Math.max(0, i - 10); j--) {
      if (lines[j].includes('enrichedDisplayData')) { inEnriched = true; break; }
    }
    if (!inEnriched) continue;

    // Verificar que dash.loaded ya no esta (no aplicar dos veces)
    if (lines[i + 1] && lines[i + 1].includes('dash.loaded')) {
      console.log('Ya esta corregido.');
      process.exit(0);
    }

    // Insertar el bloque despues de esta linea
    const indent = lines[i].match(/^(\s*)/)[1];
    const insert = [
      `${indent}if (dash.loaded) {`,
      `${indent}  data.lugar = dash.lugarExpedicion`,
      `${indent}  data.fechaExpedicion = dash.fechaExpedicion`,
      `${indent}  data.director = { apellidosNombres: dash.directorNombre, cedula: dash.directorCedula }`,
      `${indent}  if (data.rawDataMap) {`,
      `${indent}    data.rawDataMap = { ...data.rawDataMap }`,
      `${indent}    if (dash.lugarExpedicion) data.rawDataMap['EXPEDICION.LUGAR'] = dash.lugarExpedicion`,
      `${indent}    if (dash.fechaExpedicion) data.rawDataMap['EXPEDICION.FECHA'] = dash.fechaExpedicion`,
      `${indent}    data.rawDataMap['DIRECTOR.NOMBRE'] = dash.directorNombre`,
      `${indent}    data.rawDataMap['DIRECTOR.CEDULA'] = dash.directorCedula`,
      `${indent}  }`,
      `${indent}}`,
    ];
    lines.splice(i + 1, 0, ...insert);
    changed = true;
    console.log('Bloque dash overlay insertado despues de linea ' + (i + 1));
    break;
  }
}

// Actualizar dependencias
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('[displayData, rawDataFlat]') && lines[i].includes('}') && !lines[i].includes('dash')) {
    lines[i] = lines[i].replace('[displayData, rawDataFlat]', '[displayData, rawDataFlat, dash.loaded, dash.lugarExpedicion, dash.fechaExpedicion, dash.directorNombre, dash.directorCedula]');
    console.log('Dependencias actualizadas en linea ' + (i + 1));
    changed = true;
    break;
  }
}

if (changed) {
  fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
  console.log('OK. Ejecuta: git add . && git commit -m "fix: cert-view overlay dashboard bindings" && git push');
} else {
  console.log('No se encontraron patrones esperados. Mostrando lineas 130-145:');
  lines.slice(129, 145).forEach((l, idx) => console.log((idx + 130) + ': ' + l));
}