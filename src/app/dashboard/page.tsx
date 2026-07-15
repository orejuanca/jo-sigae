'use client'

import { useState, useEffect, useCallback } from 'react'
import { AppShell } from '@/components/app-shell'
import {
  Search,
  Save,
  Pencil,
  Trash2,
  Download,
  ArrowRightLeft,
  Loader2,
} from 'lucide-react'

// Materias por ao - EXACTAS del Excel
const MATERIAS_1ERO = ['Castellano', 'Matematicas', 'Educacion Fisica', 'Arte y Patrimonio', 'Ciencias Naturales']
const MATERIAS_2DO = ['Ingles y otras Len. Extranj.', 'Matematicas', 'Educacion Fisica', 'Arte y Patrimonio', 'Ciencias Naturales']
const MATERIAS_3ERO = ['Castellano', 'Ingles y otras Len. Extranj.', 'Matematicas', 'Educacion Fisica', 'Fisica', 'Quimica', 'Biologia', 'Geografia, Hist. y Ciudad.', 'Form. para la Sober. Nal.']
const MATERIAS_4TO = ['Ingles y otras Len. Extranj.', 'Matematicas', 'Educacion Fisica', 'Fisica', 'Quimica', 'Biologia', 'Geografia, Hist. y Ciudad.', 'Form. para la Sober. Nal.']
const MATERIAS_5TO = ['Castellano', 'Ingles y otras Len. Extranj.', 'Matematicas', 'Educacion Fisica', 'Fisica', 'Quimica', 'Ciencias de la Tierra', 'Geografia, Hist. y Ciudad.']

interface NotaRow { nota: string; te: string; fecha: string; plantel: string }
interface Plantel { nombre: string; localidad: string; ef: string }

const eNR = (): NotaRow => ({ nota: '', te: '', fecha: '', plantel: '' })
const emptyNotas1 = () => MATERIAS_1ERO.map(() => eNR())
const emptyNotas2 = () => MATERIAS_2DO.map(() => eNR())
const emptyNotas3 = () => MATERIAS_3ERO.map(() => eNR())
const emptyNotas4 = () => MATERIAS_4TO.map(() => eNR())
const emptyNotas5 = () => MATERIAS_5TO.map(() => eNR())
const emptyPlanteles = (): Plantel[] => Array(5).fill(null).map(() => ({ nombre: '', localidad: '', ef: '' }))

