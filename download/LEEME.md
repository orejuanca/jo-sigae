# LOGO FLOTANTE — Paquete COMPLETO (10 archivos)

> **⭐ SOLUCIÓN DEFINITIVA — `reparar-logos-certificaciones.js`** (no requiere tocar la app):
>
> **Por qué EMG 31059 (vigente) imprime el logo y los derogados no**: en EMG 31059 la celda
> del logo está **limpia** — token `##LOGO_CEMG##`, **sin** `dataBinding`, celda visible.
> En los derogados la celda quedó dañada de 1 de 3 formas: **PISADO** (la celda tiene un
> `dataBinding` de la era de "Parchear Bindings" y al renderizar `resolveBinding(...)` **reemplaza
> el token por texto vacío** — cert-view líneas 433-435 y 277), **TAPADO** (otra celda la cubre
> con colspan) o **SIN-LOGO** (el token no existe). El botón "Reparar Derogados" de v4/v5
> **saltaba** cualquier layout que tuviera el token en los datos ("YA TENÍA") → el caso PISADO
> (el más probable) **jamás se reparó**. Ese fue el error.
>
> **Cómo usarlo** (en la carpeta de tu proyecto, con la app corriendo, Node 18+):
> ```
> node reparar-logos-certificaciones.js
> ```
> Diagnostica TODOS los derogados con su estado real (incluye tu caso de prueba
> `cmsj1rx4i0004po90x67iovoj` aunque no aparezca en la lista), repara (limpia bindings pisadores,
> destapa, inserta — y si no hay espacio, agrega una fila arriba igual a la fila 1 de EMG 31059),
> guarda con el mismo PUT del botón Guardar, **verifica re-leyendo por las 2 rutas de la API** e
> imprime los status HTTP crudos. `--diagnostico` = solo lectura. Es idempotente (re-correlo
> las veces que quieras; lo que ya está sano no se toca).
>
> Los archivos .tsx de abajo siguen válidos como capas extra, pero **no son necesarios** para
> recuperar el logo: el script arregla los datos y tu render actual ya pinta un logo limpio.

> **ACTUALIZACIÓN v7 (Doctor del Logo)**: archivo NUEVO `cert-logo-doctor-page.tsx` →
> crea la página `/cert-logo-doctor`. Es un **diagnóstico forense + reparación con
> evidencia** para el caso concreto de la hoja III ETAPA BASICA
> (`?layout=cmsj1rx4i0004po90x67iovoj&plan=derogado`) y para cualquier otro layout.
> No reemplaza ningún archivo anterior: **se AGREGA** (1 carpeta nueva + 1 archivo).
> Abre: `http://localhost:3000/cert-logo-doctor?layout=cmsj1rx4i0004po90x67iovoj&plan=derogado`
>
> **ACTUALIZACIÓN v6 (doble seguro)**: `certificaciones-visual-page.tsx` y `cert-view-page.tsx`
> traen **GARANTÍA VISUAL**: si una certificación del plan derogado no tiene un
> `##LOGO_CEMG##` **visible** (falta o está tapado por una celda combinada), el logo del
> ministerio se pinta automáticamente en **pantalla e impresión** como overlay (el mismo
> mecanismo probado del membrete). Además la reparación masiva ahora (a) solo salta un
> layout si su logo es realmente VISIBLE, (b) manda el PUT con `meta.plan` igual que el
> botón Guardar y (c) **verifica cada guardado re-leyendo la BD** (estado nuevo NO PERSISTIÓ
> si la API acepta pero no guarda). **Reemplaza esos 2 archivos**; el resto no cambió.
>
> **ACTUALIZACIÓN v5 (verificación de posiciones)**: el modal de **Reparar Derogados** ahora
> tiene 2 modos: **Iniciar reparación** (repara, guarda y copia el ancho combinado de la
> referencia) y **Verificar posiciones** (auditoría solo lectura que compara el logo de cada
> certificación derogada contra la referencia vigente).
>
> **ACTUALIZACIÓN v4 (reparación masiva)**: `certificaciones-visual-page.tsx` trae el botón
> **Reparar Derogados** — repara TODAS las certificaciones del plan derogado de una sola vez
> (escanea la BD, re-inserta `##LOGO_CEMG##` donde falte y guarda). **Solo reemplaza ese 1 archivo**;
> el resto del paquete no cambió.
>
> **ACTUALIZACIÓN v3 (logo del ministerio)**: `certificaciones-visual-page.tsx` y
> `cert-view-page.tsx` traen el botón **Restaurar Logo** + protección del token
> `##LOGO_CEMG##` al imprimir. Si ya tenías el paquete v2 instalado, **solo reemplaza
> esos 2 archivos** — los demás no cambiaron.

## Qué hay en esta carpeta

