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
