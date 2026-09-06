#!/usr/bin/env python3
# Versión compacta: por cada alumno MP, SOLO las materias que debe (algún valor != *) y su secuencia 1M|2M|3M|4M
import json

def compact(f, ini):
    d = json.load(open(f))
    grid = {}
    for x in d['celdas']:
        if x['r'] >= ini:
            grid.setdefault(x['r'], {})[x['c']] = x['v']
    fila_mat = grid.get(ini + 1, {})
    mats = {}
    for c, v in fila_mat.items():
        if isinstance(v, str) and v.strip() in ('CA','ILE','MA','EF','AP','CN','GHC','OC','PG','FI','QU','BI','FS','CT'):
            mats[c] = v.strip()
    print(f'== {f} (ini {ini}, materias detectadas: {len(mats)}) ==')
    r = ini + 3
    n = 0
    while r <= d['filas']:
        row = grid.get(r, {})
        ced = row.get(2)
        if not ced or not str(ced).strip().startswith(('V','E','J')): break
        n += 1
        debedas = []
        for c0, cod in sorted(mats.items()):
            seq = [str(row.get(c0 + k, '')).strip() for k in range(4)]
            if any(v not in ('*', '') for v in seq):
                debedas.append(f"{cod}: {'|'.join(v if v else '·' for v in seq)}")
        if debedas:
            print(f"  {str(ced).strip()} {row.get(3,'')}")
            for x in debedas: print(f'     {x}')
        r += 1
    print(f'  ({n} alumnos)')
    print()

compact('NL_1grado.json', 482)
compact('NL_2grado.json', 482)
compact('NL_3grado.json', 482)
compact('NL_4grado.json', 482)
