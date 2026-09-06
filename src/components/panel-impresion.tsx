'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

// ==================== PANEL DE IMPRESION (WYSIWYG) ====================
// Un solo panel para imprimir los formatos (Resumen Final, Certificaciones,
// y los layouts del editor de formatos) con TODOS los parametros ajustables.
// La vista previa y la impresion salen del MISMO documento (un iframe con
// @page, margenes y escala): lo que se ve en el panel es EXACTAMENTE lo que
// sale por la impresora.
//
//   - Papel: FLSA/Folio/Oficio 8.5x13 (el del plantel), Carta, Legal, A4 o
//     personalizado (ancho y alto en cm).
//   - Margen: 0 por defecto (el formato pegado a los bordes, igual que el
//     Excel original) o el valor que se quiera, en mm.
//   - Escala: Automatica (reduce solo lo necesario para que todo el formato
//     quepa en UNA hoja, sin deformarlo) o porcentaje manual.
//   - La hoja impresa NUNCA se parte en 2: si el contenido no cabe a la
//     escala elegida, el panel lo avisa ANTES de imprimir (lo que sobre se
//     recorta, igual que en el Excel).
//   - Los parametros se recuerdan por modulo (localStorage).

export type Papel = { key: string; label: string; wIn: number; hIn: number };

export const PAPELES: Papel[] = [
  { key: 'flsa', label: 'FLSA / Folio / Oficio (8.5 x 13")', wIn: 8.5, hIn: 13 },
  { key: 'carta', label: 'Carta (8.5 x 11")', wIn: 8.5, hIn: 11 },
  { key: 'legal', label: 'Legal (8.5 x 14")', wIn: 8.5, hIn: 14 },
  { key: 'a4', label: 'A4 (21 x 29.7 cm)', wIn: 8.27, hIn: 11.69 },
  { key: 'custom', label: 'Personalizado...', wIn: 8.5, hIn: 13 },
];

export type ParamsImpresion = {
  papelKey: string;
  customWcm: number;
  customHcm: number;
  margenMm: number;
  escalaAuto: boolean;
  escalaPct: number;
};

const DEFAULTS: ParamsImpresion = {
  papelKey: 'flsa',
  customWcm: 21.59,
  customHcm: 33.02,
  margenMm: 0,
  escalaAuto: true,
  escalaPct: 100,
};

type Props = {
  open: boolean;
  onClose: () => void;
  titulo: string;
  /** HTML del formato (tabla o divs con estilos inline), SIN <html>/<body> */
  getContenidoHtml: () => string;
  /** CSS extra que el contenido necesita (p.ej. reglas de la tabla del editor) */
  contenidoCss?: string;
  /** Gancho para ajustar el documento del iframe antes de medir (p.ej. auto-fit de texto) */
  ajustarDoc?: (doc: Document) => void;
  /** Papel inicial (p.ej. el seleccionado en la barra del editor) */
  papelInicial?: string;
  /** Escala inicial en % si el layout trae una escala guardada */
  escalaInicialPct?: number;
  /** Clave para recordar los parametros por modulo */
  persistKey: string;
};

