"""Extrae data legacy del xlsm UENCC 2021-2022: secciones+docentes (matriz) y alumnos."""
import json, openpyxl, sys

XL = 'Control de Alumnos UENCC 2021 - 2022 - copia.xlsm'
wb = openpyxl.load_workbook(XL, read_only=True, data_only=True)

def dump_sheet(name, max_rows=12, max_cols=14):
    ws = wb[name]
    print(f'=== {name} dims={ws.max_row}x{ws.max_column} ===')
    for i, row in enumerate(ws.iter_rows(max_row=max_rows, max_col=max_cols, values_only=True)):
        print(i+1, [str(c)[:14] if c is not None else '' for c in row])

if __name__ == '__main__':
    which = sys.argv[1] if len(sys.argv) > 1 else 'peek'
    if which == 'peek':
        dump_sheet('SECCIONES')
        print()
        dump_sheet('ALUMNOS')
        print()
        dump_sheet('PROFESORES')
