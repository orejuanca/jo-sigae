// fix-cert-view.cjs — Ejecutar desde la raiz del repo: node fix-cert-view.cjs
const fs = require('fs');
const path = require('path');

const filePath = path.join('src', 'app', 'cert-view', 'page.tsx');
if (!fs.existsSync(filePath)) { console.error('No se encontro ' + filePath); process.exit(1); }

let c = fs.readFileSync(filePath, 'utf8');
let changes = 0;

// 1. Agregar import
if (!c.includes('useDashboardBindings')) {
  c = c.replace(
    "import { notaEnLetras, formatCedulaFinal } from '@/lib/school-config'",
    "import { notaEnLetras, formatCedulaFinal } from '@/lib/school-config'\nimport { useDashboardBindings } from '@/hooks/use-dashboard-bindings'"
  );
  changes++;
}

// 2. Agregar const dash
if (!c.includes('const dash = useDashboardBindings')) {
  c = c.replace(
    'const { toast } = useToast()',
    'const { toast } = useToast()\n  const dash = useDashboardBindings(plan)'
  );
  changes++;
}

// 3. Reemplazar enrichedDisplayData
const oldBlock = `  // Enrich displayData with rawDataMap literals (same safety net as editor)
  const enrichedDisplayData = useMemo(() => {
    if (!displayData || !rawDataFlat) return displayData
    const data = { ...displayData }
    const cals = { ...data.calificaciones }`;

const newBlock = `  // Enrich displayData: overlay dashboard bindings (Z4/AH4/Z6/Z7) + rawDataMap literals
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
    const cals = { ...data.calificaciones }`;

if (c.includes(oldBlock)) {
  c = c.replace(oldBlock, newBlock);
  changes++;
} else {
  console.log('SKIP: Bloque enrichedDisplayData no encontrado tal cual (puede ya estar modificado)');
}

// 4. Reemplazar dependencias del useMemo
const oldDeps = '  }, [displayData, rawDataFlat])';
const newDeps = '  }, [displayData, rawDataFlat, dash.loaded, dash.lugarExpedicion, dash.fechaExpedicion, dash.directorNombre, dash.directorCedula])';

if (c.includes(oldDeps)) {
  c = c.replace(oldDeps, newDeps);
  changes++;
} else if (c.includes(newDeps)) {
  console.log('OK: Dependencias ya actualizadas');
} else {
  console.log('SKIP: Dependencias no encontradas tal cual');
}

fs.writeFileSync(filePath, c, 'utf8');
console.log('Cambios aplicados: ' + changes);
console.log(changes > 0 ? 'Ejecuta: git add . && git commit -m "fix: cert-view overlayea bindings dashboard" && git push' : 'Nada que cambiar.');
