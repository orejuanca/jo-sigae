# =============================================
# SCRIPT: aplicar-cambios-dashboard.py
# USO:   python aplicar-cambios-dashboard.py
# LUGAR: D:\jo-sigae\  (misma carpeta que package.json)
# =============================================
# Aplica los 11 cambios de desvinculacion de /api/students
# a /api/plan-derogado en dashboard-content.tsx
# =============================================

import os
import sys
import shutil
from datetime import datetime

FILE_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'src', 'components', 'dashboard-content.tsx')
BACKUP_PATH = FILE_PATH + f'.backup-{datetime.now().strftime("%Y%m%d-%H%M%S")}'

# =============================================
# DEFINICION DE CAMBIOS (11 cambios)
# =============================================
cambios = [
    # CAMBIO 1: Linea 606 - apiBase
    {
        'desc': 'CAMBIO 1: apiBase para plan derogado',
        'old': "const apiBase = plan === 'vigente' ? '/api/plan-vigente' : '/api/students'",
        'new': "const apiBase = plan === 'vigente' ? '/api/plan-vigente' : '/api/plan-derogado'",
    },
    # CAMBIO 2: Linea 615 - search URL 1
    {
        'desc': 'CAMBIO 2: search URL quita &plan',
        'old': ": `/api/students?q=${encodeURIComponent(q.trim())}&plan=${plan}&limit=10`",
        'new': ": `/api/plan-derogado?q=${encodeURIComponent(q.trim())}&limit=10`",
    },
    # CAMBIO 3: Linea 627 - search URL 2
    {
        'desc': 'CAMBIO 3: segunda search URL quita &plan',
        'old': ": `/api/students?q=${encodeURIComponent(q.trim())}&plan=${plan}&limit=10`",
        'new': ": `/api/plan-derogado?q=${encodeURIComponent(q.trim())}&limit=10`",
        'count': 2,  # Hay 2 ocurrencias, esta es la segunda
    },
    # CAMBIO 4: Linea 643 - fetch student by ID 1
    {
        'desc': 'CAMBIO 4: fetch by ID quita ?plan',
        'old': ": `/api/students/${studentId}?plan=${plan}`",
        'new': ": `/api/plan-derogado/${studentId}`",
    },
    # CAMBIO 5: Linea 656 - fetch student by ID 2
    {
        'desc': 'CAMBIO 5: segundo fetch by ID quita ?plan',
        'old': ": `/api/students/${studentId}?plan=${plan}`",
        'new': ": `/api/plan-derogado/${studentId}`",
        'count': 2,
    },
    # CAMBIO 6: Linea 703 - cedula exact search
    {
        'desc': 'CAMBIO 6: cedula exact search simplifica',
        'old': ": `/api/students?cedula_exact=${encodeURIComponent(cedula)}&plan=${plan}`",
        'new': ": `/api/plan-derogado?q=${encodeURIComponent(cedula)}&limit=1`",
    },
    # CAMBIO 7: Linea 714 - POST create URL
    {
        'desc': 'CAMBIO 7: postUrl para plan derogado',
        'old': "const postUrl = plan === 'vigente' ? '/api/plan-vigente' : '/api/students'",
        'new': "const postUrl = plan === 'vigente' ? '/api/plan-vigente' : '/api/plan-derogado'",
    },
    # CAMBIO 8: Linea 729 - PUT update URL
    {
        'desc': 'CAMBIO 8: PUT URL quita ?plan',
        'old': ": `/api/students/${editingStudentId}?plan=${plan}`",
        'new': ": `/api/plan-derogado/${editingStudentId}`",
    },
    # CAMBIO 9: Linea 749 - DELETE URL
    {
        'desc': 'CAMBIO 9: DELETE URL quita ?plan',
        'old': ": `/api/students/${editingStudentId}?plan=${plan}`",
        'new': ": `/api/plan-derogado/${editingStudentId}`",
        'count': 2,
    },
    # CAMBIO 10: isCeDropdown
    {
        'desc': 'CAMBIO 10: isCeDropdown agrega rutas derogado',
        'old': "const isCeDropdown = plan === 'vigente' && ceList.length > 0 && c === 2 && r >= 14 && r <= 18",
        'new': "const isCeDropdown = ceList.length > 0 && c === 2 && (\n    (plan === 'vigente' && r >= 14 && r <= 18) ||\n    (plan === 'derogado' && (r >= 14 && r <= 18 || r >= 20 && r <= 24))\n  )",
    },
    # CAMBIO 11: isAutoFill
    {
        'desc': 'CAMBIO 11: isAutoFill agrega rutas derogado',
        'old': "const isAutoFill = plan === 'vigente' && r >= 14 && r <= 18 && (c === 8 || c === 11)",
        'new': "const isAutoFill = ceList.length > 0 && (c === 8 || c === 11) && (\n    (plan === 'vigente' && r >= 14 && r <= 18) ||\n    (plan === 'derogado' && (r >= 14 && r <= 18 || r >= 20 && r <= 24))\n  )",
    },
]

