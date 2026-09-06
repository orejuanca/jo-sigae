// COTEJO NR vs DEFINITIVAS: para cada fila de alumno en NR_*.json,
// comparar con las notas importadas (definitiva por materia) del sandbox SQLite.
// Criterio v7: definitiva = round(mean(lapsos numericos)); P propaga; NC no promedia.
const { PrismaClient } = require("/home/z/my-project/node_modules/@prisma/client");
const prisma = new PrismaClient();
const fs = require("fs");
const BASE = "/home/z/my-project/jo-sigae/scripts/data_legacy/excel_integro";

const MAP = { FS: "FSN", PG: "PGCRP" }; // codigos catalogo

function digits(s) { return String(s).replace(/\D/g, ""); }
function r2(n) { return Math.round(n); } // half-up como v7 (Math.round)

async function main() {
  const asigs = await prisma.asignatura.findMany();
  const byCod = new Map(asigs.map(a => [a.codigo, a.id]));

  let totalRows = 0, sinInsc = [], conflictos = [], okRows = 0;
  const resumen = {};

  for (let g = 1; g <= 5; g++) {
    const d = JSON.parse(fs.readFileSync(`${BASE}/NR_${g}grado.json`, "utf8"));
    const grid = {};
    for (const c of d.celdas) (grid[c.r] ||= {})[c.c] = c.v;

    // bloques
    const bloques = [];
    for (const r of Object.keys(grid).map(Number).sort((a, b) => a - b)) {
      const v = grid[r][1];
      if (typeof v === "string" && v.startsWith("Notas de REVIS")) {
        const titulo = v; // "Notas de REVISION 1° A"
        const sec = titulo.split("°")[1]?.trim()?.charAt(0) || "?";
        // materias: fila r+1 desde col 5
        const mats = [];
        for (let c = 5; c <= 20; c++) {
          const m = grid[r + 1]?.[c];
          if (m) mats.push({ col: c, cod: String(m) });
          if (String(m) === "GRUPO") break;
        }
        bloques.push({ r, sec, mats });
      }
    }

    for (const b of bloques) {
      for (const r of Object.keys(grid).map(Number).sort((a, b) => a - b)) {
        if (r <= b.r + 2 || r >= b.r + 48) continue;
        const ced = grid[r]?.[2];
        if (!ced || !String(ced).includes("V") || !/\d/.test(String(ced))) continue;
        totalRows++;
        const dig = digits(ced);
        // inscripcion del alumno en este grado (seccion regular, no U)
        const alumno = await prisma.alumno.findFirst({ where: { cedula: { in: ["V " + dig, "V" + dig, dig] } } });
        if (!alumno) { sinInsc.push(`NR${g} ${ced} no existe alumno`); continue; }
        const insc = await prisma.inscripcion.findFirst({
          where: { alumnoId: alumno.id, seccion: { is: { grado: String(g), codigo: b.sec, tipo: "REGULAR" } } },
          include: { seccion: true },
        });
        if (!insc) { sinInsc.push(`NR${g} ${ced} sin inscripcion ${g}${b.sec}`); continue; }

        // notas por asignatura
        const nls = await prisma.notaLapso.findMany({ where: { inscripcionId: insc.id } });
        const porAsig = new Map();
        for (const n of nls) {
          const arr = porAsig.get(n.asignaturaId) || [];
          arr.push({ lapso: n.lapso, valor: n.valor });
          porAsig.set(n.asignaturaId, arr);
        }
        function definitiva(aid) {
          const arr = (porAsig.get(aid) || []).filter(x => x.lapso >= 1 && x.lapso <= 3);
          if (!arr.length) return null;
          const vals = arr.map(x => x.valor);
          if (vals.includes("P")) return "P";
          const nums = vals.filter(v => v !== "NC").map(Number);
          if (!nums.length) return "NC";
          return r2(nums.reduce((a, b) => a + b, 0) / nums.length);
        }

        let falloAlgo = false, cellFuera = [];
        for (const m of b.mats) {
          const cod = MAP[m.cod] || m.cod;
          const aid = byCod.get(cod);
          if (!aid) { cellFuera.push(`cod ${cod} no en catalogo`); continue; }
          const raw = grid[r]?.[m.col];
          const def = definitiva(aid);
          if (raw === undefined || String(raw) === "*") {
            // * en NR -> o aprobo (def>=10) o sin definitiva (NC/P/vacia)
            if (typeof def === "number" && def < 10) {
              conflictos.push(`NR${g}${b.sec} ${alumno.apellidos} ${cod}: NR=* pero def=${def} <10`);
              falloAlgo = true;
            }
          } else {
            falloAlgo = true;
            if (!(typeof def === "number" && def < 10)) {
              conflictos.push(`NR${g}${b.sec} ${alumno.apellidos} ${cod}: NR=${raw} pero def=${def}`);
            }
          }
        }
        if (falloAlgo) okRows++;
      }
    }
    resumen[g] = bloques.map(b => b.sec).join(",");
  }

  console.log("secciones por grado:", JSON.stringify(resumen));
  console.log(`filas alumno NR: ${totalRows} | con fallo detectado: ${okRows}`);
  console.log(`sin inscripcion/alumno: ${sinInsc.length}`); sinInsc.slice(0, 10).forEach(x => console.log("  ", x));
  console.log(`conflictos criterio: ${conflictos.length}`); conflictos.slice(0, 25).forEach(x => console.log("  ", x));

  // casos clave
  for (const [ced, g, sec, codExcel] of [["32787155", 1, "A", "ILE"], ["33233434", 3, "B", "ILE"], ["31010790", 5, "B", "ILE"], ["30300794", 5, "A", "CA"], ["31523586", 4, "B", "BI"]]) {
    const al = await prisma.alumno.findFirst({ where: { cedula: ced } });
    if (!al) { console.log(`caso ${ced}: sin alumno`); continue; }
    const insc = await prisma.inscripcion.findFirst({ where: { alumnoId: al.id, seccion: { is: { grado: String(g), codigo: sec, tipo: "REGULAR" } } }, include: { seccion: true } });
    if (!insc) { console.log(`caso ${ced}: sin insc`); continue; }
    const aid = byCod.get(codExcel);
    const nls = await prisma.notaLapso.findMany({ where: { inscripcionId: insc.id, asignaturaId: aid }, orderBy: { lapso: "asc" } });
    console.log(`caso ${al.apellido.slice(0, 20)} ${g}${sec} ${codExcel}: lapsos=${nls.map(n => n.lapso + ":" + n.valor).join(" ")}`);
  }
  await prisma.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
