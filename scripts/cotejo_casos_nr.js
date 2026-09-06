// Casos clave: lapsos y definitiva de alumnos puntuales para entender celdas NR
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const CASOS = [
  ["32787155", "OSPINO 1A (NR: todo IN)"],
  ["33025238", "MENDEZ 1A (NR ILE=10)"],
  ["33233434", "BLANCO SANCH 3B (NR ILE=2)"],
  ["31523586", "NELCHA 4B (NR: 13,10,10,10,10,10,10)"],
  ["10406550549", "URBANO 4D (NR ILE=10 MA=10 QU=10, def 11/11/10?)"],
  ["32486444", "LUZARDO 1B (NC NC NC -> NR *)"],
  ["32246034", "GIMENEZ 2F (NR todo IN)"],
  ["32059229", "SOTO FALCON 3F (NR todo IN)"],
];

async function main() {
  const asigs = await prisma.asignatura.findMany();
  const byCod = new Map(asigs.map(a => [a.codigo, a.id]));
  for (const [ced, etiqueta] of CASOS) {
    const al = await prisma.alumno.findFirst({ where: { cedula: { in: ["V " + ced, "V" + ced] } } });
    if (!al) { console.log(`${etiqueta}: SIN ALUMNO`); continue; }
    const inscs = await prisma.inscripcion.findMany({ where: { alumnoId: al.id }, include: { seccion: true } });
    for (const insc of inscs) {
      const nls = await prisma.notaLapso.findMany({ where: { inscripcionId: insc.id }, orderBy: [{ asignaturaId: "asc" }, { lapso: "asc" }] });
      if (!nls.length) continue;
      const porAsig = new Map();
      for (const n of nls) { (porAsig.get(n.asignaturaId) || porAsig.set(n.asignaturaId, []).get(n.asignaturaId)).push(n); }
      const cod = id => asigs.find(a => a.id === id)?.codigo || "?";
      const partes = [];
      for (const [aid, arr] of porAsig) {
        const vals = arr.map(n => `${n.lapso}:${n.valor}`).join(" ");
        partes.push(`${cod(aid)} [${vals}]`);
      }
      console.log(`${etiqueta} -> ${insc.seccion.grado}${insc.seccion.codigo}${insc.seccion.tipo === "MP" ? " (MP)" : ""}:`);
      for (const p of partes) console.log("    ", p);
    }
  }
  await prisma.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
