# JO-SIGAE — Mejoras Responsive (Móvil) 📱

Mejoras para que el sistema se vea y funcione bien en teléfonos, **sin tocar
ninguna lógica**: no se modificaron APIs, base de datos, Prisma, autenticación
ni impresión. Solo estilos (CSS/Tailwind) y un componente nuevo de escalado.

## 📦 Qué hay en esta entrega

| Archivo | Contenido |
|---------|-----------|
| `jo-sigae-responsive.patch` | Patch de git con TODOS los cambios (recomendado) |
| `jo-sigae-responsive-archivos.zip` | Los 14 archivos modificados por si prefieres copiarlos a mano |
| `shots/` | Capturas de verificación (móvil 390px y escritorio 1366px) |

## 🚀 Cómo aplicar (opción A — patch, recomendado)

```bash
# 1. Entra a tu proyecto y crea un branch de prueba
cd jo-sigae
git checkout -b mejora-responsive

# 2. Aplica el patch
git apply jo-sigae-responsive.patch

# 3. Arranca tu app como siempre y prueba en el móvil
pnpm dev
```

Si algo no te gusta, vuelves atrás con:
```bash
git checkout main   # (o tu branch habitual)
```

## 📋 Cómo aplicar (opción B — copiar archivos)

Descomprime `jo-sigae-responsive-archivos.zip` sobre la raíz de tu proyecto
(reemplaza los archivos existentes). Son solo archivos de `src/`.

## 📁 Archivos incluidos (14)

- `src/components/scaled-document.tsx` — **NUEVO**: escala certificados de ancho fijo tipo "visor PDF"
- `src/app/layout.tsx` — viewport explícito (permite pinch-zoom)
- `src/app/globals.css` — evita auto-zoom de iOS en inputs, quita destello táctil, anula escala al imprimir
- `src/components/app-shell.tsx` — botones del menú móvil con área táctil de 44px + feedback al tocar
- `src/app/cert-view/page.tsx` — certificado escalado en móvil (escritorio idéntico)
- `src/app/validar/page.tsx` — ídem
- `src/app/validar-titulo/page.tsx` — ídem
- `src/app/certificaciones-visual/page.tsx` — grilla escalada + panel de propiedades se apila debajo en móvil
- `src/app/boletin/page.tsx` — formulario en 1 columna en móvil, botones apilados
- `src/app/titulos/page.tsx` — firmas con espaciado adaptado
- `src/app/alumnos/page.tsx` — formulario de alumno en 1 columna en móvil
- `src/app/boletas/page.tsx` — filtros full-width en móvil
- `src/app/boletin-calificaciones/page.tsx` — ídem
- `src/app/centros-escolares/page.tsx` — barra de búsqueda no se corta
- Además: títulos de página (`h1`) ahora usan `text-white` — antes eran invisibles
  (texto oscuro sobre fondo oscuro), tanto en móvil como en escritorio.

## ✅ Verificado en navegador

- Móvil 390×844: login, menú, dashboard, certificados con datos, alumnos,
  boletín, boletas, centros escolares, editor de grilla — todo usable.
- Escritorio 1366×900: certificados SIN escala (idéntico a antes), nav
  horizontal normal — cero regresiones.
- Compilación: todas las rutas compilan sin errores.

## ⚠️ Notas

1. **La planilla del dashboard (tipo Excel) sigue con scroll horizontal en
   móvil** — es lo esperado; es una herramienta de escritorio.
2. **`/titulos-lista` da 404**: el menú tiene un botón "TITULOS" apuntando a
   esa ruta, pero la página no existe en el repo. Es preexistente, no relacionado
   con estos cambios.
3. **Impresión**: la salida de impresión no cambia (el escalado se anula en
   `@media print` y la impresión de certificados usa un iframe aparte, como ya
   lo hacías).