export default function PanelImpresion({
  open,
  onClose,
  titulo,
  getContenidoHtml,
  contenidoCss = '',
  ajustarDoc,
  papelInicial,
  escalaInicialPct,
  persistKey,
}: Props) {
  const [params, setParams] = useState<ParamsImpresion>(DEFAULTS);
  const [html, setHtml] = useState('');
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [zoomPct, setZoomPct] = useState(55);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const visorRef = useRef<HTMLDivElement | null>(null);
  const paramsRef = useRef(params);
  paramsRef.current = params;

  // Cargar parametros guardados + contenido al abrir el panel
  useEffect(() => {
    if (!open) return;
    let p: ParamsImpresion = { ...DEFAULTS };
    try {
      const raw = localStorage.getItem(`jo-print-panel:${persistKey}`);
      if (raw) p = { ...p, ...JSON.parse(raw) };
    } catch { /* sin parametros guardados, se usan los de fabrica */ }
    if (papelInicial && PAPELES.some(x => x.key === papelInicial)) p.papelKey = papelInicial;
    if (escalaInicialPct && escalaInicialPct > 0 && escalaInicialPct !== 100) {
      p.escalaAuto = false;
      p.escalaPct = escalaInicialPct;
    }
    setParams(p);
    setNatural(null);
    setMensaje(null);
    setHtml(getContenidoHtml());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, persistKey]);

  // Guardar parametros cada vez que cambian (con el panel abierto)
  useEffect(() => {
    if (!open) return;
    try { localStorage.setItem(`jo-print-panel:${persistKey}`, JSON.stringify(params)); } catch { /* sin storage */ }
  }, [params, open, persistKey]);

  const papel = useMemo(() => {
    const base = PAPELES.find(x => x.key === params.papelKey) || PAPELES[0];
    if (params.papelKey === 'custom') {
      return { key: 'custom', label: 'Personalizado', wIn: params.customWcm / 2.54, hIn: params.customHcm / 2.54 };
    }
    return base;
  }, [params.papelKey, params.customWcm, params.customHcm]);

  // Escala: automatica = la mayor que cabe completa en 1 hoja (sin deformar, sin agrandar)
  const escala = useMemo(() => {
    if (!natural) return (params.escalaAuto ? 1 : params.escalaPct / 100);
    const m = params.margenMm / 25.4;
    const dispW = Math.max(1, (papel.wIn - 2 * m) * 96);
    const dispH = Math.max(1, (papel.hIn - 2 * m) * 96);
    if (params.escalaAuto) {
      const s = Math.min(dispW / natural.w, dispH / natural.h);
      return Math.max(0.1, Math.min(1, s));
    }
    return Math.max(0.1, Math.min(4, params.escalaPct / 100));
  }, [natural, params.escalaAuto, params.escalaPct, params.margenMm, papel]);

  const cabeEnUnaHoja = useMemo(() => {
    if (!natural) return true;
    const m = params.margenMm / 25.4;
    const dispW = Math.max(1, (papel.wIn - 2 * m) * 96);
    const dispH = Math.max(1, (papel.hIn - 2 * m) * 96);
    return natural.w * escala <= dispW + 1 && natural.h * escala <= dispH + 1;
  }, [natural, escala, params.margenMm, papel]);

  // Documento unico para la vista previa Y la impresion
  const docHtml = useMemo(() => {
    if (!html) return '';
    const pw = Math.round(papel.wIn * 96);
    const ph = Math.round(papel.hIn * 96);
    const mIn = (params.margenMm / 25.4).toFixed(4);
    const wIn = papel.wIn.toFixed(4);
    const hIn = papel.hIn.toFixed(4);
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${titulo.replace(/[<>&]/g, '')}</title><style>
@page { size: ${wIn}in ${hIn}in; margin: ${mIn}in; }
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body { margin: 0; padding: 0; }
body { padding: 8px; background: #8d949e; }
#hoja { position: relative; width: ${pw}px; height: ${ph}px; background: #fff; overflow: hidden; margin: 0 auto; box-shadow: 0 2px 10px rgba(0,0,0,.45); }
#contenido { transform-origin: top left; }
${contenidoCss}
@media print {
  body { padding: 0; background: #fff; }
  #hoja { margin: 0; box-shadow: none; width: calc(${pw}px - 2px); height: calc(${ph}px - 2px); }
  * { -webkit-print-color-adjust: exact; print-color-adjust: exact; color-adjust: exact; }
}
</style></head><body><div id="hoja"><div id="contenido" style="transform: scale(${escala});">${html}</div></div></body></html>`;
  }, [html, papel, params.margenMm, escala, contenidoCss, titulo]);

  // Medir el contenido natural (sin escala) cuando el iframe termina de cargar
  const alCargarIframe = useCallback(() => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc) return;
    try { ajustarDoc?.(doc); } catch { /* el ajuste opcional fallo; se mide igual */ }
    const c = doc.getElementById('contenido');
    if (!c) return;
    const rect = c.getBoundingClientRect();
    const s = parseFloat(c.style.transform.replace(/[^\d.]/g, '')) || 1;
    if (rect.width > 0 && rect.height > 0) {
      setNatural({ w: rect.width / s, h: rect.height / s });
    }
    const imgs = doc.querySelectorAll('img');
    if (imgs.length > 0) {
      let pend = 0;
      const done = () => { pend++; if (pend >= imgs.length) reMedir(); };
      const reMedir = () => {
        const cc = doc.getElementById('contenido');
        if (!cc) return;
        const r = cc.getBoundingClientRect();
        const ss = parseFloat(cc.style.transform.replace(/[^\d.]/g, '')) || 1;
        if (r.width > 0 && r.height > 0) setNatural({ w: r.width / ss, h: r.height / ss });
      };
      imgs.forEach(img => { if (img.complete) done(); else { img.onload = done; img.onerror = done; } });
    }
  }, [ajustarDoc]);

  // Zoom inicial: que la hoja quepa completa en el visor
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => {
      const v = visorRef.current;
      if (!v) return;
      const pw = papel.wIn * 96 + 16;
      const ph = papel.hIn * 96 + 16;
      const z = Math.min(1, (v.clientWidth - 30) / pw, (v.clientHeight - 30) / ph);
      if (z > 0.05) setZoomPct(Math.round(z * 100));
    }, 50);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, params.papelKey, params.customWcm, params.customHcm]);

  const imprimir = () => {
    const w = iframeRef.current?.contentWindow;
    if (!w || !html) return;
    if (!cabeEnUnaHoja) {
      setMensaje('El contenido NO cabe completo a esta escala: lo que sobre se RECORTARIA. Baja la escala, cambia el papel o usa la escala automatica.');
      return;
    }
    setMensaje(null);
    w.focus();
    w.print();
  };

  if (!open) return null;

  const pw = Math.round(papel.wIn * 96);
  const ph = Math.round(papel.hIn * 96);
  const z = zoomPct / 100;

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-2" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-2xl w-[min(1150px,97vw)] h-[94vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Cabecera */}
        <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b bg-slate-50">
          <h2 className="text-sm font-bold text-slate-800 truncate">
            VISTA PREVIA DE IMPRESION — {titulo}
          </h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-800 text-xl leading-none px-2" title="Cerrar">×</button>
        </div>

        <div className="flex-1 flex min-h-0">
          {/* ==== Parametros (todos ajustables) ==== */}
          <div className="w-[270px] shrink-0 border-r overflow-y-auto p-3 space-y-4 bg-slate-50/60">
            <div>
              <p className="text-[11px] font-bold text-slate-500 mb-1">PAPEL</p>
              <select
                data-testid="panel-papel"
                value={params.papelKey}
                onChange={e => { setParams(p => ({ ...p, papelKey: e.target.value })); setNatural(null); }}
                className="w-full border rounded px-2 py-1.5 text-sm bg-white"
              >
                {PAPELES.map(x => <option key={x.key} value={x.key}>{x.label}</option>)}
              </select>
              {params.papelKey === 'custom' && (
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <label className="text-xs text-slate-600">Ancho (cm)
                    <input type="number" min={5} max={60} step={0.1} value={params.customWcm}
                      onChange={e => { setParams(p => ({ ...p, customWcm: Number(e.target.value) || 21.59 })); setNatural(null); }}
                      className="mt-1 w-full border rounded px-2 py-1 text-sm" />
                  </label>
                  <label className="text-xs text-slate-600">Alto (cm)
                    <input type="number" min={5} max={80} step={0.1} value={params.customHcm}
                      onChange={e => { setParams(p => ({ ...p, customHcm: Number(e.target.value) || 33.02 })); setNatural(null); }}
                      className="mt-1 w-full border rounded px-2 py-1 text-sm" />
                  </label>
                </div>
              )}
              <p className="text-[11px] text-slate-500 mt-1">
                {papel.wIn.toFixed(2)}" x {papel.hIn.toFixed(2)}" ({(papel.wIn * 25.4).toFixed(0)} x {(papel.hIn * 25.4).toFixed(0)} mm)
              </p>
            </div>

            <div>
              <p className="text-[11px] font-bold text-slate-500 mb-1">MARGEN (mm)</p>
              <input data-testid="panel-margen" type="number" min={0} max={40} step={1} value={params.margenMm}
                onChange={e => setParams(p => ({ ...p, margenMm: Math.max(0, Number(e.target.value) || 0) }))}
                className="w-full border rounded px-2 py-1.5 text-sm" />
              <p className="text-[11px] text-slate-500 mt-1">0 = el formato pegado a los bordes (igual que el Excel).</p>
            </div>

            <div>
              <p className="text-[11px] font-bold text-slate-500 mb-1">ESCALA</p>
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" checked={params.escalaAuto} onChange={() => setParams(p => ({ ...p, escalaAuto: true }))} />
                Automatica (cabe en 1 hoja)
              </label>
              <label className="flex items-center gap-2 text-sm mt-1">
                <input type="radio" checked={!params.escalaAuto} onChange={() => setParams(p => ({ ...p, escalaAuto: false }))} />
                Personalizada:
                <input type="number" min={10} max={400} step={1} value={params.escalaPct}
                  disabled={params.escalaAuto}
                  onChange={e => setParams(p => ({ ...p, escalaPct: Math.max(5, Number(e.target.value) || 100) }))}
                  className="w-16 border rounded px-1.5 py-1 text-sm disabled:bg-slate-100" />
                %
              </label>
              <p className="text-[11px] text-slate-500 mt-1">
                Escala actual: <b>{Math.round(escala * 100)}%</b>{params.escalaAuto ? ' (automatica)' : ''}
              </p>
            </div>

            <div className={`rounded border px-2.5 py-2 text-xs font-semibold ${natural === null ? 'bg-slate-100 text-slate-600 border-slate-200' : cabeEnUnaHoja ? 'bg-green-50 text-green-800 border-green-300' : 'bg-red-50 text-red-800 border-red-300'}`}>
              {natural === null
                ? 'Midiendo el formato...'
                : cabeEnUnaHoja
                  ? `Cabe en 1 hoja ${papel.label.includes('FLSA') ? 'FLSA' : ''} a ${Math.round(escala * 100)}%`
                  : `NO cabe a ${Math.round(escala * 100)}%: se recortaria. Usa la escala automatica o cambia el papel.`}
            </div>

            <div className="border-t pt-3">
              <button
                onClick={imprimir}
                disabled={!html || (natural !== null && !cabeEnUnaHoja)}
                className="w-full px-3 py-2 bg-blue-700 text-white text-sm font-bold rounded hover:bg-blue-600 disabled:opacity-40"
              >
                IMPRIMIR
              </button>
              <button
                onClick={onClose}
                className="w-full mt-2 px-3 py-1.5 bg-slate-200 text-slate-800 text-sm font-semibold rounded hover:bg-slate-300"
              >
                Cerrar
              </button>
            </div>

            <div className="border-t pt-3 text-[11px] text-slate-500 leading-relaxed">
              <p className="font-semibold text-slate-600 mb-1">En el dialogo del navegador:</p>
              <p>1) Papel: el mismo que aqui (FLSA / Folio / Oficio 8.5x13).</p>
              <p>2) Margenes: <b>Ninguno</b>.</p>
              <p>3) Escala: <b>100</b> o <b>Predeterminada</b>.</p>
              <p className="mt-1">Para un PDF exacto elige destino <b>Guardar como PDF</b>: respeta el papel 8.5x13 de este panel.</p>
            </div>
          </div>

          {/* ==== Visor WYSIWYG (mismo documento que se imprime) ==== */}
          <div className="flex-1 flex flex-col min-w-0">
            <div className="flex items-center gap-2 px-3 py-1.5 border-b bg-white text-xs text-slate-600">
              <span className="font-semibold">ZOOM</span>
              <button onClick={() => setZoomPct(v => Math.max(10, v - 10))} className="px-2 py-0.5 border rounded hover:bg-slate-100">−</button>
              <span className="w-10 text-center font-semibold">{zoomPct}%</span>
              <button onClick={() => setZoomPct(v => Math.min(200, v + 10))} className="px-2 py-0.5 border rounded hover:bg-slate-100">+</button>
              <button
                onClick={() => {
                  const v = visorRef.current; if (!v) return;
                  const zz = Math.min(1, (v.clientWidth - 30) / (pw + 16), (v.clientHeight - 30) / (ph + 16));
                  setZoomPct(Math.round(zz * 100));
                }}
                className="px-2 py-0.5 border rounded hover:bg-slate-100"
              >Ajustar</button>
              <span className="ml-auto text-slate-400">Esto es exactamente lo que sale impreso</span>
            </div>
            {mensaje && (
              <p className="mx-3 mt-2 text-xs text-amber-900 bg-amber-50 border border-amber-300 rounded px-2.5 py-1.5">{mensaje}</p>
            )}
            <div ref={visorRef} className="flex-1 min-h-0 overflow-auto p-4 flex justify-center">
              {html ? (
                <div style={{ width: (pw + 16) * z, height: (ph + 16) * z }}>
                  <iframe
                    ref={iframeRef}
                    title="vista-previa-impresion"
                    srcDoc={docHtml}
                    onLoad={alCargarIframe}
                    style={{
                      width: pw + 16,
                      height: ph + 16,
                      border: 'none',
                      transform: `scale(${z})`,
                      transformOrigin: 'top left',
                      background: '#8d949e',
                    }}
                  />
                </div>
              ) : (
                <p className="text-sm text-slate-500 mt-10">No hay contenido para imprimir.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
