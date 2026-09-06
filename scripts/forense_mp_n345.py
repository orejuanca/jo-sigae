#!/usr/bin/env python3
# Dump verbatim de bloques MP de NL_3, NL_4 y contexto NL_5 (solo filas con datos, sin relleno puro de *)
import json

def dump(f, ini, fin, solo_con_cedula_hasta=None):
    d = json.load(open(f))
    grid = {}
    for x in d['celdas']:
        if ini <= x['r'] <= fin:
            grid.setdefault(x['r'], {})[x['c']] = x['v']
    print(f'== {f} filas {ini}-{fin} ==')
    for r in sorted(grid.keys()):
        row = grid[r]
        # fila de relleno: todas las celdas son '*'
        vals = [str(v).strip() for v in row.values()]
        if vals and all(v == '*' for v in vals):
            continue
        line = ' | '.join(f'c{c}={row[c]!r}' for c in sorted(row.keys()) if str(row[c]).strip() != '')
        print(f'  r{r}: {line}')
    print()

dump('NL_3grado.json', 482, 535)
dump('NL_4grado.json', 482, 535)
dump('NL_5grado.json', 145, 160)
