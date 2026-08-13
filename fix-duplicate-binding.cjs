// fix-duplicate-binding.cjs — Run with: node fix-duplicate-binding.cjs
// Removes the duplicate bindingCellsRef declaration added by the previous session's Fix 3 script.

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'jo-sigae', 'src', 'components', 'dashboard-content.tsx');

// Also try current working directory
let targetFile = filePath;
if (!fs.existsSync(targetFile)) {
  targetFile = path.resolve(process.cwd(), 'src', 'components', 'dashboard-content.tsx');
}
if (!fs.existsSync(targetFile)) {
  // Try one more: relative to script location
  targetFile = path.resolve(__dirname, '..', 'jo-sigae', 'src', 'components', 'dashboard-content.tsx');
}

if (!fs.existsSync(targetFile)) {
  console.error('ERROR: No se encontro dashboard-content.tsx');
  console.error('Buscado en:', filePath);
  console.error('Intenta: node fix-duplicate-binding.cjs  (desde la raiz del repo)');
  process.exit(1);
}

let content = fs.readFileSync(targetFile, 'utf8');
const lines = content.split('\n');

// Find all lines with 'const bindingCellsRef'
const declLines = [];
lines.forEach((line, i) => {
  if (/const bindingCellsRef\s*=/.test(line)) {
    declLines.push(i);
  }
});

console.log('Declaraciones de bindingCellsRef encontradas:', declLines.length);
declLines.forEach(i => console.log('  Linea ' + (i + 1) + ': ' + lines[i].trim()));

if (declLines.length <= 1) {
  console.log('OK: No hay duplicado. El archivo ya esta correcto.');
  process.exit(0);
}

// We need to remove the SECOND declaration and its associated useEffect block.
// The block looks like:
//   const bindingCellsRef = useRef({ z4: '', ah4: '', z6: '', z7: '' })
//   useEffect(() => {
//     ... everything until the closing }, [...])
//
// Strategy: find the second declaration, then find the matching useEffect + its closing.

const secondDeclIdx = declLines[1]; // 0-based line index of second declaration

// Go backwards to find the start of the block (look for comment or empty line before)
let blockStart = secondDeclIdx;
while (blockStart > 0 && lines[blockStart - 1].trim() === '') blockStart--;
// Check if there's a comment block before
if (blockStart > 0 && lines[blockStart - 1].trim().startsWith('//')) {
  blockStart--;
  while (blockStart > 0 && lines[blockStart - 1].trim().startsWith('//')) blockStart--;
}

// Go forward to find the end of the useEffect block
// After the declaration, there should be a useEffect(() => { ... }, [...])
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
  console.error('ERROR: No se pudo encontrar el fin del bloque duplicado.');
  process.exit(1);
}

// Remove lines from blockStart to blockEnd (inclusive)
console.log('\nEliminando bloque duplicado: lineas ' + (blockStart + 1) + ' a ' + (blockEnd + 1));
console.log('  Inicio: ' + lines[blockStart].trim());
console.log('  Fin:   ' + lines[blockEnd].trim());

const newLines = [...lines.slice(0, blockStart), ...lines.slice(blockEnd + 1)];

// Verify: should now have exactly 1 declaration
const newContent = newLines.join('\n');
const newDeclCount = (newContent.match(/const bindingCellsRef\s*=/g) || []).length;
console.log('\nDeclaraciones despues del fix: ' + newDeclCount);

if (newDeclCount !== 1) {
  console.error('ERROR: Despues de eliminar, quedaron ' + newDeclCount + ' declaraciones (se esperaba 1).');
  console.error('NO se guardaron cambios.');
  process.exit(1);
}

fs.writeFileSync(targetFile, newContent, 'utf8');
console.log('\nOK: Archivo corregido y guardado: ' + targetFile);
console.log('Lineas antes: ' + lines.length + ', despues: ' + newLines.length);
console.log('\nAhora ejecuta: git add . && git commit -m "fix: eliminar duplicado bindingCellsRef" && git push');