| Archivo | Qué es |
|---|---|
| `types.ts` | Tu types.ts **COMPLETO ya modificado**: interfaz `LogoOverlay` + campo `logoOverlay` en `GridConfig` |
| `logo-overlay.tsx` | Componente NUEVO compartido (preview + impresión). Ya incluye el fix `z-index:-1` |
| `dashboard-content.tsx` | Tu archivo **COMPLETO ya modificado**: error de build arreglado + logo flotante integrado (14 cambios) |
| `constancias-page.tsx` | Tu `constancias/page.tsx` **COMPLETO ya arreglado**: fix del bug `dash.loaded` que rompía el build |
| `validar-page.tsx` | Tu `validar/page.tsx` **COMPLETO ya modificado**: logo membrete (detrás del texto) en pantalla e impresión. Cubre Validar Notas + ANTI |
| `validar-titulo-page.tsx` | Tu `validar-titulo/page.tsx` **COMPLETO ya modificado**: logo membrete + fix de una llave `}` extra que tenía el CSS de impresión |
| `cert-view-page.tsx` | Tu `cert-view/page.tsx` **COMPLETO ya modificado**: logo membrete (Constancia de Notas) + fix del regex de fechas + protección del token de logo al imprimir |
| `certificaciones-visual-page.tsx` | Tu `certificaciones-visual/page.tsx` **COMPLETO ya modificado**: botón **Logo** (membrete flotante) + botón **Restaurar Logo** (##LOGO_CEMG## del ministerio) + botón **Reparar Derogados** (reparación masiva) + protección del token al imprimir |
| `cert-logo-doctor-page.tsx` | **NUEVO v7** — página `/cert-logo-doctor`: diagnostica el logo de un layout mirando los datos REALES de la BD (tokens, archivos 200/404, listas de cada plan, las 2 rutas de la API) y repara con evidencia |
| `LEEME.md` | Este archivo |

## Instalación (8 pasos — reemplaza archivos ENTEROS, cero buscar/reemplazar)

1. **Copia el logo**: verifica que exista `public/Imagen2.png` (carpeta `public` de la raíz).

2. **Tipos**: `types.ts` → sobre `src/components/cert-visual/types.ts`.

3. **Componente nuevo**: `logo-overlay.tsx` → `src/components/cert-visual/logo-overlay.tsx`.

4. **Dashboard**: `dashboard-content.tsx` → sobre `src/components/dashboard-content.tsx`.

5. **Páginas**: `constancias-page.tsx` → `constancias/page.tsx`, `validar-page.tsx` → `validar/page.tsx`,
   `validar-titulo-page.tsx` → `validar-titulo/page.tsx`, `cert-view-page.tsx` → `cert-view/page.tsx`,
   `certificaciones-visual-page.tsx` → `certificaciones-visual/page.tsx`.

6. **Borra el componente viejo**: elimina `src/components/logo-flotante.tsx` (no queda ninguna referencia).

7. **Compila**: `npm run build` → tiene que terminar en verde.

8. **Prueba las 6 vistas**: editor de formatos (configura el logo en un layout y Guárdalo),
   Validar Notas (+ANTI), Validar Título, Constancia de Notas, dashboard vigente, dashboard derogado.

## Cómo funciona (resumen)

- El logo se configura **en el Editor de Formatos** (botón fucsia "Logo" en la toolbar) y se guarda
  DENTRO de cada layout (`GridConfig.datos.logoOverlay`). Cada layout tiene el suyo — los que no
  lo configuran siguen igual, sin logo.
- En las vistas de documento (Validar Notas, Validar Título, Constancia de Notas) el logo va
  **detrás del texto** (membrete) tanto en pantalla como al imprimir.
- En el editor: en modo diseño se ve **encima** (para configurarlo bien); en "Vista Previa" se ve
  **detrás del texto**, exactamente como va a imprimir.
- En los dashboards el logo va **encima** de las celdas (z=25), se configura en el editor de
  dashboards y cada plan (vigente/derogado) tiene el suyo independiente.

## Botón "Restaurar Logo" (logo del ministerio en la grilla)

Los layouts traen el logo oficial del MPPE como un **token dentro de una celda**:
`##LOGO_CEMG##` (se renderiza como `/logo-cemg.png`). Si un layout perdió ese token
(como pasó con las certificaciones del plan derogado), se recupera en 4 pasos:

1. Abre el layout dañado en el **Editor de Formatos** (plan derogado → Abrir).
2. Haz clic en la celda de la esquina donde iba el logo (arriba a la izquierda).
   Si la celda perdió la combinación, selecciona el rango y pulsa **COMBINAR > Selección** primero.
3. Pulsa el botón esmeralda **Restaurar Logo** (al lado del botón fucsia Logo).
   Inserta `##LOGO_CEMG##` en esa celda, le quita cualquier data binding y la centra.
4. Pulsa **Guardar**. Listo — el logo queda renderizado en pantalla e impresión,
   igual que en el layout EMG 31059.

Sin celda seleccionada, el botón **diagnostica** el layout: te dice si ya tiene un token
`##LOGO_...` y en qué fila/columna está, o te pide seleccionar la celda destino.

Además, ambos archivos traen un **fix de impresión**: si una celda de logo tiene un
`dataBinding` que resuelve vacío, el token ya NO se pisa (antes el logo desaparecía
al imprimir aunque se viera en pantalla).

## Botón "Reparar Derogados" (reparación masiva — v4, mejorada en v6)

Como el daño estaba **solo en las certificaciones del plan derogado**, este botón
(color teal, al lado de Restaurar Logo) las repara **todas de una sola vez**:

1. Abre el **Editor de Formatos** (con cualquier plan; el botón siempre apunta al derogado).
2. Pulsa **Reparar Derogados** → se abre el modal de reparación.
3. Pulsa **Iniciar reparación**. El editor:
   - Lista todas las certificaciones del plan derogado en la BD.
   - Toma la **posición del logo visible de una certificación vigente intacta** (ej. EMG 31059)
     como referencia.
   - En cada layout **sin logo VISIBLE** (le falte el token, tenga otro token `##LOGO_...##`
     distinto, o su token esté **tapado** por una celda combinada): inserta `##LOGO_CEMG##`
     en esa posición (o en el primer espacio libre visible de la zona superior), limpia su
     data binding, la centra, copia el ancho combinado de la referencia y — si había un
     token tapado — lo reubica y limpia el viejo.
   - **Guarda y VERIFICA**: tras cada PUT re-lee el layout de la BD y comprueba que el logo
     quedó persistido de verdad.
4. Al terminar ves un **reporte por layout**:
   - **REPARADO** (verde): insertado y **verificado re-leyendo la BD**.
   - **YA TENÍA** (gris): ya tenía un logo visible — no se tocó.
   - **MANUAL** (ámbar): sin celda libre visible arriba; ese único layout se arregla con
     **Restaurar Logo** (celda seleccionada).
   - **NO PERSISTIÓ** (rojo): la API respondió OK pero al re-leer el logo NO aparece — el
     problema es del backend (no de los layouts). Aun así, la **garantía visual** pinta el
     logo en ese layout al previsualizar e imprimir.
   - **ERROR** (rojo): no se pudo cargar o la BD rechazó el guardado.

No toca los layouts con logo visible, no borra nada (solo añade el token y limpia tokens
muertos) y conserva el nombre, la escala de impresión y los demás datos de cada layout.

### Por qué "el problema persistía" con v4/v5 (y cómo lo ataca v6)

- **Bug del salto**: antes bastaba CUALQUIER token `##LOGO_...##` para marcar un layout como
  "YA TENÍA" y no tocarlo. Si el layout tenía otro token (o su `##LOGO_CEMG##` estaba tapado
  por una combinación de celdas), quedaba sin reparar aunque el logo no se viera.
- **Tokens tapados**: un token dentro de una celda cubierta por un `colspan`/`rowspan`
  **existe en los datos pero el render jamás lo pinta** — por eso había layouts que "tenían"
  el logo y no se veía. v6 los detecta (estado TAPADO), los limpia y lo reubica.
- **Guardados fantasma**: si la API acepta el PUT pero no persiste, antes era indetectable.
  Ahora cada guardado se verifica re-leyendo la BD (NO PERSISTIÓ).
- **Y si nada de eso alcanza**: la garantía visual pinta el logo igual (ver sección siguiente),
  así que ninguna certificación derogada vuelve a salir sin el logo del ministerio.

## Garantía visual del logo (v6) — pantalla e impresión

En **ambos archivos** (`certificaciones-visual-page.tsx` y `cert-view-page.tsx`):

- Cuando el plan es **derogado** y el layout cargado no tiene un `##LOGO_CEMG##` **visible**,
  se pinta automáticamente `/logo-cemg.png` como **overlay flotante** (arriba a la izquierda,
  mismo mecanismo del membrete) en la **Vista Previa** y en la **impresión**.
- En el editor también se ve en modo diseño (encima, para que sepas que está activo).
- Si el layout tiene su logo en la grilla (visible), **nada cambia** — el overlay no aparece.
- Si el plan es **vigente**, el overlay nunca aparece (ese plan está intacto).
- Además, cert-view trae ahora el mismo fix de anti-pisado **en pantalla** que ya tenía en
  impresión: una celda de logo con dataBinding que resuelve vacío ya no tapa el token.

Con esto, aunque la BD no coopere (API que no guarda, layouts dañados, lo que sea), la
**certificación impresa siempre lleva el logo del ministerio**.

> **Importante**: verifica que exista `public/logo-cemg.png` (es el mismo archivo que usa
> EMG 31059 — si ese layout imprime su logo, el archivo ya está).

### Verificar posiciones (auditoría — v5)

En el mismo modal, el botón **Verificar posiciones (sin guardar nada)** es una auditoría
**de solo lectura**: NO modifica la BD, solo compara. Contrasta la fila, la columna y el
ancho combinado del logo de cada certificación derogada contra la referencia (el logo
de una certificación vigente intacta, ej. EMG 31059) y clasifica cada layout:

- **COINCIDE** (verde): misma fila, columna y ancho que la referencia. Nada que hacer.
- **POSICIÓN** (azul): misma celda, pero la referencia combina más columnas (su logo es
  más ancho). Si se ve chico: selecciona la celda del logo + **COMBINAR > Selección**.
- **DIFIERE** (ámbar): el logo quedó en otra celda (o no hay referencia vigente con logo).
  Para moverlo: selecciona la celda destino + botón esmeralda **Restaurar Logo** + Guardar.
- **TAPADO** (naranja): el token EXISTE pero está cubierto por una celda combinada — por
  eso no se ve ni se imprime. La reparación masiva lo reubica.
- **SIN LOGO** (rojo): falta el token — ejecuta la reparación masiva.
- **ERROR** (rojo): no se pudo leer el layout de la BD.

Puedes verificar **antes** de reparar (para ver el alcance del daño), **después** de
reparar (para confirmar) y **después** de mover un logo a mano (para re-auditar).

Flujo recomendado: Reparar Derogados → Iniciar reparación → Cerrar → Reparar
Derogados → Verificar posiciones → revisar que todo diga COINCIDE.

## Doctor del Logo (v7) — `/cert-logo-doctor`

Las versiones anteriores reparaban **a ciegas**: insertaban un token suponiendo cómo
estaban los datos. El Doctor hace lo contrario: **primero mira los datos reales**, te
muestra exactamente dónde se rompe la cadena del logo y después repara sabiendo la verdad.

### Instalación (1 solo paso)

1. Crea la carpeta `src/app/cert-logo-doctor/` y guarda ahí el archivo como `page.tsx`
   (no reemplaza nada de lo que ya tienes instalado).

### Uso

1. Abre `http://localhost:3000/cert-logo-doctor?layout=cmsj1rx4i0004po90x67iovoj&plan=derogado`
   (o pega cualquier otro ID y pulsa **Diagnosticar**). El diagnóstico es **solo lectura**.
2. Verás el **VEREDICTO** y la lista de **hallazgos**. Cada uno responde a una causa real:
   - **Layout FUERA de la lista del plan derogado**: la reparación masiva anterior itera esa
     lista; si este layout no está en ella (huérfano), **jamás fue tocado** — esa es la
     explicación más probable de que el problema "persista" justo en este layout.
   - **Las dos rutas de la API devuelven datos distintos**: cert-view lee por `?id=` y la
     reparación antigua re-leía por `/{id}`; si no coinciden, un guardado puede no verse.
   - **Token perfecto pero archivo 404**: si `/logo-cemg.png` no existe en `public/`, el
     `<img>` queda roto y el logo NO se ve aunque el token esté — ningún cambio de BD lo
     arregla; hay que copiar el PNG. El Doctor lo dice y no intenta reparar en vano.
   - **Token TAPADO** por una celda combinada, **dataBinding pisador**, **sin token**,
     **referencia**: qué certificación vigente muestra el logo, con qué token y qué archivo.
3. Pulsa **Reparar este layout** (va directo por ID, aunque sea huérfano) o
   **Reparar todos los derogados** (la lista + el huérfano actual). Cada operación queda en
   el **registro** con su resultado verificado re-leyendo la BD por AMBAS rutas.
4. Vuelve a abrir el layout en `cert-view` (se recarga al ganar el foco) y confirma.

La reparación usa el **token de la referencia** (el mismo de la certificación vigente que
sí muestra logo) y el mismo cuerpo de guardado que el botón Guardar del editor; si el
PUT falla, el registro muestra el **status y la respuesta exacta de la API**.

## El dashboard-content.tsx nuevo

- ✅ Fix del error de build (contenedor del sheet sin cerrar + `</div>` huérfano en el modal).
- ✅ Logo flotante **por plan** (vigente y derogado independientes).
- ✅ Botón "Logo" en la toolbar de diseño (fucsia; brillante cuando hay logo activo).
- ✅ Autoguardado a BD + localStorage, y viaja por BroadcastChannel.
- ✅ "Restaurar" también borra el logo.

**Nota**: el botón "Logo" del dashboard solo aparece en modo diseño (`designLocked = false`).
En los dashboards normales el logo se VE y se IMPRIME, pero no se configura.
