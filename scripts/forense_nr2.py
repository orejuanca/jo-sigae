# -*- coding: utf-8 -*-
"""FORENSE NR parte 2: columnas exactas de un bloque, todos los bloques del NR_1,
resumen de bloques de NR 2-5, y vistazo a RF_1grado para comparar."""
import json, os, sys

BASE = "/home/z/my-project/jo-sigae/scripts/data_legacy/excel_integro"

def cargar(nombre):
    d = json.load(open(os.path.join(BASE, nombre), encoding="utf-8"))
    grid = {}
    for c in d["celdas"]:
        grid.setdefault(c["r"], {})[c["c"]] = c["v"]
    return d, grid

def fmt(v):
    if v is None: return ""
    if isinstance(v, float) and v == int(v): return str(int(v))
    return str(v)

print("### NR_1grado filas 1-6, TODAS las columnas con datos")
d, grid = cargar("NR_1grado.json")
for r in range(1, 7):
    vals = grid.get(r, {})
    for c in sorted(vals.keys()):
        print(f"  r{r} c{c}: {repr(vals[c])[:60]}")
    print("  ---")

print("\n### BLOQUES de NR_1grado (filas que empiezan con 'Notas de REVIS')")
bloques = []
for r in sorted(grid.keys()):
    v = grid[r].get(1)
    if v and str(v).startswith("Notas de REVIS"):
        # letra de seccion: buscar celda no vacia en la fila
        extras = {c: fmt(x) for c, x in grid[r].items() if c > 1 and str(x).strip() not in ("", "R")}
        bloques.append((r, extras))
for r, ex in bloques:
    print(f"  fila {r}: extras={ex}")
print(f"total bloques: {len(bloques)}")

print("\n### FILAS DE ALUMNOS por bloque NR_1 (cedula en c2)")
alumnos = 0
for r in sorted(grid.keys()):
    v2 = grid[r].get(2)
    if v2 and ("V" in str(v2) and any(ch.isdigit() for ch in str(v2))):
        alumnos += 1
        vals = grid[r]
        cmax = max(vals.keys())
        linea = [fmt(vals.get(c)) for c in range(1, cmax + 1)]
        print(f"  r{r:>4}| " + " | ".join(x[:13] for x in linea))
print(f"total filas alumno NR_1: {alumnos}")

print("\n### FOOTERS NR_1 (TOTAL APROBADOS / APLAZADOS / PROMEDIO)")
for r in sorted(grid.keys()):
    v1 = str(grid[r].get(1, ""))
    if "TOTAL" in v1 or "PROMEDIO" in v1:
        vals = grid[r]
        cmax = max(vals.keys())
        linea = [fmt(vals.get(c)) for c in range(1, min(cmax, 20) + 1)]
        print(f"  r{r:>4}| " + " | ".join(x[:13] for x in linea))

print("\n### RESUMEN de NR_2..NR_5 (bloques + alumnos)")
for n in ["NR_2grado.json", "NR_3grado.json", "NR_4grado.json", "NR_5grado.json"]:
    d, grid = cargar(n)
    nb = 0; na = 0; secciones = []
    for r in sorted(grid.keys()):
        v = grid[r].get(1)
        if v and str(v).startswith("Notas de REVIS"):
            nb += 1
            extras = {c: fmt(x) for c, x in grid[r].items() if c > 1 and str(x).strip() not in ("", "R")}
            secciones.append(extras)
        v2 = grid[r].get(2)
        if v2 and "V" in str(v2) and any(ch.isdigit() for ch in str(v2)):
            na += 1
    print(f"  {d['hoja']}: bloques={nb} alumnos={na} secciones={secciones}")
