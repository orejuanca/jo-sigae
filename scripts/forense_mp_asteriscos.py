#!/usr/bin/env python3
# Inventario de asteriscos-legítimos en momentos ANTERIORES a la primera nota/IN
# en materias que el alumno SÍ debe (patrón: alumno trasladado venía aplazado).
import json, glob, re

MATERIAS_COLS = {}  # col_inicial de cada materia (cada materia ocupa 4 cols: 1M-4M)

for f in sorted(glob.glob('NL_*grado.json')):
    d = json.load(open(f))
    celdas = d['celdas']
    ini = None
    for x in celdas:
        if isinstance(x.get('v'), str) and 'MATERIA PENDIENTE' in x['v'].upper():
            ini = x['r']; break
    if ini is None: continue
    grid = {}
    for x in celdas:
        if x['r'] >= ini:
            grid.setdefault(x['r'], {})[x['c']] = x['v']
    # fila de materias: r ini+1 (ej 483): CA en c5, ILE en c9... (cada 4)
    fila_mat = ini + 1
    fila_hdr = ini + 2
    mats = {}
    for c, v in grid.get(fila_mat, {}).items():
        if isinstance(v, str) and re.fullmatch(r'[A-Z]{2,5}', v.strip()) and v.strip() not in ('GRUPO', 'PROM'):
            mats[c] = v.strip()
    hdr = grid.get(fila_hdr, {})
    if not hdr.get(5) in ('1', '1M'):
        continue  # formato inesperado
    print(f'== {f}: materias en bloque MP: {list(mats.values())}')
    # filas de alumnos: desde ini+3 mientras haya cédula
    r = ini + 3
    while r <= d['filas']:
        row = grid.get(r, {})
        ced = row.get(2)
        if not ced or not str(ced).strip().startswith(('V', 'E', 'J')):
            break  # fin de alumnos (siguen filas de relleno)
        nombre = row.get(3, '')
        hallazgos = []
        for c0, cod in sorted(mats.items()):
            seq = [str(row.get(c0 + k, '')).strip() for k in range(4)]
            # materia debida: tiene al menos un valor distinto de * y ''
            if not any(v not in ('*', '') for v in seq): continue
            # primera nota/IN
            primera = next((i for i, v in enumerate(seq) if v not in ('*', '')), None)
            if primera is None: continue
            previos = seq[:primera]
            n_ast = previos.count('*')
            if n_ast:
                hallazgos.append(f'{cod}: {" | ".join(v if v else "·" for v in seq)}  ({n_ast} * previos)')
        if hallazgos:
            print(f'  {ced} {nombre}')
            for h in hallazgos: print(f'     {h}')
        r += 1
    print()
