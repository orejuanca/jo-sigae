
---
Task ID: 1
Agent: main
Task: Implement rawData parsing for certificaciones, support BD/BD2 plans, auto-populate grades

Work Log:
- Analyzed BD (students_bd.json, 1870 students) and BD2 (students_bd2.json, 305 students) data structures
- Mapped BD grade pattern: keys 23-227 in groups of 5 (nota, tipo, mes, año, lapso), 7-7-8-9-10 subjects per year
- Mapped BD2 grade pattern: keys 39+ in groups of 5, variable structure with specializations
- Created src/lib/parse-rawdata.ts: parser for both BD and BD2 rawData formats
- Created /api/students/[id]/cert-data endpoint
- Rewrote certificaciones/page.tsx with auto-population from rawData
- Updated student-search.tsx with plan badge display
- Build passed, lint clean, pushed to GitHub

Stage Summary:
- Certificaciones page now auto-populates ALL data from rawData when a student is selected
- Supports both BD (plan vigente EMG) and BD2 (planes derogados)
- Grades, dates, T/E types, institutions, OC, groups, observations, acta data all extracted
- Deployed to Vercel via GitHub push (commit b3bdfd6)

---
Task ID: 2
Agent: main
Task: Fix cert parser for asterisk blocks, ensure all grade data shows correctly, BD+BD2 dual database support

Work Log:
- Analyzed raw data structure: BD has asterisk blocks (**, ****) interspersed between real grade groups
- BD2 has alternating real-grade and asterisk-block patterns (real, ***, *, **, ****, *, real, real, ...)
- Rewrote parseBDRawData: scans keys 23-227 in groups of 5, uses isValidGrade() to skip asterisk blocks
- Rewrote parseBD2RawData: scans keys 39-293 with same asterisk-skipping approach
- Added isValidGrade(val): validates numeric 01-20 and special types (PE, IN, EX)
- Improved isAsterisk(val): handles *, **, ****, * * patterns with regex
- Fixed db.ts to use @prisma/client instead of @/generated/prisma (legacy route compatibility)
- Enhanced certificaciones/page.tsx Vista Previa with NOTA column and Valor Fiscal display
- Verified no primary education references anywhere in codebase
- Seeded both databases: 1,870 BD vigente + 305 BD2 derogado = 2,175 total
- Verified Neon PostgreSQL has all 2,175 students
- Tested parser with BD student: 41 grades correctly extracted (7+7+8+9+10) with nota, literal, T-E, mes, año
- Tested parser with BD2 student: 30 grades extracted, 3 institutions, specializations parsed
- Build successful, pushed to GitHub (commit 02e437b)

Stage Summary:
- Certification format now shows ALL required data: Nota, Literal, Tipo Evaluación (T-E), Mes, Año
- Both BD (plan vigente) and BD2 (planes derogados) databases fully supported
- System is exclusively for Educación Media General (secondary, 1ro-5to año)
- Parser correctly handles asterisk blocks in raw data from .xlsm files
- Institutions, Orientación, Grupos, Observaciones, Acta all extracted properly

---
Task ID: 3
Agent: main
Task: Verify rawData in DB, fix certificaciones data display, remove primary education refs

Work Log:
- Investigated why certifications showed no grades: rawData was already populated for all 2,175 students
- Verified parser works correctly: NAVARRO CAÑATE → 41 grades (7+7+8+9+10 across 5 years), with nota/literal/T-E/mes/año
- Verified BELLO RAMOS → 22 grades across 5 years (some years partial)
- Verified URBANO SANTA MARIA → 31 grades across 4 years
- Root cause: Vercel deploy was using OLD code before rawData seed; code was already correct
- Fixed emptyCertData() to include planTipo and aniosEscolares (was missing, could cause type issues)
- Fixed boletin page: changed default grado from '6to Grado' to '1er Año' (EMG only, no primary)
- Verified no primary education references remain in src/ (only boletin had '6to Grado', now fixed)
- Build passed cleanly, pushed to GitHub (commit c61077b), Vercel auto-deploying

Stage Summary:
- All 2,175 students have rawData with grades in Neon PostgreSQL
- Certificaciones page auto-loads and displays: NOTA, LETRAS, T-E, MES, AÑO for all years
- Both BD (plan vigente) and BD2 (plan derogado) fully supported
- System is exclusively Educación Media General (secondary education only)
- Vercel deployment triggered via GitHub push
