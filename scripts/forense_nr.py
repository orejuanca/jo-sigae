# -*- coding: utf-8 -*-
"""FORENSE NR: reconstruir las sábanas NR_1grado..NR_5grado del Excel verbatim
para entender la estructura del 'resumen final de revisión' (modulo a construir en v8)."""
import json, os

BASE = "/home/z/my-project/jo-sigae/scripts/data_legacy/excel_integro"

def cargar(nombre):
    d = json.load(open(os.path.join(BASE, nombre), encoding="utf-8"))
    grid = {}
    for c in d["celdas"]:
        grid.setdefault(c["r"], {})[c["c"]] = c["v"]
    return d, grid

def mostrar(nombre, max_filas=60, max_col=30):
    d, grid = cargar(nombre)
    print("=" * 100)
    print(f"HOJA: {d['hoja']}  filas={d['filas']} col={d['columnas']} celdas={d['celdas_con_datos']}")
    filas = sorted(grid.keys())
    print(f"filas con datos: {len(filas)} (primera={filas[0]}, ultima={filas[-1]})")
    for r in filas[:max_filas]:
        vals = grid[r]
        cmax = max(vals.keys())
        linea = []
        for c in range(1, min(cmax, max_col) + 1):
            v = vals.get(c)
            if v is None:
                linea.append("")
            elif isinstance(v, float) and v == int(v):
                linea.append(str(int(v)))
            else:
                linea.append(str(v))
        print(f"r{r:>4}| " + " | ".join(x[:14] for x in linea))

for n in ["NR_1grado.json"]:
    mostrar(n)
