#!/usr/bin/env python3
# Forense MP: extrae verbatim el bloque "Notas de Materia Pendiente" de cada hoja NL
# para ver qué traen los MOMENTOS (IN / enteros / asteriscos) de cada alumno.
import json, glob, re

for f in sorted(glob.glob('NL_*grado.json')):
    d = json.load(open(f))
    celdas = d['celdas']
    # localizar encabezado del bloque MP
    ini = None
    for x in celdas:
        if isinstance(x.get('v'), str) and 'MATERIA PENDIENTE' in x['v'].upper():
            ini = x['r']
            titulo = x['v']
            break
    if ini is None:
        print(f'== {f}: SIN bloque MP ==')
        continue
    fin = d['filas']
    print(f'== {f} — "{titulo}" filas {ini}-{fin} ==')
    # reconstruir grid del bloque
    grid = {}
    for x in celdas:
        if x['r'] >= ini:
            grid.setdefault(x['r'], {})[x['c']] = x['v']
    maxc = max((max(row.keys()) for row in grid.values()), default=0)
    for r in sorted(grid.keys()):
        cols = grid[r]
        celdas_row = []
        for c in range(1, maxc + 1):
            v = cols.get(c)
            if v is None: continue
            v = str(v)
            if v.strip() == '': continue
            celdas_row.append(f'c{c}={v!r}')
        if celdas_row:
            print(f'  r{r}: ' + ' | '.join(celdas_row))
    print()
