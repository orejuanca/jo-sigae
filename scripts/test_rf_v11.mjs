// ==================== TEST v11: MÓDULO RF + VII. OBSERVACIONES (sábanas NL/NR) ====================
// Valida el módulo contra los casos REALES del Excel del plantel.
// Uso: con el servidor corriendo (pnpm dev), ejecutar:  node scripts/test_rf_v11.mjs
const BASE = process.env.BASE_URL || 'http://localhost:3000';
let ok = 0, fallos = 0;
function check(nombre, cond, detalle = '') {
  if (cond) { ok++; console.log(`  OK  ${nombre}`); }
  else { fallos++; console.log(`  FALLO ${nombre} ${detalle}`); }
}
async function get(grado, sec, tipo, mes) {
  const qs = new URLSearchParams({ grado, sec, tipo, mes });
  const r = await fetch(`${BASE}/api/control-estudios/rf?${qs}`);
  return { status: r.status, d: await r.json() };
}

console.log('TEST v11 — RF RESUMEN FINAL + VII. OBSERVACIONES');

// ---- 1) 1°A FINAL JULIO-2022: 20 con cédula + 4 S/C (los mismos del Excel) ----
{
  const { status, d } = await get('1', 'A', 'FINAL', 'JULIO - 2022');
  check('1A: HTTP 200', status === 200);
  check('1A: nPorSeccion=24', d.nPorSeccion === 24, `=${d.nPorSeccion}`);
  check('1A: 20 con cédula', d.conCedula.length === 20, `=${d.conCedula.length}`);
  check('1A: 4 S/C', d.sinCedula.length === 4, `=${d.sinCedula.length}`);
  const sc = d.sinCedula.map(x => x.apellidos).join(',');
  check('1A: S/C exactos (BLANCO AZUAJE, ECHEVERRIA MONTES, BRITO BARRIOS, LANDAETA TURIPE)',
    sc === 'BLANCO AZUAJE,ECHEVERRIA MONTES,BRITO BARRIOS,LANDAETA TURIPE', sc);
  check('1A: fila 1 = V 32787155 OSPINO BLANQUICET', d.conCedula[0].cedula === 'V 32787155');
  check('1A: 9 áreas', d.areas.length === 9 && d.areas[7].codigo === 'OC' && d.areas[8].codigo === 'PGCRP');
}

// ---- 2) 5°D FINAL JULIO-2022: 36 (35 hoja 1 + 1 hoja 2), PIES idénticos al Excel ----
{
  const { status, d } = await get('5', 'D', 'FINAL', 'JULIO - 2022');
  check('5D: HTTP 200', status === 200);
  check('5D: nPorSeccion=36', d.nPorSeccion === 36, `=${d.nPorSeccion}`);
  check('5D: 12 áreas', d.areas.length === 12);
  check('5D: fila 1 = NELCHA HEREDIA (V 29594614)', d.conCedula[0].cedula === 'V 29594614');
  check('5D: fila 35 = V 32897699 CASTRO FLORES', d.conCedula[34].cedula === 'V 32897699');
  check('5D: fila 36 = PEREIRA PADRINO (va a la hoja 2)', d.conCedula[35].apellidos === 'PEREIRA PADRINO');
  const nel = d.conCedula.filter(x => x.apellidos === 'NELCHA HEREDIA');
  check('5D: 2 NELCHA con P en CA y MA', nel.length === 2 && nel.every(x => x.notas.CA === 'P' && x.notas.MA === 'P'));
  const per = d.conCedula.find(x => x.apellidos === 'PEREZ PEREZ');
  check('5D: PEREZ PEREZ con NC en CA', per && per.notas.CA === 'NC');

  // pie de totales: valores cacheados del Excel RF 5° (página de 35)
  const areaCod = d.areas.map(a => a.codigo);
  const page1 = d.conCedula.slice(0, 35);
  const num = v => typeof v === 'number' ? v : (v !== '' && isFinite(Number(v)) ? Number(v) : null);
  const st = areaCod.map(c => {
    const letras = ['OC', 'PGCRP'].includes(c);
    const vs = page1.map(f => f.notas[c] ?? '').filter(v => v !== '');
    if (letras) {
      return {
        insc: vs.filter(v => ['A', 'B', 'C', 'D', 'P'].includes(String(v))).length,
        ina: vs.filter(v => v === 'IN').length,
        ap: vs.filter(v => ['A', 'B', 'C', 'D'].includes(String(v))).length,
        na: vs.filter(v => v === 'P').length,
        nc: vs.filter(v => v === 'NC').length,
      };
    }
    const nums = vs.map(num).filter(n => n !== null);
    return {
      insc: nums.length + vs.filter(v => v === 'IN' || v === 'P').length,
      ina: vs.filter(v => v === 'IN').length,
      ap: nums.filter(n => n >= 9.5).length,
      na: nums.filter(n => n <= 9.49).length + vs.filter(v => v === 'P').length,
      nc: vs.filter(v => v === 'NC').length,
    };
  });
  const EXCEL = {
    insc: [34, 35, 35, 35, 35, 35, 35, 35, 35, 35, 33, 0],
    ina: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    ap: [27, 29, 29, 29, 30, 28, 30, 27, 25, 25, 33, 0],
    na: [7, 6, 6, 6, 5, 7, 5, 8, 10, 10, 0, 0],
    nc: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  };
  const iguales = areaCod.every((_, i) =>
    st[i].insc === EXCEL.insc[i] && st[i].ina === EXCEL.ina[i] && st[i].ap === EXCEL.ap[i] &&
    st[i].na === EXCEL.na[i] && st[i].nc === EXCEL.nc[i]);
  check('5D: pie de totales idéntico al Excel (5 filas x 12 áreas)', iguales,
    JSON.stringify(st));

  // Convención del plantel (v14/v16): en el Resumen Final NINGUNA casilla de OC/PGCRP/GRUPO
  // queda en blanco: lo no asentado imprime "*" (aplazada). El "*" NO cuenta en el pie
  // (fórmulas oficiales del Excel: Inscritos solo A/B/C/D/P; No Aprobados solo P).
  const sinBlanco = d.conCedula.every(f =>
    (f.notas.OC ?? '') !== '' && (f.notas.PGCRP ?? '') !== '' && (f.grupo ?? '') !== '');
  check('5D: OC/PGCRP/GRUPO sin casillas en blanco (lo no asentado = "*")', sinBlanco);
  const nelStar = d.conCedula.filter(x => x.apellidos === 'NELCHA HEREDIA');
  check('5D: las 2 NELCHA con "*" en OC/PGCRP/GRUPO',
    nelStar.length === 2 && nelStar.every(x => x.notas.OC === '*' && x.notas.PGCRP === '*' && x.grupo === '*'));
}

