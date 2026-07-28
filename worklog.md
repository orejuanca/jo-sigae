# Worklog — Certificación Preview

## Date: 2025-07-12

## Task: Rewrite "Vista Previa" preview section to match Excel format exactly (Formato Nuevo CEMG.xlsm)

### Summary
Rewrote the preview style variables, `renderYearHalf` function, and the entire `TabsContent value="vista"` section of `/src/app/certificaciones/page.tsx` to match the Excel file "Formato Nuevo CEMG.xlsm" sheet "Hoja1" exactly.

### Key Changes

#### 1. Style Variables (lines 431-437) — Excel Format Compliance
- **Font**: Changed from `7pt` to `9pt` (Arial, matching Excel's standard 9pt)
- **Removed ALL background colors**: Deleted `backgroundColor: '#f5f5f5'` from `bdH` and `backgroundColor: '#f0f0f0'` from `bdCh`
- **Headers**: `bdCh` changed to 7pt bold centered (Excel Inst. Educ. headers are 7pt bold)
- **`tbS`**: Added `fontFamily: 'Arial, sans-serif'` for Excel font compliance
- All cells use `border: '1px solid #000'` (thin Excel borders on all sides)

#### 2. `renderYearHalf` Function (lines 439-497) — Corrected Structure
- Changed from 7-`<td>` per row with inconsistent colSpan to clean 7-`<td>` matching Excel logical columns:
  - ÁREAS DE FORMACIÓN (1 col, rowspan 2 with `<br/>` wrap)
  - N° (1 col)
  - LETRAS (1 col)
  - T-E (1 col, rowspan 2)
  - Mes (1 col)
  - Año (1 col)
  - Inst. Educ. (1 col, rowspan 2)
- **Filters out qualitative subjects** (Orientación, Participación Grupal) — only quantitative grades shown
- Subject names use `verticalAlign: 'top'` and `whiteSpace: 'normal'` matching Excel
- Grade column is `fontWeight: 'bold'`, LETRAS is `textAlign: 'left'`
- Inst. Educ. uses abbreviated `instName` at 6pt

#### 3. TabsContent Vista Section (lines 890-1249) — Full Excel Layout

**Container**: `maxWidth: '260mm'`, `fontFamily: 'Arial, sans-serif'`, `fontSize: '9pt'`, `padding: '0'`, `border border-black` (single 1px border)

**Rows 1-3 (Header)**:
- Row 1: Logo (left A-L) + Title "CERTIFICACIÓN DE CALIFICACIONES EMG" centered bold 11pt (M-AA merged)
- Row 2: "I. Plan de Estudio: EDUCACIÓN MEDIA GENERAL" (left) + "Código 31059" (right-aligned)
- Row 3: "Lugar y Fecha de Expedición:" + lugar/fecha right-aligned

**Row 4**: Empty spacer row (6px height, just borders)

**Section II (Rows 5-8)**: Institution data — Código, Denominación, Dirección, Teléfono, Municipio, Estado, CDCEE

**Section III (Rows 9-12)**: Student data — Cédula, Fecha Nacimiento, Apellidos, Nombres, País, Estado, Municipio

**Section IV (Rows 13-16)**: Institutions tables side-by-side — Left half has section title + 2 data rows, Right half has headers + 3 data rows (5 institutions total)

**Section V**: Year grade tables in pairs:
- 1° Año (left) + 2° Año (right) side-by-side
- 3° Año (left) + 4° Año (right) side-by-side
- 5° Año (left) + Orientación/Grupos (right) side-by-side

**Section VI**: Observaciones row with P.A. and promedio acumulado

**Sections VII + VIII**: Director and CDCCE side-by-side with SELLO areas and Firma

**Valor Fiscal**: Single row at bottom

### Files Modified
- `src/app/certificaciones/page.tsx` — Lines 431-437 (styles), 439-497 (renderYearHalf), 890-1249 (vista tab)

### What Was NOT Changed
- All other tabs: datos, instituciones, calificaciones, adicional, generar
- Component interfaces, state management, API calls
- School config or data interfaces
- Student search and selection logic

---
Task ID: 1
Agent: main
Task: Fix missing data bindings in Cert.Visual - orientación literales, grupo 2°-5°, observaciones por línea, promedio académico

Work Log:
- Read and analyzed types.ts (patchDataBindings, resolveBinding, DisplayData, DATA_BINDINGS)
- Read and analyzed page.tsx (displayData construction, CertData interface, grid rendering)
- Read parse-rawdata.ts to understand data flow from rawData → parsed → certData → displayData
- Identified root causes: bind() silently failed when cells missing from saved templates; observations were a single joined string instead of 4 individual lines
- Fixed bind() to create row/cell if missing (robust bind)
- Added obsLine.0-3 resolver case and DATA_BINDINGS entries
- Split observaciones into 4 individual lines via observacionesLines field
- Added calificaciones, orientacion, grupos to DisplayData interface
- Updated parse-rawdata.ts parsedToCertData to include observacionesLines
- Updated page.tsx CertData interface and displayData to pass observacionesLines
- Pushed to GitHub, Vercel will auto-deploy

Stage Summary:
- Key fix: patchDataBindings bind() now creates missing rows/cells instead of silently failing
- Observaciones now split into 4 lines (obsLine.0-3) instead of single doc.observaciones
- Promedio Académico cell (doc.promedioAcumulado) now only shows acta value, not obs text
- All 4 observation lines now have orange dots in designer mode

---
Task ID: 1
Agent: main
Task: Refactor Excel import system — replace numeric column keys with structured named data

Work Log:
- Analyzed DATA_ALUMNOS.xlsx: 1871 rows, 261 columns, headers are numbers (8-261) for non-student cols
- Created `/src/lib/import-excel.ts` — reads Excel directly and produces structured_v1 format
- Modified `/src/app/api/seed/route.ts` — now imports from DATA_ALUMNOS.xlsx directly (plan vigente) + students_bd2.json (plan derogado)
- Updated `/src/app/api/boletin/route.ts` — supports both structured_v1 and legacy flat numeric formats
- Installed `xlsx` package for server-side Excel reading
- Verified: 1870 records imported, 0 numeric keys, parseCertData works correctly
- Build passes with no errors

Stage Summary:
- Eliminated fragile numeric-key intermediate JSON step entirely
- rawData now stored as structured_v1 with descriptive keys (instituciones[], calificaciones[], orientacion[], etc.)
- No changes needed to parse-rawdata.ts — it already handles structured_v1 format
- Backward compatible: boletin API still reads legacy flat format if encountered
- Seed API reads DATA_ALUMNOS.xlsx directly on POST /api/seed
- Orientación and grupo bindings work with any saved template (cells auto-created)

---
Task ID: 1
Agent: main
Task: Fix Vercel "This page couldn't load" error for dashboard

Work Log:
- Diagnosed that the preview URL (jo-sigae-dlfa2a2s8...) had SSO protection, not a build error
- Found production URL jo-sigae.vercel.app works for login but not dashboard
- Used agent-browser to confirm: login works, dashboard shows "This page couldn't load"
- Verified all JS chunks load (HTTP 200), CSS loads, fonts load
- Confirmed the error is a server-side rendering error in the 1445-line dashboard component
- Created minimal test page → worked, confirming the issue is in the dashboard component code
- Root cause: Turbopack SSR fails on the complex dashboard component (likely due to large module-level data structures or component complexity)
- Solution: Wrapped dashboard in dynamic import with ssr:false

Stage Summary:
- Moved src/app/dashboard/page.tsx → src/components/dashboard-content.tsx
- Created new src/app/dashboard/page.tsx with next/dynamic and ssr:false
- Dashboard now loads on Vercel via client-side rendering only
- Full login → dashboard flow works correctly
