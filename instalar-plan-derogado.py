# =============================================
# SCRIPT: instalar-plan-derogado.py
# USO:   python instalar-plan-derogado.py
# LUGAR: D:\jo-sigae\  (misma carpeta que package.json)
# =============================================
# Hace TODO:
#   1. Agrega modelo PlanDerogado a prisma/schema.prisma
#   2. Copia las 3 rutas API a sus carpetas
#   3. Copia el script de importacion
#   4. Ejecuta npx prisma db push
#   5. Aplica los 11 cambios al dashboard-content.tsx
# =============================================

import os
import sys
import shutil
import subprocess
from datetime import datetime

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# =============================================
# PASO 1: AGREGAR MODELO PRISMA
# =============================================
print('=====================================')
print('  INSTALACION PLAN DEROGADO')
print('=====================================')
print()

PRISMA_FILE = os.path.join(BASE_DIR, 'prisma', 'schema.prisma')
MODEL_BLOCK = '''model PlanDerogado {
  id        String   @id @default(cuid())
  cedula    String   @unique
  rawData   String
  certDraft String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}'''

print('PASO 1/5: Modelo Prisma')
if os.path.exists(PRISMA_FILE):
    with open(PRISMA_FILE, 'r', encoding='utf-8') as f:
        prisma_content = f.read()
    if 'model PlanDerogado' in prisma_content:
        print('  ⏭️  Modelo PlanDerogado ya existe, saltando...')
    else:
        # Agregar al final del archivo
        with open(PRISMA_FILE, 'a', encoding='utf-8') as f:
            f.write('\n' + MODEL_BLOCK + '\n')
        print('  ✅ Modelo PlanDerogado agregado a schema.prisma')
else:
    print(f'  ❌ No encuentro: {PRISMA_FILE}')
    sys.exit(1)
print()

# =============================================
# PASO 2: COPIAR RUTAS API
# =============================================
print('PASO 2/5: Rutas API')

# Rutas a crear
api_files = {
    'plan-derogado-route.ts': os.path.join(BASE_DIR, 'src', 'app', 'api', 'plan-derogado', 'route.ts'),
    'plan-derogado-id-route.ts': os.path.join(BASE_DIR, 'src', 'app', 'api', 'plan-derogado', '[id]', 'route.ts'),
    'plan-derogado-cert-data-route.ts': os.path.join(BASE_DIR, 'src', 'app', 'api', 'plan-derogado', '[id]', 'cert-data', 'route.ts'),
    'update-plan-derogado.cjs': os.path.join(BASE_DIR, 'scripts', 'update-plan-derogado.cjs'),
}

DOWNLOAD_DIR = os.path.join(BASE_DIR, 'download')

for src_name, dest_path in api_files.items():
    src_path = os.path.join(DOWNLOAD_DIR, src_name)
    if os.path.exists(src_path):
        # Crear carpeta destino si no existe
        os.makedirs(os.path.dirname(dest_path), exist_ok=True)
        shutil.copy2(src_path, dest_path)
        print(f'  ✅ {os.path.relpath(dest_path, BASE_DIR)}')
    else:
        print(f'  ❌ No encuentro origen: {src_name}')
        print(f'     Copia los archivos a: {DOWNLOAD_DIR}')

print()

# =============================================
# PASO 3: PRISMA DB PUSH
# =============================================
print('PASO 3/5: Creando tabla en la base de datos...')
print('  Ejecutando: npx prisma db push')
print()

result = subprocess.run(
    ['npx', 'prisma', 'db', 'push'],
    cwd=BASE_DIR,
    capture_output=True,
    text=True,
    timeout=120
)

if result.returncode == 0:
    print('  ✅ Tabla PlanDerogado creada exitosamente')
    if result.stdout.strip():
        for line in result.stdout.strip().split('\n')[-3:]:
            print(f'     {line}')
else:
    print(f'  ⚠️  prisma db push tuvo problemas:')
    if result.stderr.strip():
        for line in result.stderr.strip().split('\n')[-5:]:
            print(f'     {line}')
    print('  Puedes ejecutar manualmente: npx prisma db push')
print()

# =============================================
# PASO 4: APLICAR 11 CAMBIOS AL DASHBOARD
# =============================================
print('PASO 4/5: Aplicando 11 cambios a dashboard-content.tsx')

DASHBOARD_FILE = os.path.join(BASE_DIR, 'src', 'components', 'dashboard-content.tsx')
BACKUP_PATH = DASHBOARD_FILE + f'.backup-{datetime.now().strftime("%Y%m%d-%H%M%S")}'