// ---- 3) 4° U(MP) PENDIENTE JUNIO-2022: 7 alumnos, notas del 4M (IN) ----
{
  const { status, d } = await get('4', 'U(MP)', 'PENDIENTE', 'JUNIO - 2022');
  check('4MP: HTTP 200', status === 200);
  check('4MP: 7 alumnos', d.nPorSeccion === 7, `=${d.nPorSeccion}`);
  check('4MP: se imprime U.', d.secDisplay === 'U.');
  const nel = d.conCedula.filter(x => x.apellidos === 'NELCHA HEREDIA');
  const ile = nel.filter(x => x.notas.ILE === 'IN').length;
  const ma = nel.filter(x => x.notas.MA === 'IN').length;
  check('4MP: NELCHA con IN en ILE (1) y MA (2) — igual al pie del Excel', ile === 1 && ma === 2, `ile=${ile} ma=${ma}`);
  // "*" = no debe esa materia (así va la sábana MP del Excel); nota real solo en lo que debe
  const conNotaJunio = d.conCedula.filter(x => Object.values(x.notas).some(v => v !== '' && v !== '*'));
  check('4MP: solo 2 alumnos con nota real en 4M JUNIO (las 2 NELCHA; "*" no cuenta)', conNotaJunio.length === 2, `=${conNotaJunio.length}`);
  const sinBlancoMp = d.conCedula.every(f => (f.grupo ?? '') !== '');
  check('4MP: GRUPO sin casillas en blanco ("*" como la sábana del Excel)', sinBlancoMp);
}

// ---- 4) 3°F REVISIÓN JULIO-2022: 9 con cédula (los del RF 3° del Excel) ----
{
  const { status, d } = await get('3', 'F', 'REVISIÓN', 'JULIO - 2022');
  check('3F: HTTP 200', status === 200);
  check('3F: 9 con cédula (los del RF 3° del Excel)', d.conCedula.length === 9, `=${d.conCedula.length}`);
  check('3F: 3 S/C del bloque NR', d.sinCedula.length === 3, `=${d.sinCedula.length}`);
  const alv = d.conCedula.find(x => x.apellidos === 'ALVARADO GOMEZ');
  check('3F: ALVARADO GOMEZ FI=10 y GHC=10', alv && alv.notas.FI === '10' && alv.notas.GHC === '10');
  const ynf = d.conCedula.find(x => x.apellidos === 'YNFANTE MONTOYA');
  // En el bloque NR lo no revisado imprime "*" en OC/PGCRP/GRUPO (así van los NR del Excel)
  check('3F: YNFANTE todo IN (y "*" donde no hay revisión)', ynf && Object.values(ynf.notas).every(v => v === 'IN' || v === '' || v === '*'));
}

