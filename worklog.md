---
Task ID: 1
Agent: Main Agent
Task: Corregir formato cédula, letras, tipo evaluación y fechas en certificaciones

Work Log:
- Analizó el código fuente completo: parse-rawdata.ts, certificaciones/page.tsx, seed/route.ts, schema.prisma
- Verificó el formato real de datos en students_bd.json: cédula como "E 84607347" (letra+espacio+número)
- Confirmó que rawData tiene: NOTA (numérico), TIPO (F/R/P), MES (número), AÑO (4 dígitos)
- Confirmó que las LETRAS se calculan con notaToLiteral() (A=18-20, B=15-17, C=12-14, D=10-11, E=01-09)
- Corrigió parse-rawdata.ts:
  - formatDateVal() ahora normaliza ISO y DD/MM/YYYY a DD/MM/YYYY con ceros
  - Agregó currentDateDDMMYYYY() para fecha de expedición
  - fechaNacimiento se normaliza a DD/MM/YYYY en parsedToCertData()
  - tipoEvaluacion por defecto cambió de 'EF' a '' (vacío)
- Corrigió certificaciones/page.tsx:
  - emptyCertData() tipoEvaluacion por defecto a '' en vez de 'EF'
  - fechaExpedicion normalizada a DD/MM/YYYY
  - handleSelectStudent() normaliza fechaNacimiento a DD/MM/YYYY
- Corrigió seed/route.ts:
  - Agregó normalizeFecha() para convertir ISO a DD/MM/YYYY al importar
- Build exitoso, push a GitHub, Vercel desplegando

Stage Summary:
- Archivos modificados: parse-rawdata.ts, certificaciones/page.tsx, seed/route.ts
- Todas las fechas ahora se muestran en DD/MM/YYYY
- Tipo de evaluación muestra valor real de rawData (F/R/P/E/Q) sin valor por defecto
- Cédula preserva formato original (letra + espacio + número)
- Commit: 1eff2ca
---
Task ID: 1
Agent: Main Agent
Task: Corregir formato de cédula - max 10 caracteres con espacio, sin espacio si excede

Work Log:
- Investigado formato actual en BD: 2,045 estudiantes con ≤10 chars (ej: "E 84607347"), 130 con >10 chars (ej: "V 10313697107")
- Creada función `formatCedulaFinal()` en `src/lib/school-config.ts` con la regla: si letra+espacio+número ≤ 10 → con espacio, si > 10 → sin espacio
- Actualizadas 130 cédulas en la BD de Neon PostgreSQL (quitaron espacio por exceder 10 chars)
- Aplicado `formatCedulaFinal()` en 14 archivos: seed route, 6 páginas principales (certificaciones, boletin, constancias, títulos, validar, dashboard, alumnos), 5 componentes (student-search, student-list, boletin-view, validar-form, constancia-form)
- Corregida cédula del director en school-config.ts: "V-6419439" → "V 6419439"
- Seed route actualizado para usar formatCedulaFinal en futuras importaciones
- Build exitoso, commit y push a GitHub

Stage Summary:
- Regla aplicada: cédulas ≤10 chars con espacio (ej: "E 84607347"), >10 chars sin espacio (ej: "V10313697107")
- 130 registros actualizados en la BD
- 14 archivos modificados, todo compilando correctamente
- Desplegado a Vercel (jo-sigae.vercel.app)
