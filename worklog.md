
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
