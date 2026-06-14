import { type ReactNode } from 'react'
import { type BlockProps } from './types'
import { schoolConfig, planEMG, type PlanAnio } from '@/lib/school-config'

// --- Helper: build base styles from BlockProps ---
function makeStyles(p: BlockProps) {
  const fs = `${p.fontSize}pt`
  const bw = p.showBorders ? `${p.borderWidth}px solid #000` : 'none'
  const px = `${p.paddingX}px`
  const py = `${p.paddingY}px`

  const tbS: React.CSSProperties = {
    borderCollapse: 'collapse',
    fontSize: fs,
    lineHeight: '1.2',
    fontFamily: 'Arial, sans-serif',
  }
  const bd: React.CSSProperties = {
    border: bw,
    padding: `${py} ${px}`,
    fontSize: fs,
  }
  const bdB: React.CSSProperties = { ...bd, fontWeight: 'bold' }
  const bdH: React.CSSProperties = {
    ...bd,
    fontWeight: 'bold',
    backgroundColor: p.headerBg,
    color: p.headerColor,
  }
  const bdC: React.CSSProperties = { ...bd, textAlign: 'center' }
  const bdH9: React.CSSProperties = {
    ...bd,
    fontWeight: 'bold',
    textAlign: 'center',
    verticalAlign: 'middle',
  }
  const instVert: React.CSSProperties = {
    ...bd,
    fontWeight: 'bold',
    textAlign: 'center',
    verticalAlign: 'middle',
    padding: '0 1px',
  }
  const sepCol: React.CSSProperties = { border: 'none' }

  return { tbS, bd, bdB, bdH, bdC, bdH9, instVert, sepCol, bw, px, py, fs }
}

// --- Helper: get active plan ---
function getActivePlan(planTipo?: string): PlanAnio[] {
  if (planTipo === 'derogado') {
    return Array.from({ length: 5 }, (_, i) => ({
      anio: ['Primer Año', 'Segundo Año', 'Tercer Año', 'Cuarto Año', 'Quinto Año'][i],
      materias: Array.from({ length: 10 }, (_, j) => ({
        nombre: ['Castellano y Literatura', 'Inglés', 'Matemáticas', 'Historia de Venezuela', 'Geografía de Venezuela', 'Ciencias Biológicas', 'Física', 'Química', 'Educación Física', 'Educación para el Trabajo'][j],
        numero: j + 1,
      })),
    }))
  }
  return planEMG
}

