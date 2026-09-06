// ¿Todos los alumnos con alguna definitiva numérica <10 están en las filas NR?
// Recorre TODAS las inscripciones regulares del sandbox y compara con las cédulas NR.
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const fs = require("fs");
const BASE = "/home/z/my-project/jo-sigae/scripts/data_legacy/excel_integro";

function digits(s) { return String(s).replace(/\D/g, ""); }
function cedulasNR() {
  const out = {};
  for (let g = 1; g <= 5; g++) {
    const d = JSON.parse(fs.readFileSync(`${BASE}/NR_${g}grado.json`, "utf8"));
    const set = new Set();
    for (const c of d.celdas) {
      if (c.c === 2 && typeof c.v === "string" && c.v.includes("V") && /\d/.test(c.v)) set.add(digits(c.v));
    }
    out[g] = set;
  }
  return out;
}

async function main() {
  const nr = cedulasNR();
  const asigs = await prisma.asignatura.findMany();
  const CUALI = new Set(["OC", "PGCRP"]);
  const faltantes = []; let total = 0;
  for (let g = 1; g <= 5; g++) {
    const secs = await prisma.seccion.findMany({ where: { grado: String(g), tipo: "REGULAR" }, include: { inscripciones: { where: { activo: true } } } });
    for (const s of secs) {
      for (const i of s.inscripciones) {
        const nls = await prisma.notaLapso.findMany({ where: { inscripcionId: i.id } });
        const porAsig = new Map();
        for (const n of nls) (porAsig.get(n.asignaturaId) || porAsig.set(n.asignaturaId, []).get(n.asignaturaId)).push(n);
        let fallo = false;
        for (const [aid, arr] of porAsig) {
          const cod = asigs.find(a => a.id === aid)?.codigo;
          if (!cod || CUALI.has(cod)) continue;
          const vals = arr.filter(x => x.lapso >= 1 && x.lapso <= 3).map(x => x.valor);
          if (!vals.length) continue;
          if (vals.includes("P")) continue; // P no va a revisión (NELCHA 5D)
          const nums = vals.filter(v => v !== "NC").map(Number).filter(isFinite);
          if (!nums.length) continue;
          const def = Math.round(nums.reduce((a, b) => a + b, 0) / nums.length);
          if (def < 10) { fallo = true; break; }
        }
        if (fallo) {
          total++;
          const al = await prisma.alumno.findUnique({ where: { id: i.alumnoId } });
          const dig = digits(al.cedula);
          if (!nr[g].has(dig)) faltantes.push(`${g}${s.codigo} ${al.cedula} ${al.apellidos}`);
        }
      }
    }
  }
  console.log(`alumnos regulares con alguna def<10: ${total}`);
  console.log(`de ellos, NO presentes en NR del grado: ${faltantes.length}`);
  faltantes.forEach(x => console.log("  ", x));
  await prisma.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
