# -*- coding: utf-8 -*-
"""Comparar fila NR vs fila NL (misma cedula) celda a celda: NELCHA 4B y URBANO 4D."""
import json, os

BASE = "/home/z/my-project/jo-sigae/scripts/data_legacy/excel_integro"

def cargar(nombre):
    d = json.load(open(os.path.join(BASE, nombre), encoding="utf-8"))
    grid = {}
    for c in d["celdas"]:
        grid.setdefault(c["r"], {})[c["c"]] = c["v"]
    return grid

def fmt(v):
    if v is None: return ""
    if isinstance(v, float) and v == int(v): return str(int(v))
    return str(v)

def fila(grid, r, cmax=25):
    return [fmt(grid[r].get(c)) for c in range(1, cmax + 1)]

nr4 = cargar("NR_4grado.json")
nl4 = cargar("NL_4grado.json")

print("### NR_4 r53 (header materias) y r54 (NELCHA):")
print("r53:", fila(nr4, 53))
print("r54:", fila(nr4, 54))

print("\n### NL_4: buscar fila de 33312054 en bloque B")
# localizar bloques NL: titulo 'Notas de Lapso y Definitivas 4 B'
for r in sorted(nl4.keys()):
    v = nl4[r].get(1)
    if v and "4° B" in str(v):
        print(f"bloque B en r{r}: '{v}'")
        for rr in range(r + 3, r + 48):
            c2 = str(nl4[rr].get(2, ""))
            if "33312054" in c2:
                print(f"r{rr}:", fila(nl4, rr))

print("\n### NL_4 headers del bloque B (2 filas)")
for r in sorted(nl4.keys()):
    v = nl4[r].get(1)
    if v and "4° B" in str(v):
        print(f"r{r+1}:", fila(nl4, r + 1))
        print(f"r{r+2}:", fila(nl4, r + 2))
        break

print("\n### NR_4 r156-157 (URBANO) y su fila NL_4D")
print("r156:", fila(nr4, 156))
print("r157:", fila(nr4, 157))
for r in sorted(nl4.keys()):
    v = nl4[r].get(1)
    if v and "4° D" in str(v):
        for rr in range(r + 3, r + 48):
            c2 = str(nl4[rr].get(2, ""))
            if "10406550549" in c2:
                print(f"NL r{rr}:", fila(nl4, rr))
        break