// --- Render one half-table for a year ---
function renderYearHalf(
  s: ReturnType<typeof makeStyles>,
  plan: PlanAnio,
  data: any,
  minRows?: number,
  props: BlockProps,
) {
  const allGrades: any[] = data.calificaciones?.[plan.anio] || []
  const grades = allGrades.filter((_g: any, idx: number) => {
    const m = plan.materias[idx]
    return m && m.tipo !== 'cualitativa'
  })
  const fillerCount = minRows ? Math.max(0, minRows - grades.length) : 0

  return (
    <table width="100%" cellPadding={0} cellSpacing={0} style={s.tbS}>
      <colgroup>
        <col style={{ width: '30.2%' }} />
        <col style={{ width: '9.0%' }} />
        <col style={{ width: '36.1%' }} />
        <col style={{ width: '9.0%' }} />
        <col style={{ width: '9.0%' }} />
        <col style={{ width: '3.5%' }} />
        <col style={{ width: '3.2%' }} />
      </colgroup>
      <tbody>
        <tr>
          <td colSpan={7} style={{ ...s.bdH, borderTop: 'none', borderLeft: 'none', borderRight: 'none', textAlign: 'center' }}>
            {plan.anio.toUpperCase()}
          </td>
        </tr>
        <tr>
          <td colSpan={1} rowSpan={2} style={s.bdH9}>ÁREAS DE FORMACIÓN</td>
          <td colSpan={2} style={s.bdH9}>CALIFICACIÓN</td>
          <td rowSpan={2} style={s.bdH9}>T-E</td>
          <td colSpan={2} style={s.bdH9}>FECHA</td>
          <td rowSpan={2} style={s.instVert}>
            <span style={{ display: 'inline-block', writingMode: 'vertical-rl' as const, transform: 'rotate(180deg)', fontSize: '7pt', whiteSpace: 'nowrap', lineHeight: '1' }}>
              Inst. Educ.
            </span>
          </td>
        </tr>
        <tr>
          <td style={s.bdH9}>N°</td>
          <td style={s.bdH9}>LETRAS</td>
          <td style={s.bdH9}>Mes</td>
          <td style={s.bdH9}>Año</td>
        </tr>
        {grades.map((cal: any, idx: number) => (
          <tr key={idx} style={{ height: `${props.rowHeight}px` }}>
            <td style={{ ...s.bd, verticalAlign: 'top', whiteSpace: 'normal', lineHeight: '1.1', overflow: 'hidden' }}>{cal.materia}</td>
            <td style={{ ...s.bdC, fontWeight: 'bold' }}>{cal.nota || ''}</td>
            <td style={{ ...s.bdC, textAlign: 'left' }}>{cal.literal || ''}</td>
            <td style={s.bdC}>{cal.tipoEvaluacion || ''}</td>
            <td style={s.bdC}>{cal.fechaMes || ''}</td>
            <td style={{ ...s.bdC, fontSize: '7pt' }}>{cal.fechaAnio || ''}</td>
            <td style={{ ...s.bdC, fontSize: '5pt', padding: '0 1px', overflow: 'hidden', whiteSpace: 'nowrap' }}>{cal.instEduc || ''}</td>
          </tr>
        ))}
        {Array.from({ length: fillerCount }).map((_, idx) => (
          <tr key={`fill-${idx}`} style={{ height: `${props.rowHeight}px` }}>
            <td style={s.bd}>{'**********************'}</td>
            <td style={s.bdC}>{'*'}</td>
            <td style={s.bdC}>{'**********************'}</td>
            <td style={s.bdC}>{'*'}</td>
            <td style={s.bdC}>{'*'}</td>
            <td style={s.bdC}>{'*'}</td>
            <td style={s.bdC}>{'*'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

// --- Render a single section ---
export function renderSection(blockId: string, props: BlockProps, data: any): ReactNode {
  const s = makeStyles(props)
  const d = data || {}
  const sepW = props.separatorWidth || '0.8%'

  // Format fecha
  const displayFechaExpedicion = (() => {
    const f = d.fechaExpedicion
    if (!f) return new Date().toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric' })
    if (/^\d{4}-\d{2}-\d{2}$/.test(f)) {
      const [y, m, dd] = f.split('-')
      return `${dd}/${m}/${y}`
    }
    return f
  })()

  switch (blockId) {
    case 'encabezado':
      return (
        <table width="100%" cellPadding={0} cellSpacing={0} style={s.tbS}>
          <colgroup>
            <col style={{ width: '44%' }} />
            <col style={{ width: '24%' }} />
            <col style={{ width: '10%' }} />
            <col style={{ width: '22%' }} />
          </colgroup>
          <tbody>
            <tr>
              <td rowSpan={3} style={{ ...s.bd, verticalAlign: 'middle', padding: '2px' }}>
                <img src="/logo-mppe.png" alt="Logo" style={{ width: '100%', height: 'auto', display: 'block', objectFit: 'contain' }} />
              </td>
              <td colSpan={3} style={{ ...s.bd, textAlign: 'center', verticalAlign: 'middle', fontWeight: 'bold', fontSize: '9pt', padding: '4px 4px' }}>
                CERTIFICACIÓN DE CALIFICACIONES&nbsp;&nbsp;{d.planTipo === 'derogado' ? '(PLAN DEROGADO)' : 'EMG'}
              </td>
            </tr>
            <tr>
              <td colSpan={2} style={{ ...s.bd, padding: '1px 3px', fontWeight: 'bold' }}>I. Plan de Estudio:&nbsp;&nbsp;{d.planEstudio}</td>
              <td style={{ ...s.bd, padding: '1px 3px', fontWeight: 'bold' }}>Código&nbsp;{schoolConfig.planCodigo}</td>
            </tr>
            <tr>
              <td style={{ ...s.bd, padding: '1px 3px', fontWeight: 'bold' }}>Lugar y Fecha de Expedición:</td>
              <td style={{ ...s.bd, padding: '1px 3px', textAlign: 'right', borderRight: 'none' }}>{d.lugar},</td>
              <td style={{ ...s.bd, padding: '1px 3px', borderLeft: 'none' }}>{displayFechaExpedicion}</td>
            </tr>
          </tbody>
        </table>
      )

    case 'seccion2':
      return (
        <table width="100%" cellPadding={0} cellSpacing={0} style={s.tbS}>
          <colgroup>
            <col style={{ width: '11.11%' }} />
            <col style={{ width: '14.81%' }} />
            <col style={{ width: '3.70%' }} />
            <col style={{ width: '7.41%' }} />
            <col style={{ width: '11.11%' }} />
            <col style={{ width: '3.70%' }} />
            <col style={{ width: '14.81%' }} />
            <col style={{ width: '11.11%' }} />
            <col style={{ width: '3.70%' }} />
            <col style={{ width: '18.52%' }} />
          </colgroup>
          <tbody>
            <tr>
              <td colSpan={10} style={s.bdH}>II. Datos de la Institución Educativa o Centro de Desarrollo de la Calidad Educativa Estadal (CDCEE) que Emite la Certificación:</td>
            </tr>
            <tr>
              <td style={s.bd}>Código:</td>
              <td colSpan={2} style={s.bd}>{d.od}</td>
              <td colSpan={2} style={{ ...s.bd, textAlign: 'center' }}>Denominación y Epónimo:</td>
              <td style={s.bd}></td>
              <td colSpan={4} style={s.bd}>{d.denominacion}</td>
            </tr>
            <tr>
              <td style={s.bd}>Dirección:</td>
              <td colSpan={6} style={s.bd}>{d.direccion}</td>
              <td style={s.bd}>Teléfono:</td>
              <td colSpan={2} style={{ ...s.bd, textAlign: 'center' }}>{d.telefono}</td>
            </tr>
            <tr>
              <td style={s.bd}>Municipio:</td>
              <td style={{ ...s.bd, textAlign: 'center' }}>{d.municipio}</td>
              <td colSpan={2} style={s.bd}>Estado:</td>
              <td colSpan={3} style={{ ...s.bd, textAlign: 'center' }}>{d.estado}</td>
              <td colSpan={2} style={s.bd}>CDCEE:</td>
              <td style={{ ...s.bd, textAlign: 'center' }}>{d.cdcce}</td>
            </tr>
          </tbody>
        </table>
      )

    case 'seccion3':
      return (
        <table width="100%" cellPadding={0} cellSpacing={0} style={s.tbS}>
          <colgroup>
            <col style={{ width: '11.11%' }} />
            <col style={{ width: '3.70%' }} />
            <col style={{ width: '3.70%' }} />
            <col style={{ width: '14.81%' }} />
            <col style={{ width: '7.41%' }} />
            <col style={{ width: '7.41%' }} />
            <col style={{ width: '7.41%' }} />
            <col style={{ width: '18.52%' }} />
            <col style={{ width: '7.41%' }} />
            <col style={{ width: '18.52%' }} />
          </colgroup>
          <tbody>
            <tr>
              <td colSpan={10} style={s.bdH}>III. Datos de Identificación del Estudiante:</td>
            </tr>
            <tr>
              <td colSpan={2} style={s.bd}>Cédula de Identidad:</td>
              <td colSpan={2} style={s.bd}>{d.estudiante?.cedula}</td>
              <td colSpan={3} style={s.bd}>Fecha de Nacimiento:</td>
              <td colSpan={3} style={s.bd}>{d.estudiante?.fechaNacimiento || ''}</td>
            </tr>
            <tr>
              <td style={s.bd}>Apellidos:</td>
              <td colSpan={4} style={s.bd}>{d.estudiante?.apellidos}</td>
              <td colSpan={2} style={s.bd}>Nombres:</td>
              <td colSpan={3} style={s.bd}>{d.estudiante?.nombres}</td>
            </tr>
            <tr>
              <td colSpan={3} style={s.bd}>Lugar de Nacimiento País:</td>
              <td colSpan={2} style={s.bd}>{d.estudiante?.pais}</td>
              <td style={{ ...s.bd, textAlign: 'center' }}>Estado:</td>
              <td colSpan={2} style={s.bd}>{d.estudiante?.estadoNac || ''}</td>
              <td style={{ ...s.bd, textAlign: 'center' }}>Municipio:</td>
              <td style={s.bd}>{d.estudiante?.municipioNac || ''}</td>
            </tr>
          </tbody>
        </table>
      )

    case 'seccion4': {
      const inst = d.instituciones || []
      return (
        <table width="100%" cellPadding={0} cellSpacing={0} style={s.tbS}>
          <colgroup>
            <col style={{ width: '3.70%' }} />
            <col style={{ width: '22.22%' }} />
            <col style={{ width: '18.52%' }} />
            <col style={{ width: '3.70%' }} />
            <col style={{ width: sepW }} />
            <col style={{ width: '3.70%' }} />
            <col style={{ width: '22.22%' }} />
            <col style={{ width: '18.52%' }} />
            <col style={{ width: '3.70%' }} />
          </colgroup>
          <tbody>
            <tr>
              <td colSpan={4} style={s.bdH}>IV. Instituciones Educativas donde Cursó Estudios</td>
              <td style={{ border: 'none' }}></td>
              <td style={{ ...s.bd, fontWeight: 'bold', textAlign: 'center' }}>N°</td>
              <td style={{ ...s.bd, fontWeight: 'bold', textAlign: 'center' }}>Denominación y Epónimo de la Institución Educativa</td>
              <td style={{ ...s.bd, fontWeight: 'bold', textAlign: 'center' }}>Localidad</td>
              <td style={{ ...s.bd, fontWeight: 'bold', textAlign: 'center' }}>E.F.</td>
            </tr>
            <tr>
              <td style={{ ...s.bd, fontWeight: 'bold', textAlign: 'center' }}>N°</td>
              <td style={{ ...s.bd, fontWeight: 'bold', textAlign: 'center' }}>Denominación y Epónimo de la Institución Educativa</td>
              <td style={{ ...s.bd, fontWeight: 'bold', textAlign: 'center' }}>Localidad</td>
              <td style={{ ...s.bd, fontWeight: 'bold', textAlign: 'center' }}>E.F.</td>
              <td style={{ border: 'none' }}></td>
              <td style={{ ...s.bd, textAlign: 'center', fontWeight: 'bold' }}>{inst[2] ? 3 : ''}</td>
              <td style={s.bd}>{inst[2]?.denominacion || '*'}</td>
              <td style={s.bd}>{inst[2]?.localidad || '*'}</td>
              <td style={{ ...s.bd, textAlign: 'center' }}>{inst[2]?.ef || '*'}</td>
            </tr>
            <tr>
              <td style={{ ...s.bd, textAlign: 'center', fontWeight: 'bold' }}>1</td>
              <td style={s.bd}>{inst[0]?.denominacion || '*'}</td>
              <td style={s.bd}>{inst[0]?.localidad || '*'}</td>
              <td style={{ ...s.bd, textAlign: 'center' }}>{inst[0]?.ef || '*'}</td>
              <td style={{ border: 'none' }}></td>
              <td style={{ ...s.bd, textAlign: 'center', fontWeight: 'bold' }}>{inst[3] ? 4 : ''}</td>
              <td style={s.bd}>{inst[3]?.denominacion || '*'}</td>
              <td style={s.bd}>{inst[3]?.localidad || '*'}</td>
              <td style={{ ...s.bd, textAlign: 'center' }}>{inst[3]?.ef || '*'}</td>
            </tr>
            <tr>
              <td style={{ ...s.bd, textAlign: 'center', fontWeight: 'bold' }}>2</td>
              <td style={s.bd}>{inst[1]?.denominacion || '*'}</td>
              <td style={s.bd}>{inst[1]?.localidad || '*'}</td>
              <td style={{ ...s.bd, textAlign: 'center' }}>{inst[1]?.ef || '*'}</td>
              <td style={{ border: 'none' }}></td>
              <td style={{ ...s.bd, textAlign: 'center', fontWeight: 'bold' }}>{inst[4] ? 5 : ''}</td>
              <td style={s.bd}>{inst[4]?.denominacion || '*'}</td>
              <td style={s.bd}>{inst[4]?.localidad || '*'}</td>
              <td style={{ ...s.bd, textAlign: 'center' }}>{inst[4]?.ef || '*'}</td>
            </tr>
          </tbody>
        </table>
      )
    }

    case 'seccion5': {
      const activePlan = getActivePlan(d.planTipo)
      if (!activePlan || activePlan.length < 5) return null

      const countQuant = (p: PlanAnio) => p.materias.filter(m => m.tipo !== 'cualitativa').length
      const c1 = countQuant(activePlan[0]), c2 = countQuant(activePlan[1])
      const c3 = countQuant(activePlan[2]), c4 = countQuant(activePlan[3])
      const max12 = Math.max(c1, c2)
      const max34 = Math.max(c3, c4)

      return (
        <>
          <table width="100%" cellPadding={0} cellSpacing={0} style={s.tbS}>
            <tbody>
              <tr>
                <td style={{ ...s.bdH, borderBottom: 'none' }}>V. Plan de Estudio:</td>
              </tr>
            </tbody>
          </table>

          {/* 1° + 2° */}
          <div style={{ display: 'flex', gap: '0' }}>
            <div style={{ flex: '1 1 49.6%' }}>{renderYearHalf(s, activePlan[0], d, max12, props)}</div>
            <div style={{ ...s.sepCol, flexShrink: 0, width: sepW }} />
            <div style={{ flex: '1 1 49.6%' }}>{renderYearHalf(s, activePlan[1], d, max12, props)}</div>
          </div>

          {/* 3° + 4° */}
          <div style={{ display: 'flex', gap: '0' }}>
            <div style={{ flex: '1 1 49.6%' }}>{renderYearHalf(s, activePlan[2], d, max34, props)}</div>
            <div style={{ ...s.sepCol, flexShrink: 0, width: sepW }} />
            <div style={{ flex: '1 1 49.6%' }}>{renderYearHalf(s, activePlan[3], d, max34, props)}</div>
          </div>

          {/* 5° + Orientación/Grupos */}
          <div style={{ display: 'flex', gap: '0' }}>
            <div style={{ flex: '1 1 49.6%' }}>{renderYearHalf(s, activePlan[4], d, undefined, props)}</div>
            <div style={{ ...s.sepCol, flexShrink: 0, width: sepW }} />
            <div style={{ flex: '1 1 49.6%' }}>
              {/* Orientación y Convivencia */}
              <table width="100%" cellPadding={0} cellSpacing={0} style={s.tbS}>
                <colgroup>
                  <col style={{ width: '39.3%' }} />
                  <col style={{ width: '9.0%' }} />
                  <col style={{ width: '51.7%' }} />
                </colgroup>
                <tbody>
                  <tr>
                    <td style={s.bdH9}>ÁREA DE FORMACIÓN</td>
                    <td style={s.bdH9}>AÑO</td>
                    <td style={s.bdH9}>LITERAL</td>
                  </tr>
                  <tr>
                    <td rowSpan={5} style={s.bd}>Orientación y Convivencia</td>
                    <td style={s.bdC}>1°</td>
                    <td style={s.bdC}>{d.orientacion?.[0]?.literal || '*'}</td>
                  </tr>
                  {[1, 2, 3, 4].map(i => (
                    <tr key={`o${i}`}>
                      <td style={s.bdC}>{i + 1}°</td>
                      <td style={s.bdC}>{d.orientacion?.[i]?.literal || '*'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {/* Participación en Grupos */}
              <table width="100%" cellPadding={0} cellSpacing={0} style={s.tbS}>
                <colgroup>
                  <col style={{ width: '39.3%' }} />
                  <col style={{ width: '9.0%' }} />
                  <col style={{ width: '45.1%' }} />
                  <col style={{ width: '6.6%' }} />
                </colgroup>
                <tbody>
                  <tr>
                    <td style={s.bdH9}>ÁREA DE FORMACIÓN</td>
                    <td style={s.bdH9}>AÑO</td>
                    <td style={s.bdH9}>GRUPO</td>
                    <td style={s.bdH9}>LITERAL</td>
                  </tr>
                  {[0, 1, 2, 3, 4].map(i => (
                    <tr key={`g${i}`}>
                      {i === 0 && <td rowSpan={5} style={s.bd}>Participación en Grupos de Creación, Recreación y Producción</td>}
                      <td style={s.bdC}>{i + 1}°</td>
                      <td style={s.bdC}>{d.grupos?.[i]?.grupo || '*'}</td>
                      <td style={s.bdC}>{d.grupos?.[i]?.literal || '*'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )
    }

    case 'seccion6':
      return (
        <table width="100%" cellPadding={0} cellSpacing={0} style={s.tbS}>
          <tbody>
            <tr>
              <td style={{ ...s.bdB, whiteSpace: 'nowrap' }}>VI. Observaciones:</td>
              <td style={{ ...s.bdB, whiteSpace: 'nowrap', width: '60px' }}>P.A.:</td>
              <td style={{ ...s.bd, width: '100px', textAlign: 'center' }}>{d.promedioAcumulado || ''}</td>
              <td style={s.bd}>{d.observaciones || ''}</td>
            </tr>
          </tbody>
        </table>
      )

    case 'seccion7':
      return (
        <table width="100%" cellPadding={0} cellSpacing={0} style={s.tbS}>
          <tbody>
            <tr>
              <td colSpan={2} style={s.bdH}>VII. Institución Educativa</td>
            </tr>
            <tr>
              <td style={{ ...s.bd, textAlign: 'center', fontWeight: 'bold', fontSize: '7pt', width: '35%' }}>Director(a)</td>
              <td style={{ ...s.bd, textAlign: 'center', fontWeight: 'bold', fontSize: '7pt' }}>SELLO DE LA INSTITUCIÓN EDUCATIVA</td>
            </tr>
            <tr><td colSpan={2} style={s.bdB}>Apellidos y Nombres:</td></tr>
            <tr><td colSpan={2} style={s.bd}>{d.director?.apellidosNombres || ''}</td></tr>
            <tr><td colSpan={2} style={s.bdB}>Cédula de Identidad:</td></tr>
            <tr><td colSpan={2} style={s.bd}>{d.director?.cedula || ''}</td></tr>
            <tr><td colSpan={2} style={{ ...s.bd, fontWeight: 'bold' }}>Firma:</td></tr>
            <tr>
              <td colSpan={2} style={{ ...s.bd, fontStyle: 'italic', textAlign: 'center', fontSize: '7pt' }}>
                Para efectos de su Validez Nacional
              </td>
            </tr>
          </tbody>
        </table>
      )

    case 'seccion8':
      return (
        <table width="100%" cellPadding={0} cellSpacing={0} style={s.tbS}>
          <tbody>
            <tr>
              <td colSpan={2} style={s.bdH}>VIII. Centro de Desarrollo de la Calidad Educativa Estadal</td>
            </tr>
            <tr>
              <td style={{ ...s.bd, textAlign: 'center', fontWeight: 'bold', fontSize: '7pt', width: '35%' }}>Director(a)</td>
              <td style={{ ...s.bd, textAlign: 'center', fontWeight: 'bold', fontSize: '7pt' }}>SELLO DEL CENTRO DE DESARROLLO DE LA CALIDAD EDUCATIVA ESTADAL</td>
            </tr>
            <tr><td colSpan={2} style={s.bdB}>Apellidos y Nombres:</td></tr>
            <tr><td colSpan={2} style={s.bd}>{d.directorCdcce?.apellidosNombres || ''}</td></tr>
            <tr><td colSpan={2} style={s.bdB}>Cédula de Identidad:</td></tr>
            <tr><td colSpan={2} style={s.bd}>{d.directorCdcce?.cedula || ''}</td></tr>
            <tr><td colSpan={2} style={{ ...s.bd, fontWeight: 'bold' }}>Firma:</td></tr>
            <tr>
              <td colSpan={2} style={{ ...s.bd, fontStyle: 'italic', textAlign: 'center', fontSize: '7pt' }}>
                Para efectos de su Validez Internacional
              </td>
            </tr>
          </tbody>
        </table>
      )

    case 'valorFiscal':
      return (
        <table width="100%" cellPadding={0} cellSpacing={0} style={s.tbS}>
          <tbody>
            <tr>
              <td style={{ ...s.bd, fontWeight: 'bold', textAlign: 'center', fontSize: '7pt' }}>
                VALOR FISCAL: Para su validez legal y de acuerdo al Ramo de Estampillas, al dorso de este documento se le debe colocar tres décimas de la Unidad Tributaria (0,3 U.T.)
              </td>
            </tr>
          </tbody>
        </table>
      )

    default:
      return null
  }
}