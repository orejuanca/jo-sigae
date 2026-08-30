'use client'
import type { LogoOverlay } from './types'

// Componente para PREVIEW en pantalla (React).
// z = z-index: 25 = encima de las celdas (editor/dashboards), -1 = detrás del texto (membrete)
export function OverlayImg({ overlay, z = 0 }: { overlay: LogoOverlay; z?: number }) {
  const m = overlay.margin ?? 8
  const pos: React.CSSProperties =
    overlay.position === 'top-right' ? { top: m, right: m } :
    overlay.position === 'bottom-left' ? { bottom: m, left: m } :
    overlay.position === 'bottom-right' ? { bottom: m, right: m } :
    overlay.position === 'center' ? { top: '50%', left: '50%', transform: 'translate(-50%,-50%)' } :
    { top: m, left: m }
  return (
    <img
      src={`/${overlay.name}`}
      alt=""
      style={{
        position: 'absolute',
        width: `${overlay.size ?? 15}%`,
        opacity: overlay.opacity ?? 1,
        objectFit: 'contain',
        pointerEvents: 'none',
        zIndex: z,
        ...pos,
      }}
    />
  )
}

// HTML para IMPRESIÓN (se inyecta en el iframe antes del <table>).
// z-index:-1 = membrete DETRÁS del texto. Conversión px → mm para el margen.
export function overlayPrintHtml(o: LogoOverlay): string {
  const mm = ((o.margin ?? 8) * 25.4 / 96).toFixed(1) + 'mm'
  const pos =
    o.position === 'top-right' ? `top:${mm};right:${mm};` :
    o.position === 'bottom-left' ? `bottom:${mm};left:${mm};` :
    o.position === 'bottom-right' ? `bottom:${mm};right:${mm};` :
    o.position === 'center' ? `top:50%;left:50%;transform:translate(-50%,-50%);` :
    `top:${mm};left:${mm};`
  return `<img src="/${o.name}" style="position:absolute;${pos}width:${o.size ?? 15}%;opacity:${o.opacity ?? 1};object-fit:contain;pointer-events:none;z-index:-1;">`
}