export default function DashboardPage() {
  const [plan, setPlan] = useState<'vigente' | 'derogado'>('vigente')
  const [totalRecords, setTotalRecords] = useState(0)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'ok' | 'error'; text: string } | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  // Datos Personales
  const [cedula, setCedula] = useState('')
  const [fechaNacimiento, setFechaNacimiento] = useState('')
  const [apellidos, setApellidos] = useState('')
  const [nombres, setNombres] = useState('')
  const [pais, setPais] = useState('VENEZUELA')
  const [estado, setEstado] = useState('')
  const [municipio, setMunicipio] = useState('')

  // Planteles
  const [planteles, setPlanteles] = useState<Plantel[]>(emptyPlanteles())

  // Notas por ao
  const [notas1, setNotas1] = useState<NotaRow[]>(emptyNotas1())
  const [notas2, setNotas2] = useState<NotaRow[]>(emptyNotas2())
  const [seccion2, setSeccion2] = useState('')
  const [oc2, setOc2] = useState('')
  const [pg2, setPg2] = useState('')
  const [notas3, setNotas3] = useState<NotaRow[]>(emptyNotas3())
  const [seccion3, setSeccion3] = useState('')
  const [notas4, setNotas4] = useState<NotaRow[]>(emptyNotas4())
  const [seccion4, setSeccion4] = useState('')
  const [notas5, setNotas5] = useState<NotaRow[]>(emptyNotas5())
  const [seccion5, setSeccion5] = useState('')
  const [grupo5, setGrupo5] = useState('')

  // Observaciones
  const [observaciones, setObservaciones] = useState('')

  // Validacion
  const [serialT, setSerialT] = useState('')
  const [fechaEmisionT, setFechaEmisionT] = useState('')
  const [anioEgresoT, setAnioEgresoT] = useState('')
  const [fechaEmisionN, setFechaEmisionN] = useState('')
  const [promedioTotal, setPromedioTotal] = useState('')

  const loadCount = useCallback(async () => {
    try {
      const res = await fetch(`/api/stats?plan=${plan}`)
      const data = await res.json()
      setTotalRecords(data.totalStudents || 0)
    } catch {}
  }, [plan])
  useEffect(() => { loadCount() }, [loadCount])

  const today = new Date()
  const todayStr = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`

  const resetForm = () => {
    setEditingId(null); setCedula(''); setFechaNacimiento(''); setApellidos(''); setNombres('')
    setPais('VENEZUELA'); setEstado(''); setMunicipio('')
    setPlanteles(emptyPlanteles())
    setNotas1(emptyNotas1()); setNotas2(emptyNotas2()); setSeccion2(''); setOc2(''); setPg2('')
    setNotas3(emptyNotas3()); setSeccion3('')
    setNotas4(emptyNotas4()); setSeccion4('')
    setNotas5(emptyNotas5()); setSeccion5(''); setGrupo5('')
    setObservaciones(''); setSerialT(''); setFechaEmisionT(''); setAnioEgresoT(''); setFechaEmisionN(''); setPromedioTotal('')
  }

  const showMsg = (type: 'ok' | 'error', text: string) => {
    setMessage({ type, text }); setTimeout(() => setMessage(null), 4000)
  }

  const handleSearch = async () => {
    if (!searchQuery.trim()) return
    setLoading(true)
    try {
      const res = await fetch(`/api/students?q=${encodeURIComponent(searchQuery)}&plan=${plan}`)
      const data = await res.json()
      const students = data.students || []
      if (students.length > 0) {
        const s = students[0]
        setEditingId(s.id); setCedula(s.cedula); setFechaNacimiento(s.fechaNacimiento || '')
        setApellidos(s.apellidos); setNombres(s.nombres); setPais(s.pais || 'VENEZUELA')
        setEstado(s.estado || ''); setMunicipio(s.municipio || '')
        if (s.rawData) {
          try {
            const rd = JSON.parse(s.rawData)
            if (rd.planteles) setPlanteles(rd.planteles)
            if (rd.notas1) setNotas1(rd.notas1)
            if (rd.notas2) setNotas2(rd.notas2)
            if (rd.seccion2) setSeccion2(rd.seccion2)
            if (rd.oc2) setOc2(rd.oc2)
            if (rd.pg2) setPg2(rd.pg2)
            if (rd.notas3) setNotas3(rd.notas3)
            if (rd.seccion3) setSeccion3(rd.seccion3)
            if (rd.notas4) setNotas4(rd.notas4)
            if (rd.seccion4) setSeccion4(rd.seccion4)
            if (rd.notas5) setNotas5(rd.notas5)
            if (rd.seccion5) setSeccion5(rd.seccion5)
            if (rd.grupo5) setGrupo5(rd.grupo5)
            if (rd.observaciones) setObservaciones(rd.observaciones)
            if (rd.serialT) setSerialT(rd.serialT)
            if (rd.fechaEmisionT) setFechaEmisionT(rd.fechaEmisionT)
            if (rd.anioEgresoT) setAnioEgresoT(rd.anioEgresoT)
            if (rd.fechaEmisionN) setFechaEmisionN(rd.fechaEmisionN)
            if (rd.promedioTotal) setPromedioTotal(rd.promedioTotal)
          } catch {}
        }
        showMsg('ok', `Encontrado: ${s.apellidos}, ${s.nombres}`)
      } else { showMsg('error', 'No se encontro alumno') }
    } catch { showMsg('error', 'Error al buscar') }
    setLoading(false)
  }

  const getRawData = () => JSON.stringify({
    planteles, notas1, notas2, seccion2, oc2, pg2, notas3, seccion3,
    notas4, seccion4, notas5, seccion5, grupo5, observaciones,
    serialT, fechaEmisionT, anioEgresoT, fechaEmisionN, promedioTotal,
  })

  const handleGuardar = async () => {
    if (!cedula.trim() || !apellidos.trim() || !nombres.trim()) { showMsg('error', 'Cedula, Apellidos y Nombres son obligatorios'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/students', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cedula, apellidos, nombres, fechaNacimiento, pais, estado, municipio, plan, rawData: getRawData() }),
      })
      if (res.ok) { showMsg('ok', 'Datos guardados'); resetForm(); loadCount() }
      else { const d = await res.json(); showMsg('error', d.error || 'Error') }
    } catch { showMsg('error', 'Error de conexion') }
    setSaving(false)
  }

  const handleGuardarEditado = async () => {
    if (!editingId) { showMsg('error', 'No hay alumno seleccionado'); return }
    setSaving(true)
    try {
      const res = await fetch(`/api/students/${editingId}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cedula, apellidos, nombres, fechaNacimiento, pais, estado, municipio, rawData: getRawData() }),
      })
      if (res.ok) showMsg('ok', 'Datos actualizados')
      else { const d = await res.json(); showMsg('error', d.error || 'Error') }
    } catch { showMsg('error', 'Error de conexion') }
    setSaving(false)
  }

  const handleEliminar = async () => {
    if (!editingId) { showMsg('error', 'No hay alumno seleccionado'); return }
    if (!confirm('Eliminar este alumno?')) return
    setSaving(true)
    try {
      const res = await fetch(`/api/students/${editingId}`, { method: 'DELETE' })
      if (res.ok) { showMsg('ok', 'Eliminado'); resetForm(); loadCount() }
      else { const d = await res.json(); showMsg('error', d.error || 'Error') }
    } catch { showMsg('error', 'Error') }
    setSaving(false)
  }

  const handleExportar = async () => {
    try {
      const res = await fetch(`/api/students?plan=${plan}&limit=99999`)
      const data = await res.json()
      const students = data.students || []
      const h = ['Cedula', 'Apellidos', 'Nombres', 'Fecha Nacimiento', 'Pais', 'Estado', 'Municipio', 'Plan']
      const rows = students.map((s: Record<string, string>) => [s.cedula, s.apellidos, s.nombres, s.fechaNacimiento || '', s.pais || '', s.estado || '', s.municipio || '', s.plan || ''])
      const csv = [h.join(','), ...rows.map((r: string[]) => r.map(c => `"${(c || '').replace(/"/g, '""')}"`).join(','))].join('\n')
      const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = url; a.download = `bd_${plan}.csv`; a.click(); URL.revokeObjectURL(url)
      showMsg('ok', `Exportados ${students.length} registros`)
    } catch { showMsg('error', 'Error al exportar') }
  }

  const updateNota = (setter: Function, arr: NotaRow[], idx: number, field: keyof NotaRow, val: string) => {
    const copy = arr.map(r => ({ ...r })); copy[idx][field] = val; setter(copy)
  }

  const updatePlantel = (idx: number, field: keyof Plantel, val: string) => {
    const copy = [...planteles]; copy[idx] = { ...copy[idx], [field]: val }; setPlanteles(copy)
  }

  // Styles
  const S = {
    header: 'bg-cyan-700 text-white text-[10px] font-bold p-1',
    subheader: 'bg-sky-200 text-sky-900 text-[9px] font-bold p-0.5 text-center',
    label: 'text-[9px] font-bold text-gray-700 text-right whitespace-nowrap pr-1',
    input: 'h-5 text-[9px] border border-amber-300 bg-amber-100 px-0.5',
    inputW: 'w-full h-5 text-[9px] border border-amber-300 bg-amber-100 px-0.5',
    btn: 'h-6 text-[9px] font-bold text-white px-2 rounded-sm cursor-pointer border-0 flex items-center gap-1',
    cell: 'border border-gray-200 p-0',
    yellowBg: 'bg-amber-50',
  }

  return (
    <AppShell>
      <div className="overflow-x-auto">
        {message && (
          <div className={`px-2 py-1 text-[10px] font-bold text-center ${message.type === 'ok' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {message.text}
          </div>
        )}
        <table className="border-collapse border border-gray-400 w-max min-w-full">
          <colgroup>
            <col className="w-[30px]" /> {/* A */}
            <col className="w-[160px]" /> {/* B */}
            <col className="w-[80px]" /> {/* C */}
            <col className="w-[30px]" /> {/* D */}
            <col className="w-[130px]" /> {/* E */}
            <col className="w-[40px]" /> {/* F */}
            <col className="w-[30px]" /> {/* G */}
            <col className="w-[30px]" /> {/* H */}
            <col className="w-[50px]" /> {/* I */}
            <col className="w-[100px]" /> {/* J */}
            <col className="w-[130px]" /> {/* K */}
            <col className="w-[40px]" /> {/* L */}
            <col className="w-[30px]" /> {/* M */}
            <col className="w-[30px]" /> {/* N */}
            <col className="w-[50px]" /> {/* O */}
            <col className="w-[100px]" /> {/* P */}
            <col className="w-[40px]" /> {/* Q */}
            <col className="w-[130px]" /> {/* R */}
            <col className="w-[40px]" /> {/* S - OC */}
            <col className="w-[30px]" /> {/* T - PG */}
            <col className="w-[130px]" /> {/* U */}
            <col className="w-[40px]" /> {/* V */}
            <col className="w-[30px]" /> {/* W */}
            <col className="w-[30px]" /> {/* X */}
            <col className="w-[50px]" /> {/* Y */}
            <col className="w-[100px]" /> {/* Z */}
            <col className="w-[40px]" /> {/* AA */}
            <col className="w-[130px]" /> {/* AB */}
            <col className="w-[40px]" /> {/* AC */}
            <col className="w-[30px]" /> {/* AD */}
            <col className="w-[30px]" /> {/* AE */}
            <col className="w-[50px]" /> {/* AF */}
            <col className="w-[100px]" /> {/* AG */}
            <col className="w-[40px]" /> {/* AH */}
            <col className="w-[130px]" /> {/* AI */}
            <col className="w-[40px]" /> {/* AJ */}
            <col className="w-[30px]" /> {/* AK */}
            <col className="w-[30px]" /> {/* AL */}
            <col className="w-[50px]" /> {/* AM */}
            <col className="w-[100px]" /> {/* AN */}
          </colgroup>

          <tbody>
            {/* ===== FILA 1: TITULO ===== */}
            <tr>
              <td colSpan={40} className={S.header} style={{textAlign:'center'}}>
                AGREGAR DATOS, NOTAS Y OBSERVACIONES PARA CERTIFICACION DE CALIFICACIONES EMG 31059 - CONSTANCIA - BOLETIN - VALIDACION DE TITULO Y NOTAS
              </td>
            </tr>

            {/* ===== FILA 2: DATOS PERSONALES + CIRCULAR ===== */}
            <tr>
              <td colSpan={7} className={`${S.subheader} text-left pl-2`}>DATOS PERSONALES</td>
              <td colSpan={33} className={`${S.subheader} text-left pl-2`}>CIRCULAR N 05, (02/07/2003) (modificada al 30/03/2007)</td>
            </tr>

            {/* ===== FILA 3: CEDULA + Fecha + Botones ===== */}
            <tr className={S.yellowBg}>
              <td className={S.label}>CEDULA:</td>
              <td className={S.cell}><input className={S.inputW} value={cedula} onChange={e => setCedula(e.target.value)} /></td>
              <td colSpan={5} className={S.cell}></td>
              <td className={`${S.cell} text-[10px] text-gray-700 font-mono`}>{todayStr}</td>
              <td colSpan={2} className={`${S.cell} text-[8px] text-gray-500`}>Cambio de fecha expedicion</td>
              <td className={S.cell}></td>
              <td className={`${S.cell} text-[8px] text-gray-500`}>Impresora</td>
              <td className={S.cell}></td>
              <td colSpan={28} className={S.cell} style={{textAlign:'right'}}>
                <button onClick={() => { setPlan(p => p === 'vigente' ? 'derogado' : 'vigente'); resetForm() }}
                  className="h-6 text-[9px] font-bold text-white bg-blue-900 hover:bg-blue-800 px-3 rounded-sm flex items-center gap-1 ml-auto">
                  <ArrowRightLeft className="h-3 w-3" /> IR A {plan === 'vigente' ? 'PLANES DEROGADOS' : 'PLAN VIGENTE'}
                </button>
              </td>
            </tr>

            {/* ===== FILA 4: FECHA NAC + Registros ===== */}
            <tr className={S.yellowBg}>
              <td className={S.label}>FECHA DE NACIMIENTO:</td>
              <td className={S.cell}><input className={S.inputW} value={fechaNacimiento} onChange={e => setFechaNacimiento(e.target.value)} placeholder="DD/MM/AAAA" /></td>
              <td colSpan={5} className={S.cell}></td>
              <td className={`${S.cell} text-[9px] font-bold text-blue-800`}>{totalRecords.toLocaleString()} Registros en la Base de Datos.</td>
              <td colSpan={31} className={S.cell}></td>
            </tr>

            {/* ===== FILA 5: APELLIDOS ===== */}
            <tr className={S.yellowBg}>
              <td className={S.label}>APELLIDOS:</td>
              <td className={S.cell}><input className={S.inputW} value={apellidos} onChange={e => setApellidos(e.target.value)} /></td>
              <td colSpan={38} className={S.cell}></td>
            </tr>

            {/* ===== FILA 6: NOMBRES ===== */}
            <tr className={S.yellowBg}>
              <td className={S.label}>NOMBRES:</td>
              <td className={S.cell}><input className={S.inputW} value={nombres} onChange={e => setNombres(e.target.value)} /></td>
              <td colSpan={38} className={S.cell}></td>
            </tr>

            {/* ===== FILA 7: PAIS ===== */}
            <tr className={S.yellowBg}>
              <td className={S.label}>PAIS DE NACIMIENTO:</td>
              <td className={S.cell}><input className={S.inputW} value={pais} onChange={e => setPais(e.target.value)} /></td>
              <td colSpan={38} className={S.cell}></td>
            </tr>

            {/* ===== FILA 8: ESTADO ===== */}
            <tr className={S.yellowBg}>
              <td className={S.label}>ESTADO:</td>
              <td className={S.cell}><input className={S.inputW} value={estado} onChange={e => setEstado(e.target.value)} /></td>
              <td colSpan={38} className={S.cell}></td>
            </tr>

            {/* ===== FILA 9: MUNICIPIO ===== */}
            <tr className={S.yellowBg}>
              <td className={S.label}>MUNICIPIO:</td>
              <td className={S.cell}><input className={S.inputW} value={municipio} onChange={e => setMunicipio(e.target.value)} /></td>
              <td colSpan={38} className={S.cell}></td>
            </tr>

            {/* ===== FILA 10: Credito + Botones ===== */}
            <tr className={S.yellowBg}>
              <td colSpan={7} className={`${S.cell} text-[8px] text-gray-400 italic`}>Programacion y Diseño por Juan C. Orellana R.</td>
              <td className={S.cell}>
                <button onClick={handleSearch} disabled={loading} className={`${S.btn} bg-pink-500 hover:bg-pink-600`}>
                  {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Search className="h-3 w-3" />} Buscar/Editar Alumno
                </button>
              </td>
              <td className={S.cell}>
                <button onClick={handleExportar} className={`${S.btn} bg-red-600 hover:bg-red-700`}>
                  <Download className="h-3 w-3" /> EXPORTAR BASE DE DATOS
                </button>
              </td>
              <td className={S.cell}>
                <button onClick={handleGuardar} disabled={saving || !!editingId} className={`${S.btn} bg-sky-500 hover:bg-sky-600`}>
                  <Save className="h-3 w-3" /> Guardar Datos
                </button>
              </td>
              <td colSpan={37} className={S.cell}></td>
            </tr>

            {/* ===== FILA 11: Mas botones ===== */}
            <tr className={S.yellowBg}>
              <td className={S.cell}>
                <button onClick={handleGuardarEditado} disabled={saving || !editingId} className={`${S.btn} bg-gray-400 hover:bg-gray-500`}>
                  <Pencil className="h-3 w-3" /> Guardar Editado
                </button>
              </td>
              <td colSpan={7} className={S.cell}></td>
              <td className={S.cell}>
                <button onClick={handleEliminar} disabled={saving || !editingId} className={`${S.btn} bg-red-700 hover:bg-red-800`}>
                  <Trash2 className="h-3 w-3" /> Eliminar Datos
                </button>
              </td>
              <td colSpan={31} className={S.cell}></td>
            </tr>

            {/* ===== FILA 12: Headers - Planteles + 1er Ao + 2do Ao + Seccion/OC/PG ===== */}
            <tr>
              <td className={S.subheader}>N</td>
              <td className={S.subheader}>NOMBRE DEL PLANTEL</td>
              <td className={S.subheader}>LOCALIDAD</td>
              <td className={S.subheader}>E.F.</td>
              <td colSpan={6} className={S.subheader}>PRIMER AO</td>
              <td colSpan={6} className={S.subheader}>SEGUNDO AO</td>
              <td colSpan={4} className={S.subheader}>SECCION</td>
            </tr>
            {/* Sub-headers 1er + 2do */}
            <tr>
              <td colSpan={4} className={S.cell}></td>
              <td className={`${S.subheader} bg-amber-200`}>AREAS DE FORMACION</td>
              <td className={`${S.subheader} bg-amber-200`}>NOTA</td>
              <td className={`${S.subheader} bg-amber-200`}>T-E</td>
              <td className={`${S.subheader} bg-amber-200`}>FECHA</td>
              <td className={`${S.subheader} bg-amber-200`}>PLANTEL</td>
              <td className={`${S.subheader} bg-amber-200`}>AREAS DE FORMACION</td>
              <td className={`${S.subheader} bg-amber-200`}>NOTA</td>
              <td className={`${S.subheader} bg-amber-200`}>T-E</td>
              <td className={`${S.subheader} bg-amber-200`}>FECHA</td>
              <td className={`${S.subheader} bg-amber-200`}>PLANTEL</td>
              <td className={`${S.subheader} bg-amber-200`}>AREAS</td>
              <td className={`${S.subheader} bg-amber-200`}>OC</td>
              <td className={`${S.subheader} bg-amber-200`}>PG</td>
              <td colSpan={21} className={S.cell}></td>
            </tr>

            {/* ===== FILAS 13-17: Datos Planteles + 1er Ao + 2do Ao + Seccion ===== */}
            {MATERIAS_1ERO.map((mat, i) => (
              <tr key={`r12_${i}`} className={S.yellowBg}>
                <td className={`${S.cell} text-[9px] text-center text-gray-400`}>{i + 1}</td>
                <td className={S.cell}><input className={S.inputW} value={planteles[i]?.nombre || ''} onChange={e => updatePlantel(i, 'nombre', e.target.value)} /></td>
                <td className={S.cell}><input className={S.inputW} value={planteles[i]?.localidad || ''} onChange={e => updatePlantel(i, 'localidad', e.target.value)} /></td>
                <td className={S.cell}><input className={S.inputW} value={planteles[i]?.ef || ''} onChange={e => updatePlantel(i, 'ef', e.target.value)} /></td>
                {/* 1er Ao */}
                <td className={`${S.cell} text-[8px] text-gray-600 truncate`} title={mat}>{mat}</td>
                <td className={S.cell}><input className={S.inputW} value={notas1[i]?.nota || ''} onChange={e => updateNota(setNotas1, notas1, i, 'nota', e.target.value)} /></td>
                <td className={S.cell}><input className={S.inputW} value={notas1[i]?.te || ''} onChange={e => updateNota(setNotas1, notas1, i, 'te', e.target.value)} /></td>
                <td className={S.cell}><input className={S.inputW} value={notas1[i]?.fecha || ''} onChange={e => updateNota(setNotas1, notas1, i, 'fecha', e.target.value)} /></td>
                <td className={S.cell}><input className={S.inputW} value={notas1[i]?.plantel || ''} onChange={e => updateNota(setNotas1, notas1, i, 'plantel', e.target.value)} /></td>
                {/* 2do Ao */}
                <td className={`${S.cell} text-[8px] text-gray-600 truncate`} title={MATERIAS_2DO[i]}>{MATERIAS_2DO[i]}</td>
                <td className={S.cell}><input className={S.inputW} value={notas2[i]?.nota || ''} onChange={e => updateNota(setNotas2, notas2, i, 'nota', e.target.value)} /></td>
                <td className={S.cell}><input className={S.inputW} value={notas2[i]?.te || ''} onChange={e => updateNota(setNotas2, notas2, i, 'te', e.target.value)} /></td>
                <td className={S.cell}><input className={S.inputW} value={notas2[i]?.fecha || ''} onChange={e => updateNota(setNotas2, notas2, i, 'fecha', e.target.value)} /></td>
                <td className={S.cell}><input className={S.inputW} value={notas2[i]?.plantel || ''} onChange={e => updateNota(setNotas2, notas2, i, 'plantel', e.target.value)} /></td>
                {/* Seccion/OC/PG */}
                <td className={S.cell}><input className={S.inputW} value={i === 0 ? seccion2 : ''} onChange={e => setSeccion2(e.target.value)} placeholder={i === 0 ? 'Secc.' : ''} /></td>
                <td className={S.cell}><input className={S.inputW} value={i === 0 ? oc2 : ''} onChange={e => setOc2(e.target.value)} placeholder={i === 0 ? 'OC' : ''} /></td>
                <td className={S.cell}><input className={S.inputW} value={i === 0 ? pg2 : ''} onChange={e => setPg2(e.target.value)} placeholder={i === 0 ? 'PG' : ''} /></td>
                <td colSpan={21} className={S.cell}></td>
              </tr>
            ))}

            {/* ===== FILA 18: Headers 3er + 4to + 5to Ao + Grupo ===== */}
            <tr>
              <td colSpan={4} className={S.subheader}>TERCER AO</td>
              <td colSpan={2} className={S.subheader}>SECCION</td>
              <td className={`${S.subheader} bg-amber-200`}>AREAS DE FORMACION</td>
              <td className={`${S.subheader} bg-amber-200`}>NOTA</td>
              <td className={`${S.subheader} bg-amber-200`}>T-E</td>
              <td className={`${S.subheader} bg-amber-200`}>FECHA</td>
              <td className={`${S.subheader} bg-amber-200`}>PLANTEL</td>
              <td colSpan={6} className={S.subheader}>CUARTO AO</td>
              <td colSpan={2} className={S.subheader}>SECCION</td>
              <td className={`${S.subheader} bg-amber-200`}>AREAS DE FORMACION</td>
              <td className={`${S.subheader} bg-amber-200`}>NOTA</td>
              <td className={`${S.subheader} bg-amber-200`}>T-E</td>
              <td className={`${S.subheader} bg-amber-200`}>FECHA</td>
              <td className={`${S.subheader} bg-amber-200`}>PLANTEL</td>
              <td colSpan={6} className={S.subheader}>QUINTO AO</td>
              <td colSpan={2} className={S.subheader}>SECCION</td>
              <td className={`${S.subheader} bg-amber-200`}>AREAS DE FORMACION</td>
              <td className={`${S.subheader} bg-amber-200`}>NOTA</td>
              <td className={`${S.subheader} bg-amber-200`}>T-E</td>
              <td className={`${S.subheader} bg-amber-200`}>FECHA</td>
              <td className={`${S.subheader} bg-amber-200`}>PLANTEL</td>
              <td colSpan={2} className={S.subheader}>GRUPO</td>
              <td className={S.cell}></td>
              <td className={S.cell}></td>
            </tr>

            {/* ===== FILAS 19-26: 3er + 4to + 5to Ao datos ===== */}
            {Array.from({ length: Math.max(MATERIAS_3ERO.length, MATERIAS_4TO.length, MATERIAS_5TO.length) }).map((_, i) => (
              <tr key={`r18_${i}`} className={S.yellowBg}>
                {/* 3er Ao */}
                {i < MATERIAS_3ERO.length ? (
                  <>
                    <td colSpan={4} className={`${S.cell} text-[8px] text-gray-600 truncate`} title={MATERIAS_3ERO[i]}>{i === 0 ? <><input className={S.inputW} value={seccion3} onChange={e => setSeccion3(e.target.value)} placeholder="Secc." style={{width:'40px',display:'inline'}} /> {MATERIAS_3ERO[i]}</> : MATERIAS_3ERO[i]}</td>
                    <td colSpan={2} className={S.cell}></td>
                    <td className={S.cell}><input className={S.inputW} value={notas3[i]?.nota || ''} onChange={e => updateNota(setNotas3, notas3, i, 'nota', e.target.value)} /></td>
                    <td className={S.cell}><input className={S.inputW} value={notas3[i]?.te || ''} onChange={e => updateNota(setNotas3, notas3, i, 'te', e.target.value)} /></td>
                    <td className={S.cell}><input className={S.inputW} value={notas3[i]?.fecha || ''} onChange={e => updateNota(setNotas3, notas3, i, 'fecha', e.target.value)} /></td>
                    <td className={S.cell}><input className={S.inputW} value={notas3[i]?.plantel || ''} onChange={e => updateNota(setNotas3, notas3, i, 'plantel', e.target.value)} /></td>
                  </>
                ) : (
                  <td colSpan={10} className={S.cell}></td>
                )}
                {/* 4to Ao */}
                {i < MATERIAS_4TO.length ? (
                  <>
                    <td colSpan={6} className={`${S.cell} text-[8px] text-gray-600 truncate`} title={MATERIAS_4TO[i]}>{i === 0 ? <><input className={S.inputW} value={seccion4} onChange={e => setSeccion4(e.target.value)} placeholder="Secc." style={{width:'40px',display:'inline'}} /> {MATERIAS_4TO[i]}</> : MATERIAS_4TO[i]}</td>
                    <td colSpan={2} className={S.cell}></td>
                    <td className={S.cell}><input className={S.inputW} value={notas4[i]?.nota || ''} onChange={e => updateNota(setNotas4, notas4, i, 'nota', e.target.value)} /></td>
                    <td className={S.cell}><input className={S.inputW} value={notas4[i]?.te || ''} onChange={e => updateNota(setNotas4, notas4, i, 'te', e.target.value)} /></td>
                    <td className={S.cell}><input className={S.inputW} value={notas4[i]?.fecha || ''} onChange={e => updateNota(setNotas4, notas4, i, 'fecha', e.target.value)} /></td>
                    <td className={S.cell}><input className={S.inputW} value={notas4[i]?.plantel || ''} onChange={e => updateNota(setNotas4, notas4, i, 'plantel', e.target.value)} /></td>
                  </>
                ) : (
                  <td colSpan={12} className={S.cell}></td>
                )}
                {/* 5to Ao */}
                {i < MATERIAS_5TO.length ? (
                  <>
                    <td colSpan={6} className={`${S.cell} text-[8px] text-gray-600 truncate`} title={MATERIAS_5TO[i]}>{i === 0 ? <><input className={S.inputW} value={seccion5} onChange={e => setSeccion5(e.target.value)} placeholder="Secc." style={{width:'40px',display:'inline'}} /> {MATERIAS_5TO[i]}</> : MATERIAS_5TO[i]}</td>
                    <td colSpan={2} className={S.cell}></td>
                    <td className={S.cell}><input className={S.inputW} value={notas5[i]?.nota || ''} onChange={e => updateNota(setNotas5, notas5, i, 'nota', e.target.value)} /></td>
                    <td className={S.cell}><input className={S.inputW} value={notas5[i]?.te || ''} onChange={e => updateNota(setNotas5, notas5, i, 'te', e.target.value)} /></td>
                    <td className={S.cell}><input className={S.inputW} value={notas5[i]?.fecha || ''} onChange={e => updateNota(setNotas5, notas5, i, 'fecha', e.target.value)} /></td>
                    <td className={S.cell}><input className={S.inputW} value={notas5[i]?.plantel || ''} onChange={e => updateNota(setNotas5, notas5, i, 'plantel', e.target.value)} /></td>
                    <td colSpan={2} className={S.cell}><input className={S.inputW} value={i === 0 ? grupo5 : ''} onChange={e => setGrupo5(e.target.value)} placeholder={i === 0 ? 'GRUPO' : ''} /></td>
                    <td className={S.cell}></td>
                    <td className={S.cell}></td>
                  </>
                ) : (
                  <td colSpan={14} className={S.cell}></td>
                )}
              </tr>
            ))}

            {/* ===== FILA 27: VALIDACION TITULO / NOTAS header ===== */}
            <tr>
              <td colSpan={2} className={S.subheader}>VALIDACION TITULO / NOTAS</td>
              <td className={`${S.subheader} bg-amber-200`}>Serial T.</td>
              <td className={`${S.subheader} bg-amber-200`}>Fecha Emision T.</td>
              <td className={`${S.subheader} bg-amber-200`}>Ao Egreso T.</td>
              <td className={`${S.subheader} bg-amber-200`}>Fecha Emision N.</td>
              <td className={`${S.subheader} bg-amber-200`}>Promedio Total</td>
              <td className={`${S.subheader}`}>*</td>
              <td colSpan={32} className={S.cell}></td>
            </tr>

            {/* ===== FILA 28: Observaciones + Validacion inputs + contadores ===== */}
            <tr className={S.yellowBg}>
              <td className={S.label}>Observaciones:</td>
              <td colSpan={6} className={S.cell}>
                <textarea className="w-full h-12 text-[9px] border border-amber-300 bg-amber-100 p-1 resize-none" value={observaciones} onChange={e => setObservaciones(e.target.value)} />
              </td>
              <td className={S.cell}><input className={S.inputW} value={serialT} onChange={e => setSerialT(e.target.value)} /></td>
              <td className={S.cell}><input className={S.inputW} value={fechaEmisionT} onChange={e => setFechaEmisionT(e.target.value)} /></td>
              <td className={S.cell}><input className={S.inputW} value={anioEgresoT} onChange={e => setAnioEgresoT(e.target.value)} /></td>
              <td className={S.cell}><input className={S.inputW} value={fechaEmisionN} onChange={e => setFechaEmisionN(e.target.value)} /></td>
              <td className={S.cell}><input className={S.inputW} value={promedioTotal} onChange={e => setPromedioTotal(e.target.value)} /></td>
              <td className={`${S.cell} text-[8px] text-red-600`}>*</td>
              <td colSpan={32} className={S.cell}></td>
            </tr>

            {/* ===== FILAS 29-51: Vacias (espacio del Excel) ===== */}
            {Array.from({ length: 23 }).map((_, i) => (
              <tr key={`empty_${i}`}><td colSpan={40} className="h-4 border border-gray-200"></td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppShell>
  )
}