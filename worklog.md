# Worklog — Certificación Preview Fix

## Date: 2025-07-11

## Task: Fix CertificacionPreview component to EXACTLY match the Excel format

### Summary
Rewrote the HTML preview section of `/src/app/certificaciones/page.tsx` to use proper HTML tables with exact colspan patterns matching the Excel (CEMG certification document). Previously, the preview used CSS grid/flex layouts which didn't match the Excel's table structure.

### Changes Made

#### 1. Added helper styles and renderYearTable function (lines 431-475)
- `tbS`: Table base style (borderCollapse, fontSize 7pt, lineHeight 1.3)
- `bd`: Basic bordered cell style
- `bdB`: Bold bordered cell (for labels)
- `bdH`: Header row style (bold + gray background)
- `bdC`: Centered bordered cell
- `bdCh`: Centered header cell (bold + gray bg + 6pt font)
- `renderYearTable()`: Generates a 13-column year table matching the Excel's A-M column pattern

#### 2. Section II — Datos de la Institución (27 columns)
Fixed colspan patterns to match Excel exactly:
- Row 6: Código(3) + OD(5) + Denominación label(5) + Denominación value(14) = **27**
- Row 7: Dirección(3) + address(15) + Teléfono(3) + phone(6) = **27**
- Row 8: Municipio(3) + value(4) + Estado(3) + value(8) + CDCEE(4) + value(5) = **27**

#### 3. Section III — Datos del Estudiante (27 columns)
Fixed colspan patterns:
- Row 10: Cédula(4) + value(5) + Fecha Nacimiento(6) + value(12) = **27**
- Row 11: Apellidos(3) + value(8) + Nombres(4) + value(12) = **27**
- Row 12: Lugar País(5) + value(6) + Estado(2) + value(7) + Municipio(2) + value(5) = **27**

#### 4. Section V — Calificaciones (side-by-side year tables)
- **Primer Año + Segundo Año**: Flex container with two 13-column tables side-by-side (2px gap = Excel's column N separator)
- **Tercer Año + Cuarto Año**: Same side-by-side layout
- **Quinto Año + Orientación/Grupos**: Quinto subjects on left, Orientación y Convivencia table + Participación en Grupos table on right
- Each year table has proper structure: ÁREAS DE FORMACIÓN (colspan 4, rowspan 2), CALIFICACIÓN header, N° + LETRAS sub-headers, T-E (rowspan 2), FECHA (Mes+Año), Inst. Educ. (rowspan 2)

#### 5. Section VI — Observaciones (27 columns)
- Row: Observaciones label(4) + P.A. label(3) + promedio value(20) = **27**
- Full width row: observaciones text(27)

#### 6. Sections VII + VIII — Director y CDCCE (side-by-side)
- Left half (VII): 13-column table with director info + firma/sello
- Right half (VIII): 13-column table with CDCCE director info + firma/sello
- Side-by-side with 2px gap matching Excel's column N separator

#### 7. Container styling
- Changed to `maxWidth: 210mm` (A4 width) for proper print preview
- Set `fontSize: 7pt, lineHeight: 1.3` to match Excel cell density
- Changed padding from `p-6` to `8px`

### Commit
- `fix: certificacion preview - colspan exactos del Excel para todas las secciones`
- 1 file changed, 253 insertions(+), 160 deletions(-)
- Force-pushed to `main` branch

### Files Modified
- `src/app/certificaciones/page.tsx` — Preview section (lines ~880-1135)

### What Was NOT Changed
- Main component logic (form state, API calls, etc.)
- Data entry tabs (Datos, Instituciones, Calificaciones, Adicional)
- Generate tab functionality
- Student search and selection logic
- School config or data interfaces