// ---- 5) 4° U(EQV) EQUIVALENCIA: BLANCO COLMENARES con BI=14 ----
{
  const { status, d } = await get('4', 'U(EQV)', 'EQUIVALENCIA', 'JULIO - 2022');
  check('4U: HTTP 200', status === 200);
  check('4U: 1 alumno (BLANCO COLMENARES)', d.nPorSeccion === 1 && d.conCedula[0].apellidos === 'BLANCO COLMENARES');
  check('4U: BI = 14', d.conCedula[0].notas.BI === 14, `=${d.conCedula[0].notas.BI}`);
  check('4U: se imprime U', d.secDisplay === 'U');
}

// ---- 6) Validación de parámetros ----
{
  const malo = await get('5', 'D', 'FINAL', 'ENERO - 2025');
  check('mes fuera de la lista -> 400 MES_INVALIDO', malo.status === 400 && malo.d.error === 'MES_INVALIDO');
}

// ---- 7) VII. OBSERVACIONES: mapeo verbatim de las sábanas NL/NR ----
// Fórmulas del Excel: REVISIÓN -> NR {g}° (C{48k}/A{48k+1}); resto -> NL {g}°;
// U. (MP) -> bloque MP de NL por mes (OCT C528, DIC C530, ENE C532, JUN C534).
{
  // --- casos cacheados en las 5 hojas RF del Excel ---
  const r1 = (await get('1', 'A', 'FINAL', 'JULIO - 2022')).d;
  check('OBS 1°A FINAL = "*" (NL 1° C48, como RF 1° del Excel)', r1.observaciones.linea1 === '*' && r1.observaciones.linea2 === '*', JSON.stringify(r1.observaciones));

  const r2 = (await get('2', 'A', 'FINAL', 'JULIO - 2022')).d;
  check('OBS 2°A FINAL = LUGAR DE NAC.:N.31 JUAN GERMAN ROSCIO. (como RF 2° del Excel)',
    r2.observaciones.linea1 === 'LUGAR DE NAC.:N.31 JUAN GERMAN ROSCIO.' && r2.observaciones.linea2 === '*', JSON.stringify(r2.observaciones));

  const r5 = (await get('5', 'D', 'FINAL', 'JULIO - 2022')).d;
  check('OBS 5°D FINAL = NOMBRES: N.01 YOELKARLEY KAROLAYN COROMOTO (como RF 5° del Excel)',
    r5.observaciones.linea1 === 'NOMBRES: N.01 YOELKARLEY KAROLAYN COROMOTO', JSON.stringify(r5.observaciones));

  const r4 = (await get('4', 'U(MP)', 'PENDIENTE', 'JUNIO - 2022')).d;
  check('OBS 4°U(MP) JUNIO = "*" (NL 4° C534, como RF 4° del Excel)', r4.observaciones.linea1 === '*' && r4.observaciones.linea2 === '*', JSON.stringify(r4.observaciones));

  const r3 = (await get('3', 'F', 'REVISIÓN', 'JULIO - 2022')).d;
  check('OBS 3°F REVISIÓN = "*" (REVISIÓN tira de NR 3°F C288, no de NL)', r3.observaciones?.linea1 === '*', JSON.stringify(r3.observaciones));

  // --- la misma sección cambia de fuente según el tipo (NL vs NR) ---
  const f2d = (await get('2', 'D', 'FINAL', 'JULIO - 2022')).d;
  check('OBS 2°D FINAL = NL: LUGAR DE NAC.:N.15 JUAN GERMAN ROSCIO.', f2d.observaciones.linea1 === 'LUGAR DE NAC.:N.15 JUAN GERMAN ROSCIO.');
  const v2d = (await get('2', 'D', 'REVISIÓN', 'JULIO - 2022')).d;
  check('OBS 2°D REVISIÓN = NR: "*" (NR 2°D no tiene texto)', v2d.observaciones.linea1 === '*' && v2d.observaciones.linea2 === '*');

  const v2a = (await get('2', 'A', 'REVISIÓN', 'JULIO - 2022')).d;
  check('OBS 2°A REVISIÓN = NR: LUGAR DE NAC.: N.01 SIMON RODRIGUEZ. (distinta de NL 2°A)',
    v2a.observaciones.linea1 === 'LUGAR DE NAC.: N.01 SIMON RODRIGUEZ.');
  const v2e = (await get('2', 'E', 'REVISIÓN', 'JULIO - 2022')).d;
  check('OBS 2°E REVISIÓN = NR: APELLIDOS: N.01 CASTELLANOS.', v2e.observaciones.linea1 === 'APELLIDOS: N.01 CASTELLANOS.');

  const v3c = (await get('3', 'C', 'REVISIÓN', 'JULIO - 2022')).d;
  check('OBS 3°C REVISIÓN = NR: NOMBRES: N.01 LOS ANGELES.', v3c.observaciones.linea1 === 'NOMBRES: N.01 LOS ANGELES.');
  const f3c = (await get('3', 'C', 'FINAL', 'JULIO - 2022')).d;
  check('OBS 3°C FINAL = NL: NOMBRES: N.21 LOS ANGELES, N.26 BETANIA... (texto largo verbatim)',
    f3c.observaciones.linea1 === 'NOMBRES: N.21 LOS ANGELES, N.26 BETANIA DE NAZARETH. LUGAR DE NAC.:N.27 JUAN ANTONIO SOTILLO, N.34 JUAN GERMAN ROSCIO.');

  const v5c = (await get('5', 'C', 'REVISIÓN', 'JULIO - 2022')).d;
  check('OBS 5°C REVISIÓN = NR: NOMBRES: N.01  NATHALY. (doble espacio verbatim del Excel)',
    v5c.observaciones.linea1 === 'NOMBRES: N.01  NATHALY.');

  // --- otras secciones NL con texto ---
  const f1b = (await get('1', 'B', 'FINAL', 'JULIO - 2022')).d;
  check('OBS 1°B FINAL = NL: NOMBRES: N.22 SUSEJ.', f1b.observaciones.linea1 === 'NOMBRES: N.22 SUSEJ.');
  const f1d = (await get('1', 'D', 'FINAL', 'JULIO - 2022')).d;
  check('OBS 1°D FINAL = NL: LUGAR DE NACIMIENTO: N.11 JUAN GERMAN ROSCIO.', f1d.observaciones.linea1 === 'LUGAR DE NACIMIENTO: N.11 JUAN GERMAN ROSCIO.');
  const f4d = (await get('4', 'D', 'FINAL', 'JULIO - 2022')).d;
  check('OBS 4°D FINAL = NL: NOMBRES: N. 04 JORSECK. (espacio verbatim N. 04)', f4d.observaciones.linea1 === 'NOMBRES: N. 04 JORSECK.');

  // --- U(MP): la observación depende del mes (4 momentos), SIEMPRE de NL ---
  const m1o = (await get('1', 'U(MP)', 'PENDIENTE', 'OCTUBRE - 2021')).d;
  check('OBS 1°U(MP) OCTUBRE = NL MP: NOMBRES: N°02 ALEXANDRA.', m1o.observaciones.linea1 === 'NOMBRES: N°02 ALEXANDRA.');
  const m2e = (await get('2', 'U(MP)', 'PENDIENTE', 'ENERO - 2022')).d;
  check('OBS 2°U(MP) ENERO = NL MP: N.01: INGRESO 11/01/2022.', m2e.observaciones.linea1 === 'N.01: INGRESO 11/01/2022.');
  const m2j = (await get('2', 'U(MP)', 'PENDIENTE', 'JUNIO - 2022')).d;
  check('OBS 2°U(MP) JUNIO = NL MP: N.01: INGRESO 08/02/2022.', m2j.observaciones.linea1 === 'N.01: INGRESO 08/02/2022.');
  const m3o = (await get('3', 'U(MP)', 'PENDIENTE', 'OCTUBRE - 2021')).d;
  check('OBS 3°U(MP) OCTUBRE = NL MP: LUGAR DE NACIMIENTO: N.04 LEONARDO INFANTE.', m3o.observaciones.linea1 === 'LUGAR DE NACIMIENTO: N.04 LEONARDO INFANTE.');
  const m2d = (await get('2', 'U(MP)', 'PENDIENTE', 'DICIEMBRE - 2021')).d;
  check('OBS 2°U(MP) DICIEMBRE = "*" (NL 2° C530 vacío)', m2d.observaciones.linea1 === '*' && m2d.observaciones.linea2 === '*');
  const m2jul = (await get('2', 'U(MP)', 'PENDIENTE', 'JULIO - 2022')).d;
  check('OBS 2°U(MP) JULIO (mes sin momento) = "*"', m2jul.observaciones.linea1 === '*' && m2jul.observaciones.linea2 === '*');

  // --- U(EQV): celda C480/A481 de NL/NR (todas "*" en el legacy) ---
  const u4f = (await get('4', 'U(EQV)', 'EQUIVALENCIA', 'JULIO - 2022')).d;
  check('OBS 4°U(EQV) = "*" (NL 4° U C480)', u4f.observaciones.linea1 === '*' && u4f.observaciones.linea2 === '*');

  // --- secciones sin observación en ninguna sábana ---
  const f1h = (await get('1', 'H', 'FINAL', 'JULIO - 2022')).d;
  check('OBS 1°H FINAL = "*" (NL 1° H vacío)', f1h.observaciones.linea1 === '*' && f1h.observaciones.linea2 === '*');
}

console.log(`\nRESULTADO: ${ok} OK, ${fallos} FALLOS`);
process.exit(fallos ? 1 : 0);
