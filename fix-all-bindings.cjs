// fix-all-bindings.cjs — Ejecutar desde la RAIZ del repo jo-sigae:
//   node fix-all-bindings.cjs
//
// Corrige 3 problemas:
//   1. Elimina duplicado bindingCellsRef en dashboard-content.tsx
//   2. Agrega useEffect en certificaciones/page.tsx para re-aplicar bindings
//      cuando el hook termine de cargar (race condition fix)
//   3. Agrega useEffect en constancias/page.tsx para lo mismo

const fs = require('fs');
const path = require('path');

let fixesApplied = 0;
let errors = 0;

// ============================================================
// FIX 1: Eliminar duplicado bindingCellsRef en dashboard-content.tsx
// ============================================================
function fixDashboardContent() {
  const filePath = path.join('src', 'components', 'dashboard-content.tsx');
  if (!fs.existsSync(filePath)) {
    console.log('FIX 1 SKIP: No se encontro ' + filePath);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  // Encontrar todas las lineas con 'const bindingCellsRef'
  const declLines = [];
  lines.forEach((line, i) => {
    if (/const bindingCellsRef\s*=/.test(line)) {
      declLines.push(i);
    }
  });

  console.log('FIX 1: Declaraciones de bindingCellsRef encontradas: ' + declLines.length);

  if (declLines.length <= 1) {
    console.log('FIX 1 OK: No hay duplicado (ya correcto)');
    return;
  }

  // Eliminar la SEGUNDA declaracion y su bloque useEffect asociado
  const secondDeclIdx = declLines[1];

  // Buscar el inicio del bloque (comentarios antes)
  let blockStart = secondDeclIdx;
  while (blockStart > 0 && lines[blockStart - 1].trim() === '') blockStart--;
  if (blockStart > 0 && lines[blockStart - 1].trim().startsWith('//')) {
    blockStart--;
    while (blockStart > 0 && lines[blockStart - 1].trim().startsWith('//')) blockStart--;
  }

  // Buscar el fin del bloque useEffect
  let blockEnd = secondDeclIdx;
  let braceDepth = 0;
  let foundUseEffect = false;
  let foundClosing = false;

  for (let i = secondDeclIdx; i < lines.length; i++) {
    const line = lines[i];
    if (!foundUseEffect && /useEffect\(\s*\(/.test(line)) {
      foundUseEffect = true;
    }
    if (foundUseEffect) {
      for (const ch of line) {
        if (ch === '(' || ch === '{' || ch === '[') braceDepth++;
        if (ch === ')' || ch === '}' || ch === ']') braceDepth--;
      }
      if (braceDepth <= 0) {
        blockEnd = i;
        foundClosing = true;
        break;
      }
    }
  }

  if (!foundClosing) {
    console.log('FIX 1 ERROR: No se pudo encontrar el fin del bloque duplicado');
    errors++;
    return;
  }

  console.log('FIX 1: Eliminando lineas ' + (blockStart + 1) + ' a ' + (blockEnd + 1));

  const newLines = [...lines.slice(0, blockStart), ...lines.slice(blockEnd + 1)];
  const newContent = newLines.join('\n');
  const newDeclCount = (newContent.match(/const bindingCellsRef\s*=/g) || []).length;

  if (newDeclCount !== 1) {
    console.log('FIX 1 ERROR: Quedarian ' + newDeclCount + ' declaraciones (se esperaba 1). No se guardo.');
    errors++;
    return;
  }

  fs.writeFileSync(filePath, newContent, 'utf8');
  console.log('FIX 1 OK: Duplicado eliminado (' + lines.length + ' -> ' + newLines.length + ' lineas)');
  fixesApplied++;
}

// ============================================================
// FIX 2: Agregar useEffect para re-aplicar bindings en certificaciones
// ============================================================
function fixCertificaciones() {
  const filePath = path.join('src', 'app', 'certificaciones', 'page.tsx');
  if (!fs.existsSync(filePath)) {
    console.log('FIX 2 SKIP: No se encontro ' + filePath);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');

  // Verificar si ya tiene el fix
  if (content.includes('Re-aplicar bindings cuando el hook termine de cargar')) {
    console.log('FIX 2 OK: Ya tiene el useEffect de re-aplicacion (previamente aplicado)');
    return;
  }

  // 1. Agregar useRef al import
  if (!content.includes('useRef')) {
    content = content.replace(
      "import { useState, useCallback } from 'react'",
      "import { useState, useCallback, useRef, useEffect } from 'react'"
    );
  } else if (!content.includes('useEffect')) {
    content = content.replace(
      /import \{([^}]*useRef[^}]*)\} from 'react'/,
      (match, imports) => {
        if (!imports.includes('useEffect')) {
          return "import {" + imports + ", useEffect } from 'react'";
        }
        return match;
      }
    );
  }

  // Verificar que useEffect esta en los imports
  if (!content.includes("useEffect") || !content.match(/import.*useEffect.*from 'react'/)) {
    // Intentar agregarlo de otra forma
    const importMatch = content.match(/import \{([^}]+)\} from 'react'/);
    if (importMatch) {
      const currentImports = importMatch[1];
      if (!currentImports.includes('useEffect')) {
        const newImports = currentImports + ', useEffect';
        content = content.replace(importMatch[0], "import { " + newImports + " } from 'react'");
      }
    }
    if (!currentImports) {
      // Si no tiene useRef tampoco
      content = content.replace(
        "import { useState, useCallback } from 'react'",
        "import { useState, useCallback, useRef, useEffect } from 'react'"
      );
    }
  }

  // 2. Agregar el useRef y useEffect despues de la linea: const [certData, setCertData] = useState<CertData>(emptyCertData())
  const certDataLine = 'const [certData, setCertData] = useState<CertData>(emptyCertData())';
  const certDataIdx = content.indexOf(certDataLine);
  if (certDataIdx === -1) {
    console.log('FIX 2 SKIP: No se encontro la linea de certData state');
    return;
  }

  const insertPoint = content.indexOf('\n', certDataIdx) + 1;

  const effectCode = `
  // Re-aplicar bindings cuando el hook del dashboard termine de cargar (fix race condition)
  // Sin este efecto, si el usuario selecciona un alumno antes de que carguen los valores
  // del dashboard, se quedan los defaults en lugar de los valores reales de Z4/AH4/Z6/Z7.
  const prevDashLoaded = useRef(false)
  useEffect(() => {
    if (!dash.loaded || !dataLoaded) return
    // Re-aplicar siempre que dash.fechaExpedicion cambie (ej: usuario edito en dashboard y volvio)
    setCertData(prev => ({
      ...prev,
      lugar: dash.lugarExpedicion,
      fechaExpedicion: dash.fechaExpedicionISO,
      director: { ...dash.director },
    }))
  }, [dash.loaded, dash.fechaExpedicion, dash.lugarExpedicion, dash.directorNombre, dash.directorCedula])
`;

  content = content.slice(0, insertPoint) + effectCode + content.slice(insertPoint);

  fs.writeFileSync(filePath, content, 'utf8');
  console.log('FIX 2 OK: useEffect de re-aplicacion agregado a certificaciones/page.tsx');
  fixesApplied++;
}

// ============================================================
// FIX 3: Agregar useEffect para re-aplicar bindings en constancias
// ============================================================
function fixConstancias() {
  const filePath = path.join('src', 'app', 'constancias', 'page.tsx');
  if (!fs.existsSync(filePath)) {
    console.log('FIX 3 SKIP: No se encontro ' + filePath);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');

  // La constancia usa dash directamente en handleGenerate (line 75-77).
  // El race condition es menor porque el usuario tiene que hacer click,
  // pero si hace click rapido puede usar defaults.
  // Fix: deshabilitar el boton de generar hasta que dash.loaded sea true.

  if (content.includes('dash.loaded')) {
    console.log('FIX 3 OK: Ya tiene la proteccion dash.loaded');
    return;
  }

  // Cambiar el boton para que se deshabilite si dash no cargo
  const oldButton = '<Button onClick={handleGenerate} disabled={generating}>';
  const newButton = '<Button onClick={handleGenerate} disabled={generating || !dash.loaded}>';

  if (content.includes(oldButton)) {
    content = content.replace(oldButton, newButton);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('FIX 3 OK: Boton deshabilitado hasta que dash cargue en constancias');
    fixesApplied++;
  } else {
    // Buscar variaciones
    const btnMatch = content.match(/<Button onClick=\{handleGenerate\} disabled=\{[^}]+\}>/);
    if (btnMatch) {
      content = content.replace(btnMatch[0], '<Button onClick={handleGenerate} disabled={generating || !dash.loaded}>');
      fs.writeFileSync(filePath, content, 'utf8');
      console.log('FIX 3 OK: Boton actualizado en constancias');
      fixesApplied++;
    } else {
      console.log('FIX 3 SKIP: No se encontro el boton de generar en constancias');
    }
  }
}

// ============================================================
// FIX 4: Verificar que el hook existe
// ============================================================
function verifyHook() {
  const filePath = path.join('src', 'hooks', 'use-dashboard-bindings.ts');
  if (fs.existsSync(filePath)) {
    console.log('FIX 4 OK: Hook use-dashboard-bindings.ts existe');
    return;
  }
  console.log('FIX 4 ERROR: No existe ' + filePath + ' — se necesita crear');
  errors++;
}

// ============================================================
// EJECUTAR TODOS LOS FIXES
// ============================================================
console.log('=== FIX ALL BINDINGS ===');
console.log('');

fixDashboardContent();
console.log('');
fixCertificaciones();
console.log('');
fixConstancias();
console.log('');
verifyHook();
console.log('');
console.log('=== RESULTADO ===');
console.log('Fixes aplicados: ' + fixesApplied);
console.log('Errores: ' + errors);
console.log('');
if (fixesApplied > 0) {
  console.log('Siguiente paso: npm run dev  (para verificar que compila)');
  console.log('Luego: git add . && git commit -m "fix: race condition bindings + duplicado bindingCellsRef" && git push');
} else if (errors === 0) {
  console.log('Todo ya estaba correcto. Solo necesitas: npm run dev && git push');
}
