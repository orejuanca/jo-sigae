# -*- coding: utf-8 -*-
"""FORENSE NR parte 3: encabezados de bloque por grado (letra seccion + materias),
filas de alumno completas de NR 2-5, y vistazo a RF_1grado."""
import json, os

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

for n in ["NR_2grado.json", "NR_3grado.json", "NR_4grado.json", "NR_5grado.json"]:
    d, grid = cargar(n)
    print("=" * 100)
    print(f"HOJA {d['hoja']}")
    # titulos de bloque: fila con 'Notas de REVIS' en c1 + header materias en r+1 (desde c4 o c5)
    titulos = []
    for r in sorted(grid.keys()):
        v = grid[r].get(1)
        if v and str(v).startswith("Notas de REVIS"):
            titulos.append((r, str(v)))
    print(f"bloques ({len(titulos)}):")
    for r, t in titulos:
        # materias del bloque: fila r+1
        mats = [fmt(grid[r + 1].get(c)) for c in range(4, 20) if grid[r + 1].get(c)]
        print(f"  r{r:>4}: '{t}'  materias={mats}")
    # filas de alumno
    print("alumnos:")
    for r in sorted(grid.keys()):
        v2 = grid[r].get(2)
        if v2 and "V" in str(v2) and any(ch.isdigit() for ch in str(v2)):
            vals = grid[r]
            cmax = max(vals.keys())
            linea = [fmt(vals.get(c)) for c in range(1, cmax + 1)]
            print(f"  r{r:>4}| " + " | ".join(x[:12] for x in linea))

print("\n" + "#" * 100)
print("### RF_1grado (solo primeras 25 filas con datos, para contexto)")
d, grid = cargar("RF_1grado.json")
print(f"HOJA {d['hoja']} filas={d['filas']} col={d['columnas']} celdas={d['celdas_con_datos']}")
n = 0
for r in sorted(grid.keys()):
    vals = grid[r]
    cmax = max(vals.keys())
    linea = [fmt(vals.get(c)) for c in range(1, min(cmax, 20) + 1)]
    if any(x.strip() for x in linea):
        print(f"  r{r:>4}| " + " | ".join(x[:13] for x in linea))
        n += 1
    if n >= 25:
        break