cambios = [
    # CAMBIO 1: apiBase
    {
        'desc': 'apiBase para plan derogado',
        'old': "const apiBase = plan === 'vigente' ? '/api/plan-vigente' : '/api/students'",
        'new': "const apiBase = plan === 'vigente' ? '/api/plan-vigente' : '/api/plan-derogado'",
    },
    # CAMBIO 2: search URL 1
    {
        'desc': 'search URL 1 quita &plan',
        'old': ": `/api/students?q=${encodeURIComponent(q.trim())}&plan=${plan}&limit=10`",
        'new': ": `/api/plan-derogado?q=${encodeURIComponent(q.trim())}&limit=10`",
    },
    # CAMBIO 3: search URL 2 (segunda ocurrencia)
    {
        'desc': 'search URL 2 quita &plan',
        'old': ": `/api/students?q=${encodeURIComponent(q.trim())}&plan=${plan}&limit=10`",
        'new': ": `/api/plan-derogado?q=${encodeURIComponent(q.trim())}&limit=10`",
        'count': 2,
    },
    # CAMBIO 4: fetch by ID 1
    {
        'desc': 'fetch by ID 1 quita ?plan',
        'old': ": `/api/students/${studentId}?plan=${plan}`",
        'new': ": `/api/plan-derogado/${studentId}`",
    },
    # CAMBIO 5: fetch by ID 2 (segunda ocurrencia)
    {
        'desc': 'fetch by ID 2 quita ?plan',
        'old': ": `/api/students/${studentId}?plan=${plan}`",
        'new': ": `/api/plan-derogado/${studentId}`",
        'count': 2,
    },
    # CAMBIO 6: cedula exact search
    {
        'desc': 'cedula exact search',
        'old': ": `/api/students?cedula_exact=${encodeURIComponent(cedula)}&plan=${plan}`",
        'new': ": `/api/plan-derogado?q=${encodeURIComponent(cedula)}&limit=1`",
    },
    # CAMBIO 7: postUrl
    {
        'desc': 'postUrl para plan derogado',
        'old': "const postUrl = plan === 'vigente' ? '/api/plan-vigente' : '/api/students'",
        'new': "const postUrl = plan === 'vigente' ? '/api/plan-vigente' : '/api/plan-derogado'",
    },
    # CAMBIO 8: PUT URL
    {
        'desc': 'PUT URL quita ?plan',
        'old': ": `/api/students/${editingStudentId}?plan=${plan}`",
        'new': ": `/api/plan-derogado/${editingStudentId}`",
    },
    # CAMBIO 9: DELETE URL (segunda ocurrencia de editingStudentId)
    {
        'desc': 'DELETE URL quita ?plan',
        'old': ": `/api/students/${editingStudentId}?plan=${plan}`",
        'new': ": `/api/plan-derogado/${editingStudentId}`",
        'count': 2,
    },
    # CAMBIO 10: isCeDropdown
    {
        'desc': 'isCeDropdown agrega rutas derogado',
        'old': "const isCeDropdown = plan === 'vigente' && ceList.length > 0 && c === 2 && r >= 14 && r <= 18",
        'new': "const isCeDropdown = ceList.length > 0 && c === 2 && (\n    (plan === 'vigente' && r >= 14 && r <= 18) ||\n    (plan === 'derogado' && (r >= 14 && r <= 18 || r >= 20 && r <= 24))\n  )",
    },
    # CAMBIO 11: isAutoFill
    {
        'desc': 'isAutoFill agrega rutas derogado',
        'old': "const isAutoFill = plan === 'vigente' && r >= 14 && r <= 18 && (c === 8 || c === 11)",
        'new': "const isAutoFill = ceList.length > 0 && (c === 8 || c === 11) && (\n    (plan === 'vigente' && r >= 14 && r <= 18) ||\n    (plan === 'derogado' && (r >= 14 && r <= 18 || r >= 20 && r <= 24))\n  )",
    },
]

if not os.path.exists(DASHBOARD_FILE):
    print(f'  ❌ No encuentro: {DASHBOARD_FILE}')
else:
    with open(DASHBOARD_FILE, 'r', encoding='utf-8') as f:
        content = f.read()

    # Backup
    shutil.copy2(DASHBOARD_FILE, BACKUP_PATH)
    print(f'  💾 Backup creado')

    aplicados = 0
    fallidos = 0

    for i, cambio in enumerate(cambios):
        old_str = cambio['old']
        new_str = cambio['new']
        count = cambio.get('count', 1)

        if old_str not in content:
            print(f'  ⚠️  #{i+1} NO ENCONTRADA: {cambio["desc"]}')
            fallidos += 1
            continue

        if count == 1:
            content = content.replace(old_str, new_str, 1)
        elif count == 2:
            first_pos = content.find(old_str)
            second_pos = content.find(old_str, first_pos + 1)
            if second_pos == -1:
                print(f'  ⚠️  #{i+1} Solo 1 ocurrencia: {cambio["desc"]}')
                fallidos += 1
                continue
            content = content[:second_pos] + new_str + content[second_pos + len(old_str):]

        print(f'  ✅ #{i+1} {cambio["desc"]}')
        aplicados += 1

    with open(DASHBOARD_FILE, 'w', encoding='utf-8') as f:
        f.write(content)

    print(f'  Resultado: {aplicados} aplicados, {fallidos} fallidos')

print()

# =============================================
# PASO 5: INSTRUCCIONES FINALES
# =============================================
print('PASO 5/5: Resumen final')
print()
print('=====================================')
print('  ✅ INSTALACION COMPLETADA')
print('=====================================')
print()
print('Lo que quedaria por hacer manualmente:')
print()
print('1. IMPORTAR DATOS DEL EXCEL:')
print('   Asegurate de tener el archivo:')
print('   upload\Base de Datos plan derogado.xlsx')
print('   Luego ejecuta:')
print('   node scripts/update-plan-derogado.cjs')
print()
print('2. PROBAR QUE TODO FUNCIONE:')
print('   npm run dev')
print('   Ve al dashboard y selecciona Plan Derogado')
print('   Busca un estudiante y verifica los datos')
print()