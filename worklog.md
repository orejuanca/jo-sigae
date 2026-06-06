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
