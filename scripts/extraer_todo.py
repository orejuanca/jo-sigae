"""Extraccion completa legacy UENCC 2021-2022 -> data_legacy/*.json
Salidas: matriz_secciones.json (celdas grado|seccion|codigo|docenteRaw|cedula),
         docentes.json (catalogo nombre->ci), alumnos.json (nomina completa).
"""
import json, re, openpyxl
from pathlib import Path

XL = 'Control de Alumnos UENCC 2021 - 2022 - copia.xlsm'
OUT = Path('scripts/data_legacy'); OUT.mkdir(parents=True, exist_ok=True)

wb = openpyxl.load_workbook(XL, read_only=True, data_only=True)

def norm(s):
    return re.sub(r'\s+', ' ', str(s or '')).strip().upper()

# ---------- 1) SECCIONES -> matriz ----------
ws = wb['SECCIONES']
rows = list(ws.iter_rows(values_only=True))
MAXC = 54  # dims reales

grado_row, code_row = rows[0], rows[1]
# asignar col -> grado (forward fill de fila 1)
col_grado, current = {}, None
for c in range(1, MAXC):
    v = norm(grado_row[c]) if c < len(grado_row) else ''
    if v: current = v
    if current: col_grado[c] = current
col_code = {c: norm(code_row[c]) for c in range(1, MAXC) if code_row[c]}

GRADO_ABR = {'PRIMER AÑO': '1', 'SEGUNDO AÑO': '2', 'TERCER AÑO': '3',
             'CUARTO AÑO': '4', 'QUINTO AÑO': '5'}

celdas, docentes_set = [], set()
for r in rows[2:]:
    letra = norm(r[0])
    if not letra or len(letra) > 2: continue
    for c, code in col_code.items():
        raw = norm(r[c]) if c < len(r) else ''
        if not code or not raw: continue
        g = GRADO_ABR.get(col_grado.get(c, ''), col_grado.get(c, '?'))
        celdas.append({'grado': g, 'seccion': letra, 'codigo': code,
                       'docenteRaw': raw if raw != '*' else None})
        if raw != '*': docentes_set.add(raw)

# ---------- 2) PROFESORES -> catalogo cedulas ----------
wsp = wb['PROFESORES']
prows = list(wsp.iter_rows(values_only=True))
cat = {}  # nombre normalizado -> ci
for r in prows[1:]:
    if len(r) < 3: continue
    prof, ci = norm(r[1]), norm(r[2])
    if prof and ci and re.match(r'^[VEJ][- ]?\d', ci):
        ci = re.sub(r'\s+', '', ci)
        cat[prof] = ci
        if not re.match(r'^V ', ci) and not ci.startswith('E '):
            cat[prof] = ci[0] + ' ' + ci[1:]

con_ci = sin_ci = 0
for c in celdas:
    if c['docenteRaw']:
        ci = cat.get(c['docenteRaw'])
        c['cedula'] = ci
        con_ci += 1 if ci else 0
        sin_ci += 0 if ci else 1

# ---------- 3) ALUMNOS -> nomina ----------
wsa = wb['ALUMNOS']
alumnos, headers = [], 0
sin_gs = 0
for r in wsa.iter_rows(values_only=True):
    if not r or len(r) < 10: continue
    ced = norm(r[0])
    if ced == 'CEDULA': headers += 1; continue
    m = re.match(r'^([VEJ])\s*(\d{5,12})$', ced)
    if m: ced = m.group(1) + ' ' + m.group(2)
    else: continue
    g, s = norm(r[1]), norm(r[2])
    if not re.match(r'^\d$', g or '') or not re.match(r'^[A-Z]$', s or ''):
        sin_gs += 1; continue
    fn = r[9]
    fnorm = None
    if fn:
        try:
            from datetime import datetime, date
            if isinstance(fn, datetime): fnorm = fn.date().isoformat()
            elif isinstance(fn, date): fnorm = fn.isoformat()
            else:
                fnorm = datetime.strptime(str(fn).strip()[:10], '%Y-%m-%d').date().isoformat()
        except Exception: fnorm = str(fn).strip()[:10]
    alumnos.append({'cedula': ced, 'grado': g, 'seccion': s,
                    'matricula': str(r[3] or '').strip(),
                    'apellidos': norm(r[6]), 'nombres': norm(r[7]),
                    'sexo': norm(r[8]) or None, 'fechaNac': fnorm,
                    'entidad': norm(r[12]) or None, 'ef': norm(r[11]) or None})

json.dump(celdas, open(OUT / 'matriz_secciones.json', 'w'), ensure_ascii=False, indent=1)
json.dump([{'nombre': k, 'cedula': v} for k, v in sorted(cat.items())],
          open(OUT / 'docentes.json', 'w'), ensure_ascii=False, indent=1)
json.dump(alumnos, open(OUT / 'alumnos.json', 'w'), ensure_ascii=False, indent=1)

print(f'CELDAS matriz: {len(celdas)} (con docente {con_ci}, sin CI {sin_ci}, sin docente {sum(1 for c in celdas if not c["docenteRaw"])})')
print(f'DOCENTES catalogo: {len(cat)}')
print(f'ALUMNOS: {len(alumnos)} (headers {headers}, sin grado/seccion saltadas {sin_gs})')
from collections import Counter
print('por grado:', dict(Counter(c["grado"] for c in celdas)))
print('codigos:', dict(Counter(c["codigo"] for c in celdas)))
print('alumnos por grado:', dict(Counter(a["grado"] for a in alumnos)))
sin = [c for c in celdas if c['docenteRaw'] and not c['cedula']]
print('celdas sin CI resuelto:', len(sin), [f'{c["grado"]}{c["seccion"]} {c["codigo"]} {c["docenteRaw"]}' for c in sin[:8]])