# =============================================
# FUNCIONES
# =============================================

def read_file(path):
    with open(path, 'r', encoding='utf-8') as f:
        return f.read()

def write_file(path, content):
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

def apply_change(content, cambio, change_num):
    """Aplica un cambio. Si hay count=2, reemplaza solo la segunda ocurrencia."""
    old_str = cambio['old']
    new_str = cambio['new']
    count = cambio.get('count', 1)  # 1 = primera, 2 = segunda

    if old_str not in content:
        print(f'  ⚠️  NO ENCONTRADA: {cambio["desc"]}')
        print(f'      Buscando: {repr(old_str[:80])}...')
        return content, False

    if count == 1:
        # Reemplazar primera (y unica) ocurrencia
        content = content.replace(old_str, new_str, 1)
    elif count == 2:
        # Reemplazar solo la segunda ocurrencia
        first_pos = content.find(old_str)
        second_pos = content.find(old_str, first_pos + 1)
        if second_pos == -1:
            print(f'  ⚠️  Solo 1 ocurrencia encontrada (esperaba 2): {cambio["desc"]}')
            return content, False
        content = content[:second_pos] + new_str + content[second_pos + len(old_str):]

    print(f'  ✅ {cambio["desc"]}')
    return content, True

# =============================================
# MAIN
# =============================================

print('=====================================')
print('  APLICANDO 11 CAMBIOS DASHBOARD')
print('=====================================')
print()

# Verificar archivo existe
if not os.path.exists(FILE_PATH):
    print(f'❌ ERROR: No encuentro el archivo:')
    print(f'   {FILE_PATH}')
    print(f'   Asegurate de ejecutar este script desde D:\\jo-sigae\\')
    sys.exit(1)

print(f'📄 Archivo: {FILE_PATH}')
print(f'   Tamano: {os.path.getsize(FILE_PATH):,} bytes')
print()

# Leer archivo
try:
    content = read_file(FILE_PATH)
except Exception as e:
    print(f'❌ Error leyendo archivo: {e}')
    sys.exit(1)

lines = content.split('\n')
print(f'   Lineas: {len(lines)}')
print()

# Crear backup
print(f'💾 Creando backup: {os.path.basename(BACKUP_PATH)}')
shutil.copy2(FILE_PATH, BACKUP_PATH)
print()

# Aplicar cambios
print('🔧 Aplicando cambios...')
print()

aplicados = 0
fallidos = 0

for i, cambio in enumerate(cambios):
    content, ok = apply_change(content, cambio, i + 1)
    if ok:
        aplicados += 1
    else:
        fallidos += 1

# Escribir archivo modificado
print()
if aplicados > 0:
    try:
        write_file(FILE_PATH, content)
        print(f'✅ Archivo actualizado con exito!')
    except Exception as e:
        print(f'❌ Error escribiendo archivo: {e}')
        print(f'   Restaurando backup...')
        shutil.copy2(BACKUP_PATH, FILE_PATH)
        sys.exit(1)
else:
    print('⚠️  No se aplico ningun cambio.')

print()
print('=====================================')
print(f'  RESULTADO: {aplicados} aplicados, {fallidos} fallidos')
print('=====================================')
if fallidos > 0:
    print(f'  ⚠️  Hay cambios que no se aplicaron.')
    print(f'  Revisa arriba cuales fallaron.')
    print(f'  El backup esta en: {BACKUP_PATH}')
else:
    print(f'  🎉 Todos los cambios se aplicaron correctamente!')
print('=====================================')
